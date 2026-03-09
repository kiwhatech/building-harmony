import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, CalendarCheck } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { RequestStatusBadge } from '@/components/requests/RequestStatusBadge';
import { RequestTypeBadge } from '@/components/requests/RequestTypeBadge';
import { RequestForm, type RequestFormData } from '@/components/requests/RequestForm';
import { AdminActions } from '@/components/requests/AdminActions';
import { ResidentApproval } from '@/components/requests/ResidentApproval';
import { RequestTimeline } from '@/components/requests/RequestTimeline';
import { RequestCompletedCard } from '@/components/requests/RequestCompletedCard';
import { InterventionPaymentCard } from '@/components/requests/InterventionPaymentCard';
import { RequestPaymentStatus } from '@/components/requests/RequestPaymentStatus';
import { ProviderRating } from '@/components/requests/ProviderRating';
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

  const [form, setForm] = useState<RequestFormData>({
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
    scheduled_date: null,
    scheduled_hour: '09',
    scheduled_minute: '00',
    preferred_provider_id: '',
    assigned_provider_id: '',
  });

  const isOwner = request?.created_by === user?.id;
  const isDraft = !request || request.status === 'draft';
  const canEdit = isNew || (isOwner && isDraft);

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
      preferred_provider_id: d.preferred_provider_id || '',
      assigned_provider_id: d.assigned_provider_id || '',
    });
    setLoading(false);
  };

  const updateField = (field: string, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const buildScheduledDatetime = (): string | null => {
    if (!form.scheduled_date) return null;
    const d = new Date(form.scheduled_date);
    d.setHours(parseInt(form.scheduled_hour), parseInt(form.scheduled_minute), 0, 0);
    return d.toISOString();
  };

  const logActivity = async (
    requestId: string,
    type: string,
    opts?: { oldStatus?: string; newStatus?: string; message?: string }
  ) => {
    if (!user) return;
    await supabase.from('request_activities' as any).insert({
      request_id: requestId,
      user_id: user.id,
      activity_type: type,
      old_status: opts?.oldStatus || null,
      new_status: opts?.newStatus || null,
      message: opts?.message || null,
    } as any);
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
      preferred_provider_id: form.preferred_provider_id || null,
      ...(submit ? { status: 'submitted' } : {}),
    };

    if (isNew) {
      payload.created_by = user?.id;
      payload.status = submit ? 'submitted' : 'draft';
      const { data, error } = await supabase
        .from('unified_requests' as any)
        .insert(payload)
        .select()
        .single();
      if (error) {
        toast.error('Failed to create request');
        console.error(error);
      } else {
        const newId = (data as any).id;
        await logActivity(newId, 'created', { message: submit ? 'Request created and submitted' : 'Draft created' });
        if (submit) {
          await logActivity(newId, 'status_change', { oldStatus: 'draft', newStatus: 'submitted' });
        }
        toast.success(submit ? 'Request submitted!' : 'Draft saved!');
        navigate(`/requests/${newId}`);
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
        if (submit && request?.status === 'draft') {
          await logActivity(id!, 'status_change', { oldStatus: 'draft', newStatus: 'submitted' });
        }
        toast.success(submit ? 'Request submitted!' : 'Request updated');
        fetchRequest();
      }
    }
    setSaving(false);
  };

  const handleStatusChange = async (newStatus: UnifiedRequestStatus) => {
    if (newStatus === 'intervention' && !form.scheduled_date) {
      toast.error('Please select a scheduled date and time first');
      return;
    }
    const oldStatus = request.status;
    const updatePayload: any = { status: newStatus };

    if (isAdmin) {
      updatePayload.internal_notes = form.internal_notes.trim() || null;
      updatePayload.estimated_amount = form.estimated_amount ? parseFloat(form.estimated_amount) : null;
      updatePayload.provider = form.provider.trim() || null;
      updatePayload.assigned_provider_id = form.assigned_provider_id || null;
    }
    if (newStatus === 'intervention') updatePayload.scheduled_date = buildScheduledDatetime();
    if (newStatus === 'completed') updatePayload.completed_at = new Date().toISOString();

    const { error } = await supabase
      .from('unified_requests' as any)
      .update(updatePayload)
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
      console.error(error);
    } else {
      await logActivity(id!, 'status_change', { oldStatus, newStatus });

      // Log specific activity types
      if (newStatus === 'quoted') await logActivity(id!, 'quotation_sent');
      if (newStatus === 'waiting_approval' && oldStatus === 'quoted') {
        await logActivity(id!, 'quotation_approved', { message: 'Resident approved the quotation' });
      }
      if (newStatus === 'rejected' && ['quoted', 'waiting_approval'].includes(oldStatus)) {
        await logActivity(id!, 'quotation_rejected', { message: 'Quotation was rejected' });
      }

      // Auto-create payment record when moving to ready_for_payment
      if (newStatus === 'ready_for_payment') {
        const amount = form.estimated_amount ? parseFloat(form.estimated_amount) : 0;
        if (amount > 0) {
          const { error: payErr } = await supabase.from('payments').insert({
            request_id: id,
            amount,
            status: 'pending_confirmation',
            payment_type: 'intervention',
            currency: 'EUR',
            created_by: user?.id,
            metadata: { title: request.title, request_type: request.request_type },
          } as any);
          if (payErr) console.error('Failed to create payment record:', payErr);
        }
      }

      // Auto-mark payment as succeeded when completing request
      if (newStatus === 'completed') {
        await supabase
          .from('payments')
          .update({ status: 'succeeded', updated_at: new Date().toISOString() })
          .eq('request_id', id)
          .neq('status', 'succeeded');
      }

      toast.success(`Status changed to ${newStatus.replace(/_/g, ' ')}`);
      fetchRequest();
    }
  };

  const handleConvertToIntervention = async () => {
    if (!form.scheduled_date) {
      toast.error('Please select a scheduled date and time first');
      return;
    }
    const oldStatus = request.status;
    const { error } = await supabase
      .from('unified_requests' as any)
      .update({
        request_type: 'intervention',
        status: 'intervention',
        scheduled_date: buildScheduledDatetime(),
        internal_notes: form.internal_notes.trim() || null,
        estimated_amount: form.estimated_amount ? parseFloat(form.estimated_amount) : null,
        provider: form.provider.trim() || null,
      })
      .eq('id', id);

    if (error) {
      toast.error('Conversion failed');
      console.error(error);
    } else {
      await logActivity(id!, 'status_change', { oldStatus, newStatus: 'intervention', message: 'Converted to intervention' });
      toast.success('Converted to intervention!');
      fetchRequest();
    }
  };

  const handleSaveAdmin = async () => {
    const payload: any = {
      internal_notes: form.internal_notes.trim() || null,
      estimated_amount: form.estimated_amount ? parseFloat(form.estimated_amount) : null,
      provider: form.provider.trim() || null,
      assigned_provider_id: form.assigned_provider_id || null,
      scheduled_date: buildScheduledDatetime(),
    };
    const { error } = await supabase.from('unified_requests' as any).update(payload).eq('id', id);
    if (error) toast.error('Failed to save');
    else { toast.success('Saved'); fetchRequest(); }
  };

  const handleDelete = async () => {
    const { error } = await supabase.from('unified_requests' as any).delete().eq('id', id);
    if (error) toast.error('Failed to delete');
    else {
      toast.success('Request deleted');
      navigate('/requests');
    }
  };

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

        {/* Resident Approval (prominent placement) */}
        {!isAdmin && isOwner && request && ['quoted', 'waiting_approval'].includes(request.status) && (
          <ResidentApproval
            request={request}
            estimatedAmount={form.estimated_amount}
            provider={form.provider}
            onStatusChange={handleStatusChange}
          />
        )}

        {/* Resident Payment Card (only if no payment exists yet) */}
        {!isAdmin && isOwner && request?.status === 'ready_for_payment' && (
          <InterventionPaymentCard
            request={request}
            estimatedAmount={form.estimated_amount}
          />
        )}

        {/* Payment Status Tracking */}
        {request && ['ready_for_payment', 'completed'].includes(request.status) && (
          <RequestPaymentStatus
            requestId={request.id}
            isAdmin={isAdmin}
            onPaymentCompleted={fetchRequest}
          />
        )}

        {/* Request Form */}
        <RequestForm
          form={form}
          onUpdate={updateField}
          buildings={buildings}
          units={units}
          canEdit={canEdit}
          isNew={isNew}
          isAdmin={isAdmin}
          saving={saving}
          onSave={handleSave}
          onDelete={!isNew ? handleDelete : undefined}
        />

        {/* Admin Actions */}
        {isAdmin && request && (
          <AdminActions
            request={request}
            form={form}
            onUpdate={updateField}
            onStatusChange={handleStatusChange}
            onConvertToIntervention={handleConvertToIntervention}
            onSaveAdmin={handleSaveAdmin}
            onDelete={handleDelete}
          />
        )}

        {/* Completed / Rejected card */}
        {request && ['completed', 'rejected'].includes(request.status) && (
          <RequestCompletedCard request={request} />
        )}

        {/* Timeline & Comments */}
        {!isNew && id && (
          <RequestTimeline requestId={id} />
        )}
      </div>
    </AppLayout>
  );
}
