import { useState, useRef, useMemo } from 'react';
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Upload, Loader2, FileText, Trash2, AlertTriangle, CheckCircle2, Building2, Users, Calculator, ArrowRight,
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface Building {
  id: string;
  name: string;
}

interface ParsedUnit {
  unit_number: string;
  owner_name: string | null;
  millesimi_value: number;
  floor: number | null;
  area_sqft: number | null;
}

interface ImportMillesimiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buildings: Building[];
  onSuccess: () => void;
}

type Step = 'select_building' | 'upload' | 'preview' | 'confirm';

export function ImportMillesimiDialog({
  open, onOpenChange, buildings, onSuccess,
}: ImportMillesimiDialogProps) {
  const { t, formatCurrency } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('select_building');
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [parseNotes, setParseNotes] = useState('');

  // Parsed data
  const [units, setUnits] = useState<ParsedUnit[]>([]);
  const [tableCode, setTableCode] = useState('GENERAL');
  const [tableLabel, setTableLabel] = useState('Tabella Generale');

  const selectedBuilding = buildings.find(b => b.id === selectedBuildingId);

  const totalMillesimi = useMemo(() =>
    Math.round(units.reduce((s, u) => s + u.millesimi_value, 0) * 100) / 100,
    [units]
  );

  const resetState = () => {
    setStep('select_building');
    setSelectedBuildingId('');
    setIsParsing(false);
    setIsSaving(false);
    setFileName('');
    setParseError('');
    setParseNotes('');
    setUnits([]);
    setTableCode('GENERAL');
    setTableLabel('Tabella Generale');
  };

  const handleClose = () => {
    if (isParsing || isSaving) return;
    resetState();
    onOpenChange(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 80 * 1024 * 1024) {
      toast.error(t('millesimi.import.fileTooLarge'));
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
        `https://${projectId}.supabase.co/functions/v1/parse-millesimi-file`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${anonKey}` },
          body: formData,
        }
      );

      const result = await response.json();

      if (result.error && (!result.units || result.units.length === 0)) {
        setParseError(result.error);
        setIsParsing(false);
        return;
      }

      if (!result.units || result.units.length === 0) {
        setParseError(t('millesimi.import.noDataExtracted'));
        setIsParsing(false);
        return;
      }

      const mapped: ParsedUnit[] = result.units.map((u: any) => ({
        unit_number: String(u.unit_number || '').trim(),
        owner_name: u.owner_name || null,
        millesimi_value: Number(u.millesimi_value) || 0,
        floor: u.floor != null ? Number(u.floor) : null,
        area_sqft: u.area_sqft != null ? Number(u.area_sqft) : null,
      }));

      setUnits(mapped);
      if (result.table_code) setTableCode(result.table_code);
      if (result.table_label) setTableLabel(result.table_label);
      if (result.notes) setParseNotes(result.notes);

      setStep('preview');
    } catch (err: any) {
      console.error(err);
      setParseError(t('millesimi.import.processingFailed'));
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const updateUnit = (idx: number, field: keyof ParsedUnit, value: string | number | null) => {
    setUnits(prev => prev.map((u, i) => {
      if (i !== idx) return u;
      if (field === 'millesimi_value') return { ...u, [field]: Number(value) || 0 };
      if (field === 'floor') return { ...u, [field]: value != null ? Number(value) : null };
      if (field === 'area_sqft') return { ...u, [field]: value != null ? Number(value) : null };
      return { ...u, [field]: value };
    }));
  };

  const removeUnit = (idx: number) => setUnits(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!selectedBuildingId || units.length === 0) return;
    setIsSaving(true);

    try {
      // 1. Create units
      const unitInserts = units.map(u => ({
        building_id: selectedBuildingId,
        unit_number: u.unit_number,
        floor: u.floor,
        area_sqft: u.area_sqft,
      }));

      const { data: createdUnits, error: unitErr } = await supabase
        .from('units')
        .insert(unitInserts)
        .select('id, unit_number');
      if (unitErr) throw unitErr;

      // 2. Create millesimi table
      const { data: mtData, error: mtErr } = await supabase
        .from('millesimi_tables')
        .insert({
          building_id: selectedBuildingId,
          code: tableCode.toUpperCase().replace(/\s+/g, '_'),
          label: tableLabel,
        })
        .select()
        .single();
      if (mtErr) throw mtErr;

      // 3. Create millesimi values
      const milVals = units.map(u => {
        const created = createdUnits?.find(cu => cu.unit_number === u.unit_number);
        return {
          millesimi_table_id: mtData.id,
          unit_id: created!.id,
          value: u.millesimi_value,
        };
      });

      const { error: mvErr } = await supabase.from('millesimi_values').insert(milVals);
      if (mvErr) throw mvErr;

      // 4. Create residents if owner names are present
      const residentsToInsert = units
        .filter(u => u.owner_name)
        .map(u => {
          const created = createdUnits?.find(cu => cu.unit_number === u.unit_number);
          const nameParts = u.owner_name!.trim().split(/\s+/);
          const surname = nameParts.pop() || '';
          const name = nameParts.join(' ') || surname;
          return {
            unit_id: created!.id,
            name: name || surname,
            surname: nameParts.length > 0 ? surname : '',
            email: '',
            is_owner: true,
          };
        });

      if (residentsToInsert.length > 0) {
        const { error: resErr } = await supabase.from('residents').insert(residentsToInsert);
        if (resErr) console.error('Error creating residents:', resErr);
      }

      toast.success(t('millesimi.import.savedSuccess', { count: units.length }));
      handleClose();
      onSuccess();
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('duplicate key')) {
        toast.error(t('millesimi.import.duplicateUnits'));
      } else {
        toast.error(err.message || t('millesimi.import.saveFailed'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {t('millesimi.import.title')}
          </DialogTitle>
          <DialogDescription>
            {step === 'select_building' && t('millesimi.import.selectBuildingDesc')}
            {step === 'upload' && t('millesimi.import.uploadDesc')}
            {step === 'preview' && t('millesimi.import.previewDesc', { count: units.length })}
            {step === 'confirm' && t('millesimi.import.confirmDesc')}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {(['select_building', 'upload', 'preview', 'confirm'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              {i > 0 && <ArrowRight className="h-3 w-3" />}
              <Badge variant={step === s ? 'default' : 'secondary'} className="text-xs">
                {i + 1}. {t(`millesimi.import.step.${s}`)}
              </Badge>
            </div>
          ))}
        </div>

        {/* Step 1: Select Building */}
        {step === 'select_building' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('common.selectBuilding')}</Label>
              <Select value={selectedBuildingId} onValueChange={setSelectedBuildingId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('common.selectBuilding')} />
                </SelectTrigger>
                <SelectContent>
                  {buildings.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Step 2: Upload */}
        {step === 'upload' && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 rounded-md bg-primary/10 p-3 text-sm">
              <Building2 className="h-4 w-4 text-primary shrink-0" />
              <span>{t('millesimi.import.targetBuilding')}: <strong>{selectedBuilding?.name}</strong></span>
            </div>
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
              onClick={() => !isParsing && fileInputRef.current?.click()}
            >
              {isParsing ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <div>
                    <p className="font-medium">{t('millesimi.import.analyzing', { name: fileName })}</p>
                    <p className="text-sm text-muted-foreground">{t('millesimi.import.extracting')}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <FileText className="h-10 w-10 text-muted-foreground/50" />
                  <div>
                    <p className="font-medium">{t('millesimi.import.clickToUpload')}</p>
                    <p className="text-sm text-muted-foreground">{t('millesimi.import.supportedFormats')}</p>
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

        {/* Step 3: Preview & Edit */}
        {step === 'preview' && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 rounded-md bg-primary/10 p-3 text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              <span>
                {t('millesimi.import.extractedSummary', {
                  count: units.length,
                  total: String(totalMillesimi),
                  file: fileName,
                })}
              </span>
            </div>

            {parseNotes && (
              <div className="flex items-start gap-2 rounded-md bg-muted p-3 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{parseNotes}</span>
              </div>
            )}

            {/* Table metadata */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t('millesimi.import.tableCode')}</Label>
                <Input value={tableCode} onChange={e => setTableCode(e.target.value)} className="h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('millesimi.import.tableLabel')}</Label>
                <Input value={tableLabel} onChange={e => setTableLabel(e.target.value)} className="h-8" />
              </div>
            </div>

            {/* Units table */}
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('millesimi.import.col.unitNumber')}</TableHead>
                    <TableHead>{t('millesimi.import.col.owner')}</TableHead>
                    <TableHead className="text-right">{t('millesimi.import.col.millesimi')}</TableHead>
                    <TableHead className="text-right">{t('millesimi.import.col.percent')}</TableHead>
                    <TableHead className="text-right">{t('millesimi.import.col.floor')}</TableHead>
                    <TableHead className="text-right">{t('millesimi.import.col.area')}</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {units.map((unit, idx) => {
                    const pct = totalMillesimi > 0
                      ? ((unit.millesimi_value / totalMillesimi) * 100).toFixed(2)
                      : '0.00';
                    return (
                      <TableRow key={idx}>
                        <TableCell>
                          <Input
                            value={unit.unit_number}
                            onChange={e => updateUnit(idx, 'unit_number', e.target.value)}
                            className="h-8 w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={unit.owner_name || ''}
                            onChange={e => updateUnit(idx, 'owner_name', e.target.value || null)}
                            className="h-8"
                            placeholder="—"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={unit.millesimi_value}
                            onChange={e => updateUnit(idx, 'millesimi_value', e.target.value)}
                            className="h-8 w-24 ml-auto text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm">
                          {pct}%
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            value={unit.floor ?? ''}
                            onChange={e => updateUnit(idx, 'floor', e.target.value || null)}
                            className="h-8 w-16 ml-auto text-right"
                            placeholder="—"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            step="0.01"
                            value={unit.area_sqft ?? ''}
                            onChange={e => updateUnit(idx, 'area_sqft', e.target.value || null)}
                            className="h-8 w-20 ml-auto text-right"
                            placeholder="—"
                          />
                        </TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" onClick={() => removeUnit(idx)} className="h-8 w-8">
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={2} className="font-medium">{t('millesimi.import.total')}</TableCell>
                    <TableCell className="text-right font-medium">{totalMillesimi}</TableCell>
                    <TableCell className="text-right font-medium">
                      {totalMillesimi > 0 ? '100.00%' : '0.00%'}
                    </TableCell>
                    <TableCell colSpan={3}>
                      {Math.abs(totalMillesimi - 1000) > 0.01 && totalMillesimi > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          ≠ 1000
                        </Badge>
                      )}
                      {Math.abs(totalMillesimi - 1000) <= 0.01 && (
                        <Badge variant="default" className="text-xs">
                          ✓ 1000
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 'confirm' && (
          <div className="space-y-4 py-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50">
                    <Building2 className="h-6 w-6 text-primary" />
                    <span className="text-sm text-muted-foreground">{t('millesimi.import.targetBuilding')}</span>
                    <span className="font-semibold">{selectedBuilding?.name}</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50">
                    <Users className="h-6 w-6 text-primary" />
                    <span className="text-sm text-muted-foreground">{t('millesimi.import.unitsToImport')}</span>
                    <span className="font-semibold">{units.length}</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50">
                    <Calculator className="h-6 w-6 text-primary" />
                    <span className="text-sm text-muted-foreground">{t('millesimi.import.totalMillesimi')}</span>
                    <span className="font-semibold">{totalMillesimi}</span>
                  </div>
                </div>

                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('millesimi.import.col.unitNumber')}</TableHead>
                        <TableHead>{t('millesimi.import.col.owner')}</TableHead>
                        <TableHead className="text-right">{t('millesimi.import.col.millesimi')}</TableHead>
                        <TableHead className="text-right">{t('millesimi.import.col.percent')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {units.map((unit, idx) => {
                        const pct = totalMillesimi > 0
                          ? ((unit.millesimi_value / totalMillesimi) * 100).toFixed(2)
                          : '0.00';
                        return (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{unit.unit_number}</TableCell>
                            <TableCell>{unit.owner_name || '—'}</TableCell>
                            <TableCell className="text-right">{unit.millesimi_value}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{pct}%</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={2} className="font-medium">{t('millesimi.import.total')}</TableCell>
                        <TableCell className="text-right font-medium">{totalMillesimi}</TableCell>
                        <TableCell className="text-right font-medium">100.00%</TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>

                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• {t('millesimi.import.willCreate', { count: units.length })}</p>
                  <p>• {t('millesimi.import.willCreateTable', { label: tableLabel, code: tableCode })}</p>
                  {units.some(u => u.owner_name) && (
                    <p>• {t('millesimi.import.willCreateResidents', { count: units.filter(u => u.owner_name).length })}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step !== 'select_building' && step !== 'confirm' && (
            <Button
              variant="outline"
              onClick={() => {
                if (step === 'upload') setStep('select_building');
                if (step === 'preview') { setStep('upload'); setUnits([]); setParseError(''); }
              }}
              disabled={isParsing || isSaving}
            >
              {t('common.back')}
            </Button>
          )}
          {step === 'confirm' && (
            <Button variant="outline" onClick={() => setStep('preview')} disabled={isSaving}>
              {t('common.back')}
            </Button>
          )}
          <Button variant="outline" onClick={handleClose} disabled={isParsing || isSaving}>
            {t('common.cancel')}
          </Button>

          {step === 'select_building' && (
            <Button onClick={() => setStep('upload')} disabled={!selectedBuildingId}>
              {t('millesimi.import.continue')} <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          )}
          {step === 'preview' && (
            <Button
              onClick={() => setStep('confirm')}
              disabled={units.length === 0 || units.some(u => !u.unit_number)}
            >
              {t('millesimi.import.reviewConfirm')} <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          )}
          {step === 'confirm' && (
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              {t('millesimi.import.saveAll')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
