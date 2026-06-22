-- Policy to ensure admins can view all sales analytics records
CREATE POLICY "Admins can view all sales analytics"
  ON public.sales_analytics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.platform_role = 'admin'
    )
  );
