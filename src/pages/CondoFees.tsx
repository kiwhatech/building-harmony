import { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  Calculator, Plus, Loader2, Building2, AlertTriangle, Info, Trash2, Save,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────
interface Building { id: string; name: string; }
interface Unit { id: string; unit_number: string; building_id: string; area_sqft: number | null; }
interface MillesimiTable { id: string; building_id: string; code: string; label: string; }
interface MillesimiValue { id: string; millesimi_table_id: string; unit_id: string; value: number; }
interface BudgetCategory { id: string; budget_id: string; millesimi_table_id: string; code: string; label: string; total: number; }
interface BuildingBudget { id: string; building_id: string; year: number; total_amount: number; categories?: BudgetCategory[]; }

interface UnitFeeResult {
  unitId: string;
  unitNumber: string;
  totalYearlyFee: number;
  breakdown: { categoryCode: string; categoryLabel: string; millesimiUsed: number; categoryTotal: number; unitShare: number; }[];
  userExplanation: string;
}

interface CalcResult {
  year: number;
  buildingId: string;
  totalBudget: number;
  perUnitFees: UnitFeeResult[];
  notes: string[];
}

// ── Component ──────────────────────────────────────────
export default function CondoFees() {
  const { user } = useAuth();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [millesimiTables, setMillesimiTables] = useState<MillesimiTable[]>([]);
  const [millesimiValues, setMillesimiValues] = useState<MillesimiValue[]>([]);
  const [budgets, setBudgets] = useState<BuildingBudget[]>([]);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedBuilding, setSelectedBuilding] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [calcResult, setCalcResult] = useState<CalcResult | null>(null);

  // Dialog states
  const [mtDialogOpen, setMtDialogOpen] = useState(false);
  const [mtCode, setMtCode] = useState('');
  const [mtLabel, setMtLabel] = useState('');
  const [mtBuildingId, setMtBuildingId] = useState('');
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [budgetYear, setBudgetYear] = useState(new Date().getFullYear());
  const [newCategories, setNewCategories] = useState<{ code: string; label: string; total: string; millesimi_table_id: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Millesimi inline editing
  const [editingValues, setEditingValues] = useState<Record<string, Record<string, string>>>({});
  const [savingMillesimi, setSavingMillesimi] = useState(false);
  // Millesimi table metadata editing (label & code)
  const [editingTableMeta, setEditingTableMeta] = useState<Record<string, { code: string; label: string }>>({});
  const [savingTableMeta, setSavingTableMeta] = useState(false);
  const [isSavingFees, setIsSavingFees] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [bRes, uRes, mtRes, mvRes, bbRes, bcRes] = await Promise.all([
        supabase.from('buildings').select('id, name').order('name'),
        supabase.from('units').select('id, unit_number, building_id, area_sqft').order('unit_number'),
        supabase.from('millesimi_tables').select('*').order('code'),
        supabase.from('millesimi_values').select('*'),
        supabase.from('building_budgets').select('*').order('year', { ascending: false }),
        supabase.from('budget_categories').select('*'),
      ]);
      if (bRes.error) throw bRes.error;
      setBuildings(bRes.data || []);
      setUnits(uRes.data || []);
      setMillesimiTables(mtRes.data || []);
      setMillesimiValues(mvRes.data || []);
      setBudgets(bbRes.data || []);
      setBudgetCategories(bcRes.data || []);
      if (!selectedBuilding && bRes.data?.length) setSelectedBuilding(bRes.data[0].id);
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Filtered data ──
  const buildingUnits = useMemo(() => units.filter(u => u.building_id === selectedBuilding), [units, selectedBuilding]);
  const buildingMTables = useMemo(() => millesimiTables.filter(mt => mt.building_id === selectedBuilding), [millesimiTables, selectedBuilding]);
  const buildingBudgets = useMemo(() => budgets.filter(b => b.building_id === selectedBuilding), [budgets, selectedBuilding]);

  // ── Dialog units (based on dialog building selection) ──
  const mtDialogUnits = useMemo(() => units.filter(u => u.building_id === mtBuildingId), [units, mtBuildingId]);

  // ── Create millesimi table ──
  // Buildings that don't have a millesimi table yet
  const buildingsWithoutMTable = useMemo(() => {
    const buildingIdsWithTable = new Set(millesimiTables.map(mt => mt.building_id));
    return buildings.filter(b => !buildingIdsWithTable.has(b.id));
  }, [buildings, millesimiTables]);

  const handleCreateMTable = async () => {
    if (!mtBuildingId || !mtCode || !mtLabel) return;
    // Check if building already has a millesimi table
    if (millesimiTables.some(mt => mt.building_id === mtBuildingId)) {
      toast.error('This building already has a millesimi table. Only one table per building is allowed.');
      return;
    }
    if (mtDialogUnits.length === 0) {
      toast.error('No units found for this building. Please add units first.');
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: tableData, error } = await supabase.from('millesimi_tables').insert({
        building_id: mtBuildingId, code: mtCode.toUpperCase().replace(/\s+/g, '_'), label: mtLabel,
      }).select().single();
      if (error) throw error;

      // Distribute millesimi based on square meters if available, otherwise equally
      const totalArea = mtDialogUnits.reduce((s, u) => s + (Number(u.area_sqft) || 0), 0);
      const useArea = totalArea > 0 && mtDialogUnits.every(u => u.area_sqft && Number(u.area_sqft) > 0);

      let unitValues: { millesimi_table_id: string; unit_id: string; value: number }[];

      if (useArea) {
        const rawValues = mtDialogUnits.map(u => ({
          millesimi_table_id: tableData.id,
          unit_id: u.id,
          value: Math.round((Number(u.area_sqft) / totalArea) * 1000 * 100) / 100,
        }));
        // Adjust last unit for rounding
        const sumSoFar = rawValues.slice(0, -1).reduce((s, v) => s + v.value, 0);
        rawValues[rawValues.length - 1].value = Math.round((1000 - sumSoFar) * 100) / 100;
        unitValues = rawValues;
      } else {
        const equalValue = Math.round((1000 / mtDialogUnits.length) * 100) / 100;
        unitValues = mtDialogUnits.map((u, idx) => ({
          millesimi_table_id: tableData.id,
          unit_id: u.id,
          value: idx === mtDialogUnits.length - 1
            ? Math.round((1000 - equalValue * (mtDialogUnits.length - 1)) * 100) / 100
            : equalValue,
        }));
      }

      const { error: valErr } = await supabase.from('millesimi_values').insert(unitValues);
      if (valErr) throw valErr;

      toast.success(`Millesimi table created with ${mtDialogUnits.length} units (${useArea ? 'distributed by sqm' : 'equally distributed'})`);
      setMtDialogOpen(false);
      setMtCode(''); setMtLabel(''); setMtBuildingId('');
      // Switch page building selector to the chosen building
      setSelectedBuilding(mtBuildingId);
      fetchAll();
    } catch (e: any) {
      toast.error(e.message || 'Failed to create');
    } finally { setIsSubmitting(false); }
  };

  const handleDeleteMTable = async (id: string) => {
    try {
      const { error } = await supabase.from('millesimi_tables').delete().eq('id', id);
      if (error) throw error;
      toast.success('Millesimi table deleted');
      fetchAll();
    } catch (e: any) { toast.error(e.message || 'Failed to delete'); }
  };

  // ── Millesimi value editing ──
  const initEditingForTable = (tableId: string) => {
    const existing: Record<string, string> = {};
    buildingUnits.forEach(u => {
      const mv = millesimiValues.find(v => v.millesimi_table_id === tableId && v.unit_id === u.id);
      existing[u.id] = mv ? String(mv.value) : '0';
    });
    setEditingValues(prev => ({ ...prev, [tableId]: existing }));
  };

  const saveMillesimiValues = async (tableId: string) => {
    const vals = editingValues[tableId];
    if (!vals) return;
    setSavingMillesimi(true);
    try {
      const upserts = Object.entries(vals).map(([unitId, val]) => ({
        millesimi_table_id: tableId,
        unit_id: unitId,
        value: parseFloat(val) || 0,
      }));
      // Delete existing then insert (upsert workaround)
      await supabase.from('millesimi_values').delete().eq('millesimi_table_id', tableId);
      const { error } = await supabase.from('millesimi_values').insert(upserts);
      if (error) throw error;
      toast.success('Millesimi values saved');
      setEditingValues(prev => { const n = { ...prev }; delete n[tableId]; return n; });
      fetchAll();
    } catch (e: any) { toast.error(e.message || 'Failed to save'); }
    finally { setSavingMillesimi(false); }
  };

  // ── Save millesimi table metadata (label & code) ──
  const saveTableMeta = async (tableId: string) => {
    const meta = editingTableMeta[tableId];
    if (!meta || !meta.code || !meta.label) return;
    setSavingTableMeta(true);
    try {
      const { error } = await supabase.from('millesimi_tables').update({
        code: meta.code.toUpperCase().replace(/\s+/g, '_'),
        label: meta.label,
      }).eq('id', tableId);
      if (error) throw error;
      toast.success('Table updated');
      setEditingTableMeta(prev => { const n = { ...prev }; delete n[tableId]; return n; });
      fetchAll();
    } catch (e: any) { toast.error(e.message || 'Failed to update table'); }
    finally { setSavingTableMeta(false); }
  };


    try {
      // Delete categories first, then the budget
      await supabase.from('budget_categories').delete().eq('budget_id', budgetId);
      const { error } = await supabase.from('building_budgets').delete().eq('id', budgetId);
      if (error) throw error;
      toast.success('Budget deleted');
      fetchAll();
    } catch (e: any) { toast.error(e.message || 'Failed to delete budget'); }
  };

  // ── Budget creation ──
  const handleCreateBudget = async () => {
    if (!selectedBuilding || newCategories.length === 0) return;
    // Check: only 1 budget per building per year
    if (budgets.some(b => b.building_id === selectedBuilding && b.year === budgetYear)) {
      toast.error(`A budget for year ${budgetYear} already exists for this building.`);
      return;
    }
    setIsSubmitting(true);
    try {
      const totalAmount = newCategories.reduce((s, c) => s + (parseFloat(c.total) || 0), 0);
      const { data: budgetData, error: budgetErr } = await supabase.from('building_budgets').insert({
        building_id: selectedBuilding, year: budgetYear, total_amount: totalAmount, created_by: user?.id,
      }).select().single();
      if (budgetErr) throw budgetErr;

      const cats = newCategories.map(c => ({
        budget_id: budgetData.id,
        millesimi_table_id: c.millesimi_table_id,
        code: c.code.toUpperCase().replace(/\s+/g, '_'),
        label: c.label,
        total: parseFloat(c.total) || 0,
      }));
      const { error: catErr } = await supabase.from('budget_categories').insert(cats);
      if (catErr) throw catErr;

      toast.success('Budget created successfully');
      setBudgetDialogOpen(false);
      setNewCategories([]);
      fetchAll();
    } catch (e: any) { toast.error(e.message || 'Failed to create budget'); }
    finally { setIsSubmitting(false); }
  };

  // ── Fee calculation ──
  const calculateFees = () => {
    const budget = buildingBudgets.find(b => b.year === selectedYear);
    if (!budget) { toast.error('No budget found for selected year'); return; }

    const cats = budgetCategories.filter(c => c.budget_id === budget.id);
    if (cats.length === 0) { toast.error('No expense categories in this budget'); return; }

    const notes: string[] = ['Calcolo effettuato in base alle tabelle millesimali fornite.'];
    const perUnitFees: UnitFeeResult[] = [];
    const errors: string[] = [];

    // For each category, compute millesimi sums
    const categoryData = cats.map(cat => {
      const tableValues = millesimiValues.filter(v => v.millesimi_table_id === cat.millesimi_table_id);
      const mTable = millesimiTables.find(mt => mt.id === cat.millesimi_table_id);
      const sum = tableValues.reduce((s, v) => s + Number(v.value), 0);
      if (sum === 0) {
        errors.push(`La somma dei millesimi per "${mTable?.label || cat.label}" è zero. Impossibile calcolare.`);
      }
      if (Math.abs(sum - 1000) > 0.01) {
        notes.push(`La somma dei millesimi per la tabella ${mTable?.label || cat.label} è ${sum} (diversa da 1000); gli importi sono calcolati proporzionalmente.`);
      } else {
        notes.push(`La somma dei millesimi per la tabella ${mTable?.label || cat.label} è 1000.`);
      }
      return { ...cat, tableValues, sum, mTableLabel: mTable?.label || cat.label };
    });

    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }

    buildingUnits.forEach(unit => {
      const breakdown: UnitFeeResult['breakdown'] = [];
      let totalYearlyFee = 0;
      const explanationParts: string[] = [];

      categoryData.forEach(cat => {
        const mv = cat.tableValues.find(v => v.unit_id === unit.id);
        if (!mv) {
          errors.push(`Unit ${unit.unit_number} non ha millesimi nella tabella ${cat.mTableLabel}.`);
          return;
        }
        const fraction = Number(mv.value) / cat.sum;
        const unitShare = Math.round(Number(cat.total) * fraction * 100) / 100;
        totalYearlyFee += unitShare;
        breakdown.push({
          categoryCode: cat.code,
          categoryLabel: cat.label,
          millesimiUsed: Number(mv.value),
          categoryTotal: Number(cat.total),
          unitShare,
        });
        explanationParts.push(`${Number(mv.value)} millesimi ${cat.mTableLabel.toLowerCase()}`);
      });

      totalYearlyFee = Math.round(totalYearlyFee * 100) / 100;

      perUnitFees.push({
        unitId: unit.id,
        unitNumber: unit.unit_number,
        totalYearlyFee,
        breakdown,
        userExplanation: `La quota annua di Unità ${unit.unit_number} per il ${selectedYear} è ${totalYearlyFee.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}, calcolata sulla base di ${explanationParts.join(' e ')} rispetto al totale del condominio.`,
      });
    });

    if (errors.length > 0) {
      notes.push(...errors.map(e => `⚠️ ${e}`));
    }

    perUnitFees.sort((a, b) => a.unitNumber.localeCompare(b.unitNumber));

    setCalcResult({
      year: selectedYear,
      buildingId: selectedBuilding,
      totalBudget: Number(budget.total_amount),
      perUnitFees,
      notes,
    });
  };

  // ── Save fee plan to fees table ──
  const saveFeePlan = async () => {
    if (!calcResult || !user) return;
    setIsSavingFees(true);
    try {
      // Delete existing fees for this building and year (based on description pattern)
      const yearTag = `[${calcResult.year}]`;
      const { data: existingFees } = await supabase
        .from('fees')
        .select('id')
        .eq('building_id', calcResult.buildingId)
        .like('description', `${yearTag}%`);

      if (existingFees && existingFees.length > 0) {
        const { error: delErr } = await supabase
          .from('fees')
          .delete()
          .in('id', existingFees.map(f => f.id));
        if (delErr) throw delErr;
      }

      // Insert new fee records
      const dueDate = `${calcResult.year}-12-31`;
      const feeInserts = calcResult.perUnitFees.map(uf => ({
        building_id: calcResult.buildingId,
        unit_id: uf.unitId,
        description: `${yearTag} ${uf.breakdown.map(b => b.categoryLabel).join(', ')}`,
        amount: uf.totalYearlyFee,
        due_date: dueDate,
        status: 'pending' as const,
        created_by: user.id,
      }));

      const { error: insErr } = await supabase.from('fees').insert(feeInserts);
      if (insErr) throw insErr;

      toast.success(`Fee plan for ${calcResult.year} saved successfully (${feeInserts.length} fees)`);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to save fee plan');
    } finally {
      setIsSavingFees(false);
    }
  };

  const addCategory = () => {
    setNewCategories(prev => [...prev, { code: '', label: '', total: '', millesimi_table_id: '' }]);
  };

  const updateCategory = (idx: number, field: string, value: string) => {
    setNewCategories(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const removeCategory = (idx: number) => {
    setNewCategories(prev => prev.filter((_, i) => i !== idx));
  };

  if (isLoading) {
    return (
      <AppLayout title="Condo Fee Calculator" description="Millesimi-based yearly fee distribution">
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Condo Fee Calculator" description="Millesimi-based yearly fee distribution">
      <div className="space-y-6">
        {/* Building selector */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <Label>Building</Label>
            <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Select a building" />
              </SelectTrigger>
              <SelectContent>
                {buildings.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="millesimi" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="millesimi">Millesimi Tables</TabsTrigger>
            <TabsTrigger value="budget">Budget Setup</TabsTrigger>
            <TabsTrigger value="calculate">Fee Calculation</TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Millesimi Tables ── */}
          <TabsContent value="millesimi" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Millesimi Tables</h3>
                <p className="text-sm text-muted-foreground">Define millesimi tables and assign values to each unit.</p>
              </div>
               <Dialog open={mtDialogOpen} onOpenChange={(open) => { setMtDialogOpen(open); if (open) { const defaultBld = buildingsWithoutMTable.find(b => b.id === selectedBuilding) ? selectedBuilding : (buildingsWithoutMTable[0]?.id || ''); setMtBuildingId(defaultBld); } }}>
                <DialogTrigger asChild>
                  <Button disabled={buildingsWithoutMTable.length === 0}>
                    <Plus className="mr-2 h-4 w-4" />{buildingsWithoutMTable.length === 0 ? 'All buildings have a table' : 'New Table'}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Millesimi Table</DialogTitle>
                    <DialogDescription>Add a new millesimi distribution table (e.g., General, Heating, Elevator).</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label>Building *</Label>
                      <Select value={mtBuildingId} onValueChange={setMtBuildingId}>
                        <SelectTrigger><SelectValue placeholder="Select a building" /></SelectTrigger>
                        <SelectContent>
                          {buildingsWithoutMTable.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Code</Label>
                      <Input value={mtCode} onChange={e => setMtCode(e.target.value)} placeholder="e.g. GENERAL" />
                    </div>
                    <div className="space-y-2">
                      <Label>Label</Label>
                      <Input value={mtLabel} onChange={e => setMtLabel(e.target.value)} placeholder="e.g. Spese generali" />
                    </div>
                    {mtBuildingId && (
                      <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
                        <p className="text-sm font-medium flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5" />
                          {mtDialogUnits.length} unit{mtDialogUnits.length !== 1 ? 's' : ''} will be included
                        </p>
                        {mtDialogUnits.length > 0 ? (() => {
                          const totalArea = mtDialogUnits.reduce((s, u) => s + (Number(u.area_sqft) || 0), 0);
                          const useArea = totalArea > 0 && mtDialogUnits.every(u => u.area_sqft && Number(u.area_sqft) > 0);
                          return (
                            <>
                              <p className="text-xs text-muted-foreground">
                                {useArea
                                  ? `Distribution based on square meters (total: ${totalArea.toLocaleString()} sqm)`
                                  : `Equal distribution (1000 ÷ ${mtDialogUnits.length} = ${(1000 / mtDialogUnits.length).toFixed(2)} each)`}
                              </p>
                              {useArea && (
                                <div className="mt-2 space-y-0.5">
                                  {mtDialogUnits.map(u => {
                                    const area = Number(u.area_sqft) || 0;
                                    const mill = Math.round((area / totalArea) * 1000 * 100) / 100;
                                    return (
                                      <p key={u.id} className="text-xs text-muted-foreground">
                                        Unit {u.unit_number}: {area} sqm → {mill} millesimi
                                      </p>
                                    );
                                  })}
                                </div>
                              )}
                              {!useArea && mtDialogUnits.some(u => !u.area_sqft || Number(u.area_sqft) === 0) && (
                                <p className="text-xs text-warning flex items-center gap-1 mt-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Some units have no square meters set — using equal distribution instead.
                                </p>
                              )}
                            </>
                          );
                        })() : (
                          <p className="text-xs text-muted-foreground">No units found for this building. Please add units first.</p>
                        )}
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setMtDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateMTable} disabled={isSubmitting || !mtCode || !mtLabel || !mtBuildingId || mtDialogUnits.length === 0}>
                      {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Create
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {buildingMTables.length === 0 ? (
              <Card><CardContent className="flex flex-col items-center justify-center py-12">
                <Calculator className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <h3 className="mb-2 text-lg font-semibold">No millesimi tables</h3>
                <p className="text-muted-foreground">Create a millesimi table to start defining unit shares.</p>
              </CardContent></Card>
            ) : (
              <Accordion type="multiple" className="space-y-2">
                {buildingMTables.map(mt => {
                  const vals = millesimiValues.filter(v => v.millesimi_table_id === mt.id);
                  const sum = Math.round(vals.reduce((s, v) => s + Number(v.value), 0) * 100) / 100;
                  const isEditing = !!editingValues[mt.id];

                  return (
                    <AccordionItem key={mt.id} value={mt.id} className="rounded-lg border bg-card">
                      <AccordionTrigger className="px-4 hover:no-underline">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">{mt.label}</span>
                          <Badge variant="secondary">{mt.code}</Badge>
                          <Badge variant={Math.abs(sum - 1000) < 0.01 ? 'default' : 'destructive'} className="text-xs">
                            Σ {sum}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="flex gap-2 mb-3">
                          {!isEditing ? (
                            <Button size="sm" variant="outline" onClick={() => initEditingForTable(mt.id)}>Edit Values</Button>
                          ) : (
                            <>
                              <Button size="sm" onClick={() => saveMillesimiValues(mt.id)} disabled={savingMillesimi}>
                                <Save className="mr-1 h-3 w-3" />{savingMillesimi ? 'Saving...' : 'Save'}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingValues(prev => { const n = { ...prev }; delete n[mt.id]; return n; })}>Cancel</Button>
                            </>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive"><Trash2 className="h-3 w-3" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete millesimi table?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the table "{mt.label}" and all its millesimi values. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteMTable(mt.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Unit</TableHead>
                              <TableHead className="text-right">Millesimi</TableHead>
                              <TableHead className="text-right">%</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {buildingUnits.map(unit => {
                              const mv = vals.find(v => v.unit_id === unit.id);
                              const val = isEditing ? (editingValues[mt.id]?.[unit.id] || '0') : String(mv?.value || 0);
                              const pct = sum > 0 ? ((parseFloat(val) / sum) * 100).toFixed(2) : '0.00';
                              return (
                                <TableRow key={unit.id}>
                                  <TableCell className="font-medium">Unit {unit.unit_number}</TableCell>
                                  <TableCell className="text-right">
                                    {isEditing ? (
                                      <Input
                                        type="number" step="0.01" min="0"
                                        className="w-24 ml-auto text-right"
                                        value={val}
                                        onChange={e => setEditingValues(prev => ({
                                          ...prev, [mt.id]: { ...prev[mt.id], [unit.id]: e.target.value }
                                        }))}
                                      />
                                    ) : val}
                                  </TableCell>
                                  <TableCell className="text-right text-muted-foreground">{pct}%</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                        {Math.abs(sum - 1000) > 0.01 && sum > 0 && (
                          <div className="mt-3 flex items-center gap-2 rounded-md bg-warning/10 p-3 text-sm text-warning">
                            <AlertTriangle className="h-4 w-4" />
                            La somma dei millesimi è {sum} (diversa da 1000). Gli importi saranno calcolati proporzionalmente.
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </TabsContent>

          {/* ── Tab 2: Budget Setup ── */}
          <TabsContent value="budget" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Yearly Budget</h3>
                <p className="text-sm text-muted-foreground">Define the annual expense budget with categories linked to millesimi tables.</p>
              </div>
              <Dialog open={budgetDialogOpen} onOpenChange={o => { setBudgetDialogOpen(o); if (!o) setNewCategories([]); }}>
                <DialogTrigger asChild>
                  <Button disabled={!selectedBuilding || buildingMTables.length === 0}>
                    <Plus className="mr-2 h-4 w-4" />New Budget
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Yearly Budget</DialogTitle>
                    <DialogDescription>Define expense categories and their totals for a specific year.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Year</Label>
                      <Input type="number" value={budgetYear} onChange={e => setBudgetYear(parseInt(e.target.value))} />
                      {budgets.some(b => b.building_id === selectedBuilding && b.year === budgetYear) && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          A budget for {budgetYear} already exists for this building.
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Expense Categories</Label>
                        <Button size="sm" variant="outline" onClick={addCategory}><Plus className="mr-1 h-3 w-3" />Add Category</Button>
                      </div>
                      {newCategories.map((cat, idx) => (
                        <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-end">
                          <div>
                            <Label className="text-xs">Code</Label>
                            <Input value={cat.code} onChange={e => updateCategory(idx, 'code', e.target.value)} placeholder="GENERAL" />
                          </div>
                          <div>
                            <Label className="text-xs">Label</Label>
                            <Input value={cat.label} onChange={e => updateCategory(idx, 'label', e.target.value)} placeholder="Spese generali" />
                          </div>
                          <div>
                            <Label className="text-xs">Total (€)</Label>
                            <Input type="number" step="0.01" value={cat.total} onChange={e => updateCategory(idx, 'total', e.target.value)} placeholder="10000" />
                          </div>
                          <div>
                            <Label className="text-xs">Millesimi Table</Label>
                            <Select value={cat.millesimi_table_id} onValueChange={v => updateCategory(idx, 'millesimi_table_id', v)}>
                              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent>
                                {buildingMTables.map(mt => <SelectItem key={mt.id} value={mt.id}>{mt.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button size="icon" variant="ghost" onClick={() => removeCategory(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      ))}
                      {newCategories.length > 0 && (
                        <div className="text-sm text-muted-foreground text-right">
                          Total: €{newCategories.reduce((s, c) => s + (parseFloat(c.total) || 0), 0).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setBudgetDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateBudget} disabled={isSubmitting || newCategories.length === 0 || newCategories.some(c => !c.code || !c.millesimi_table_id) || budgets.some(b => b.building_id === selectedBuilding && b.year === budgetYear)}>
                      {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Create Budget
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {buildingBudgets.length === 0 ? (
              <Card><CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <h3 className="mb-2 text-lg font-semibold">No budgets defined</h3>
                <p className="text-muted-foreground">Create a yearly budget to start calculating fees.</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-4">
                {buildingBudgets.map(budget => {
                  const cats = budgetCategories.filter(c => c.budget_id === budget.id);
                  return (
                    <Card key={budget.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">Budget {budget.year}</CardTitle>
                            <CardDescription>Total: €{Number(budget.total_amount).toLocaleString()}</CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-base">{budget.year}</Badge>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive"><Trash2 className="h-3 w-3" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete budget {budget.year}?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete the budget for {budget.year} and all its expense categories. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteBudget(budget.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Category</TableHead>
                              <TableHead>Code</TableHead>
                              <TableHead>Millesimi Table</TableHead>
                              <TableHead className="text-right">Amount (€)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {cats.map(cat => {
                              const mt = millesimiTables.find(m => m.id === cat.millesimi_table_id);
                              return (
                                <TableRow key={cat.id}>
                                  <TableCell className="font-medium">{cat.label}</TableCell>
                                  <TableCell><Badge variant="outline">{cat.code}</Badge></TableCell>
                                  <TableCell className="text-muted-foreground">{mt?.label || '—'}</TableCell>
                                  <TableCell className="text-right font-medium">€{Number(cat.total).toLocaleString()}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── Tab 3: Fee Calculation ── */}
          <TabsContent value="calculate" className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(parseInt(v))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {buildingBudgets.map(b => (
                      <SelectItem key={b.year} value={String(b.year)}>{b.year}</SelectItem>
                    ))}
                    {buildingBudgets.length === 0 && (
                      <SelectItem value={String(selectedYear)}>{selectedYear}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={calculateFees} disabled={buildingBudgets.length === 0}>
                  <Calculator className="mr-2 h-4 w-4" />Calculate Fees
                </Button>
                {calcResult && (
                  <Button onClick={saveFeePlan} disabled={isSavingFees} variant="default">
                    {isSavingFees ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Fee Plan
                  </Button>
                )}
              </div>
            </div>

            {calcResult ? (
              <div className="space-y-4">
                {/* Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Fee Distribution — {calcResult.year}</CardTitle>
                    <CardDescription>Total budget: €{calcResult.totalBudget.toLocaleString()}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {calcResult.notes.length > 0 && (
                      <div className="mb-4 space-y-1 rounded-md bg-muted p-3 text-sm">
                        {calcResult.notes.map((n, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <Info className="mt-0.5 h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground">{n}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Unit</TableHead>
                          {calcResult.perUnitFees[0]?.breakdown.map(b => (
                            <TableHead key={b.categoryCode} className="text-right">{b.categoryLabel}</TableHead>
                          ))}
                          <TableHead className="text-right font-bold">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {calcResult.perUnitFees.map(uf => (
                          <TableRow key={uf.unitId}>
                            <TableCell className="font-medium">Unit {uf.unitNumber}</TableCell>
                            {uf.breakdown.map(b => (
                              <TableCell key={b.categoryCode} className="text-right">
                                <div>€{b.unitShare.toLocaleString()}</div>
                                <div className="text-xs text-muted-foreground">{b.millesimiUsed} mill.</div>
                              </TableCell>
                            ))}
                            <TableCell className="text-right font-bold">€{uf.totalYearlyFee.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Per-unit explanations */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Unit Explanations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {calcResult.perUnitFees.map(uf => (
                      <div key={uf.unitId} className="rounded-md border p-3 text-sm text-muted-foreground">
                        {uf.userExplanation}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card><CardContent className="flex flex-col items-center justify-center py-12">
                <Calculator className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <h3 className="mb-2 text-lg font-semibold">Ready to calculate</h3>
                <p className="text-muted-foreground">Select a year and click Calculate to distribute fees across units.</p>
              </CardContent></Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
