import { useState, useCallback, useMemo } from 'react';
import { Upload, FileText, X, Loader2, Download, CheckCircle2, BarChart3, ShieldCheck, AlertTriangle, ChevronDown, ChevronUp, XCircle, HelpCircle, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { analyzeTradesCSV, generateOrdersTestCSV, TradeAnalysisResult } from '@/lib/tradeAnalyzer';
import { TradeAnalysisView } from './TradeAnalysisView';
import { Progress } from '@/components/ui/progress';
import { useTradeVerification } from '@/hooks/useTradeVerification';
import { TradeToVerify, TradeVerificationResult } from '@/lib/tradeVerification';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';

interface OrderCSVImporterProps {
  onImportComplete?: () => void;
}

export function OrderCSVImporter({ onImportComplete }: OrderCSVImporterProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<TradeAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const { toast } = useToast();
  
  const { 
    isVerifying, 
    progress: verifyProgress, 
    summary: verifySummary,
    verificationResults,
    verifyAllTrades,
    clearVerifications 
  } = useTradeVerification();

  const handleFileAnalyze = useCallback(async (selectedFile: File) => {
    setIsAnalyzing(true);
    try {
      const text = await selectedFile.text();
      const result = analyzeTradesCSV(text);
      setAnalysis(result);
      setFile(selectedFile);
      
      toast({
        title: 'Analysis Complete',
        description: `Found ${result.matchedTrades.length} matched trades from ${result.parseResult.orders.length} orders`,
      });
    } catch (error) {
      toast({
        title: 'Analysis Error',
        description: error instanceof Error ? error.message : 'Failed to analyze CSV',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === 'text/csv' || droppedFile?.name.endsWith('.csv')) {
      handleFileAnalyze(droppedFile);
    } else {
      toast({ title: 'Invalid file', description: 'Please upload a CSV file', variant: 'destructive' });
    }
  }, [toast, handleFileAnalyze]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFileAnalyze(selectedFile);
  };

  // State for unverified trades collapsible, filter, and expanded view
  const [showUnverified, setShowUnverified] = useState(false);
  const [unverifiedFilter, setUnverifiedFilter] = useState<'all' | 'impossible' | 'suspicious' | 'unknown' | 'lowscore' | 'old'>('all');
  const [expandedList, setExpandedList] = useState(false);

  // 7-day cutoff date
  const sevenDaysAgo = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  // Check if trade is within last 7 days
  const isWithinSevenDays = useCallback((trade: { entryTime: Date }) => {
    return trade.entryTime >= sevenDaysAgo;
  }, [sevenDaysAgo]);

  // Get only verified trades for import (must be within 7 days)
  const getVerifiedTrades = useCallback(() => {
    if (!analysis || !verificationResults.size) return [];
    
    return analysis.matchedTrades.filter((trade, idx) => {
      const result = verificationResults.get(`temp-${idx}`);
      return result?.verified === true && isWithinSevenDays(trade);
    });
  }, [analysis, verificationResults, isWithinSevenDays]);

  // Count trades older than 7 days
  const oldTradesCount = useMemo(() => {
    if (!analysis) return 0;
    return analysis.matchedTrades.filter(trade => !isWithinSevenDays(trade)).length;
  }, [analysis, isWithinSevenDays]);

  // Get unverified trades with their verification results (including old trades)
  const getUnverifiedTradesWithResults = useCallback((): Array<{ trade: typeof analysis.matchedTrades[0]; result: TradeVerificationResult; index: number; category: 'impossible' | 'suspicious' | 'unknown' | 'lowscore' | 'old' }> => {
    if (!analysis || !verificationResults.size) return [];
    
    return analysis.matchedTrades
      .map((trade, idx) => {
        const result = verificationResults.get(`temp-${idx}`);
        if (!result) return null;
        
        // Check if trade is too old first
        if (!isWithinSevenDays(trade)) {
          return { trade, result, index: idx, category: 'old' as const };
        }
        
        // Skip verified trades
        if (result.verified) return null;
        
        // Categorize the trade
        let category: 'impossible' | 'suspicious' | 'unknown' | 'lowscore';
        if (result.impossible_flag) {
          category = 'impossible';
        } else if (result.entry_verification.status === 'unknown' || result.exit_verification?.status === 'unknown') {
          category = 'unknown';
        } else if (result.suspicious_flag) {
          category = 'suspicious';
        } else {
          category = 'lowscore';
        }
        
        return { trade, result, index: idx, category };
      })
      .filter((item): item is { trade: typeof analysis.matchedTrades[0]; result: TradeVerificationResult; index: number; category: 'impossible' | 'suspicious' | 'unknown' | 'lowscore' | 'old' } => 
        item !== null
      );
  }, [analysis, verificationResults, isWithinSevenDays]);

  const verifiedTradeCount = getVerifiedTrades().length;
  const unverifiedTrades = getUnverifiedTradesWithResults();
  const unverifiedTradeCount = unverifiedTrades.length;
  
  // Filter counts
  const impossibleCount = unverifiedTrades.filter(t => t.category === 'impossible').length;
  const suspiciousCount = unverifiedTrades.filter(t => t.category === 'suspicious').length;
  const unknownCount = unverifiedTrades.filter(t => t.category === 'unknown').length;
  const lowScoreCount = unverifiedTrades.filter(t => t.category === 'lowscore').length;
  const oldCount = unverifiedTrades.filter(t => t.category === 'old').length;
  
  // Filtered trades based on selected tab
  const filteredUnverifiedTrades = unverifiedFilter === 'all' 
    ? unverifiedTrades 
    : unverifiedTrades.filter(t => t.category === unverifiedFilter);

  const handleImport = async () => {
    if (!analysis) return;

    setIsImporting(true);
    setImportProgress(0);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Error', description: 'You must be logged in to import trades', variant: 'destructive' });
        return;
      }

      // Only import verified trades
      const trades = getVerifiedTrades();
      if (trades.length === 0) {
        toast({ title: 'No verified trades', description: 'No verified trades to import', variant: 'destructive' });
        return;
      }

      // Process in batches
      const BATCH_SIZE = 50;
      let imported = 0;

      for (let i = 0; i < trades.length; i += BATCH_SIZE) {
        const batch = trades.slice(i, i + BATCH_SIZE);
        
        const tradesData = batch.map(trade => ({
          user_id: user.id,
          asset: trade.symbol,
          direction: trade.side,
          entry_price: trade.entryPrice,
          exit_price: trade.exitPrice,
          entry_date: trade.entryTime.toISOString(),
          exit_date: trade.exitTime.toISOString(),
          entry_datetime_utc: trade.entryTime.toISOString(),
          exit_datetime_utc: trade.exitTime.toISOString(),
          quantity: trade.quantity,
          profit_loss: trade.netPnL,
          commission: trade.totalCommission,
          leverage: trade.leverage || null,
          margin: trade.margin || null,
          instrument_type: 'other' as const,
          group_symbol: trade.symbol,
          notes: `Entry Order: ${trade.entryOrderId || 'N/A'}, Exit Order: ${trade.exitOrderId || 'N/A'}`,
        }));

        const { error, data } = await supabase
          .from('trader_trades')
          .insert(tradesData)
          .select();

        if (error) {
          console.error('Import error:', error);
        } else {
          imported += data?.length || tradesData.length;
        }

        setImportProgress(Math.round(((i + batch.length) / trades.length) * 100));
      }

      toast({
        title: 'Import Complete',
        description: `Successfully imported ${imported} verified trades${unverifiedTradeCount > 0 ? ` (${unverifiedTradeCount} unverified skipped)` : ''}`,
      });

      setFile(null);
      setAnalysis(null);
      onImportComplete?.();
    } catch (error) {
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Failed to import trades',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  const handleDownloadTemplate = () => {
    const csv = generateOrdersTestCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orders_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setFile(null);
    setAnalysis(null);
    setIsVerified(false);
    clearVerifications();
  };

  const handleVerify = async () => {
    if (!analysis) return;
    
    const tradesToVerify: TradeToVerify[] = analysis.matchedTrades.map((trade, idx) => ({
      id: `temp-${idx}`,
      symbol: trade.symbol,
      entry_fill_price: trade.entryPrice,
      exit_fill_price: trade.exitPrice,
      entry_timestamp: trade.entryTime,
      exit_timestamp: trade.exitTime,
      side: trade.side,
      quantity: trade.quantity,
    }));
    
    await verifyAllTrades(tradesToVerify);
    setIsVerified(true);
    
    toast({
      title: 'Verification Complete',
      description: 'Your trades have been verified against market data',
    });
  };

  if (isAnalyzing) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardContent className="py-12 flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Analyzing trade orders...</p>
          <p className="text-sm text-muted-foreground">Matching buy/sell pairs using FIFO...</p>
        </CardContent>
      </Card>
    );
  }

  if (analysis) {
    return (
      <div className="space-y-4">
        {/* File info header */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {file?.name}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          {isImporting && (
            <CardContent className="pt-0">
              <div className="space-y-2">
                <Progress value={importProgress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  Importing... {importProgress}%
                </p>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Analysis View */}
        <TradeAnalysisView analysis={analysis} />

        {/* Verification Animation */}
        {isVerifying && (
          <Card className="border-primary/30 bg-primary/5 overflow-hidden">
            <CardContent className="py-8">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-primary/20 flex items-center justify-center">
                    <ShieldCheck className="h-8 w-8 text-primary animate-pulse" />
                  </div>
                  <div 
                    className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin"
                    style={{ animationDuration: '1s' }}
                  />
                </div>
                <div className="text-center">
                  <p className="font-medium text-foreground">Verifying Trades</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Checking {verifyProgress.completed} of {verifyProgress.total} trades...
                  </p>
                </div>
                <Progress 
                  value={(verifyProgress.completed / Math.max(verifyProgress.total, 1)) * 100} 
                  className="w-48 h-2" 
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Verification Result */}
        {isVerified && verifySummary && !isVerifying && (
          verifySummary.verified_trades > 0 && verifySummary.average_score >= 0.5 ? (
            // Show green or yellow based on anomalies
            verifySummary.mild_anomaly_trades === 0 && verifySummary.suspicious_trades === 0 ? (
              // Pure green - all verified, no anomalies
              <Card className="border-green-500/30 bg-green-500/5">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <ShieldCheck className="h-5 w-5 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-green-600 dark:text-green-400">Verification Passed</p>
                      <p className="text-sm text-muted-foreground">
                        {verifySummary.verified_trades} of {verifySummary.total_trades} trades verified • 
                        Score: {(verifySummary.average_score * 100).toFixed(0)}%
                      </p>
                      <div className="text-xs text-muted-foreground/80 mt-1 flex flex-wrap gap-x-3">
                        {verifySummary.polygon_verified > 0 && (
                          <span>Polygon: {verifySummary.polygon_verified}</span>
                        )}
                        {verifySummary.finnhub_verified > 0 && (
                          <span>Finnhub: {verifySummary.finnhub_verified}</span>
                        )}
                        {verifySummary.alphavantage_verified > 0 && (
                          <span>AlphaVantage: {verifySummary.alphavantage_verified}</span>
                        )}
                        {verifySummary.unknown_trades > 0 && (
                          <span className="text-muted-foreground">No data: {verifySummary.unknown_trades}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              // Yellow - verified with minor anomalies
              <Card className="border-yellow-500/30 bg-yellow-500/5">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-yellow-600 dark:text-yellow-400">Verified with Minor Anomalies</p>
                      <p className="text-sm text-muted-foreground">
                        {verifySummary.verified_trades} of {verifySummary.total_trades} trades verified • 
                        Score: {(verifySummary.average_score * 100).toFixed(0)}%
                      </p>
                      <div className="text-xs text-muted-foreground/80 mt-1 flex flex-wrap gap-x-3">
                        {verifySummary.mild_anomaly_trades > 0 && (
                          <span className="text-yellow-600">Slight deviations: {verifySummary.mild_anomaly_trades}</span>
                        )}
                        {verifySummary.suspicious_trades > 0 && (
                          <span className="text-yellow-600">Suspicious precision: {verifySummary.suspicious_trades}</span>
                        )}
                        {verifySummary.polygon_verified > 0 && (
                          <span>Polygon: {verifySummary.polygon_verified}</span>
                        )}
                        {verifySummary.finnhub_verified > 0 && (
                          <span>Finnhub: {verifySummary.finnhub_verified}</span>
                        )}
                        {verifySummary.alphavantage_verified > 0 && (
                          <span>AlphaVantage: {verifySummary.alphavantage_verified}</span>
                        )}
                      </div>
                      <p className="text-xs text-yellow-600/80 mt-2">
                        Some fills are slightly outside tolerance but within acceptable margin.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          ) : (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="py-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-destructive">Verification Not Passed</p>
                    <p className="text-sm text-muted-foreground">
                      Only {verifySummary.verified_trades} of {verifySummary.total_trades} trades could be verified • 
                      Score: {(verifySummary.average_score * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
                
                {/* Detailed breakdown */}
                <div className="bg-destructive/10 rounded-lg p-3 text-sm space-y-2">
                  <p className="font-medium text-destructive">Why verification failed:</p>
                  <ul className="space-y-1 text-muted-foreground text-xs">
                    {verifySummary.impossible_trades > 0 && (
                      <li className="flex items-start gap-2">
                        <span className="text-destructive">•</span>
                        <span><strong>{verifySummary.impossible_trades} impossible trade{verifySummary.impossible_trades > 1 ? 's' : ''}</strong> — fill prices far outside tolerance (fraud detected)</span>
                      </li>
                    )}
                    {verifySummary.unknown_trades > 0 && (
                      <li className="flex items-start gap-2">
                        <span className="text-muted-foreground">•</span>
                        <span><strong>{verifySummary.unknown_trades} unknown trade{verifySummary.unknown_trades > 1 ? 's' : ''}</strong> — no market data available from any provider</span>
                      </li>
                    )}
                    {verifySummary.average_score < 0.5 && verifySummary.impossible_trades === 0 && (
                      <li className="flex items-start gap-2">
                        <span className="text-muted-foreground">•</span>
                        <span>Average authenticity score ({(verifySummary.average_score * 100).toFixed(0)}%) below 50% threshold</span>
                      </li>
                    )}
                  </ul>
                  
                  {/* Show first few problematic trades */}
                  {(() => {
                    const problemTrades = Array.from(verificationResults.values())
                      .filter(r => r.impossible_flag || r.suspicious_flag || r.unsupported_reason)
                      .slice(0, 4);
                    
                    if (problemTrades.length > 0) {
                      return (
                        <div className="mt-2 pt-2 border-t border-destructive/20">
                          <p className="font-medium text-destructive mb-1">Sample issues:</p>
                          {problemTrades.map((trade, i) => (
                            <p key={i} className="text-xs text-muted-foreground truncate">
                              <span className="font-mono">{trade.original_symbol}</span>
                              {trade.normalized_symbol && trade.normalized_symbol !== trade.original_symbol && (
                                <span className="text-muted-foreground/60"> → {trade.normalized_symbol}</span>
                              )}
                              : {trade.unsupported_reason || trade.entry_verification.notes || trade.exit_verification?.notes || 'Verification failed'}
                            </p>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </CardContent>
            </Card>
          )
        )}

        {/* Unverified Trades Details */}
        {isVerified && unverifiedTradeCount > 0 && (
          <Collapsible open={showUnverified} onOpenChange={setShowUnverified}>
            <Card className="border-border/50 bg-card/50">
              <CollapsibleTrigger asChild>
                <CardHeader className="py-3 cursor-pointer hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-destructive" />
                        {unverifiedTradeCount} Unverified Trade{unverifiedTradeCount !== 1 ? 's' : ''} (will not be imported)
                      </CardTitle>
                      {/* Breakdown by type */}
                      <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3">
                        {impossibleCount > 0 && <span className="text-destructive">Impossible: {impossibleCount}</span>}
                        {suspiciousCount > 0 && <span className="text-yellow-500">Suspicious: {suspiciousCount}</span>}
                        {unknownCount > 0 && <span>No data: {unknownCount}</span>}
                        {lowScoreCount > 0 && <span>Low score: {lowScoreCount}</span>}
                      </div>
                    </div>
                    {showUnverified ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 pb-3 space-y-3">
                  {/* Filter tabs */}
                  <div className="flex flex-wrap gap-1">
                    <Button
                      variant={unverifiedFilter === 'all' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={(e) => { e.stopPropagation(); setUnverifiedFilter('all'); }}
                    >
                      All ({unverifiedTradeCount})
                    </Button>
                    {impossibleCount > 0 && (
                      <Button
                        variant={unverifiedFilter === 'impossible' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="h-7 text-xs text-destructive"
                        onClick={(e) => { e.stopPropagation(); setUnverifiedFilter('impossible'); }}
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Impossible ({impossibleCount})
                      </Button>
                    )}
                    {suspiciousCount > 0 && (
                      <Button
                        variant={unverifiedFilter === 'suspicious' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="h-7 text-xs text-yellow-600"
                        onClick={(e) => { e.stopPropagation(); setUnverifiedFilter('suspicious'); }}
                      >
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Suspicious ({suspiciousCount})
                      </Button>
                    )}
                    {unknownCount > 0 && (
                      <Button
                        variant={unverifiedFilter === 'unknown' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={(e) => { e.stopPropagation(); setUnverifiedFilter('unknown'); }}
                      >
                        <HelpCircle className="h-3 w-3 mr-1" />
                        No Data ({unknownCount})
                      </Button>
                    )}
                    {lowScoreCount > 0 && (
                      <Button
                        variant={unverifiedFilter === 'lowscore' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={(e) => { e.stopPropagation(); setUnverifiedFilter('lowscore'); }}
                      >
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Low Score ({lowScoreCount})
                      </Button>
                    )}
                    {oldCount > 0 && (
                      <Button
                        variant={unverifiedFilter === 'old' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={(e) => { e.stopPropagation(); setUnverifiedFilter('old'); }}
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        Too Old ({oldCount})
                      </Button>
                    )}
                  </div>
                  
                  <div className={expandedList ? "" : "max-h-[250px] overflow-y-auto"}>
                    <div className="space-y-2">
                      {filteredUnverifiedTrades.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No trades in this category
                        </p>
                      ) : (
                        filteredUnverifiedTrades.map(({ trade, result, index, category }) => (
                          <div 
                            key={index} 
                            className="p-2 rounded-lg bg-muted/30 border border-border/30 text-xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  {category === 'impossible' ? (
                                    <XCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                                  ) : category === 'suspicious' ? (
                                    <AlertCircle className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" />
                                  ) : category === 'unknown' ? (
                                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                  ) : category === 'old' ? (
                                    <Clock className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                                  ) : (
                                    <AlertTriangle className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                                  )}
                                  <span className="font-medium font-mono truncate">
                                    {trade.symbol}
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                    trade.side === 'long' ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-600'
                                  }`}>
                                    {trade.side.toUpperCase()}
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                    category === 'impossible' ? 'bg-destructive/20 text-destructive' :
                                    category === 'suspicious' ? 'bg-yellow-500/20 text-yellow-600' :
                                    category === 'unknown' ? 'bg-muted text-muted-foreground' :
                                    category === 'old' ? 'bg-amber-500/20 text-amber-600' :
                                    'bg-orange-500/20 text-orange-600'
                                  }`}>
                                    {category === 'lowscore' ? 'LOW SCORE' : category === 'old' ? 'TOO OLD' : category.toUpperCase()}
                                  </span>
                                </div>
                                <div className="text-muted-foreground space-y-0.5">
                                  <p>
                                    Entry: ${trade.entryPrice.toFixed(4)} @ {trade.entryTime.toLocaleString()}
                                  </p>
                                  <p>
                                    Exit: ${trade.exitPrice.toFixed(4)} @ {trade.exitTime.toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className={`font-medium ${trade.netPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {trade.netPnL >= 0 ? '+' : ''}{trade.netPnL.toFixed(2)}
                                </p>
                                <p className="text-muted-foreground/70 text-[10px]">
                                  Qty: {trade.quantity}
                                </p>
                              </div>
                            </div>
                            {/* Failure reason */}
                            <div className="mt-2 pt-2 border-t border-border/30">
                              <p className={category === 'old' ? 'text-amber-600' : 'text-destructive/90'}>
                                <strong>Reason:</strong>{' '}
                                {category === 'old'
                                  ? 'Trade is older than 7 days (only recent trades can be imported)'
                                  : result.unsupported_reason || 
                                   (category === 'impossible'
                                     ? `${result.entry_verification.notes}${result.exit_verification?.notes ? ` | ${result.exit_verification.notes}` : ''}`
                                     : category === 'suspicious'
                                       ? `${result.entry_verification.notes || result.exit_verification?.notes}`
                                       : category === 'unknown'
                                         ? 'No market data available from any provider'
                                         : `Score too low: ${(result.authenticity_score * 100).toFixed(0)}% (min 50%)`
                                   )}
                              </p>
                              {result.entry_verification.market_low !== null && (
                                <div className="text-muted-foreground/70 mt-1 space-y-0.5">
                                  <p>
                                    Market range: ${result.entry_verification.market_low.toFixed(4)} - ${result.entry_verification.market_high?.toFixed(4)} 
                                    {result.entry_verification.provider_used !== 'none' && ` (via ${result.entry_verification.provider_used})`}
                                  </p>
                                  {result.entry_verification.tolerance_value !== null && (
                                    <p className="text-[10px]">
                                      Tolerance: ±{result.entry_verification.tolerance_value.toFixed(6)} | 
                                      Deviation: {result.entry_verification.deviation_from_range !== null 
                                        ? result.entry_verification.deviation_from_range.toFixed(6) 
                                        : 'N/A'}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  
                  {/* Show more/less button */}
                  {filteredUnverifiedTrades.length > 2 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground"
                      onClick={(e) => { e.stopPropagation(); setExpandedList(!expandedList); }}
                    >
                      {expandedList ? (
                        <>
                          <ChevronUp className="h-3 w-3 mr-1" />
                          Show less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3 mr-1" />
                          Show more ({filteredUnverifiedTrades.length} trades)
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}
        <div className="flex gap-3">
          {!isVerified ? (
            <Button
              onClick={handleVerify}
              disabled={isVerifying || analysis.matchedTrades.length === 0}
              className="flex-1"
              variant="outline"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Verify Trades
                </>
              )}
            </Button>
          ) : verifySummary && verifiedTradeCount > 0 ? (
            <Button
              onClick={handleImport}
              disabled={isImporting || verifiedTradeCount === 0}
              className="flex-1"
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Import {verifiedTradeCount} Verified Trade{verifiedTradeCount !== 1 ? 's' : ''}
                  {unverifiedTradeCount > 0 && (
                    <span className="ml-1 text-xs opacity-70">({unverifiedTradeCount} skipped)</span>
                  )}
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleReset}
              variant="destructive"
              className="flex-1"
            >
              <X className="mr-2 h-4 w-4" />
              Clear & Try Again
            </Button>
          )}
          <Button variant="outline" onClick={handleReset} disabled={isImporting || isVerifying}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-dashed border-2 border-border/50 bg-card/50">
      <CardContent className="p-6">
        <div
          className={`flex flex-col items-center justify-center gap-4 py-8 rounded-lg transition-colors ${
            isDragging ? 'bg-primary/10' : ''
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <BarChart3 className="h-12 w-12 text-muted-foreground" />
          <div className="text-center">
            <p className="font-medium">Drop your order history CSV</p>
            <p className="text-sm text-muted-foreground mt-1">
              Auto-detects columns and matches buy/sell orders
            </p>
          </div>

          <input
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
            id="order-csv-import"
          />
          
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <label htmlFor="order-csv-import" className="cursor-pointer">Browse Files</label>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDownloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Template
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center mt-4 max-w-md space-y-2">
            <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400">
              <Clock className="h-3.5 w-3.5" />
              <p className="font-medium">Only trades from the last 7 days are accepted</p>
            </div>
            <div>
              <p className="font-medium mb-1">Supported fields:</p>
              <p>Symbol, Side (Buy/Sell), Qty, Fill Price, Placing Time, Commission, Leverage, Margin</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
