import { useState, useCallback } from 'react';
import { Upload, FileText, X, Loader2, Download, CheckCircle2, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { analyzeTradesCSV, generateOrdersTestCSV, TradeAnalysisResult } from '@/lib/tradeAnalyzer';
import { TradeAnalysisView } from './TradeAnalysisView';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const { toast } = useToast();

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

      const trades = analysis.matchedTrades;
      if (trades.length === 0) {
        toast({ title: 'No trades to import', description: 'No matched trades found', variant: 'destructive' });
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

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={handleImport}
            disabled={isImporting || analysis.matchedTrades.length === 0}
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
                Import {analysis.matchedTrades.length} Trades
              </>
            )}
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={isImporting}>
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

          <div className="text-xs text-muted-foreground text-center mt-4 max-w-md">
            <p className="font-medium mb-1">Supported fields:</p>
            <p>Symbol, Side (Buy/Sell), Qty, Fill Price, Placing Time, Commission, Leverage, Margin</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
