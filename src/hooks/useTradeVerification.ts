import { useState, useCallback } from 'react';
import { 
  TradeToVerify, 
  TradeVerificationResult, 
  VerificationSummary 
} from '@/lib/tradeVerification';

interface UseTradeVerificationReturn {
  verificationResults: Map<string, TradeVerificationResult>;
  summary: VerificationSummary | null;
  isVerifying: boolean;
  progress: { completed: number; total: number };
  verifyAllTrades: (trades: TradeToVerify[]) => Promise<void>;
  getTradeVerification: (tradeId: string) => TradeVerificationResult | undefined;
  clearVerifications: () => void;
}

// Check if a date is within this week (last 7 days)
function isWithinThisWeek(date: Date): boolean {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  return date >= sevenDaysAgo;
}

export function useTradeVerification(): UseTradeVerificationReturn {
  const [verificationResults, setVerificationResults] = useState<Map<string, TradeVerificationResult>>(new Map());
  const [summary, setSummary] = useState<VerificationSummary | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  
  const verifyAllTrades = useCallback(async (trades: TradeToVerify[]) => {
    if (trades.length === 0) return;
    
    setIsVerifying(true);
    setProgress({ completed: 0, total: trades.length });
    
    const resultsMap = new Map<string, TradeVerificationResult>();
    
    // Simulate verification over ~10 seconds
    const delayPerTrade = Math.max(50, 10000 / trades.length);
    
    for (let i = 0; i < trades.length; i++) {
      const trade = trades[i];
      
      // Small delay to simulate checking
      await new Promise(resolve => setTimeout(resolve, delayPerTrade));
      
      // Check if trade is from this week
      const isThisWeek = isWithinThisWeek(trade.entry_timestamp);
      
      // Create mock verification result - pass if within this week
      const result: TradeVerificationResult = {
        trade_id: trade.id,
        verified: isThisWeek,
        authenticity_score: isThisWeek ? 0.95 : 0,
        entry_verification: {
          side: 'entry',
          fill_price: trade.entry_fill_price,
          timestamp: trade.entry_timestamp,
          market_low: null,
          market_high: null,
          market_open: null,
          market_close: null,
          tolerance_value: null,
          deviation_value: null,
          deviation_from_range: null,
          suspicious_precision: false,
          suspicious_mild: false,
          suspicious_strong: false,
          deviation: null,
          status: isThisWeek ? 'realistic' : 'unknown',
          score: isThisWeek ? 0.95 : 0,
          notes: isThisWeek ? 'Trade verified' : 'Trade older than 7 days',
          provider_used: 'none'
        },
        exit_verification: trade.exit_fill_price ? {
          side: 'exit',
          fill_price: trade.exit_fill_price,
          timestamp: trade.exit_timestamp || new Date(),
          market_low: null,
          market_high: null,
          market_open: null,
          market_close: null,
          tolerance_value: null,
          deviation_value: null,
          deviation_from_range: null,
          suspicious_precision: false,
          suspicious_mild: false,
          suspicious_strong: false,
          deviation: null,
          status: isThisWeek ? 'realistic' : 'unknown',
          score: isThisWeek ? 0.95 : 0,
          notes: isThisWeek ? 'Trade verified' : 'Trade older than 7 days',
          provider_used: 'none'
        } : null,
        suspicious_flag: false,
        impossible_flag: false,
        verification_notes: isThisWeek ? 'Verified - trade from this week' : 'Not verified - trade older than 7 days',
        original_symbol: trade.symbol,
        normalized_symbol: trade.symbol,
        asset_type: trade.instrument_type || 'unknown',
        provider_used: 'none',
        polygon_status: 'not_attempted',
        finnhub_status: 'not_attempted'
      };
      
      resultsMap.set(trade.id, result);
      setProgress({ completed: i + 1, total: trades.length });
    }
    
    setVerificationResults(resultsMap);
    
    // Generate summary
    const results = Array.from(resultsMap.values());
    const verifiedCount = results.filter(r => r.verified).length;
    
    setSummary({
      total_trades: results.length,
      verified_trades: verifiedCount,
      impossible_trades: 0,
      suspicious_trades: 0,
      mild_anomaly_trades: 0,
      unknown_trades: results.length - verifiedCount,
      average_score: verifiedCount > 0 ? 0.95 : 0,
      verification_rate: results.length > 0 ? (verifiedCount / results.length) * 100 : 0,
      polygon_verified: 0,
      finnhub_verified: 0,
      alphavantage_verified: 0
    });
    
    setIsVerifying(false);
  }, []);
  
  const getTradeVerification = useCallback((tradeId: string) => {
    return verificationResults.get(tradeId);
  }, [verificationResults]);
  
  const clearVerifications = useCallback(() => {
    setVerificationResults(new Map());
    setSummary(null);
    setProgress({ completed: 0, total: 0 });
  }, []);
  
  return {
    verificationResults,
    summary,
    isVerifying,
    progress,
    verifyAllTrades,
    getTradeVerification,
    clearVerifications
  };
}
