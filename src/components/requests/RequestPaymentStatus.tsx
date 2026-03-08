import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreditCard, CheckCircle, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface Payment {
  id: string;
  amount: number;
  status: string;
  currency: string;
  payment_method: string | null;
  gateway_payment_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  requestId: string;
  isAdmin: boolean;
  onPaymentCompleted?: () => void;
}

const statusConfig: Record<string, { label: string; variant: string; icon: typeof CreditCard }> = {
  created: { label: 'Created', variant: 'bg-muted text-muted-foreground', icon: CreditCard },
  pending: { label: 'Processing', variant: 'bg-warning/10 text-warning', icon: Loader2 },
  succeeded: { label: 'Paid', variant: 'bg-success/10 text-success', icon: CheckCircle },
  failed: { label: 'Failed', variant: 'bg-destructive/10 text-destructive', icon: AlertTriangle },
  canceled: { label: 'Canceled', variant: 'bg-muted text-muted-foreground', icon: AlertTriangle },
  refunded: { label: 'Refunded', variant: 'bg-accent text-accent-foreground', icon: RefreshCw },
};

export function RequestPaymentStatus({ requestId, isAdmin, onPaymentCompleted }: Props) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayment();
  }, [requestId]);

  const fetchPayment = async () => {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!error && data && data.length > 0) {
      setPayment(data[0] as Payment);
    }
    setLoading(false);
  };

  const handleMarkAsPaid = async () => {
    if (!payment) return;
    const { error } = await supabase
      .from('payments')
      .update({ status: 'succeeded', updated_at: new Date().toISOString() })
      .eq('id', payment.id);

    if (error) {
      toast.error('Failed to update payment status');
    } else {
      toast.success('Payment marked as paid');
      setPayment({ ...payment, status: 'succeeded' });
      onPaymentCompleted?.();
    }
  };

  if (loading) return null;
  if (!payment) return null;

  const config = statusConfig[payment.status] || statusConfig.created;
  const StatusIcon = config.icon;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="h-4 w-4 text-primary" /> Payment Status
        </CardTitle>
        <CardDescription>Intervention payment tracking</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className={config.variant}>
                <StatusIcon className={`h-3 w-3 mr-1 ${payment.status === 'pending' ? 'animate-spin' : ''}`} />
                {config.label}
              </Badge>
            </div>
            <p className="text-lg font-bold">
              {Number(payment.amount).toLocaleString('it-IT', { style: 'currency', currency: payment.currency || 'EUR' })}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(payment.created_at), 'MMM d, yyyy HH:mm')}
              {payment.gateway_payment_id && (
                <span className="ml-2 font-mono">{payment.gateway_payment_id.slice(0, 20)}</span>
              )}
            </p>
          </div>

          {isAdmin && ['created', 'pending'].includes(payment.status) && (
            <Button size="sm" onClick={handleMarkAsPaid} className="bg-success hover:bg-success/90 text-success-foreground">
              <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Mark as Paid
            </Button>
          )}
        </div>

        {payment.status === 'succeeded' && (
          <p className="text-sm text-success flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4" />
            Payment completed — this request can now be closed.
          </p>
        )}

        {isAdmin && payment.status === 'failed' && (
          <p className="text-sm text-destructive flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" />
            Payment failed. The resident can retry from their dashboard.
          </p>
        )}
      </CardContent>
    </Card>
  );
}