-- Add foreign key constraints on user_id columns
ALTER TABLE public.profiles
  ADD CONSTRAINT fk_profiles_user_id
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.market_listings
  ADD CONSTRAINT fk_market_listings_user_id
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.advisory_logs
  ADD CONSTRAINT fk_advisory_logs_user_id
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.crop_diagnostics
  ADD CONSTRAINT fk_crop_diagnostics_user_id
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add indexes on user_id columns for query performance
CREATE INDEX idx_market_listings_user_id ON public.market_listings(user_id);
CREATE INDEX idx_advisory_logs_user_id ON public.advisory_logs(user_id);
CREATE INDEX idx_crop_diagnostics_user_id ON public.crop_diagnostics(user_id);
