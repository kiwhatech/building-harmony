import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CreditCard, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  request: any;
  estimatedAmount: string;
}

export function InterventionPaymentCard({ request, estimatedAmount }: Props) {
  const [isPaying, setIsPaying] = useState(false);
  const amount = estimatedAmount ? parseFloat(estimatedAmount) : 0;

  const handlePay = async () => {
    setIsPaying(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { paymentType: 'intervention', requestId: request.id },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to start payment');
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" /> Payment Required
        </CardTitle>
        <CardDescription>
          The intervention for your request is complete. Please pay to close this request.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Request</span>
            <span className="font-medium">{request.title}</span>
          </div>
          {amount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Amount Due</span>
              <span className="text-xl font-bold text-foreground">
                {amount.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
              </span>
            </div>
          )}
        </div>

        <Button onClick={handlePay} disabled={isPaying || amount <= 0} className="w-full" size="lg">
          {isPaying ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CreditCard className="mr-2 h-4 w-4" />
          )}
          Pay {amount > 0 ? amount.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' }) : 'Now'}
        </Button>
      </CardContent>
    </Card>
  );
}
