import { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import { toast } from 'sonner';
import {
  DollarSign, Loader2, Search, AlertTriangle, Info, CheckCircle2, Clock,
} from 'lucide-react';

interface Building { id: string; name: string; }
interface Unit { id: string; unit_number: string; building_id: string; }
interface MillesimiTable { id: string; building_id: string; code: string; label: string; }
interface MillesimiValue { id: string; millesimi_table_id: string; unit_id: string; value: number; }
interface BudgetCategory { id: string; budget_id: string; millesimi_table_id: string; code: string; label: string; total: number; }
interface BuildingBudget { id: string; building_id: string; year: number; total_amount: number; }

interface UnitFeeResult {
  unitId: string;
  unitNumber: string;
  totalYearlyFee: number;
  breakdown: { categoryCode: string; categoryLabel: string; millesimiUsed: number; categoryTotal: number; unitShare: number }[];
  userExplanation: string;
}

interface FeeRecord {
  id: string;
  unit_id: string | null;
  status: 'pending' | 'paid' | 'overdue';
  amount: number;
  description: string;
}

export default function Fees() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [millesimiTables, setMillesimiTables] = useState<MillesimiTable[]>([]);
  const [millesimiValues, setMillesimiValues] = useState<MillesimiValue[]>([]);
  const [budgets, setBudgets] = useState<BuildingBudget[]>([]);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [bRes, uRes, mtRes, mvRes, bbRes, bcRes, fRes] = await Promise.all([
        supabase.from('buildings').select('id, name').order('name'),
        supabase.from('units').select('id, unit_number, building_id').order('unit_number'),
        supabase.from('millesimi_tables').select('*').order('code'),
        supabase.from('millesimi_values').select('*'),
        supabase.from('building_budgets').select('*').order('year', { ascending: false }),
        supabase.from('budget_categories').select('*'),
        supabase.from('fees').select('id, unit_id, status, amount, description'),
      ]);
      if (bRes.error) throw bRes.error;
      setBuildings(bRes.data || []);
      setUnits(uRes.data || []);
      setMillesimiTables(mtRes.data || []);
      setMillesimiValues(mvRes.data || []);
      setBudgets(bbRes.data || []);
      setBudgetCategories(bcRes.data || []);
      setFeeRecords(fRes.data || []);
      if (!selectedBuilding && bRes.data?.length) setSelectedBuilding(bRes.data[0].id);
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const buildingUnits = useMemo(() => units.filter(u => u.building_id === selectedBuilding), [units, selectedBuilding]);
  const buildingBudgets = useMemo(() => budgets.filter(b => b.building_id === selectedBuilding), [budgets, selectedBuilding]);
  const availableYears = useMemo(() => [...new Set(buildingBudgets.map(b => b.year))].sort((a, b) => b - a), [buildingBudgets]);

  // Calculate fees from configuration
  const calculatedFees = useMemo<{ fees: UnitFeeResult[]; notes: string[]; totalBudget: number } | null>(() => {
    const budget = buildingBudgets.find(b => b.year === selectedYear);
    if (!budget) return null;

    const cats = budgetCategories.filter(c => c.budget_id === budget.id);
    if (cats.length === 0) return null;

    const notes: string[] = ['Calcolo effettuato in base alle tabelle millesimali fornite.'];
    const errors: string[] = [];

    const categoryData = cats.map(cat => {
      const tableValues = millesimiValues.filter(v => v.millesimi_table_id === cat.millesimi_table_id);
      const mTable = millesimiTables.find(mt => mt.id === cat.millesimi_table_id);
      const sum = tableValues.reduce((s, v) => s + Number(v.value), 0);
      if (sum === 0) {
        errors.push(`La somma dei millesimi per "${mTable?.label || cat.label}" è zero.`);
      }
      if (Math.abs(sum - 1000) > 0.01) {
        notes.push(`La somma dei millesimi per la tabella ${mTable?.label || cat.label} è ${sum} (diversa da 1000); importi calcolati proporzionalmente.`);
      }
      return { ...cat, tableValues, sum, mTableLabel: mTable?.label || cat.label };
    });

    if (errors.length > 0) return null;

    const perUnitFees: UnitFeeResult[] = [];

    buildingUnits.forEach(unit => {
      const breakdown: UnitFeeResult['breakdown'] = [];
      let totalYearlyFee = 0;
      const explanationParts: string[] = [];

      categoryData.forEach(cat => {
        const mv = cat.tableValues.find(v => v.unit_id === unit.id);
        const milValue = mv ? Number(mv.value) : 0;
        const fraction = cat.sum > 0 ? milValue / cat.sum : 0;
        const unitShare = Math.round(Number(cat.total) * fraction * 100) / 100;
        totalYearlyFee += unitShare;
        breakdown.push({
          categoryCode: cat.code,
          categoryLabel: cat.label,
          millesimiUsed: milValue,
          categoryTotal: Number(cat.total),
          unitShare,
        });
        if (milValue > 0) explanationParts.push(`${milValue} millesimi ${cat.mTableLabel.toLowerCase()}`);
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

    perUnitFees.sort((a, b) => a.unitNumber.localeCompare(b.unitNumber));

    return { fees: perUnitFees, notes, totalBudget: Number(budget.total_amount) };
  }, [buildingBudgets, selectedYear, budgetCategories, millesimiValues, millesimiTables, buildingUnits]);

  // Match fee records (from fees table) to units for payment status
  const getUnitPaymentStatus = (unitId: string): 'paid' | 'pending' | 'overdue' | null => {
    const record = feeRecords.find(f => f.unit_id === unitId);
    return record ? record.status : null;
  };

  const filteredFees = useMemo(() => {
    if (!calculatedFees) return [];
    if (!searchQuery) return calculatedFees.fees;
    const q = searchQuery.toLowerCase();
    return calculatedFees.fees.filter(f =>
      f.unitNumber.toLowerCase().includes(q) ||
      f.userExplanation.toLowerCase().includes(q)
    );
  }, [calculatedFees, searchQuery]);

  // Summary totals
  const totals = useMemo(() => {
    if (!calculatedFees) return { total: 0, count: 0 };
    return {
      total: calculatedFees.totalBudget,
      count: calculatedFees.fees.length,
    };
  }, [calculatedFees]);

  const statusConfig = {
    pending: { label: 'Pending', icon: Clock, color: 'bg-warning/10 text-warning' },
    paid: { label: 'Paid', icon: CheckCircle2, color: 'bg-success/10 text-success' },
    overdue: { label: 'Overdue', icon: AlertTriangle, color: 'bg-destructive/10 text-destructive' },
  };

  return (
    <AppLayout title="Fees" description="Yearly condominium fees calculated from building configuration">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Budget</p>
                  <p className="text-2xl font-bold">
                    {totals.total.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Units</p>
                  <p className="text-2xl font-bold">{totals.count}</p>
                </div>
                <Info className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Year</p>
                  <p className="text-2xl font-bold">{selectedYear}</p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <Label>Building</Label>
            <Select value={selectedBuilding} onValueChange={v => { setSelectedBuilding(v); }}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Select a building" />
              </SelectTrigger>
              <SelectContent>
                {buildings.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Year</Label>
            <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.length > 0
                  ? availableYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)
                  : <SelectItem value={String(new Date().getFullYear())}>{new Date().getFullYear()}</SelectItem>
                }
              </SelectContent>
            </Select>
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search units..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Notes */}
        {calculatedFees && calculatedFees.notes.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                <div className="space-y-1 text-sm text-muted-foreground">
                  {calculatedFees.notes.map((note, i) => <p key={i}>{note}</p>)}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !calculatedFees || filteredFees.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <DollarSign className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="mb-2 text-lg font-semibold">No fees calculated</h3>
              <p className="mb-4 text-center text-muted-foreground">
                {!calculatedFees
                  ? 'No budget has been configured for this building and year. Set up millesimi tables and a budget in Fees Configuration first.'
                  : 'No units match your search.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Accordion type="multiple" className="space-y-2">
            {filteredFees.map(fee => {
              const paymentStatus = getUnitPaymentStatus(fee.unitId);
              const statusInfo = paymentStatus ? statusConfig[paymentStatus] : null;

              return (
                <AccordionItem key={fee.unitId} value={fee.unitId} className="rounded-lg border bg-card">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex w-full items-center justify-between pr-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2">
                          <DollarSign className="h-4 w-4 text-primary" />
                        </div>
                        <div className="text-left">
                          <span className="font-semibold">Unit {fee.unitNumber}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {statusInfo && (
                          <Badge className={statusInfo.color} variant="secondary">
                            <statusInfo.icon className="mr-1 h-3 w-3" />
                            {statusInfo.label}
                          </Badge>
                        )}
                        <span className="text-lg font-bold">
                          {fee.totalYearlyFee.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                        </span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    {/* Breakdown table */}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Millesimi</TableHead>
                          <TableHead className="text-right">Category Total</TableHead>
                          <TableHead className="text-right">Unit Share</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fee.breakdown.map(b => (
                          <TableRow key={b.categoryCode}>
                            <TableCell>
                              <div>
                                <span className="font-medium">{b.categoryLabel}</span>
                                <Badge variant="outline" className="ml-2 text-xs">{b.categoryCode}</Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{b.millesimiUsed}</TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {b.categoryTotal.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {b.unitShare.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-bold">
                          <TableCell colSpan={3} className="text-right">Total</TableCell>
                          <TableCell className="text-right">
                            {fee.totalYearlyFee.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                    {/* Explanation */}
                    <div className="mt-3 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground italic">
                      {fee.userExplanation}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>
    </AppLayout>
  );
}
