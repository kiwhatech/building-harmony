import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Plus, Search, Filter, X, Loader2, ClipboardList, Building2, Calendar, ChevronRight, ChevronDown, Workflow,
} from 'lucide-react';
import { format } from 'date-fns';
import { RequestStatusBadge } from '@/components/requests/RequestStatusBadge';
import { RequestTypeBadge } from '@/components/requests/RequestTypeBadge';
import { WorkflowDiagram } from '@/components/requests/WorkflowDiagram';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { REQUEST_STATUSES } from '@/types/requests';
import type { UnifiedRequestStatus, UnifiedRequestType } from '@/types/requests';

const priorityConfig: Record<number, { label: string; color: string }> = {
  1: { label: 'Low', color: 'text-muted-foreground' },
  2: { label: 'Medium', color: 'text-info' },
  3: { label: 'High', color: 'text-warning' },
  4: { label: 'Critical', color: 'text-destructive font-semibold' },
};

const categoryLabels: Record<string, string> = {
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  construction: 'Structural',
  general: 'General',
};

interface RequestRow {
  id: string;
  title: string;
  description: string | null;
  request_type: UnifiedRequestType;
  category: string;
  priority: number;
  status: UnifiedRequestStatus;
  estimated_amount: number | null;
  building_id: string;
  unit_id: string;
  created_by: string;
  assigned_to: string | null;
  created_at: string;
  buildings?: { name: string } | null;
  units?: { unit_number: string } | null;
}

// Status grouping for admin tabs
const statusGroups = [
  { key: 'all', label: 'All', statuses: null },
  { key: 'new', label: 'New', statuses: ['submitted'] },
  { key: 'active', label: 'In Progress', statuses: ['in_review', 'quoted', 'waiting_approval'] },
  { key: 'interventions', label: 'Interventions', statuses: ['intervention'] },
  { key: 'closed', label: 'Closed', statuses: ['completed', 'rejected'] },
  { key: 'drafts', label: 'Drafts', statuses: ['draft'] },
];

export default function Requests() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const [workflowOpen, setWorkflowOpen] = useState(false);

  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [buildings, setBuildings] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchData();
  }, [statusFilter, typeFilter, buildingFilter]);

  const fetchData = async () => {
    setLoading(true);
    const { data: bData } = await supabase.from('buildings').select('id, name').order('name');
    setBuildings(bData || []);

    let query = supabase
      .from('unified_requests' as any)
      .select('*, buildings(name), units(unit_number)')
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    if (typeFilter !== 'all') query = query.eq('request_type', typeFilter);
    if (buildingFilter !== 'all') query = query.eq('building_id', buildingFilter);

    const { data, error } = await query;
    if (error) console.error('Error fetching requests:', error);
    else setRequests((data as any) || []);
    setLoading(false);
  };

  const getFilteredByTab = (items: RequestRow[]) => {
    const group = statusGroups.find(g => g.key === activeTab);
    if (!group || !group.statuses) return items;
    return items.filter(r => group.statuses!.includes(r.status));
  };

  const filtered = getFilteredByTab(
    requests.filter(
      (r) =>
        !search ||
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.description?.toLowerCase().includes(search.toLowerCase())
    )
  );

  const getTabCount = (statuses: string[] | null) => {
    if (!statuses) return requests.length;
    return requests.filter(r => statuses.includes(r.status)).length;
  };

  const hasActiveFilters = search || statusFilter !== 'all' || typeFilter !== 'all' || buildingFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setTypeFilter('all');
    setBuildingFilter('all');
  };

  return (
    <AppLayout title="Requests" description="Create and manage all requests">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search requests..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
                <X className="mr-1 h-3 w-3" /> Clear
              </Button>
            )}
          </div>
          <Button onClick={() => navigate('/requests/new')}>
            <Plus className="mr-2 h-4 w-4" /> New Request
          </Button>
        </div>

        {/* Filters */}
        {showFilters && (
          <Card>
            <CardContent className="pt-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger><SelectValue placeholder="All Statuses" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {REQUEST_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger><SelectValue placeholder="All Types" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="quotation">Quotation</SelectItem>
                      <SelectItem value="intervention">Intervention</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Building</Label>
                  <Select value={buildingFilter} onValueChange={setBuildingFilter}>
                    <SelectTrigger><SelectValue placeholder="All Buildings" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Buildings</SelectItem>
                      {buildings.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Admin: Status-based tabs */}
        {isAdmin ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start overflow-x-auto">
              {statusGroups.map((g) => (
                <TabsTrigger key={g.key} value={g.key} className="gap-1.5">
                  {g.label}
                  <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-xs">
                    {getTabCount(g.statuses)}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            {statusGroups.map((g) => (
              <TabsContent key={g.key} value={g.key}>
                <RequestList requests={filtered} loading={loading} hasActiveFilters={hasActiveFilters} clearFilters={clearFilters} navigate={navigate} />
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <RequestList requests={filtered} loading={loading} hasActiveFilters={hasActiveFilters} clearFilters={clearFilters} navigate={navigate} />
        )}

        {/* Workflow Diagram - collapsible panel */}
        <Collapsible open={workflowOpen} onOpenChange={setWorkflowOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Workflow className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm">Workflow Diagram</CardTitle>
                    <Badge variant="secondary" className="text-xs">Interactive</Badge>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${workflowOpen ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <WorkflowDiagram
                  requests={requests.map(r => ({
                    id: r.id,
                    status: r.status,
                    request_type: r.request_type,
                    building_id: r.building_id,
                    created_at: r.created_at,
                  }))}
                  buildings={buildings}
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </AppLayout>
  );
}

function RequestList({
  requests, loading, hasActiveFilters, clearFilters, navigate,
}: {
  requests: RequestRow[];
  loading: boolean;
  hasActiveFilters: string | boolean;
  clearFilters: () => void;
  navigate: (path: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ClipboardList className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="mb-2 text-lg font-semibold">No requests found</h3>
          <p className="mb-4 text-center text-muted-foreground">
            {hasActiveFilters ? 'No requests match your filters.' : 'No requests have been submitted yet.'}
          </p>
          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {requests.map((req) => {
        const p = priorityConfig[req.priority] || priorityConfig[2];
        return (
          <Card
            key={req.id}
            className="cursor-pointer transition-all hover:shadow-md"
            onClick={() => navigate(`/requests/${req.id}`)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="rounded-lg bg-primary/10 p-2 mt-1 shrink-0">
                    <ClipboardList className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-lg truncate">{req.title}</CardTitle>
                      <span className={`text-xs ${p.color}`}>{p.label}</span>
                    </div>
                    <CardDescription className="mt-1">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {req.buildings?.name || '—'} — Unit {req.units?.unit_number || '—'}
                      </span>
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  <RequestTypeBadge type={req.request_type} />
                  <Badge variant="secondary" className="capitalize">
                    {categoryLabels[req.category] || req.category}
                  </Badge>
                  <RequestStatusBadge status={req.status} />
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardHeader>
            {req.description && (
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground line-clamp-2">{req.description}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(req.created_at), 'MMM d, yyyy')}
                  </span>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
