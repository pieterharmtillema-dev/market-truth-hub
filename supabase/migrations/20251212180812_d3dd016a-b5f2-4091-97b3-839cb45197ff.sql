-- Allow users to delete their own positions
CREATE POLICY "Users can delete their own positions"
ON public.positions
FOR DELETE
USING (auth.uid() = user_id);

-- Allow users to delete their own trade logs
CREATE POLICY "Users can delete their own trade logs"
ON public.trade_log
FOR DELETE
USING (auth.uid() = user_id);