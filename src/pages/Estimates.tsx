import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Search, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { EstimateStatusBadge } from '@/components/estimates/EstimateStatusBadge';
import type { EstimateWithRelations, EstimateStatus } from '@/types/estimates';
import { ESTIMATE_STATUSES } from '@/types/estimates';

export default function Estimates() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');

  const [estimates, setEstimates] = useState<EstimateWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchEstimates();
  }, [statusFilter]);

  const fetchEstimates = async () => {
    setLoading(true);
    let query = (supabase as any)
      .from('estimate_requests')
      .select('*, buildings(name), units(unit_number)')
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching estimates:', error);
    } else {
      setEstimates(data || []);
    }
    setLoading(false);
  };

  const filtered = estimates.filter((e) =>
    !search || e.title.toLowerCase().includes(search.toLowerCase())
  );

  const priorityLabel = (p: string) =>
    p === 'urgent' ? '🔴 Urgent' : p === 'normal' ? '🟡 Normal' : '🟢 Low';

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Estimates</h1>
            <p className="text-muted-foreground">
              {isAdmin ? 'Manage all estimate requests' : 'Your estimate requests'}
            </p>
          </div>
          <Button onClick={() => navigate('/estimates/new')}>
            <Plus className="mr-2 h-4 w-4" /> New Estimate
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search estimates..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {ESTIMATE_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-8 text-center text-muted-foreground">Loading...</p>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">No estimates found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Create a new estimate request to get started.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Building</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((est) => (
                      <TableRow
                        key={est.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/estimates/${est.id}`)}
                      >
                        <TableCell className="font-medium">{est.title}</TableCell>
                        <TableCell>{est.buildings?.name || '—'}</TableCell>
                        <TableCell>{est.units?.unit_number || '—'}</TableCell>
                        <TableCell className="capitalize">{est.category}</TableCell>
                        <TableCell>{priorityLabel(est.priority)}</TableCell>
                        <TableCell>
                          <EstimateStatusBadge status={est.status} />
                        </TableCell>
                        <TableCell>{format(new Date(est.created_at), 'MMM d, yyyy')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
