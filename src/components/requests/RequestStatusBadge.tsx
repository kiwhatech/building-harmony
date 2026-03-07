import { Badge } from '@/components/ui/badge';
import {
  Clock, Search, FileText, CheckCircle2, CalendarCheck, PlayCircle, CheckCheck, XCircle,
} from 'lucide-react';
import type { UnifiedRequestStatus } from '@/types/requests';

const config: Record<UnifiedRequestStatus, { label: string; icon: typeof Clock; className: string }> = {
  new: { label: 'New', icon: Clock, className: 'bg-muted text-muted-foreground' },
  in_review: { label: 'In Review', icon: Search, className: 'bg-warning/10 text-warning border-warning/30' },
  quotation_sent: { label: 'Quotation Sent', icon: FileText, className: 'bg-info/10 text-info border-info/30' },
  approved: { label: 'Approved', icon: CheckCircle2, className: 'bg-success/10 text-success border-success/30' },
  scheduled: { label: 'Scheduled', icon: CalendarCheck, className: 'bg-primary/10 text-primary border-primary/30' },
  in_progress: { label: 'In Progress', icon: PlayCircle, className: 'bg-primary/10 text-primary border-primary/30' },
  completed: { label: 'Completed', icon: CheckCheck, className: 'bg-success/10 text-success border-success/30' },
  rejected: { label: 'Rejected', icon: XCircle, className: 'bg-destructive/10 text-destructive border-destructive/30' },
};

interface Props {
  status: UnifiedRequestStatus;
}

export function RequestStatusBadge({ status }: Props) {
  const c = config[status] || config.new;
  const Icon = c.icon;
  return (
    <Badge variant="outline" className={c.className}>
      <Icon className="mr-1 h-3 w-3" />
      {c.label}
    </Badge>
  );
}
