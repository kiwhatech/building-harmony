import { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreditCard, Loader2, Search } from 'lucide-react';
import { format } from 'date-fns';

interface Payment {
  id: string;
  fee_id: string;
  amount: number;
  status: string;
  currency: string;
  payment_method: string | null;
  reference_number: string | null;
  gateway_payment_id: string | null;
  payment_date: string;
  created_at: string;
  created_by: string | null;
  notes: string | null;
  profile_name?: string;
  fee_description?: string;
}

const statusStyles: Record<string, string> = {
  created: 'bg-muted text-muted-foreground',
  pending: 'bg-warning/10 text-warning',
  succeeded: 'bg-success/10 text-success',
  failed: 'bg-destructive/10 text-destructive',
  refunded: 'bg-accent text-accent-foreground',
  canceled: 'bg-muted text-muted-foreground',
};

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => { fetchPayments(); }, []);

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*, fees(description)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profile names for created_by
      const userIds = [...new Set((data || []).map(p => p.created_by).filter(Boolean))];
      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        profileMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = p.full_name || p.email;
          return acc;
        }, {} as Record<string, string>);
      }

      setPayments(
        (data || []).map((p: any) => ({
          ...p,
          fee_description: p.fees?.description,
          profile_name: p.created_by ? profileMap[p.created_by] || 'Unknown' : 'System',
        }))
      );
    } catch (error) {
      console.error(error);
      toast.error('Failed to load payments');
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = useMemo(() => payments.filter(p => {
    const matchesSearch =
      p.fee_description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.profile_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.reference_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.gateway_payment_id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [payments, searchQuery, statusFilter]);

  const totals = useMemo(() => ({
    total: payments.length,
    succeeded: payments.filter(p => p.status === 'succeeded').reduce((s, p) => s + Number(p.amount), 0),
    pending: payments.filter(p => ['created', 'pending'].includes(p.status)).length,
  }), [payments]);

  return (
    <AppLayout title="Payments" description="Payment transactions and history">
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Transactions</p>
              <p className="text-2xl font-bold">{totals.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Collected</p>
              <p className="text-2xl font-bold text-success">
                {totals.succeeded.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-warning">{totals.pending}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search payments..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 sm:w-64"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="created">Created</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="succeeded">Succeeded</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
              <SelectItem value="canceled">Canceled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CreditCard className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="mb-2 text-lg font-semibold">No payments found</h3>
              <p className="text-muted-foreground">No payment transactions match your filters.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.fee_description || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{p.profile_name}</TableCell>
                    <TableCell className="font-medium">
                      {Number(p.amount).toLocaleString('it-IT', { style: 'currency', currency: p.currency || 'EUR' })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusStyles[p.status] || ''}>
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(p.created_at), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {p.gateway_payment_id?.slice(0, 20) || p.reference_number?.slice(0, 20) || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
