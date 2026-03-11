import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { UnifiedRequestStatus } from '@/types/requests';
import { ActionConfirmationDialog } from './ActionConfirmationDialog';

interface Props {
  request: any;
  estimatedAmount: string;
  provider: string;
  onStatusChange: (status: UnifiedRequestStatus) => void;
}

type PendingAction = {
  label: string;
  status: UnifiedRequestStatus;
  variant: 'default' | 'destructive' | 'success' | 'warning';
  icon: React.ReactNode;
} | null;

export function ResidentApproval({ request, estimatedAmount, provider, onStatusChange }: Props) {
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const formattedAmount = estimatedAmount
    ? `€ ${parseFloat(estimatedAmount).toFixed(2)}`
    : '—';

  const buildDetails = () => [
    { label: 'Request', value: request.title || '—' },
    { label: 'Amount', value: formattedAmount },
    { label: 'Provider', value: provider || '—' },
    { label: 'Current Status', value: request.status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) },
  ];

  return (
    <>
      <Card className="border-warning/40 bg-warning/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-warning">⚡</span> Your Approval Required
          </CardTitle>
          <CardDescription>
            {request.status === 'quoted'
              ? 'A quotation has been prepared for your request. Please review and decide.'
              : 'This request is awaiting your final approval before work can begin.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-card p-4 space-y-3">
            {estimatedAmount && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Estimated Amount</span>
                <span className="text-lg font-bold text-foreground">{formattedAmount}</span>
              </div>
            )}
            {provider && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Provider / Vendor</span>
                <span className="font-medium">{provider}</span>
              </div>
            )}
            {request.scheduled_date && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Scheduled Date</span>
                <span className="font-medium">
                  {format(new Date(request.scheduled_date), 'PPP')} at {format(new Date(request.scheduled_date), 'HH:mm')}
                </span>
              </div>
            )}
            {request.quotation_notes && (
              <div className="pt-2 border-t">
                <span className="text-sm text-muted-foreground block mb-1">Quotation Notes</span>
                <p className="text-sm">{request.quotation_notes}</p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => setPendingAction({
                label: 'Approve Quotation',
                status: 'waiting_approval',
                variant: 'success',
                icon: <CheckCircle className="h-4 w-4" />,
              })}
              className="bg-success hover:bg-success/90 text-success-foreground flex-1"
            >
              <CheckCircle className="mr-2 h-4 w-4" /> Approve Quotation
            </Button>
            <Button
              variant="destructive"
              onClick={() => setPendingAction({
                label: 'Reject',
                status: 'rejected',
                variant: 'destructive',
                icon: <XCircle className="h-4 w-4" />,
              })}
              className="flex-1"
            >
              <XCircle className="mr-2 h-4 w-4" /> Reject
            </Button>
          </div>
        </CardContent>
      </Card>

      {pendingAction && (
        <ActionConfirmationDialog
          open={!!pendingAction}
          onOpenChange={(open) => { if (!open) setPendingAction(null); }}
          actionLabel={pendingAction.label}
          requestId={request.id}
          details={buildDetails()}
          variant={pendingAction.variant}
          icon={pendingAction.icon}
          onConfirm={async () => {
            await onStatusChange(pendingAction.status);
            setPendingAction(null);
          }}
        />
      )}
    </>
  );
}
