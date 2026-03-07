import { Badge } from '@/components/ui/badge';
import type { EstimateStatus } from '@/types/estimates';

const statusStyles: Record<EstimateStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  submitted: { label: 'Submitted', variant: 'default' },
  under_review: { label: 'Under Review', variant: 'outline' },
  approved: { label: 'Approved', variant: 'default' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  converted: { label: 'Converted', variant: 'outline' },
};

export function EstimateStatusBadge({ status }: { status: EstimateStatus }) {
  const config = statusStyles[status] || statusStyles.draft;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
