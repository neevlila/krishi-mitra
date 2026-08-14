-- Add DELETE policies for advisory_logs and crop_diagnostics
CREATE POLICY "Users can delete their own diagnostics"
  ON public.crop_diagnostics
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own advisory logs"
  ON public.advisory_logs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
