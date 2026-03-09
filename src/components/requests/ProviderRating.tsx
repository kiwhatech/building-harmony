import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Send, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  requestId: string;
  providerId: string;
  providerName: string;
}

export function ProviderRating({ requestId, providerId, providerName }: Props) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [existingRating, setExistingRating] = useState<any>(null);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [totalRatings, setTotalRatings] = useState(0);

  useEffect(() => {
    fetchExistingRating();
    fetchAvgRating();
  }, [requestId, providerId]);

  const fetchExistingRating = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('provider_ratings' as any)
      .select('*')
      .eq('request_id', requestId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) {
      const d = data as any;
      setExistingRating(d);
      setRating(d.rating);
      setComment(d.comment || '');
    }
  };

  const fetchAvgRating = async () => {
    const { data } = await supabase
      .from('provider_ratings' as any)
      .select('rating')
      .eq('provider_id', providerId);
    if (data && (data as any[]).length > 0) {
      const ratings = data as any[];
      const avg = ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length;
      setAvgRating(Math.round(avg * 10) / 10);
      setTotalRatings(ratings.length);
    }
  };

  const handleSubmit = async () => {
    if (!user || rating === 0) {
      toast.error('Please select a star rating');
      return;
    }
    setSending(true);

    const payload = {
      request_id: requestId,
      user_id: user.id,
      provider_id: providerId,
      rating,
      comment: comment.trim() || null,
    };

    let error;
    if (existingRating) {
      ({ error } = await supabase
        .from('provider_ratings' as any)
        .update({ rating, comment: comment.trim() || null } as any)
        .eq('id', existingRating.id));
    } else {
      ({ error } = await supabase
        .from('provider_ratings' as any)
        .insert(payload as any));
    }

    if (error) {
      toast.error('Failed to submit rating');
      console.error(error);
    } else {
      toast.success(existingRating ? 'Rating updated!' : 'Thank you for your rating!');
      fetchExistingRating();
      fetchAvgRating();
    }
    setSending(false);
  };

  const displayRating = hoverRating || rating;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
          Rate Provider
        </CardTitle>
        <CardDescription>
          How would you rate <span className="font-semibold text-foreground">{providerName}</span>?
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Star Rating */}
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-0.5 transition-transform hover:scale-110 focus:outline-none"
              disabled={!!existingRating}
            >
              <Star
                className={cn(
                  'h-8 w-8 transition-colors',
                  star <= displayRating
                    ? 'text-amber-500 fill-amber-500'
                    : 'text-muted-foreground/30'
                )}
              />
            </button>
          ))}
          {displayRating > 0 && (
            <span className="ml-2 text-sm font-medium text-muted-foreground">
              {displayRating}/5
            </span>
          )}
        </div>

        {/* Comment */}
        {!existingRating && (
          <>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={`Share your experience with ${providerName}...`}
              rows={2}
              className="bg-background"
            />
            <Button onClick={handleSubmit} disabled={rating === 0 || sending} className="w-full">
              <Send className="mr-2 h-4 w-4" />
              {sending ? 'Submitting...' : 'Submit Rating'}
            </Button>
          </>
        )}

        {existingRating && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-success" />
            You rated this provider {existingRating.rating}/5
            {existingRating.comment && (
              <span className="italic">— "{existingRating.comment}"</span>
            )}
          </div>
        )}

        {/* Average Rating */}
        {avgRating !== null && (
          <div className="pt-2 border-t flex items-center gap-2 text-sm">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={cn(
                    'h-3.5 w-3.5',
                    s <= Math.round(avgRating)
                      ? 'text-amber-500 fill-amber-500'
                      : 'text-muted-foreground/30'
                  )}
                />
              ))}
            </div>
            <span className="font-medium">{avgRating}</span>
            <span className="text-muted-foreground">
              average from {totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
