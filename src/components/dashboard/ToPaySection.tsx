import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { CreditCard, DollarSign, Wrench, Loader2, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

interface PendingFee {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  status: string;
  building_name?: string;
  unit_number?: string;
}

interface PendingIntervention {
  id: string;
  title: string;
  estimated_amount: number | null;
  status: string;
  building_name?: string;
  unit_number?: string;
}

export function ToPaySection() {
  const { user } = useAuth();
  const [fees, setFees] = useState<PendingFee[]>([]);
  const [interventions, setInterventions] = useState<PendingIntervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) fetchItems();
  }, [user?.id]);

  const fetchItems = async () => {
    try {
      // Fetch pending/overdue fees for user's units
      const { data: unitRes } = await supabase
        .from('unit_residents')
        .select('unit_id')
        .eq('user_id', user!.id);

      const unitIds = (unitRes || []).map(u => u.unit_id);

      if (unitIds.length > 0) {
        const { data: feeData } = await supabase
          .from('fees')
          .select('*, buildings(name), units(unit_number)')
          .in('unit_id', unitIds)
          .in('status', ['pending', 'overdue'])
          .order('due_date', { ascending: true });

        setFees(
          (feeData || []).map((f: any) => ({
            ...f,
            building_name: f.buildings?.name,
            unit_number: f.units?.unit_number,
          }))
        );
      }

      // Fetch interventions awaiting payment
      const { data: reqData } = await supabase
        .from('unified_requests')
        .select('id, title, estimated_amount, status, buildings:building_id(name), units:unit_id(unit_number)')
        .eq('created_by', user!.id)
        .eq('status', 'ready_for_payment');

      setInterventions(
        (reqData || []).map((r: any) => ({
          ...r,
          building_name: r.buildings?.name,
          unit_number: r.units?.unit_number,
        }))
      );
    } catch (err) {
      console.error('Error fetching to-pay items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayFee = async (feeId: string) => {
    setPayingId(feeId);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { paymentType: 'unit_fee', feeId },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch (err: any) {
      toast.error(err.message || 'Payment failed');
    } finally {
      setPayingId(null);
    }
  };

  const handlePayIntervention = async (requestId: string) => {
    setPayingId(requestId);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { paymentType: 'intervention', requestId },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch (err: any) {
      toast.error(err.message || 'Payment failed');
    } finally {
      setPayingId(null);
    }
  };

  const totalItems = fees.length + interventions.length;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CreditCard className="h-5 w-5 text-primary" />
          To Pay
          {totalItems > 0 && (
            <Badge variant="destructive" className="ml-2">{totalItems}</Badge>
          )}
        </CardTitle>
        <CardDescription>Outstanding payments requiring your attention</CardDescription>
      </CardHeader>
      <CardContent>
        {totalItems === 0 ? (
          <div className="text-center py-6">
            <CreditCard className="mx-auto h-10 w-10 text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground">No pending payments</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Intervention payments */}
            {interventions.map(req => (
              <div key={req.id} className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Wrench className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">Intervention: {req.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {req.building_name} — Unit {req.unit_number}
                  </p>
                </div>
                <div className="text-right">
                  {req.estimated_amount && (
                    <p className="text-sm font-bold">
                      {Number(req.estimated_amount).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => handlePayIntervention(req.id)}
                  disabled={payingId === req.id}
                >
                  {payingId === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Pay'}
                </Button>
              </div>
            ))}

            {/* Fee payments */}
            {fees.map(fee => (
              <div
                key={fee.id}
                className={`flex items-center gap-3 rounded-lg border p-3 ${
                  fee.status === 'overdue' ? 'border-destructive/20 bg-destructive/5' : 'border-warning/20 bg-warning/5'
                }`}
              >
                <div className={`rounded-full p-2 ${fee.status === 'overdue' ? 'bg-destructive/10' : 'bg-warning/10'}`}>
                  {fee.status === 'overdue' ? (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  ) : (
                    <DollarSign className="h-4 w-4 text-warning" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{fee.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {fee.building_name} — Unit {fee.unit_number} · Due {format(new Date(fee.due_date), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">
                    {Number(fee.amount).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                  </p>
                  {fee.status === 'overdue' && (
                    <Badge variant="destructive" className="text-xs">Overdue</Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={fee.status === 'overdue' ? 'destructive' : 'default'}
                  onClick={() => handlePayFee(fee.id)}
                  disabled={payingId === fee.id}
                >
                  {payingId === fee.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Pay'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
