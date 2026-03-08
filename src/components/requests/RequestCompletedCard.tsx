import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format } from 'date-fns';

interface Props {
  request: any;
}

export function RequestCompletedCard({ request }: Props) {
  const isCompleted = request.status === 'completed';

  return (
    <Card className={isCompleted ? 'border-success/40 bg-success/5' : 'border-destructive/40 bg-destructive/5'}>
      <CardHeader>
        <CardTitle>{isCompleted ? '✅ Request Completed' : '❌ Request Rejected'}</CardTitle>
        <CardDescription>
          {isCompleted && request.completed_at
            ? `Completed on ${format(new Date(request.completed_at), 'PPP')}`
            : 'This request has been closed.'}
        </CardDescription>
      </CardHeader>
      {request.estimated_amount && (
        <CardContent>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Final Amount</span>
            <span className="font-semibold">€ {request.estimated_amount.toFixed(2)}</span>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
