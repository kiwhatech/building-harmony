import { Badge } from '@/components/ui/badge';
import {
  Clock, Search, FileText, CheckCircle2, CalendarCheck, CheckCheck, XCircle,
  Send, Hourglass, Wrench, PenLine,
} from 'lucide-react';
import type { UnifiedRequestStatus } from '@/types/requests';

const config: Record<UnifiedRequestStatus, { label: string; icon: typeof Clock; className: string }> = {
  draft: { label: 'Draft', icon: PenLine, className: 'bg-muted text-muted-foreground' },
  submitted: { label: 'Submitted', icon: Send, className: 'bg-info/10 text-info border-info/30' },
  in_review: { label: 'In Review', icon: Search, className: 'bg-warning/10 text-warning border-warning/30' },
  quoted: { label: 'Quoted', icon: FileText, className: 'bg-info/10 text-info border-info/30' },
  waiting_approval: { label: 'Waiting Approval', icon: Hourglass, className: 'bg-warning/10 text-warning border-warning/30' },
  intervention: { label: 'Intervention', icon: Wrench, className: 'bg-primary/10 text-primary border-primary/30' },
  completed: { label: 'Completed', icon: CheckCheck, className: 'bg-success/10 text-success border-success/30' },
  rejected: { label: 'Rejected', icon: XCircle, className: 'bg-destructive/10 text-destructive border-destructive/30' },
};

interface Props {
  status: UnifiedRequestStatus;
}

export function RequestStatusBadge({ status }: Props) {
  const c = config[status] || config.draft;
  const Icon = c.icon;
  return (
    <Badge variant="outline" className={c.className}>
      <Icon className="mr-1 h-3 w-3" />
      {c.label}
    </Badge>
  );
}
