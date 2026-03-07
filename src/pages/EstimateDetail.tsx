import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
import { ArrowLeft, Save, Send, CheckCircle, XCircle, ArrowRightCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { EstimateStatusBadge } from '@/components/estimates/EstimateStatusBadge';
import { ESTIMATE_CATEGORIES, ESTIMATE_PRIORITIES } from '@/types/estimates';
import type { EstimateRequest, EstimateCategory, EstimatePriority } from '@/types/estimates';

export default function EstimateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const isNew = !id || id === 'new';

  const [estimate, setEstimate] = useState<EstimateRequest | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  // Form state
  const [buildings, setBuildings] = useState<{ id: string; name: string }[]>([]);
  const [units, setUnits] = useState<{ id: string; unit_number: string }[]>([]);
  const [form, setForm] = useState({
    building_id: '',
    unit_id: '',
    title: '',
    description: '',
    category: 'other' as EstimateCategory,
    priority: 'normal' as EstimatePriority,
    estimated_amount: '',
    provider: '',
    internal_notes: '',
  });

  const isOwner = estimate?.created_by === user?.id;
  const isDraft = !estimate || estimate.status === 'draft';
  const canEdit = isNew || (isOwner && isDraft);
  const canAdminEdit = isAdmin && !!estimate;

  useEffect(() => {
    fetchBuildings();
    if (!isNew) fetchEstimate();
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

  const fetchEstimate = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('estimate_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      toast.error('Estimate not found');
      navigate('/estimates');
      return;
    }

    setEstimate(data);
    setForm({
      building_id: data.building_id,
      unit_id: data.unit_id,
      title: data.title,
      description: data.description || '',
      category: data.category,
      priority: data.priority,
      estimated_amount: data.estimated_amount?.toString() || '',
      provider: data.provider || '',
      internal_notes: data.internal_notes || '',
    });
    setLoading(false);
  };

  const handleSave = async (submitAfter = false) => {
    if (!form.title.trim() || !form.building_id || !form.unit_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    const payload: any = {
      building_id: form.building_id,
      unit_id: form.unit_id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category,
      priority: form.priority,
      estimated_amount: form.estimated_amount ? parseFloat(form.estimated_amount) : null,
      provider: form.provider.trim() || null,
      ...(submitAfter ? { status: 'submitted' } : {}),
    };

    if (isNew) {
      payload.created_by = user?.id;
      const { data, error } = await (supabase as any).from('estimate_requests').insert(payload).select().single();
      if (error) {
        toast.error('Failed to create estimate');
        console.error(error);
      } else {
        toast.success(submitAfter ? 'Estimate submitted!' : 'Estimate saved as draft');
        navigate(`/estimates/${data.id}`);
      }
    } else {
      const { error } = await (supabase as any).from('estimate_requests').update(payload).eq('id', id);
      if (error) {
        toast.error('Failed to update estimate');
        console.error(error);
      } else {
        toast.success('Estimate updated');
        fetchEstimate();
      }
    }
    setSaving(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    const updatePayload: any = { status: newStatus };
    if (isAdmin) {
      updatePayload.internal_notes = form.internal_notes.trim() || null;
      updatePayload.estimated_amount = form.estimated_amount ? parseFloat(form.estimated_amount) : null;
      updatePayload.provider = form.provider.trim() || null;
    }

    const { error } = await (supabase as any).from('estimate_requests').update(updatePayload).eq('id', id);
    if (error) {
      toast.error(`Failed to update status`);
      console.error(error);
    } else {
      toast.success(`Estimate ${newStatus}`);
      fetchEstimate();
    }
  };

  const handleConvert = async () => {
    const { data, error } = await (supabase as any).rpc('convert_estimate_to_request', { _estimate_id: id });
    if (error) {
      toast.error('Conversion failed: ' + error.message);
      console.error(error);
    } else {
      toast.success('Converted to maintenance request!');
      navigate(`/maintenance`);
    }
  };

  const handleDelete = async () => {
    const { error } = await (supabase as any).from('estimate_requests').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete');
    } else {
      toast.success('Estimate deleted');
      navigate('/estimates');
    }
  };

  const updateField = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  if (loading) {
    return (
      <AppLayout>
        <p className="py-12 text-center text-muted-foreground">Loading...</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/estimates')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">
              {isNew ? 'New Estimate Request' : estimate?.title}
            </h1>
            {estimate && (
              <div className="flex items-center gap-2 mt-1">
                <EstimateStatusBadge status={estimate.status} />
                <span className="text-sm text-muted-foreground">
                  Created {format(new Date(estimate.created_at), 'MMM d, yyyy')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>
              {canEdit ? 'Fill in the estimate details' : 'Estimate information'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Building *</Label>
                <Select value={form.building_id} onValueChange={(v) => { updateField('building_id', v); updateField('unit_id', ''); }} disabled={!canEdit}>
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
                <Select value={form.unit_id} onValueChange={(v) => updateField('unit_id', v)} disabled={!canEdit || !form.building_id}>
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
              <Input value={form.title} onChange={(e) => updateField('title', e.target.value)} disabled={!canEdit} placeholder="Brief description of the issue" />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => updateField('description', e.target.value)} disabled={!canEdit} rows={3} placeholder="Detailed description..." />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={(v) => updateField('category', v)} disabled={!canEdit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ESTIMATE_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority *</Label>
                <Select value={form.priority} onValueChange={(v) => updateField('priority', v)} disabled={!canEdit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ESTIMATE_PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Estimated Amount</Label>
                <Input type="number" value={form.estimated_amount} onChange={(e) => updateField('estimated_amount', e.target.value)} disabled={!canEdit && !canAdminEdit} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Provider / Vendor</Label>
                <Input value={form.provider} onChange={(e) => updateField('provider', e.target.value)} disabled={!canEdit && !canAdminEdit} placeholder="Optional" />
              </div>
            </div>

            {/* Save actions for draft/new */}
            {canEdit && (
              <div className="flex gap-2 pt-2">
                <Button onClick={() => handleSave(false)} disabled={saving} variant="outline">
                  <Save className="mr-2 h-4 w-4" /> Save Draft
                </Button>
                <Button onClick={() => handleSave(true)} disabled={saving}>
                  <Send className="mr-2 h-4 w-4" /> Submit
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Admin section */}
        {isAdmin && estimate && (
          <Card>
            <CardHeader>
              <CardTitle>Admin Actions</CardTitle>
              <CardDescription>Review and manage this estimate</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Internal Notes (admin only)</Label>
                <Textarea
                  value={form.internal_notes}
                  onChange={(e) => updateField('internal_notes', e.target.value)}
                  rows={3}
                  placeholder="Notes visible only to administrators..."
                />
              </div>

              <Separator />

              <div className="flex flex-wrap gap-2">
                {estimate.status === 'submitted' && (
                  <Button variant="outline" onClick={() => handleStatusChange('under_review')}>
                    Mark Under Review
                  </Button>
                )}
                {['submitted', 'under_review'].includes(estimate.status) && (
                  <>
                    <Button onClick={() => handleStatusChange('approved')} className="bg-green-600 hover:bg-green-700 text-white">
                      <CheckCircle className="mr-2 h-4 w-4" /> Approve
                    </Button>
                    <Button variant="destructive" onClick={() => handleStatusChange('rejected')}>
                      <XCircle className="mr-2 h-4 w-4" /> Reject
                    </Button>
                  </>
                )}
                {estimate.status === 'approved' && (
                  <Button onClick={handleConvert}>
                    <ArrowRightCircle className="mr-2 h-4 w-4" /> Convert to Maintenance Request
                  </Button>
                )}
                {estimate.status === 'converted' && estimate.linked_request_id && (
                  <Button variant="outline" asChild>
                    <Link to="/maintenance">View Linked Request</Link>
                  </Button>
                )}
                <Button variant="ghost" className="text-destructive ml-auto" onClick={handleDelete}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              </div>

              {/* Admin can also save amount/provider/notes without changing status */}
              {['submitted', 'under_review', 'approved'].includes(estimate.status) && (
                <Button variant="outline" onClick={() => {
                  const payload: any = {
                    internal_notes: form.internal_notes.trim() || null,
                    estimated_amount: form.estimated_amount ? parseFloat(form.estimated_amount) : null,
                    provider: form.provider.trim() || null,
                  };
                  (supabase as any).from('estimate_requests').update(payload).eq('id', id).then(({ error }: any) => {
                    if (error) toast.error('Failed to save');
                    else { toast.success('Saved'); fetchEstimate(); }
                  });
                }}>
                  <Save className="mr-2 h-4 w-4" /> Save Admin Changes
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
