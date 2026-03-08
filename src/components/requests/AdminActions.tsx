import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  Save, CheckCircle, XCircle, ArrowRightCircle, Trash2,
  FileText, Search, CalendarCheck, CalendarIcon, Clock, Hourglass, Star, User, CreditCard,
} from 'lucide-react';
import { format } from 'date-fns';
import { useProviders } from '@/hooks/useProviders';
import type { UnifiedRequestStatus } from '@/types/requests';
import type { RequestFormData } from './RequestForm';

interface Props {
  request: any;
  form: RequestFormData;
  onUpdate: (field: string, value: any) => void;
  onStatusChange: (status: UnifiedRequestStatus) => void;
  onConvertToIntervention: () => void;
  onSaveAdmin: () => void;
  onDelete: () => void;
}

export function AdminActions({
  request, form, onUpdate, onStatusChange, onConvertToIntervention, onSaveAdmin, onDelete,
}: Props) {
  const showScheduler = ['in_review', 'quoted', 'waiting_approval', 'intervention'].includes(request.status);
  const { providers } = useProviders(form.category);

  // Find preferred provider name
  const preferredProvider = request.preferred_provider_id
    ? providers.find((p: any) => p.id === request.preferred_provider_id)
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Actions</CardTitle>
        <CardDescription>Manage this request</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Internal notes */}
        <div className="space-y-2">
          <Label>Internal Notes (admin only)</Label>
          <Textarea
            value={form.internal_notes}
            onChange={(e) => onUpdate('internal_notes', e.target.value)}
            rows={3}
            placeholder="Notes visible only to administrators..."
          />
        </div>

        {/* Provider & amount */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Estimated Amount (€)</Label>
            <Input
              type="number"
              value={form.estimated_amount}
              onChange={(e) => onUpdate('estimated_amount', e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <Label>Assign Provider / Vendor</Label>
            {preferredProvider && (
              <div className="flex items-center gap-1.5 text-xs text-primary mb-1 p-1.5 rounded bg-primary/5 border border-primary/20">
                <User className="h-3 w-3" />
                Resident prefers: <span className="font-medium">{preferredProvider.name}</span>
                <span className="flex items-center gap-0.5 ml-1">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {Number(preferredProvider.rating).toFixed(1)}
                </span>
              </div>
            )}
            <Select
              value={form.assigned_provider_id || 'none'}
              onValueChange={(v) => {
                const selected = providers.find((p: any) => p.id === v);
                onUpdate('assigned_provider_id', v === 'none' ? '' : v);
                onUpdate('provider', selected ? selected.name : '');
              }}
            >
              <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No provider assigned</SelectItem>
                {providers.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-2">
                      {p.name}
                      {p.id === request.preferred_provider_id && (
                        <span className="text-xs text-primary">(preferred)</span>
                      )}
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
        </div>

        {/* Schedule date & time picker */}
        {showScheduler && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4" /> Schedule Intervention
            </Label>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !form.scheduled_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.scheduled_date ? format(form.scheduled_date, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.scheduled_date || undefined}
                      onSelect={(d) => onUpdate('scheduled_date', d || null)}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Select value={form.scheduled_hour} onValueChange={(v) => onUpdate('scheduled_hour', v)}>
                  <SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(h => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-muted-foreground font-bold">:</span>
                <Select value={form.scheduled_minute} onValueChange={(v) => onUpdate('scheduled_minute', v)}>
                  <SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['00', '15', '30', '45'].map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {request.scheduled_date && (
              <p className="text-sm text-muted-foreground">
                Currently scheduled: {format(new Date(request.scheduled_date), 'PPP')} at {format(new Date(request.scheduled_date), 'HH:mm')}
              </p>
            )}
          </div>
        )}

        <Separator />

        {/* Status action buttons */}
        <div className="flex flex-wrap gap-2">
          {request.status === 'submitted' && (
            <Button variant="outline" onClick={() => onStatusChange('in_review')}>
              <Search className="mr-2 h-4 w-4" /> Mark In Review
            </Button>
          )}

          {request.status === 'in_review' && (
            <>
              <Button variant="outline" onClick={() => onStatusChange('quoted')}>
                <FileText className="mr-2 h-4 w-4" /> Send Quotation
              </Button>
              <Button onClick={onConvertToIntervention}>
                <ArrowRightCircle className="mr-2 h-4 w-4" /> Convert to Intervention
              </Button>
            </>
          )}

          {request.status === 'quoted' && (
            <Button variant="outline" onClick={() => onStatusChange('waiting_approval')}>
              <Hourglass className="mr-2 h-4 w-4" /> Send for Approval
            </Button>
          )}

          {request.status === 'waiting_approval' && (
            <>
              <Button onClick={onConvertToIntervention}>
                <ArrowRightCircle className="mr-2 h-4 w-4" /> Convert to Intervention
              </Button>
              <Button variant="outline" onClick={() => onStatusChange('quoted')}>
                <FileText className="mr-2 h-4 w-4" /> Back to Quoted
              </Button>
              <Button variant="outline" onClick={() => onStatusChange('in_review')}>
                <Search className="mr-2 h-4 w-4" /> Back to Review
              </Button>
            </>
          )}

          {request.status === 'intervention' && (
            <Button
              onClick={() => onStatusChange('ready_for_payment')}
              className="bg-warning hover:bg-warning/90 text-warning-foreground"
            >
              <CreditCard className="mr-2 h-4 w-4" /> Ready for Payment
            </Button>
          )}

          {request.status === 'ready_for_payment' && (
            <Button
              onClick={() => onStatusChange('completed')}
              className="bg-success hover:bg-success/90 text-success-foreground"
            >
              <CheckCircle className="mr-2 h-4 w-4" /> Mark Completed
            </Button>
          )}

          {['submitted', 'in_review', 'quoted', 'waiting_approval', 'intervention', 'ready_for_payment'].includes(request.status) && (
            <Button variant="destructive" onClick={() => onStatusChange('rejected')}>
              <XCircle className="mr-2 h-4 w-4" /> Reject
            </Button>
          )}

          {!['completed', 'rejected'].includes(request.status) && (
            <Button variant="outline" onClick={onSaveAdmin}>
              <Save className="mr-2 h-4 w-4" /> Save Changes
            </Button>
          )}

          <Button variant="ghost" className="text-destructive ml-auto" onClick={onDelete}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
