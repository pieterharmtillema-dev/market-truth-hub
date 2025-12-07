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

  // Get all trades for import (all trades pass now)
  const getVerifiedTrades = useCallback(() => {
    if (!analysis) return [];
    return analysis.matchedTrades;
  }, [analysis]);

  const verifiedTradeCount = getVerifiedTrades().length;

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

      // Get all trades to import
      const trades = getVerifiedTrades();
      if (trades.length === 0) {
        toast({ title: 'No trades', description: 'No trades to import', variant: 'destructive' });
        return;
      }

      // Fetch existing trades for duplicate detection
      const { data: existingTrades } = await supabase
        .from('trader_trades')
        .select('asset, direction, entry_price, exit_price, entry_datetime_utc, quantity')
        .eq('user_id', user.id);

      // Create a set of existing trade signatures for quick lookup
      const existingSignatures = new Set(
        (existingTrades || []).map(t => 
          `${t.asset}|${t.direction}|${t.entry_price}|${t.exit_price}|${t.entry_datetime_utc}|${t.quantity}`
        )
      );

      // Filter out duplicates
      const newTrades = trades.filter(trade => {
        const signature = `${trade.symbol}|${trade.side}|${trade.entryPrice}|${trade.exitPrice}|${trade.entryTime.toISOString()}|${trade.quantity}`;
        return !existingSignatures.has(signature);
      });

      if (newTrades.length === 0) {
        toast({ 
          title: 'No new trades', 
          description: 'All trades already exist in your journal',
          variant: 'default' 
        });
        setFile(null);
        setAnalysis(null);
        return;
      }

      const duplicateCount = trades.length - newTrades.length;

      // Process in batches
      const BATCH_SIZE = 50;
      let imported = 0;

      for (let i = 0; i < newTrades.length; i += BATCH_SIZE) {
        const batch = newTrades.slice(i, i + BATCH_SIZE);
        
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
          notes: null,
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

        setImportProgress(Math.round(((i + batch.length) / newTrades.length) * 100));
      }

      toast({
        title: 'Import Complete',
        description: `Imported ${imported} trades${duplicateCount > 0 ? ` (${duplicateCount} duplicates skipped)` : ''}`,
      });

      toast({
        title: 'Import Complete',
        description: `Successfully imported ${imported} trades`,
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
                  Import {verifiedTradeCount} Trade{verifiedTradeCount !== 1 ? 's' : ''}
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
