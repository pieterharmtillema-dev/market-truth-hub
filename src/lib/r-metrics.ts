/**
 * R-Multiple Metrics Calculator
 *
 * Calculates profitability metrics based on R-multiples (risk units) rather than raw PnL.
 * This allows evaluation of trading edge without exposing account size or dollar amounts.
 *
 * Definitions:
 * - 1R = initial risk per trade (entry-to-stop distance)
 * - Realized R = realized_profit / initial_risk
 * - Expectancy = average R gained/lost per trade = sum(realized_R) / N
 * - Profit Factor (R-based) = sum(positive R) / abs(sum(negative R))
 */

export interface TradeWithRisk {
  pnl: number | null;
  entry_price: number;
  exit_price: number | null;
  quantity: number;
  side: 'long' | 'short';
  entry_timestamp: string;
  exit_timestamp: string | null;
  open: boolean;
  // Stop loss price if available (from bracket data)
  stop_price?: number | null;
}

export interface RMetrics {
  // Core metrics
  expectancy: number; // Average R per trade
  profitFactor: number; // Total win R / Total loss R
  winRate: number; // Percentage (0-100)

  // Sample size
  totalTrades: number;
  closedTrades: number;

  // Confidence indicators
  confidence: 'low' | 'medium' | 'high';

  // Validation warnings
  warnings: {
    smallSample: boolean;
    outlierDependent: boolean;
    stopsNotRespected: boolean;
  };

  // Additional context
  dateRange: {
    first: Date | null;
    last: Date | null;
  };

  // Data quality
  verifiable: boolean; // True if we have sufficient stop data
  tradesWithStops: number;
}

/**
 * Calculate initial risk (1R) for a trade
 * Returns null if stop price is not available
 */
export function calculateInitialRisk(trade: TradeWithRisk): number | null {
  if (!trade.stop_price) {
    return null;
  }

  const riskPerShare = Math.abs(trade.entry_price - trade.stop_price);
  return riskPerShare * trade.quantity;
}

/**
 * Calculate realized R for a single trade
 * Returns null if trade is open, has no PnL, or has no stop data
 */
export function calculateRealizedR(trade: TradeWithRisk): number | null {
  if (trade.open || trade.pnl === null || trade.exit_price === null) {
    return null;
  }

  const initialRisk = calculateInitialRisk(trade);
  if (initialRisk === null || initialRisk === 0) {
    return null;
  }

  return trade.pnl / initialRisk;
}

/**
 * Calculate comprehensive R-based metrics from an array of trades
 */
export function calculateRMetrics(trades: TradeWithRisk[]): RMetrics {
  // Filter to closed trades with valid R calculations
  const closedTrades = trades.filter(t => !t.open && t.pnl !== null && t.exit_price !== null);

  const tradesWithR: Array<{ trade: TradeWithRisk; realizedR: number }> = [];

  for (const trade of closedTrades) {
    const realizedR = calculateRealizedR(trade);
    if (realizedR !== null) {
      tradesWithR.push({ trade, realizedR });
    }
  }

  const totalTrades = trades.length;
  const tradesWithStops = tradesWithR.length;
  const verifiable = tradesWithStops > 0;

  // If no verifiable trades, return empty metrics
  if (!verifiable) {
    return {
      expectancy: 0,
      profitFactor: 0,
      winRate: 0,
      totalTrades,
      closedTrades: closedTrades.length,
      confidence: 'low',
      warnings: {
        smallSample: true,
        outlierDependent: false,
        stopsNotRespected: false,
      },
      dateRange: {
        first: null,
        last: null,
      },
      verifiable: false,
      tradesWithStops: 0,
    };
  }

  // Calculate core metrics
  const totalR = tradesWithR.reduce((sum, { realizedR }) => sum + realizedR, 0);
  const expectancy = totalR / tradesWithR.length;

  const winningTrades = tradesWithR.filter(({ realizedR }) => realizedR > 0);
  const losingTrades = tradesWithR.filter(({ realizedR }) => realizedR < 0);

  const totalWinR = winningTrades.reduce((sum, { realizedR }) => sum + realizedR, 0);
  const totalLossR = Math.abs(losingTrades.reduce((sum, { realizedR }) => sum + realizedR, 0));

  const profitFactor = totalLossR === 0
    ? (totalWinR > 0 ? Infinity : 0)
    : totalWinR / totalLossR;

  const winRate = (winningTrades.length / tradesWithR.length) * 100;

  // Confidence based on sample size
  let confidence: 'low' | 'medium' | 'high';
  if (tradesWithR.length < 50) {
    confidence = 'low';
  } else if (tradesWithR.length < 200) {
    confidence = 'medium';
  } else {
    confidence = 'high';
  }

  // Warning: Small sample
  const smallSample = tradesWithR.length < 50;

  // Warning: Outlier dependent
  const sortedByR = [...tradesWithR].sort((a, b) => Math.abs(b.realizedR) - Math.abs(a.realizedR));
  const topTradeR = Math.abs(sortedByR[0]?.realizedR || 0);
  const top5R = sortedByR.slice(0, 5).reduce((sum, { realizedR }) => sum + Math.abs(realizedR), 0);
  const totalAbsR = tradesWithR.reduce((sum, { realizedR }) => sum + Math.abs(realizedR), 0);

  const outlierDependent =
    (topTradeR > totalAbsR * 0.30) ||
    (top5R > totalAbsR * 0.60);

  // Warning: Stops not respected
  // Count trades that lost more than -1.5R (suggesting stop wasn't honored)
  const STOP_VIOLATION_THRESHOLD = -1.5;
  const VIOLATION_PERCENTAGE_THRESHOLD = 0.20; // 20%

  const stopViolations = tradesWithR.filter(({ realizedR }) => realizedR < STOP_VIOLATION_THRESHOLD).length;
  const stopsNotRespected = (stopViolations / tradesWithR.length) > VIOLATION_PERCENTAGE_THRESHOLD;

  // Date range
  const sortedByDate = [...closedTrades].sort(
    (a, b) => new Date(a.entry_timestamp).getTime() - new Date(b.entry_timestamp).getTime()
  );
  const dateRange = {
    first: sortedByDate.length > 0 ? new Date(sortedByDate[0].entry_timestamp) : null,
    last: sortedByDate.length > 0 ? new Date(sortedByDate[sortedByDate.length - 1].entry_timestamp) : null,
  };

  return {
    expectancy,
    profitFactor,
    winRate,
    totalTrades,
    closedTrades: closedTrades.length,
    confidence,
    warnings: {
      smallSample,
      outlierDependent,
      stopsNotRespected,
    },
    dateRange,
    verifiable,
    tradesWithStops,
  };
}

/**
 * Format R value for display
 * Examples: "+2.5R", "-0.8R", "0R"
 */
export function formatR(value: number, decimals: number = 1): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}R`;
}

/**
 * Format profit factor for display
 * Handle infinity and zero cases gracefully
 */
export function formatProfitFactor(pf: number): string {
  if (!isFinite(pf)) {
    return '∞';
  }
  if (pf === 0) {
    return '0';
  }
  return pf.toFixed(2);
}

/**
 * Get color class for expectancy value
 */
export function getExpectancyColor(expectancy: number): string {
  if (expectancy >= 1.0) return 'text-green-500';
  if (expectancy >= 0.3) return 'text-green-400';
  if (expectancy > 0) return 'text-primary';
  if (expectancy === 0) return 'text-muted-foreground';
  if (expectancy > -0.3) return 'text-orange-400';
  return 'text-red-400';
}

/**
 * Get confidence badge styling
 */
export function getConfidenceBadgeStyle(confidence: 'low' | 'medium' | 'high'): {
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
} {
  switch (confidence) {
    case 'high':
      return {
        variant: 'default',
        className: 'bg-green-500/15 text-green-400 border-green-500/30'
      };
    case 'medium':
      return {
        variant: 'secondary',
        className: 'bg-amber-500/15 text-amber-400 border-amber-500/30'
      };
    case 'low':
      return {
        variant: 'outline',
        className: 'bg-muted/50 text-muted-foreground border-border'
      };
  }
}
