import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CheckCircle, CreditCard, Building2, Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestTitle: string;
  amount: number;
  providerName: string;
  onConfirm: (paymentMethod: string) => Promise<void>;
}

export function CompletionPaymentDialog({
  open, onOpenChange, requestTitle, amount, providerName, onConfirm,
}: Props) {
  const [method, setMethod] = useState<string>('');
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = async () => {
    if (!method) return;
    setConfirming(true);
    try {
      await onConfirm(method);
      setConfirmed(true);
    } finally {
      setConfirming(false);
    }
  };

  const handleClose = () => {
    setMethod('');
    setConfirmed(false);
    onOpenChange(false);
  };

  const formattedAmount = amount > 0
    ? amount.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
    : '€0,00';

  const methodLabel = method === 'bank_transfer' ? 'Bank Transfer' : 'Credit Card';

  if (confirmed) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="rounded-full bg-success/10 p-3">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <DialogTitle className="text-xl">Request Closed</DialogTitle>
            <p className="text-muted-foreground">
              Payment via <span className="font-semibold text-foreground">{methodLabel}</span> for{' '}
              <span className="font-semibold text-foreground">{formattedAmount}</span>
            </p>
            {providerName && (
              <p className="text-sm text-muted-foreground">Provider: {providerName}</p>
            )}
            <Button onClick={handleClose} className="mt-2">Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Close Request — Payment Method
          </DialogTitle>
          <DialogDescription>
            Select the payment method used for this intervention before closing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Request summary */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Request</span>
              <span className="font-medium truncate ml-2 max-w-[200px]">{requestTitle}</span>
            </div>
            {providerName && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Provider</span>
                <span className="font-medium">{providerName}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount</span>
              <span className="text-lg font-bold text-foreground">{formattedAmount}</span>
            </div>
          </div>

          {/* Payment method selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Payment Method <span className="text-destructive">*</span>
            </Label>
            <RadioGroup value={method} onValueChange={setMethod} className="grid grid-cols-2 gap-3">
              <Label
                htmlFor="bank_transfer"
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                  method === 'bank_transfer'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <RadioGroupItem value="bank_transfer" id="bank_transfer" className="sr-only" />
                <Building2 className={`h-6 w-6 ${method === 'bank_transfer' ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="text-sm font-medium">Bank Transfer</span>
              </Label>
              <Label
                htmlFor="credit_card"
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                  method === 'credit_card'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <RadioGroupItem value="credit_card" id="credit_card" className="sr-only" />
                <CreditCard className={`h-6 w-6 ${method === 'credit_card' ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="text-sm font-medium">Credit Card</span>
              </Label>
            </RadioGroup>
            {!method && (
              <p className="text-xs text-muted-foreground">Please select a payment method to continue.</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleConfirm}
            disabled={!method || confirming}
            className="bg-success hover:bg-success/90 text-success-foreground"
          >
            {confirming ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            Confirm & Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
