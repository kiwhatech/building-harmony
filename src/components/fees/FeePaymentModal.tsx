import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreditCard, Building2, Loader2, Copy, CheckCircle2, Calendar, Info } from 'lucide-react';
import { format } from 'date-fns';

interface BankDetails {
  bank_name?: string;
  iban?: string;
  bic_swift?: string;
  account_holder?: string;
  payment_reference?: string;
}

interface FeePaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fee: {
    id: string;
    description: string;
    amount: number;
    due_date: string;
    building_id: string;
  } | null;
  bankDetails: BankDetails | null;
  onPaymentSubmitted: () => void;
}

export function FeePaymentModal({ open, onOpenChange, fee, bankDetails, onPaymentSubmitted }: FeePaymentModalProps) {
  const [method, setMethod] = useState<'online' | 'bank_transfer'>('online');
  const [trn, setTrn] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const resetForm = () => {
    setMethod('online');
    setTrn('');
    setNotes('');
  };

  const handleClose = (val: boolean) => {
    if (!val) resetForm();
    onOpenChange(val);
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleOnlinePayment = async () => {
    if (!fee) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { paymentType: 'unit_fee', feeId: fee.id },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
        handleClose(false);
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to start payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBankTransferSubmit = async () => {
    if (!fee) return;
    if (!trn.trim() || trn.trim().length < 5) {
      toast.error('Please enter a valid TRN (at least 5 characters)');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('payments').insert({
        fee_id: fee.id,
        amount: fee.amount,
        created_by: user.id,
        status: 'pending_confirmation',
        currency: 'EUR',
        payment_type: 'unit_fee',
        payment_method: 'bank_transfer',
        trn: trn.trim(),
        notes: notes.trim() || null,
        metadata: { description: fee.description },
      });

      if (error) throw error;
      toast.success('Bank transfer submitted. It will be confirmed by the administrator.');
      onPaymentSubmitted();
      handleClose(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit bank transfer');
    } finally {
      setSubmitting(false);
    }
  };

  if (!fee) return null;

  const BankDetailRow = ({ label, value, fieldKey }: { label: string; value?: string; fieldKey: string }) => {
    if (!value) return null;
    return (
      <div className="flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-mono font-medium">{value}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => copyToClipboard(value, fieldKey)}
        >
          {copiedField === fieldKey ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
          ) : (
            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pay Fee</DialogTitle>
          <DialogDescription>Choose your payment method</DialogDescription>
        </DialogHeader>

        {/* Step 1: Fee summary */}
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-1">
          <p className="text-sm text-muted-foreground">{fee.description}</p>
          <p className="text-2xl font-bold">
            {Number(fee.amount).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Due {format(new Date(fee.due_date), 'MMM d, yyyy')}
          </p>
        </div>

        {/* Step 2: Payment method selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Payment method</Label>
          <RadioGroup value={method} onValueChange={(v) => setMethod(v as 'online' | 'bank_transfer')} className="space-y-2">
            <label
              className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                method === 'online' ? 'border-primary bg-primary/5' : 'border-border'
              }`}
            >
              <RadioGroupItem value="online" className="mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Online payment (card or wallet)</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Pay instantly with credit/debit card or digital wallet via our secure payment provider.
                </p>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                method === 'bank_transfer' ? 'border-primary bg-primary/5' : 'border-border'
              }`}
            >
              <RadioGroupItem value="bank_transfer" className="mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Bank transfer</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Transfer funds from your bank account and submit the TRN for confirmation.
                </p>
              </div>
            </label>
          </RadioGroup>
        </div>

        {/* Bank transfer details */}
        {method === 'bank_transfer' && (
          <div className="space-y-4">
            {/* Bank details */}
            {bankDetails && (bankDetails.iban || bankDetails.bank_name) ? (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Building bank details</Label>
                <div className="space-y-1.5">
                  <BankDetailRow label="Bank Name" value={bankDetails.bank_name} fieldKey="bank_name" />
                  <BankDetailRow label="IBAN" value={bankDetails.iban} fieldKey="iban" />
                  <BankDetailRow label="BIC / SWIFT" value={bankDetails.bic_swift} fieldKey="bic_swift" />
                  <BankDetailRow label="Account Holder" value={bankDetails.account_holder} fieldKey="account_holder" />
                  <BankDetailRow label="Payment Reference" value={bankDetails.payment_reference || fee.id.slice(0, 8).toUpperCase()} fieldKey="payment_reference" />
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 flex items-start gap-2">
                <Info className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Bank details are not yet configured for this building. Please contact your building administrator.
                </p>
              </div>
            )}

            {/* TRN input */}
            <div className="space-y-2">
              <Label htmlFor="trn" className="text-sm font-medium">
                Bank transfer TRN (Transaction Reference Number) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="trn"
                placeholder="e.g. TRN-20260308-ABC123"
                value={trn}
                onChange={(e) => setTrn(e.target.value)}
                maxLength={64}
              />
              <p className="text-xs text-muted-foreground">
                Complete the transfer from your bank, then paste the TRN here.
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium">Additional notes</Label>
              <Textarea
                id="notes"
                placeholder="Optional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                rows={2}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={submitting}>
            Cancel
          </Button>
          {method === 'online' ? (
            <Button onClick={handleOnlinePayment} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
              Pay Online
            </Button>
          ) : (
            <Button onClick={handleBankTransferSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Building2 className="mr-2 h-4 w-4" />}
              Submit Bank Transfer
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
