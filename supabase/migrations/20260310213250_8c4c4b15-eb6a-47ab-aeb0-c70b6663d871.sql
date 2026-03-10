
CREATE OR REPLACE FUNCTION public.update_provider_avg_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.providers
  SET rating = (
    SELECT ROUND(AVG(rating)::numeric, 1)
    FROM public.provider_ratings
    WHERE provider_id = COALESCE(NEW.provider_id, OLD.provider_id)
  ),
  updated_at = now()
  WHERE id = COALESCE(NEW.provider_id, OLD.provider_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_provider_avg_rating
AFTER INSERT OR UPDATE OR DELETE ON public.provider_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_provider_avg_rating();
