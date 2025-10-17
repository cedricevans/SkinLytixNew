-- Phase 1: Rate Limiting Infrastructure
-- Create rate_limit_log table to track API request rates per IP address
CREATE TABLE IF NOT EXISTS public.rate_limit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  identifier TEXT NOT NULL, -- IP address
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups and cleanup
CREATE INDEX idx_rate_limit_lookup 
  ON public.rate_limit_log(endpoint, identifier, created_at);

-- Enable RLS (service role bypass for edge functions)
ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage (edge functions use service role key)
CREATE POLICY "Service role can manage rate limits"
  ON public.rate_limit_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Rate limit check function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _endpoint TEXT,
  _identifier TEXT,
  _max_requests INTEGER,
  _window_minutes INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _window_start TIMESTAMPTZ;
  _current_count INTEGER;
  _allowed BOOLEAN;
BEGIN
  -- Calculate window start time
  _window_start := NOW() - (INTERVAL '1 minute' * _window_minutes);
  
  -- Count recent requests within the time window
  SELECT COUNT(*) INTO _current_count
  FROM public.rate_limit_log
  WHERE endpoint = _endpoint 
    AND identifier = _identifier 
    AND created_at >= _window_start;
  
  -- Check if limit would be exceeded
  _allowed := _current_count < _max_requests;
  
  -- If allowed, log this request
  IF _allowed THEN
    INSERT INTO public.rate_limit_log (endpoint, identifier)
    VALUES (_endpoint, _identifier);
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', _allowed,
    'current_count', _current_count + 1,
    'max_requests', _max_requests,
    'window_minutes', _window_minutes,
    'retry_after_seconds', _window_minutes * 60
  );
END;
$$;

-- Phase 3: Monitoring - Create abuse detection view
CREATE OR REPLACE VIEW public.rate_limit_abuse_alerts AS
SELECT 
  endpoint,
  identifier AS ip_address,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '5 minutes') as requests_last_5min,
  MIN(created_at) as first_request,
  MAX(created_at) as last_request
FROM public.rate_limit_log
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY endpoint, identifier
HAVING COUNT(*) > 100  -- Flag IPs with >100 requests in past hour
ORDER BY total_requests DESC;