-- Add exit_reason column to track how a position was closed
-- Values: 'manual', 'stop_loss', 'take_profit', 'market', null (for open positions)
ALTER TABLE public.positions 
ADD COLUMN IF NOT EXISTS exit_reason TEXT DEFAULT NULL;

-- Add index for filtering by exit_reason
CREATE INDEX IF NOT EXISTS idx_positions_exit_reason ON public.positions (exit_reason) WHERE exit_reason IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.positions.exit_reason IS 'Reason for exit: manual, stop_loss, take_profit, market, or null if still open';