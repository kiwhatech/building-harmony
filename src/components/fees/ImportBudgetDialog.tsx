import { useState, useRef } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Loader2, FileText, Trash2, AlertTriangle, CheckCircle2, Plus } from 'lucide-react';

interface MillesimiTable {
  id: string;
  building_id: string;
  code: string;
  label: string;
}

interface ImportedCategory {
  code: string;
  label: string;
  total: number;
  millesimi_table_id: string;
}

interface ImportBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedBuilding: string;
  buildingMTables: MillesimiTable[];
  userId: string;
  onSuccess: () => void;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function ImportBudgetDialog({
  open, onOpenChange, selectedBuilding, buildingMTables, userId, onSuccess,
}: ImportBudgetDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fileName, setFileName] = useState('');
  const [categories, setCategories] = useState<ImportedCategory[]>([]);
  const [budgetYear, setBudgetYear] = useState(new Date().getFullYear());
  const [budgetType, setBudgetType] = useState<'calendar' | 'custom'>('calendar');
  const [budgetStartMonth, setBudgetStartMonth] = useState(0);
  const [parseNotes, setParseNotes] = useState('');
  const [parseError, setParseError] = useState('');

  const resetState = () => {
    setStep('upload');
    setIsParsing(false);
    setIsSaving(false);
    setFileName('');
    setCategories([]);
    setBudgetYear(new Date().getFullYear());
    setBudgetType('calendar');
    setBudgetStartMonth(0);
    setParseNotes('');
    setParseError('');
  };

  const handleClose = () => {
    if (isParsing || isSaving) return;
    resetState();
    onOpenChange(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      toast.error('File is too large. Maximum size is 20MB.');
      return;
    }

    setFileName(file.name);
    setIsParsing(true);
    setParseError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/parse-budget-file`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${anonKey}`,
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (result.error && (!result.categories || result.categories.length === 0)) {
        setParseError(result.error);
        setIsParsing(false);
        return;
      }

      if (!result.categories || result.categories.length === 0) {
        setParseError('No budget categories could be extracted from this file.');
        setIsParsing(false);
        return;
      }

      // Map categories, auto-assign first millesimi table
      const defaultMTableId = buildingMTables[0]?.id || '';
      const mapped: ImportedCategory[] = result.categories.map((c: any) => ({
        code: (c.code || '').toUpperCase().replace(/\s+/g, '_'),
        label: c.label || '',
        total: Number(c.total) || 0,
        millesimi_table_id: defaultMTableId,
      }));

      setCategories(mapped);

      if (result.year) setBudgetYear(result.year);
      if (result.period_type === 'custom') {
        setBudgetType('custom');
        if (typeof result.start_month === 'number') setBudgetStartMonth(result.start_month);
      }
      if (result.notes) setParseNotes(result.notes);

      setStep('preview');
    } catch (err: any) {
      console.error(err);
      setParseError('Failed to process the file. Please try again.');
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const totalAmount = categories.reduce((s, c) => s + c.total, 0);

  const updateCat = (idx: number, field: keyof ImportedCategory, value: string | number) => {
    setCategories(prev => prev.map((c, i) =>
      i === idx ? { ...c, [field]: field === 'total' ? (Number(value) || 0) : value } : c
    ));
  };

  const removeCat = (idx: number) => setCategories(prev => prev.filter((_, i) => i !== idx));

  const addCat = () => setCategories(prev => [
    ...prev,
    { code: '', label: '', total: 0, millesimi_table_id: buildingMTables[0]?.id || '' },
  ]);

  const handleSave = async () => {
    if (categories.length === 0 || categories.some(c => !c.code || !c.millesimi_table_id)) {
      toast.error('Please fill in all category codes and millesimi table assignments.');
      return;
    }

    setIsSaving(true);
    try {
      const startDate = budgetType === 'calendar'
        ? `${budgetYear}-01-01`
        : `${budgetYear}-${String(budgetStartMonth + 1).padStart(2, '0')}-01`;
      const endDate = budgetType === 'calendar'
        ? `${budgetYear}-12-31`
        : (() => {
            const d = new Date(budgetYear, budgetStartMonth + 12, 0);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          })();

      const { data: budgetData, error: budgetErr } = await supabase.from('building_budgets').insert({
        building_id: selectedBuilding,
        year: budgetYear,
        total_amount: totalAmount,
        created_by: userId,
        start_date: startDate,
        end_date: endDate,
      }).select().single();
      if (budgetErr) throw budgetErr;

      const cats = categories.map(c => ({
        budget_id: budgetData.id,
        millesimi_table_id: c.millesimi_table_id,
        code: c.code.toUpperCase().replace(/\s+/g, '_'),
        label: c.label,
        total: c.total,
      }));
      const { error: catErr } = await supabase.from('budget_categories').insert(cats);
      if (catErr) throw catErr;

      toast.success(`Budget imported with ${categories.length} categories`);
      handleClose();
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save budget');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Budget
          </DialogTitle>
          <DialogDescription>
            {step === 'upload'
              ? 'Upload a PDF or Excel file containing your budget. We\'ll extract categories and amounts automatically.'
              : `Imported ${categories.length} categories totaling €${totalAmount.toLocaleString()}. Review and edit before saving.`}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4 py-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
              onClick={() => !isParsing && fileInputRef.current?.click()}
            >
              {isParsing ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <div>
                    <p className="font-medium">Analyzing {fileName}...</p>
                    <p className="text-sm text-muted-foreground">Extracting budget categories and amounts</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <FileText className="h-10 w-10 text-muted-foreground/50" />
                  <div>
                    <p className="font-medium">Click to upload a budget file</p>
                    <p className="text-sm text-muted-foreground">Supports PDF and Excel (.xlsx) files up to 20MB</p>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.xlsx,.xls"
                className="hidden"
                onChange={handleFileSelect}
                disabled={isParsing}
              />
            </div>

            {parseError && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{parseError}</span>
              </div>
            )}
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4 py-2">
            {/* Summary badge */}
            <div className="flex items-center gap-2 rounded-md bg-primary/10 p-3 text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              <span className="text-foreground">
                Extracted <strong>{categories.length}</strong> categories totaling{' '}
                <strong>€{totalAmount.toLocaleString()}</strong> from <em>{fileName}</em>
              </span>
            </div>

            {parseNotes && (
              <div className="flex items-start gap-2 rounded-md bg-muted p-3 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{parseNotes}</span>
              </div>
            )}

            {/* Budget period config */}
            <div className="space-y-3">
              <Label className="font-medium">Budget Period</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={budgetType === 'calendar'} onChange={() => setBudgetType('calendar')} className="accent-primary" />
                  <span className="text-sm">Calendar Year</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={budgetType === 'custom'} onChange={() => setBudgetType('custom')} className="accent-primary" />
                  <span className="text-sm">Custom Period</span>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {budgetType === 'calendar' ? (
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Year</Label>
                    <Input type="number" value={budgetYear} onChange={e => setBudgetYear(parseInt(e.target.value))} />
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">Start Month</Label>
                      <Select value={String(budgetStartMonth)} onValueChange={v => setBudgetStartMonth(parseInt(v))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Start Year</Label>
                      <Input type="number" value={budgetYear} onChange={e => setBudgetYear(parseInt(e.target.value))} />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Categories table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-medium">Categories</Label>
                <Button size="sm" variant="outline" onClick={addCat}>
                  <Plus className="mr-1 h-3 w-3" />Add
                </Button>
              </div>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Millesimi Table</TableHead>
                      <TableHead className="text-right">Amount (€)</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((cat, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Input
                            value={cat.label}
                            onChange={e => updateCat(idx, 'label', e.target.value)}
                            className="h-8"
                            placeholder="Category name"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={cat.code}
                            onChange={e => updateCat(idx, 'code', e.target.value)}
                            className="h-8 w-24"
                            placeholder="CODE"
                          />
                        </TableCell>
                        <TableCell>
                          <Select value={cat.millesimi_table_id} onValueChange={v => updateCat(idx, 'millesimi_table_id', v)}>
                            <SelectTrigger className="h-8"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              {buildingMTables.map(mt => (
                                <SelectItem key={mt.id} value={mt.id}>{mt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            step="0.01"
                            value={cat.total}
                            onChange={e => updateCat(idx, 'total', e.target.value)}
                            className="h-8 w-28 ml-auto text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" onClick={() => removeCat(idx)} className="h-8 w-8">
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="text-sm text-muted-foreground text-right">
                Total: <span className="font-medium text-foreground">€{totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === 'preview' && (
            <Button variant="outline" onClick={() => { setStep('upload'); setCategories([]); setParseError(''); }} disabled={isSaving}>
              Upload Different File
            </Button>
          )}
          <Button variant="outline" onClick={handleClose} disabled={isParsing || isSaving}>
            Cancel
          </Button>
          {step === 'preview' && (
            <Button
              onClick={handleSave}
              disabled={isSaving || categories.length === 0 || categories.some(c => !c.code || !c.millesimi_table_id)}
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Budget
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
