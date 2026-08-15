-- 1. Create rate_limits table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  last_request TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  request_count INT NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, endpoint)
);

-- Enable RLS for rate_limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Rate limits are viewable by owner only" ON public.rate_limits;
CREATE POLICY "Rate limits are viewable by owner only"
  ON public.rate_limits FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Create atomic rate limiting function
CREATE OR REPLACE FUNCTION public.increment_rate_limit(
  p_user_id UUID,
  p_endpoint TEXT,
  p_window_seconds INT,
  p_max_requests INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
  v_last_request TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT request_count, last_request INTO v_count, v_last_request
  FROM public.rate_limits
  WHERE user_id = p_user_id AND endpoint = p_endpoint;

  IF NOT FOUND THEN
    INSERT INTO public.rate_limits (user_id, endpoint, last_request, request_count)
    VALUES (p_user_id, p_endpoint, now(), 1);
    RETURN TRUE;
  ELSIF v_last_request < now() - (p_window_seconds || ' seconds')::INTERVAL THEN
    UPDATE public.rate_limits
    SET last_request = now(), request_count = 1
    WHERE user_id = p_user_id AND endpoint = p_endpoint;
    RETURN TRUE;
  ELSIF v_count >= p_max_requests THEN
    RETURN FALSE;
  ELSE
    UPDATE public.rate_limits
    SET request_count = request_count + 1
    WHERE user_id = p_user_id AND endpoint = p_endpoint;
    RETURN TRUE;
  END IF;
END;
$$;

-- 2. Create farms table
CREATE TABLE IF NOT EXISTS public.farms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  acreage NUMERIC,
  soil_type TEXT,
  irrigation_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for farms
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own farms" ON public.farms;
CREATE POLICY "Users can view their own farms"
  ON public.farms FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own farms" ON public.farms;
CREATE POLICY "Users can insert their own farms"
  ON public.farms FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own farms" ON public.farms;
CREATE POLICY "Users can update their own farms"
  ON public.farms FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own farms" ON public.farms;
CREATE POLICY "Users can delete their own farms"
  ON public.farms FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 3. Create farm_crops table
CREATE TABLE IF NOT EXISTS public.farm_crops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  crop TEXT NOT NULL,
  variety TEXT,
  sowing_date DATE,
  expected_harvest_date DATE,
  growth_stage TEXT,
  season TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for farm_crops
ALTER TABLE public.farm_crops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own crops" ON public.farm_crops;
CREATE POLICY "Users can view their own crops"
  ON public.farm_crops FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.farms WHERE farms.id = farm_crops.farm_id AND farms.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can insert their own crops" ON public.farm_crops;
CREATE POLICY "Users can insert their own crops"
  ON public.farm_crops FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.farms WHERE farms.id = farm_crops.farm_id AND farms.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update their own crops" ON public.farm_crops;
CREATE POLICY "Users can update their own crops"
  ON public.farm_crops FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.farms WHERE farms.id = farm_crops.farm_id AND farms.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can delete their own crops" ON public.farm_crops;
CREATE POLICY "Users can delete their own crops"
  ON public.farm_crops FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.farms WHERE farms.id = farm_crops.farm_id AND farms.user_id = auth.uid()
  ));

-- 4. Triggers to update updated_at automatically
DROP TRIGGER IF EXISTS update_farms_updated_at ON public.farms;
CREATE TRIGGER update_farms_updated_at
  BEFORE UPDATE ON public.farms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_farm_crops_updated_at ON public.farm_crops;
CREATE TRIGGER update_farm_crops_updated_at
  BEFORE UPDATE ON public.farm_crops
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for search speed and performance
CREATE INDEX IF NOT EXISTS idx_farms_user_id ON public.farms(user_id);
CREATE INDEX IF NOT EXISTS idx_farm_crops_farm_id ON public.farm_crops(farm_id);

-- 5. Storage security hardening
UPDATE storage.buckets SET public = false WHERE id = 'crop-images';

-- Recreate storage policies to enforce private owners
DROP POLICY IF EXISTS "Users can view crop images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own crop images" ON storage.objects;
CREATE POLICY "Users can view their own crop images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'crop-images' AND auth.uid()::text = (storage.foldername(name))[1]);
