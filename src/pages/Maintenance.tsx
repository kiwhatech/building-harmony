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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
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
  Calendar,
  User,
  Building2,
  Filter,
  X,
  MessageSquare,
  ChevronRight,
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
  updated_at: string;
  unit_id: string;
  unit_number?: string;
  building_id?: string;
  building_name?: string;
  requested_by: string;
  requested_by_name?: string;
  assigned_to?: string | null;
  assigned_to_name?: string;
  completed_at?: string | null;
}

interface Building {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  unit_number: string;
  building_id: string;
  building_name: string;
}

const statusConfig: Record<RequestStatus, { label: string; icon: typeof Clock; color: string }> = {
  requested: { label: 'Open', icon: Clock, color: 'bg-muted text-muted-foreground' },
  under_review: { label: 'Under Review', icon: AlertCircle, color: 'bg-warning/10 text-warning' },
  approved: { label: 'Approved', icon: CheckCircle2, color: 'bg-info/10 text-info' },
  in_progress: { label: 'In Progress', icon: PlayCircle, color: 'bg-primary/10 text-primary' },
  completed: { label: 'Completed', icon: FileCheck, color: 'bg-success/10 text-success' },
  paid: { label: 'Closed', icon: DollarSign, color: 'bg-success/10 text-success' },
};

const categoryConfig: Record<MaintenanceCategory, { label: string; color: string }> = {
  plumbing: { label: 'Plumbing', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  electrical: { label: 'Electrical', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  construction: { label: 'Construction', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  general: { label: 'General', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
};

const priorityConfig: Record<number, { label: string; color: string }> = {
  1: { label: 'Low', color: 'text-muted-foreground' },
  2: { label: 'Medium', color: 'text-info' },
  3: { label: 'High', color: 'text-warning' },
  4: { label: 'Urgent', color: 'text-destructive font-semibold' },
};

export default function Maintenance() {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<Unit[]>([]);
  const [providers, setProviders] = useState<{ id: string; name: string }[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [buildingFilter, setBuildingFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Form state
  const [formBuildingId, setFormBuildingId] = useState('');
  const [formUnitId, setFormUnitId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<MaintenanceCategory>('general');
  const [formPriority, setFormPriority] = useState('2');
  
  // Detail view
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [adminNote, setAdminNote] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (formBuildingId) {
      setFilteredUnits(units.filter(u => u.building_id === formBuildingId));
      setFormUnitId('');
    } else {
      setFilteredUnits([]);
    }
  }, [formBuildingId, units]);

  const fetchData = async () => {
    try {
      // Fetch buildings
      const { data: buildingsData, error: buildingsError } = await supabase
        .from('buildings')
        .select('id, name')
        .order('name');
      
      if (buildingsError) throw buildingsError;
      setBuildings(buildingsData || []);

      // Fetch units with building info
      const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select(`id, unit_number, building_id, buildings!inner(name)`)
        .order('unit_number');

      if (unitsError) throw unitsError;
      setUnits(
        (unitsData || []).map((unit: any) => ({
          id: unit.id,
          unit_number: unit.unit_number,
          building_id: unit.building_id,
          building_name: unit.buildings?.name,
        }))
      );

      // Fetch providers (users with provider role) for admin assignment
      if (isAdmin) {
        const { data: providersData } = await supabase
          .from('profiles')
          .select('id, full_name');
        setProviders((providersData || []).map(p => ({ id: p.id, name: p.full_name || 'Unknown' })));
      }

      // Fetch maintenance requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('maintenance_requests')
        .select(`
          *,
          units!inner(unit_number, building_id, buildings!inner(id, name))
        `)
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      // Fetch profile names for requesters and assignees
      const userIds = new Set<string>();
      (requestsData || []).forEach((req: any) => {
        if (req.requested_by) userIds.add(req.requested_by);
        if (req.assigned_to) userIds.add(req.assigned_to);
      });

      let profilesMap: Record<string, string> = {};
      if (userIds.size > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', Array.from(userIds));
        
        profilesMap = (profilesData || []).reduce((acc: Record<string, string>, p: any) => {
          acc[p.id] = p.full_name || 'Unknown';
          return acc;
        }, {});
      }

      setRequests(
        (requestsData || []).map((req: any) => ({
          ...req,
          unit_number: req.units?.unit_number,
          building_id: req.units?.buildings?.id,
          building_name: req.units?.buildings?.name,
          requested_by_name: profilesMap[req.requested_by] || 'Unknown',
          assigned_to_name: req.assigned_to ? profilesMap[req.assigned_to] : undefined,
        }))
      );
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load requests');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormBuildingId('');
    setFormUnitId('');
    setFormTitle('');
    setFormDescription('');
    setFormCategory('general');
    setFormPriority('2');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formUnitId) return;

    setIsSubmitting(true);

    try {
      // Get building and unit details for email
      const selectedUnit = units.find(u => u.id === formUnitId);
      const selectedBuilding = buildings.find(b => b.id === formBuildingId);
      
      // Get requester profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      // Get admin emails (users with admin role)
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      let adminEmails: string[] = [];
      if (adminRoles && adminRoles.length > 0) {
        const adminIds = adminRoles.map(r => r.user_id);
        const { data: adminProfiles } = await supabase
          .from('profiles')
          .select('email')
          .in('id', adminIds);
        
        adminEmails = (adminProfiles || []).map(p => p.email).filter(Boolean);
      }

      const priorityLabel = priorityConfig[parseInt(formPriority)]?.label || 'Medium';

      const { data: insertedRequest, error } = await supabase
        .from('maintenance_requests')
        .insert({
          unit_id: formUnitId,
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          category: formCategory,
          priority: parseInt(formPriority),
          requested_by: user.id,
          status: 'requested',
        })
        .select()
        .single();

      if (error) throw error;

      // Send email notification
      if (adminEmails.length > 0) {
        try {
          const { error: emailError } = await supabase.functions.invoke('send-maintenance-notification', {
            body: {
              requestId: insertedRequest.id,
              requesterName: profileData?.full_name || user.email || 'Unknown',
              requesterEmail: profileData?.email || user.email || '',
              buildingName: selectedBuilding?.name || 'Unknown Building',
              unitNumber: selectedUnit?.unit_number || 'Unknown',
              title: formTitle.trim(),
              description: formDescription.trim() || null,
              priority: priorityLabel,
              createdAt: insertedRequest.created_at,
              appUrl: window.location.origin,
              adminEmails: adminEmails,
            },
          });

          if (emailError) {
            console.error('Email notification failed:', emailError);
            // Don't fail the request if email fails
          } else {
            console.log('Email notification sent successfully');
          }
        } catch (emailErr) {
          console.error('Error sending email notification:', emailErr);
        }
      }

      toast.success('Request submitted successfully');
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

  const updateRequest = async (requestId: string, updates: Partial<MaintenanceRequest>) => {
    try {
      const { error } = await supabase
        .from('maintenance_requests')
        .update(updates)
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Request updated successfully');
      fetchData();
      
      if (selectedRequest?.id === requestId) {
        setSelectedRequest(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (error: any) {
      console.error('Error updating request:', error);
      toast.error(error.message || 'Failed to update request');
    }
  };

  const openDetail = (request: MaintenanceRequest) => {
    setSelectedRequest(request);
    setIsDetailOpen(true);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setBuildingFilter('all');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || categoryFilter !== 'all' || buildingFilter !== 'all';

  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.unit_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.building_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || request.category === categoryFilter;
    const matchesBuilding = buildingFilter === 'all' || request.building_id === buildingFilter;
    return matchesSearch && matchesStatus && matchesCategory && matchesBuilding;
  });

  return (
    <AppLayout title="Requests" description="Create and manage maintenance requests">
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
            <Button
              variant={showFilters ? 'secondary' : 'outline'}
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="shrink-0"
            >
              <Filter className="h-4 w-4" />
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 h-3 w-3" />
                Clear filters
              </Button>
            )}
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button disabled={buildings.length === 0}>
                <Plus className="mr-2 h-4 w-4" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>New Maintenance Request</DialogTitle>
                  <DialogDescription>
                    Submit a new request for maintenance or repairs.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="building">Building *</Label>
                      <Select value={formBuildingId} onValueChange={setFormBuildingId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select building" />
                        </SelectTrigger>
                        <SelectContent>
                          {buildings.map((building) => (
                            <SelectItem key={building.id} value={building.id}>
                              {building.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unit">Unit *</Label>
                      <Select 
                        value={formUnitId} 
                        onValueChange={setFormUnitId}
                        disabled={!formBuildingId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={formBuildingId ? "Select unit" : "Select building first"} />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredUnits.map((unit) => (
                            <SelectItem key={unit.id} value={unit.id}>
                              Unit {unit.unit_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="title">Request Title *</Label>
                    <Input
                      id="title"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="Brief description of the issue"
                      required
                      maxLength={100}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Detailed Description *</Label>
                    <Textarea
                      id="description"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Please describe the issue in detail..."
                      rows={4}
                      required
                      maxLength={1000}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category *</Label>
                      <Select value={formCategory} onValueChange={(v) => setFormCategory(v as MaintenanceCategory)}>
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
                      <Label htmlFor="priority">Priority *</Label>
                      <Select value={formPriority} onValueChange={setFormPriority}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(priorityConfig).map(([value, config]) => (
                            <SelectItem key={value} value={value}>
                              {config.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting || !formUnitId || !formTitle.trim() || !formDescription.trim()}>
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

        {/* Filters Panel */}
        {showFilters && (
          <Card>
            <CardContent className="pt-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
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
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {Object.entries(categoryConfig).map(([value, config]) => (
                        <SelectItem key={value} value={value}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Building</Label>
                  <Select value={buildingFilter} onValueChange={setBuildingFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Buildings" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Buildings</SelectItem>
                      {buildings.map((building) => (
                        <SelectItem key={building.id} value={building.id}>
                          {building.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Requests List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Wrench className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="mb-2 text-lg font-semibold">No requests found</h3>
              <p className="mb-4 text-center text-muted-foreground">
                {hasActiveFilters
                  ? 'No requests match your filters.'
                  : 'No maintenance requests have been submitted yet.'}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredRequests.map((request) => {
              const status = statusConfig[request.status];
              const StatusIcon = status.icon;
              const categoryStyle = categoryConfig[request.category];
              const priorityStyle = priorityConfig[request.priority] || priorityConfig[2];

              return (
                <Card 
                  key={request.id} 
                  className="cursor-pointer transition-all hover:shadow-md"
                  onClick={() => openDetail(request)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="rounded-lg bg-primary/10 p-2 mt-1 shrink-0">
                          <Wrench className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg truncate">{request.title}</CardTitle>
                            <span className={`text-xs ${priorityStyle.color}`}>
                              {priorityStyle.label}
                            </span>
                          </div>
                          <CardDescription className="mt-1">
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {request.building_name} - Unit {request.unit_number}
                            </span>
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={categoryStyle.color} variant="secondary">
                          {categoryStyle.label}
                        </Badge>
                        <Badge className={status.color} variant="secondary">
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {status.label}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {request.description && (
                      <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
                        {request.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(request.created_at), 'MMM d, yyyy')}
                      </span>
                      {request.requested_by_name && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {request.requested_by_name}
                        </span>
                      )}
                      {request.assigned_to_name && (
                        <span className="flex items-center gap-1">
                          <Wrench className="h-3 w-3" />
                          Assigned to {request.assigned_to_name}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Request Detail Sheet */}
        <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <SheetContent className="sm:max-w-lg overflow-y-auto">
            {selectedRequest && (
              <>
                <SheetHeader>
                  <SheetTitle>{selectedRequest.title}</SheetTitle>
                  <SheetDescription>
                    {selectedRequest.building_name} - Unit {selectedRequest.unit_number}
                  </SheetDescription>
                </SheetHeader>
                
                <div className="mt-6 space-y-6">
                  {/* Status and Category */}
                  <div className="flex flex-wrap gap-2">
                    <Badge className={statusConfig[selectedRequest.status].color} variant="secondary">
                      {statusConfig[selectedRequest.status].label}
                    </Badge>
                    <Badge className={categoryConfig[selectedRequest.category].color} variant="secondary">
                      {categoryConfig[selectedRequest.category].label}
                    </Badge>
                    <Badge variant="outline" className={priorityConfig[selectedRequest.priority]?.color}>
                      {priorityConfig[selectedRequest.priority]?.label || 'Medium'} Priority
                    </Badge>
                  </div>
                  
                  <Separator />
                  
                  {/* Description */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedRequest.description || 'No description provided.'}
                    </p>
                  </div>
                  
                  <Separator />
                  
                  {/* Timeline */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">Timeline</h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        <div>
                          <p className="font-medium">Created</p>
                          <p className="text-muted-foreground">
                            {format(new Date(selectedRequest.created_at), 'PPP p')}
                            {selectedRequest.requested_by_name && ` by ${selectedRequest.requested_by_name}`}
                          </p>
                        </div>
                      </div>
                      {selectedRequest.updated_at !== selectedRequest.created_at && (
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                          <div>
                            <p className="font-medium">Last Updated</p>
                            <p className="text-muted-foreground">
                              {format(new Date(selectedRequest.updated_at), 'PPP p')}
                            </p>
                          </div>
                        </div>
                      )}
                      {selectedRequest.completed_at && (
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-2 rounded-full bg-success" />
                          <div>
                            <p className="font-medium">Completed</p>
                            <p className="text-muted-foreground">
                              {format(new Date(selectedRequest.completed_at), 'PPP p')}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Admin Controls */}
                  {isAdmin && (
                    <>
                      <Separator />
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium">Admin Actions</h4>
                        
                        <div className="space-y-2">
                          <Label>Update Status</Label>
                          <Select 
                            value={selectedRequest.status} 
                            onValueChange={(value) => updateRequest(selectedRequest.id, { 
                              status: value as RequestStatus,
                              completed_at: value === 'completed' || value === 'paid' ? new Date().toISOString() : null
                            })}
                          >
                            <SelectTrigger>
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
                        
                        <div className="space-y-2">
                          <Label>Assign To</Label>
                          <Select 
                            value={selectedRequest.assigned_to || 'unassigned'} 
                            onValueChange={(value) => updateRequest(selectedRequest.id, { 
                              assigned_to: value === 'unassigned' ? null : value 
                            })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {providers.map((provider) => (
                                <SelectItem key={provider.id} value={provider.id}>
                                  {provider.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Update Priority</Label>
                          <Select 
                            value={String(selectedRequest.priority)} 
                            onValueChange={(value) => updateRequest(selectedRequest.id, { priority: parseInt(value) })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(priorityConfig).map(([value, config]) => (
                                <SelectItem key={value} value={value}>
                                  {config.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </AppLayout>
  );
}
