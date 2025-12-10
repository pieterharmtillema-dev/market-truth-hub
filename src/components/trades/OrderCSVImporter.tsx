import { useState, useCallback } from 'react';
import { Upload, FileText, X, Loader2, Download, CheckCircle2, BarChart3, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { analyzeTradesCSV, generateOrdersTestCSV, TradeAnalysisResult } from '@/lib/tradeAnalyzer';
import { TradeAnalysisView } from './TradeAnalysisView';
import { Progress } from '@/components/ui/progress';

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
        toast({ title: 'Error', description: 'You must be logged in to import positions', variant: 'destructive' });
        return;
      }

      const trades = analysis.matchedTrades;
      if (trades.length === 0) {
        toast({ title: 'No trades', description: 'No trades to import', variant: 'destructive' });
        return;
      }

      // Fetch existing positions for duplicate detection
      const { data: existingPositions } = await supabase
        .from('positions')
        .select('symbol, side, entry_price, exit_price, entry_timestamp, quantity')
        .eq('user_id', user.id);

      // Create a set of existing position signatures for quick lookup
      const existingSignatures = new Set(
        (existingPositions || []).map(p => 
          `${p.symbol}|${p.side}|${p.entry_price}|${p.exit_price}|${p.entry_timestamp}|${p.quantity}`
        )
      );

      // Filter out duplicates
      const newTrades = trades.filter(trade => {
        const signature = `${trade.symbol}|${trade.side}|${trade.entryPrice}|${trade.exitPrice}|${trade.entryTime.toISOString()}|${trade.quantity}`;
        return !existingSignatures.has(signature);
      });

      if (newTrades.length === 0) {
        toast({ 
          title: 'No new positions', 
          description: 'All positions already exist',
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
        
        const positionsData = batch.map(trade => ({
          user_id: user.id,
          symbol: trade.symbol,
          side: trade.side,
          entry_price: trade.entryPrice,
          exit_price: trade.exitPrice,
          entry_timestamp: trade.entryTime.toISOString(),
          exit_timestamp: trade.exitTime.toISOString(),
          quantity: trade.quantity,
          pnl: trade.netPnL,
          platform: 'CSV Import',
          open: false,
        }));

        const { error, data } = await supabase
          .from('positions')
          .insert(positionsData)
          .select();

        if (error) {
          console.error('Import error:', error);
        } else {
          imported += data?.length || positionsData.length;
        }

        setImportProgress(Math.round(((i + batch.length) / newTrades.length) * 100));
      }

      toast({
        title: 'Import Complete',
        description: `Imported ${imported} positions${duplicateCount > 0 ? ` (${duplicateCount} duplicates skipped)` : ''}`,
      });

      setFile(null);
      setAnalysis(null);
      onImportComplete?.();
    } catch (error) {
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Failed to import positions',
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

        {/* Import Actions */}
        <Card className="border-border/50 bg-card/50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="font-medium text-green-600 dark:text-green-400">Ready to Import</p>
                  <p className="text-sm text-muted-foreground">
                    {analysis.matchedTrades.length} matched trades found
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleImport} 
                disabled={isImporting || analysis.matchedTrades.length === 0}
                className="gap-2"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Import {analysis.matchedTrades.length} Positions
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
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
          <Upload className="h-12 w-12 text-muted-foreground" />
          <div className="text-center">
            <p className="font-medium">Drop your order history CSV here</p>
            <p className="text-sm text-muted-foreground">Orders will be matched into positions using FIFO</p>
          </div>

          <input
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
            id="order-csv-upload"
          />
          
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <label htmlFor="order-csv-upload" className="cursor-pointer">Browse Files</label>
            </Button>
            <Button variant="ghost" onClick={handleDownloadTemplate} className="gap-2">
              <Download className="h-4 w-4" />
              Template
            </Button>
          </div>
        </div>

        <div className="mt-4 text-xs text-muted-foreground">
          <p className="font-medium mb-1">Supported columns:</p>
          <p>symbol, side, quantity, fill_price, placing_time, commission, limit_price, stop_price</p>
          <p className="mt-2">The importer automatically matches buy/sell orders by symbol using FIFO pairing.</p>
        </div>
      </CardContent>
    </Card>
  );
}
