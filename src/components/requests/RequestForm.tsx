import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Save, Send, Trash2, FileText, Wrench, Star } from 'lucide-react';
import { CATEGORIES, PRIORITIES, REQUEST_TYPES } from '@/types/requests';
import { useProviders } from '@/hooks/useProviders';
import type { UnifiedRequestType, MaintenanceCategory } from '@/types/requests';

export interface RequestFormData {
  building_id: string;
  unit_id: string;
  request_type: UnifiedRequestType;
  title: string;
  description: string;
  category: MaintenanceCategory;
  priority: number;
  estimated_amount: string;
  provider: string;
  internal_notes: string;
  scheduled_date: Date | null;
  scheduled_hour: string;
  scheduled_minute: string;
  preferred_provider_id: string;
}

interface Props {
  form: RequestFormData;
  onUpdate: (field: string, value: any) => void;
  buildings: { id: string; name: string }[];
  units: { id: string; unit_number: string }[];
  canEdit: boolean;
  isNew: boolean;
  isAdmin: boolean;
  saving: boolean;
  onSave: (submit?: boolean) => void;
  onDelete?: () => void;
}

export function RequestForm({
  form, onUpdate, buildings, units, canEdit, isNew, isAdmin, saving, onSave, onDelete,
}: Props) {
  const { providers: categoryProviders } = useProviders(form.category);
  return (
    <>
      {/* Request Type Selection (only on new) */}
      {isNew && (
        <Card>
          <CardHeader>
            <CardTitle>What do you need?</CardTitle>
            <CardDescription>Choose the type of request you'd like to submit</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={form.request_type}
              onValueChange={(v) => onUpdate('request_type', v)}
              className="grid gap-4 sm:grid-cols-2"
            >
              {REQUEST_TYPES.map((t) => {
                const Icon = t.value === 'quotation' ? FileText : Wrench;
                return (
                  <label
                    key={t.value}
                    className={`flex items-start gap-3 rounded-lg border-2 p-4 cursor-pointer transition-all ${
                      form.request_type === t.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/50'
                    }`}
                  >
                    <RadioGroupItem value={t.value} className="mt-1" />
                    <div>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        <span className="font-medium">{t.label}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{t.description}</p>
                    </div>
                  </label>
                );
              })}
            </RadioGroup>

            {form.request_type === 'quotation' && (
              <div className="mt-4 rounded-lg bg-info/5 border border-info/20 p-3">
                <p className="text-sm text-info">
                  💡 Quotation requests will be reviewed by an administrator who can then convert them into an intervention once approved.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Details Form */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>
            {canEdit ? 'Fill in the request details' : 'Request information'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Building *</Label>
              <Select
                value={form.building_id}
                onValueChange={(v) => { onUpdate('building_id', v); onUpdate('unit_id', ''); }}
                disabled={!canEdit}
              >
                <SelectTrigger><SelectValue placeholder="Select building" /></SelectTrigger>
                <SelectContent>
                  {buildings.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unit *</Label>
              <Select
                value={form.unit_id}
                onValueChange={(v) => onUpdate('unit_id', v)}
                disabled={!canEdit || !form.building_id}
              >
                <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.unit_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => onUpdate('title', e.target.value)}
              disabled={!canEdit}
              placeholder="Brief description of the issue or need"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => onUpdate('description', e.target.value)}
              disabled={!canEdit}
              rows={4}
              placeholder="Detailed description..."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={(v) => onUpdate('category', v)} disabled={!canEdit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority *</Label>
              <Select
                value={form.priority.toString()}
                onValueChange={(v) => onUpdate('priority', parseInt(v))}
                disabled={!canEdit}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value.toString()}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preferred Provider (resident - optional) */}
          {canEdit && (
            <div className="space-y-2">
              <Label>Preferred Provider (optional)</Label>
              <p className="text-xs text-muted-foreground">Select your preferred provider for this category</p>
              <Select
                value={form.preferred_provider_id || 'none'}
                onValueChange={(v) => onUpdate('preferred_provider_id', v === 'none' ? '' : v)}
              >
                <SelectTrigger><SelectValue placeholder="No preference" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No preference</SelectItem>
                  {categoryProviders.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        {p.name}
                        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {Number(p.rating).toFixed(1)}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!isNew && !isAdmin && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Estimated Amount</Label>
                <Input
                  type="text"
                  value={form.estimated_amount ? `€ ${parseFloat(form.estimated_amount).toFixed(2)}` : 'Not yet estimated'}
                  disabled
                  className={!form.estimated_amount ? 'text-muted-foreground italic' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label>Provider / Vendor</Label>
                <Input
                  value={form.provider || 'Not yet assigned'}
                  disabled
                  className={!form.provider ? 'text-muted-foreground italic' : ''}
                />
              </div>
            </div>
          )}

          {/* Save actions for draft */}
          {canEdit && (
            <div className="flex gap-2 pt-2">
              <Button onClick={() => onSave(false)} disabled={saving} variant="outline">
                <Save className="mr-2 h-4 w-4" /> Save Draft
              </Button>
              <Button onClick={() => onSave(true)} disabled={saving}>
                <Send className="mr-2 h-4 w-4" /> Submit Request
              </Button>
              {!isNew && onDelete && (
                <Button variant="ghost" className="text-destructive ml-auto" onClick={onDelete}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
