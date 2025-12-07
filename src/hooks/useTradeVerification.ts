import { useState, useCallback } from 'react';
import { 
  verifyTrades, 
  TradeToVerify, 
  TradeVerificationResult, 
  VerificationSummary,
  generateVerificationSummary 
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

export function useTradeVerification(): UseTradeVerificationReturn {
  const [verificationResults, setVerificationResults] = useState<Map<string, TradeVerificationResult>>(new Map());
  const [summary, setSummary] = useState<VerificationSummary | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  
  const verifyAllTrades = useCallback(async (trades: TradeToVerify[]) => {
    if (trades.length === 0) return;
    
    setIsVerifying(true);
    setProgress({ completed: 0, total: trades.length });
    
    try {
      const results = await verifyTrades(trades, (completed, total) => {
        setProgress({ completed, total });
      });
      
      // Build results map
      const resultsMap = new Map<string, TradeVerificationResult>();
      results.forEach(result => {
        resultsMap.set(result.trade_id, result);
      });
      
      setVerificationResults(resultsMap);
      setSummary(generateVerificationSummary(results));
    } finally {
      setIsVerifying(false);
    }
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
