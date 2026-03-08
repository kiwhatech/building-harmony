import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Send, MessageSquare, ArrowRightCircle, CheckCircle, XCircle,
  FileText, Search, Clock, Wrench, PenLine,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { RequestStatusBadge } from './RequestStatusBadge';

interface Activity {
  id: string;
  request_id: string;
  user_id: string;
  activity_type: string;
  old_status: string | null;
  new_status: string | null;
  message: string | null;
  metadata: any;
  created_at: string;
  profile?: { full_name: string | null; email: string } | null;
}

const activityIcons: Record<string, any> = {
  status_change: ArrowRightCircle,
  comment: MessageSquare,
  quotation_sent: FileText,
  quotation_approved: CheckCircle,
  quotation_rejected: XCircle,
  assignment: Wrench,
  created: PenLine,
};

const activityLabels: Record<string, string> = {
  status_change: 'changed status',
  comment: 'commented',
  quotation_sent: 'sent a quotation',
  quotation_approved: 'approved the quotation',
  quotation_rejected: 'rejected the quotation',
  assignment: 'assigned vendor',
  created: 'created the request',
};

interface Props {
  requestId: string;
}

export function RequestTimeline({ requestId }: Props) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchActivities();

    // Realtime subscription
    const channel = supabase
      .channel(`request-activities-${requestId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'request_activities',
        filter: `request_id=eq.${requestId}`,
      }, () => {
        fetchActivities();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [requestId]);

  const fetchActivities = async () => {
    const { data, error } = await supabase
      .from('request_activities' as any)
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      // Fetch profiles for all unique user_ids
      const userIds = [...new Set((data as any[]).map(a => a.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      const enriched = (data as any[]).map(a => ({
        ...a,
        profile: profileMap.get(a.user_id) || null,
      }));
      setActivities(enriched);
    }
    setLoading(false);
  };

  const handleSendComment = async () => {
    if (!comment.trim() || !user) return;
    setSending(true);

    const { error } = await supabase
      .from('request_activities' as any)
      .insert({
        request_id: requestId,
        user_id: user.id,
        activity_type: 'comment',
        message: comment.trim(),
      } as any);

    if (!error) {
      setComment('');
      fetchActivities();
    }
    setSending(false);
  };

  const getInitials = (activity: Activity) => {
    const name = activity.profile?.full_name;
    if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    return activity.profile?.email?.slice(0, 2).toUpperCase() || '??';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" /> Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading timeline...</p>
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet. Add a comment to start the conversation.</p>
        ) : (
          <div className="space-y-0">
            {activities.map((activity, idx) => {
              const Icon = activityIcons[activity.activity_type] || MessageSquare;
              const isComment = activity.activity_type === 'comment';
              const isLast = idx === activities.length - 1;

              return (
                <div key={activity.id} className="flex gap-3 relative">
                  {/* Timeline line */}
                  {!isLast && (
                    <div className="absolute left-[17px] top-[36px] bottom-0 w-px bg-border" />
                  )}

                  {/* Avatar / Icon */}
                  <div className="shrink-0 z-10">
                    {isComment ? (
                      <Avatar className="h-[34px] w-[34px]">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {getInitials(activity)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="h-[34px] w-[34px] rounded-full bg-muted flex items-center justify-center">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className={`flex-1 pb-5 ${isComment ? '' : ''}`}>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-sm font-medium">
                        {activity.profile?.full_name || activity.profile?.email || 'System'}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {activityLabels[activity.activity_type] || activity.activity_type}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </span>
                    </div>

                    {/* Status change badges */}
                    {activity.activity_type === 'status_change' && activity.old_status && activity.new_status && (
                      <div className="flex items-center gap-2 mt-1">
                        <RequestStatusBadge status={activity.old_status as any} />
                        <span className="text-muted-foreground">→</span>
                        <RequestStatusBadge status={activity.new_status as any} />
                      </div>
                    )}

                    {/* Comment message */}
                    {activity.message && (
                      <div className={`mt-1 text-sm ${isComment ? 'rounded-lg border bg-muted/50 p-3' : 'text-muted-foreground'}`}>
                        {activity.message}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}

        <Separator className="my-4" />

        {/* Comment input */}
        <div className="flex gap-2">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment or note..."
            rows={2}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSendComment();
            }}
          />
          <Button
            onClick={handleSendComment}
            disabled={!comment.trim() || sending}
            size="icon"
            className="self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Press ⌘+Enter to send</p>
      </CardContent>
    </Card>
  );
}
