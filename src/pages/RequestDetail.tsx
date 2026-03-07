import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, Save, Send, CheckCircle, XCircle, ArrowRightCircle, Trash2,
  FileText, Wrench, Loader2, CalendarCheck, PlayCircle, CalendarIcon, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { RequestStatusBadge } from '@/components/requests/RequestStatusBadge';
import { RequestTypeBadge } from '@/components/requests/RequestTypeBadge';
import { CATEGORIES, PRIORITIES, REQUEST_TYPES } from '@/types/requests';
import type { UnifiedRequestType, MaintenanceCategory, UnifiedRequestStatus } from '@/types/requests';

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const isNew = !id || id === 'new';

  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const [buildings, setBuildings] = useState<{ id: string; name: string }[]>([]);
  const [units, setUnits] = useState<{ id: string; unit_number: string }[]>([]);

  const [form, setForm] = useState({
    building_id: '',
    unit_id: '',
    request_type: 'intervention' as UnifiedRequestType,
    title: '',
    description: '',
    category: 'general' as MaintenanceCategory,
    priority: 2,
    estimated_amount: '',
    provider: '',
    internal_notes: '',
    scheduled_date: null as Date | null,
    scheduled_hour: '09',
    scheduled_minute: '00',
  });

  const isOwner = request?.created_by === user?.id;
  const isNewStatus = !request || request.status === 'new';
  const canEdit = isNew || (isOwner && isNewStatus);
  const canAdminEdit = isAdmin && !!request;

  useEffect(() => {
    fetchBuildings();
    if (!isNew) fetchRequest();
  }, [id]);

  useEffect(() => {
    if (form.building_id) fetchUnits(form.building_id);
  }, [form.building_id]);

  const fetchBuildings = async () => {
    const { data } = await supabase.from('buildings').select('id, name').order('name');
    setBuildings(data || []);
  };

  const fetchUnits = async (buildingId: string) => {
    const { data } = await supabase.from('units').select('id, unit_number').eq('building_id', buildingId).order('unit_number');
    setUnits(data || []);
  };

  const fetchRequest = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('unified_requests' as any)
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      toast.error('Request not found');
      navigate('/requests');
      return;
    }

    const d = data as any;
    setRequest(d);
    const scheduledDate = d.scheduled_date ? new Date(d.scheduled_date) : null;
    setForm({
      building_id: d.building_id,
      unit_id: d.unit_id,
      request_type: d.request_type,
      title: d.title,
      description: d.description || '',
      category: d.category,
      priority: d.priority,
      estimated_amount: d.estimated_amount?.toString() || '',
      provider: d.provider || '',
      internal_notes: d.internal_notes || '',
      scheduled_date: scheduledDate,
      scheduled_hour: scheduledDate ? format(scheduledDate, 'HH') : '09',
      scheduled_minute: scheduledDate ? format(scheduledDate, 'mm') : '00',
    });
    setLoading(false);
  };

  const handleSave = async (submit = false) => {
    if (!form.title.trim() || !form.building_id || !form.unit_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    const payload: any = {
      building_id: form.building_id,
      unit_id: form.unit_id,
      request_type: form.request_type,
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category,
      priority: form.priority,
      estimated_amount: form.estimated_amount ? parseFloat(form.estimated_amount) : null,
      provider: form.provider.trim() || null,
      ...(submit ? { status: 'new' } : {}),
    };

    if (isNew) {
      payload.created_by = user?.id;
      payload.status = 'new';
      const { data, error } = await supabase
        .from('unified_requests' as any)
        .insert(payload)
        .select()
        .single();
      if (error) {
        toast.error('Failed to create request');
        console.error(error);
      } else {
        toast.success('Request created!');
        navigate(`/requests/${(data as any).id}`);
      }
    } else {
      const { error } = await supabase
        .from('unified_requests' as any)
        .update(payload)
        .eq('id', id);
      if (error) {
        toast.error('Failed to update');
        console.error(error);
      } else {
        toast.success('Request updated');
        fetchRequest();
      }
    }
    setSaving(false);
  };

  const buildScheduledDatetime = (): string | null => {
    if (!form.scheduled_date) return null;
    const d = new Date(form.scheduled_date);
    d.setHours(parseInt(form.scheduled_hour), parseInt(form.scheduled_minute), 0, 0);
    return d.toISOString();
  };

  const handleStatusChange = async (newStatus: UnifiedRequestStatus) => {
    if (newStatus === 'scheduled' && !form.scheduled_date) {
      toast.error('Please select a scheduled date and time first');
      return;
    }
    const updatePayload: any = { status: newStatus };
    if (isAdmin) {
      updatePayload.internal_notes = form.internal_notes.trim() || null;
      updatePayload.estimated_amount = form.estimated_amount ? parseFloat(form.estimated_amount) : null;
      updatePayload.provider = form.provider.trim() || null;
    }
    if (newStatus === 'scheduled') updatePayload.scheduled_date = buildScheduledDatetime();
    if (newStatus === 'completed') updatePayload.completed_at = new Date().toISOString();

    const { error } = await supabase
      .from('unified_requests' as any)
      .update(updatePayload)
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
      console.error(error);
    } else {
      toast.success(`Status changed to ${newStatus.replace('_', ' ')}`);
      fetchRequest();
    }
  };

  const handleConvertToIntervention = async () => {
    const { error } = await supabase
      .from('unified_requests' as any)
      .update({
        request_type: 'intervention',
        status: 'approved',
        internal_notes: form.internal_notes.trim() || null,
        estimated_amount: form.estimated_amount ? parseFloat(form.estimated_amount) : null,
        provider: form.provider.trim() || null,
      })
      .eq('id', id);

    if (error) {
      toast.error('Conversion failed');
      console.error(error);
    } else {
      toast.success('Quotation converted to intervention!');
      fetchRequest();
    }
  };

  const handleDelete = async () => {
    const { error } = await supabase.from('unified_requests' as any).delete().eq('id', id);
    if (error) toast.error('Failed to delete');
    else {
      toast.success('Request deleted');
      navigate('/requests');
    }
  };

  const updateField = (field: string, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/requests')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">
              {isNew ? 'New Request' : request?.title}
            </h1>
            {request && (
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <RequestTypeBadge type={request.request_type} />
                <RequestStatusBadge status={request.status} />
                <span className="text-sm text-muted-foreground">
                  Created {format(new Date(request.created_at), 'MMM d, yyyy')}
                </span>
                {request.scheduled_date && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <CalendarCheck className="h-3.5 w-3.5" />
                    Scheduled: {format(new Date(request.scheduled_date), 'MMM d, yyyy')} at {format(new Date(request.scheduled_date), 'HH:mm')}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Request Type Selection (only on new) */}
        {isNew && (
          <Card>
            <CardHeader>
              <CardTitle>Request Type</CardTitle>
              <CardDescription>What kind of request is this?</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={form.request_type}
                onValueChange={(v) => updateField('request_type', v)}
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
                  onValueChange={(v) => { updateField('building_id', v); updateField('unit_id', ''); }}
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
                  onValueChange={(v) => updateField('unit_id', v)}
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
                onChange={(e) => updateField('title', e.target.value)}
                disabled={!canEdit}
                placeholder="Brief description of the issue or need"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                disabled={!canEdit}
                rows={4}
                placeholder="Detailed description..."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={(v) => updateField('category', v)} disabled={!canEdit}>
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
                  onValueChange={(v) => updateField('priority', parseInt(v))}
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

            {/* Cost info (read-only for non-admins) */}
            {!isNew && (form.estimated_amount || form.provider) && !isAdmin && (
              <div className="grid gap-4 sm:grid-cols-2">
                {form.estimated_amount && (
                  <div className="space-y-2">
                    <Label>Estimated Amount</Label>
                    <Input type="number" value={form.estimated_amount} disabled placeholder="0.00" />
                  </div>
                )}
                {form.provider && (
                  <div className="space-y-2">
                    <Label>Provider / Vendor</Label>
                    <Input value={form.provider} disabled />
                  </div>
                )}
              </div>
            )}

            {/* Save actions */}
            {canEdit && (
              <div className="flex gap-2 pt-2">
                <Button onClick={() => handleSave(false)} disabled={saving} variant="outline">
                  <Save className="mr-2 h-4 w-4" /> Save
                </Button>
                <Button onClick={() => handleSave(true)} disabled={saving}>
                  <Send className="mr-2 h-4 w-4" /> Submit Request
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Admin Actions */}
        {isAdmin && request && (
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
                  onChange={(e) => updateField('internal_notes', e.target.value)}
                  rows={3}
                  placeholder="Notes visible only to administrators..."
                />
              </div>

              {/* Provider & amount (editable by admin for interventions too) */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Estimated Amount</Label>
                  <Input
                    type="number"
                    value={form.estimated_amount}
                    onChange={(e) => updateField('estimated_amount', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Assign Provider / Vendor</Label>
                  <Input
                    value={form.provider}
                    onChange={(e) => updateField('provider', e.target.value)}
                    placeholder="Staff or vendor name"
                  />
                </div>
              </div>

              {/* Schedule date & time picker */}
              {['approved', 'scheduled'].includes(request.status) && (
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
                            onSelect={(d) => updateField('scheduled_date', d || null)}
                            disabled={(date) => date < new Date()}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <Select value={form.scheduled_hour} onValueChange={(v) => updateField('scheduled_hour', v)}>
                        <SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(h => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-muted-foreground font-bold">:</span>
                      <Select value={form.scheduled_minute} onValueChange={(v) => updateField('scheduled_minute', v)}>
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
                {request.status === 'new' && (
                  <Button variant="outline" onClick={() => handleStatusChange('in_review')}>
                    Mark In Review
                  </Button>
                )}

                {request.status === 'in_review' && request.request_type === 'quotation' && (
                  <Button variant="outline" onClick={() => handleStatusChange('quotation_sent')}>
                    <FileText className="mr-2 h-4 w-4" /> Quotation Sent
                  </Button>
                )}

                {['new', 'in_review', 'quotation_sent'].includes(request.status) && (
                  <>
                    <Button
                      onClick={() => handleStatusChange('approved')}
                      className="bg-success hover:bg-success/90 text-success-foreground"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" /> Approve
                    </Button>
                    <Button variant="destructive" onClick={() => handleStatusChange('rejected')}>
                      <XCircle className="mr-2 h-4 w-4" /> Reject
                    </Button>
                  </>
                )}

                {request.status === 'approved' && (
                  <>
                    <Button variant="outline" onClick={() => handleStatusChange('scheduled')}>
                      <CalendarCheck className="mr-2 h-4 w-4" /> Schedule
                    </Button>
                    <Button onClick={() => handleStatusChange('in_progress')}>
                      <PlayCircle className="mr-2 h-4 w-4" /> Start Work
                    </Button>
                  </>
                )}

                {request.status === 'scheduled' && (
                  <Button onClick={() => handleStatusChange('in_progress')}>
                    <PlayCircle className="mr-2 h-4 w-4" /> Start Work
                  </Button>
                )}

                {request.status === 'in_progress' && (
                  <Button
                    onClick={() => handleStatusChange('completed')}
                    className="bg-success hover:bg-success/90 text-success-foreground"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" /> Mark Completed
                  </Button>
                )}

                {/* Convert quotation → intervention */}
                {request.request_type === 'quotation' && request.status === 'approved' && (
                  <Button onClick={handleConvertToIntervention} variant="default">
                    <ArrowRightCircle className="mr-2 h-4 w-4" /> Convert to Intervention
                  </Button>
                )}

                {/* Save admin changes without status change */}
                <Button variant="outline" onClick={() => {
                  const payload: any = {
                    internal_notes: form.internal_notes.trim() || null,
                    estimated_amount: form.estimated_amount ? parseFloat(form.estimated_amount) : null,
                    provider: form.provider.trim() || null,
                    scheduled_date: buildScheduledDatetime(),
                  };
                  supabase.from('unified_requests' as any).update(payload).eq('id', id).then(({ error }: any) => {
                    if (error) toast.error('Failed to save');
                    else { toast.success('Saved'); fetchRequest(); }
                  });
                }}>
                  <Save className="mr-2 h-4 w-4" /> Save Changes
                </Button>

                <Button variant="ghost" className="text-destructive ml-auto" onClick={handleDelete}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
