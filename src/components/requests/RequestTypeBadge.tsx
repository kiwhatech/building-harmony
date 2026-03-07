import { Badge } from '@/components/ui/badge';
import { FileText, Wrench } from 'lucide-react';
import type { UnifiedRequestType } from '@/types/requests';

interface Props {
  type: UnifiedRequestType;
}

export function RequestTypeBadge({ type }: Props) {
  if (type === 'quotation') {
    return (
      <Badge variant="outline" className="bg-secondary text-secondary-foreground border-secondary">
        <FileText className="mr-1 h-3 w-3" />
        Quotation
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-warning/15 text-warning border-warning/40">
      <Wrench className="mr-1 h-3 w-3" />
      Intervention
    </Badge>
  );
}
