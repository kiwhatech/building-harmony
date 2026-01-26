import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  Wrench,
  Plus,
  Loader2,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  FileCheck,
  DollarSign,
} from 'lucide-react';
import { format } from 'date-fns';

type RequestStatus = 'requested' | 'under_review' | 'approved' | 'in_progress' | 'completed' | 'paid';
type MaintenanceCategory = 'plumbing' | 'electrical' | 'construction' | 'general';

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string | null;
  category: MaintenanceCategory;
  status: RequestStatus;
  priority: number;
  created_at: string;
  unit_id: string;
  unit_number?: string;
  building_name?: string;
  requested_by_name?: string;
}

interface Unit {
  id: string;
  unit_number: string;
  building_name: string;
}

const statusConfig: Record<RequestStatus, { label: string; icon: typeof Clock; color: string }> = {
  requested: { label: 'Requested', icon: Clock, color: 'bg-muted text-muted-foreground' },
  under_review: { label: 'Under Review', icon: AlertCircle, color: 'bg-warning/10 text-warning' },
  approved: { label: 'Approved', icon: CheckCircle2, color: 'bg-info/10 text-info' },
  in_progress: { label: 'In Progress', icon: PlayCircle, color: 'bg-primary/10 text-primary' },
  completed: { label: 'Completed', icon: FileCheck, color: 'bg-success/10 text-success' },
  paid: { label: 'Paid', icon: DollarSign, color: 'bg-success/10 text-success' },
};

const categoryConfig: Record<MaintenanceCategory, { label: string; color: string }> = {
  plumbing: { label: 'Plumbing', color: 'bg-blue-100 text-blue-700' },
  electrical: { label: 'Electrical', color: 'bg-yellow-100 text-yellow-700' },
  construction: { label: 'Construction', color: 'bg-orange-100 text-orange-700' },
  general: { label: 'General', color: 'bg-gray-100 text-gray-700' },
};

export default function Maintenance() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Form state
  const [unitId, setUnitId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<MaintenanceCategory>('general');
  const [priority, setPriority] = useState('3');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch units with building names
      const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select(`
          id,
          unit_number,
          buildings!inner(name)
        `)
        .order('unit_number');

      if (unitsError) throw unitsError;

      setUnits(
        (unitsData || []).map((unit: any) => ({
          id: unit.id,
          unit_number: unit.unit_number,
          building_name: unit.buildings?.name,
        }))
      );

      // Fetch maintenance requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('maintenance_requests')
        .select(`
          *,
          units!inner(
            unit_number,
            buildings!inner(name)
          ),
          profiles:requested_by(full_name)
        `)
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      setRequests(
        (requestsData || []).map((req: any) => ({
          ...req,
          unit_number: req.units?.unit_number,
          building_name: req.units?.buildings?.name,
          requested_by_name: req.profiles?.full_name,
        }))
      );
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load maintenance requests');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setUnitId('');
    setTitle('');
    setDescription('');
    setCategory('general');
    setPriority('3');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('maintenance_requests').insert({
        unit_id: unitId,
        title,
        description: description || null,
        category,
        priority: parseInt(priority),
        requested_by: user.id,
      });

      if (error) throw error;

      toast.success('Maintenance request submitted successfully');
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error creating request:', error);
      toast.error(error.message || 'Failed to create request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (requestId: string, newStatus: RequestStatus) => {
    try {
      const { error } = await supabase
        .from('maintenance_requests')
        .update({ status: newStatus })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Status updated successfully');
      fetchData();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error(error.message || 'Failed to update status');
    }
  };

  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.unit_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.building_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || request.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AppLayout title="Maintenance" description="Track and manage maintenance requests">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 sm:w-64"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(statusConfig).map(([value, config]) => (
                  <SelectItem key={value} value={value}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button disabled={units.length === 0}>
                <Plus className="mr-2 h-4 w-4" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>New Maintenance Request</DialogTitle>
                  <DialogDescription>
                    Submit a new maintenance request for your unit.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit *</Label>
                    <Select value={unitId} onValueChange={setUnitId} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.building_name} - Unit {unit.unit_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Brief description of the issue"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category *</Label>
                      <Select value={category} onValueChange={(v) => setCategory(v as MaintenanceCategory)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(categoryConfig).map(([value, config]) => (
                            <SelectItem key={value} value={value}>
                              {config.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select value={priority} onValueChange={setPriority}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Low</SelectItem>
                          <SelectItem value="2">Medium-Low</SelectItem>
                          <SelectItem value="3">Medium</SelectItem>
                          <SelectItem value="4">High</SelectItem>
                          <SelectItem value="5">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Provide more details about the issue..."
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting || !unitId}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Request'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Requests List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Wrench className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="mb-2 text-lg font-semibold">No maintenance requests</h3>
              <p className="mb-4 text-center text-muted-foreground">
                {searchQuery || statusFilter !== 'all'
                  ? 'No requests match your filters.'
                  : 'No maintenance requests have been submitted yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredRequests.map((request) => {
              const status = statusConfig[request.status];
              const StatusIcon = status.icon;
              const categoryStyle = categoryConfig[request.category];

              return (
                <Card key={request.id} className="transition-all hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-primary/10 p-2 mt-1">
                          <Wrench className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{request.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {request.building_name} - Unit {request.unit_number}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={categoryStyle.color} variant="secondary">
                          {categoryStyle.label}
                        </Badge>
                        <Badge className={status.color} variant="secondary">
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {status.label}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {request.description && (
                      <p className="mb-4 text-sm text-muted-foreground">{request.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Created {format(new Date(request.created_at), 'MMM d, yyyy')}</span>
                        {request.requested_by_name && (
                          <span>by {request.requested_by_name}</span>
                        )}
                      </div>
                      <Select
                        value={request.status}
                        onValueChange={(value) => updateStatus(request.id, value as RequestStatus)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusConfig).map(([value, config]) => (
                            <SelectItem key={value} value={value}>
                              {config.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
