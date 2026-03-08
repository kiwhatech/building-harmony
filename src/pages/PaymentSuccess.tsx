import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [details, setDetails] = useState<{ amount: number; currency: string; feeId: string } | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      return;
    }
    verifyPayment();
  }, [sessionId]);

  const verifyPayment = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { sessionId },
      });
      if (error) throw error;
      if (data.status === 'paid') {
        setStatus('success');
        setDetails({ amount: data.amount, currency: data.currency, feeId: data.feeId });
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <AppLayout title="Payment" description="">
      <div className="flex items-center justify-center py-16">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-6 p-8 text-center">
            {status === 'loading' && (
              <>
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <h2 className="text-xl font-semibold">Verifying payment…</h2>
              </>
            )}
            {status === 'success' && (
              <>
                <div className="rounded-full bg-success/10 p-4">
                  <CheckCircle2 className="h-16 w-16 text-success" />
                </div>
                <h2 className="text-2xl font-bold">Payment Successful!</h2>
                <p className="text-muted-foreground">
                  Your payment of{' '}
                  <span className="font-semibold text-foreground">
                    {details?.amount?.toLocaleString('it-IT', { style: 'currency', currency: details?.currency || 'EUR' })}
                  </span>{' '}
                  has been processed.
                </p>
                <p className="text-sm text-muted-foreground">Reference: {sessionId?.slice(0, 20)}…</p>
                <Button asChild className="mt-4 w-full">
                  <Link to="/fees">Back to Fees</Link>
                </Button>
              </>
            )}
            {status === 'error' && (
              <>
                <div className="rounded-full bg-destructive/10 p-4">
                  <XCircle className="h-16 w-16 text-destructive" />
                </div>
                <h2 className="text-2xl font-bold">Payment Issue</h2>
                <p className="text-muted-foreground">
                  We couldn't verify your payment. Please check your fees page for the current status.
                </p>
                <div className="flex gap-3 mt-4 w-full">
                  <Button variant="outline" asChild className="flex-1">
                    <Link to="/fees">Back to Fees</Link>
                  </Button>
                  <Button onClick={verifyPayment} className="flex-1">Retry</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
