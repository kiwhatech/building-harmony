import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface ActionDetail {
  label: string;
  value: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionLabel: string;
  requestId: string;
  details: ActionDetail[];
  variant?: 'default' | 'destructive' | 'success' | 'warning';
  icon?: React.ReactNode;
  onConfirm: (comment: string) => Promise<void>;
}

const variantStyles: Record<string, string> = {
  default: 'bg-primary hover:bg-primary/90 text-primary-foreground',
  destructive: 'bg-destructive hover:bg-destructive/90 text-destructive-foreground',
  success: 'bg-success hover:bg-success/90 text-success-foreground',
  warning: 'bg-warning hover:bg-warning/90 text-warning-foreground',
};

export function ActionConfirmationDialog({
  open, onOpenChange, actionLabel, requestId, details, variant = 'default', icon, onConfirm,
}: Props) {
  const [comment, setComment] = useState('');
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await onConfirm(comment);
      setComment('');
      onOpenChange(false);
    } finally {
      setConfirming(false);
    }
  };

  const handleClose = () => {
    if (confirming) return;
    setComment('');
    onOpenChange(false);
  };

  const shortId = requestId.slice(0, 8).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {icon}
            Confirm {actionLabel} — Request #{shortId}
          </DialogTitle>
          <DialogDescription>
            Please review the details below before proceeding.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Details summary */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            {details.map((d, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{d.label}</span>
                <span className="font-medium truncate ml-2 max-w-[220px] text-right">{d.value}</span>
              </div>
            ))}
          </div>

          {/* Optional comment */}
          <div className="space-y-2">
            <Label htmlFor="action-comment" className="text-sm font-medium">
              Comment <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="action-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a reason or note for this action..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={confirming}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={confirming}
            className={variantStyles[variant]}
          >
            {confirming ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : icon ? (
              <span className="mr-2 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
            ) : null}
            {actionLabel} & Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
