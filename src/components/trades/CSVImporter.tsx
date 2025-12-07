import { useState, useCallback, useMemo } from 'react';
import { Upload, FileText, X, Loader2, AlertCircle, CheckCircle2, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { parseCSV, CSVParseResult, ParsedTradeRow, generateTestCSV } from '@/lib/csvParser';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';

interface CSVImporterProps {
  onImportComplete?: () => void;
}

export function CSVImporter({ onImportComplete }: CSVImporterProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<CSVParseResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [showFieldMappings, setShowFieldMappings] = useState(false);
  const { toast } = useToast();

  const handleFileParse = useCallback(async (selectedFile: File) => {
    setIsParsing(true);
    try {
      const text = await selectedFile.text();
      const result = parseCSV(text);
      setParseResult(result);
      setFile(selectedFile);
      
      if (result.invalidCount > 0) {
        toast({
          title: 'CSV Parsed with Issues',
          description: `${result.validCount} valid rows, ${result.invalidCount} invalid rows found`,
          variant: 'default',
        });
      } else {
        toast({
          title: 'CSV Parsed Successfully',
          description: `${result.validCount} trades ready to import`,
        });
      }
    } catch (error) {
      toast({
        title: 'Parse Error',
        description: error instanceof Error ? error.message : 'Failed to parse CSV',
        variant: 'destructive',
      });
    } finally {
      setIsParsing(false);
    }
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === 'text/csv' || droppedFile?.name.endsWith('.csv')) {
      handleFileParse(droppedFile);
    } else {
      toast({ title: 'Invalid file', description: 'Please upload a CSV file', variant: 'destructive' });
    }
  }, [toast, handleFileParse]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFileParse(selectedFile);
  };

  const handleImport = async (includeInvalid: boolean = false) => {
    if (!parseResult) return;

    setIsUploading(true);
    setImportProgress(0);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Error', description: 'You must be logged in to import trades', variant: 'destructive' });
        return;
      }

      const rowsToImport = includeInvalid 
        ? parseResult.rows 
        : parseResult.rows.filter(r => r.isValid);

      if (rowsToImport.length === 0) {
        toast({ title: 'No trades to import', description: 'All rows are invalid', variant: 'destructive' });
        return;
      }

      // Process in batches of 100
      const BATCH_SIZE = 100;
      let imported = 0;
      let duplicates = 0;
      let errors = 0;

      for (let i = 0; i < rowsToImport.length; i += BATCH_SIZE) {
        const batch = rowsToImport.slice(i, i + BATCH_SIZE);
        
        const tradesData = batch
          .filter(row => row.isValid)
          .map(row => ({
            user_id: user.id,
            asset: row.data.symbol!,
            direction: row.data.side!,
            entry_price: row.data.entry_price!,
            exit_price: row.data.exit_price!,
            entry_date: row.data.entry_datetime_utc!,
            exit_date: row.data.exit_datetime_utc || null,
            entry_datetime_utc: row.data.entry_datetime_utc!,
            exit_datetime_utc: row.data.exit_datetime_utc || null,
            quantity: row.data.quantity || null,
            profit_loss: row.data.profit_loss || null,
            commission: row.data.commission || 0,
            stop_loss: row.data.stop_loss || null,
            take_profit: row.data.take_profit || null,
            leverage: row.data.leverage || null,
            margin: row.data.margin || null,
            strategy: row.data.strategy || null,
            broker_id: row.data.broker_id || null,
            account_id: row.data.account_id || null,
            instrument_type: row.data.instrument_type || 'other',
            notes: row.data.notes || null,
            group_symbol: row.data.group_symbol || row.data.symbol,
            group_strategy: row.data.group_strategy || null,
            raw_row: row.data.raw_row,
          }));

        if (tradesData.length > 0) {
          const { error, data } = await supabase
            .from('trader_trades')
            .upsert(tradesData, { 
              onConflict: 'user_id,broker_id,account_id,asset,entry_datetime_utc,entry_price',
              ignoreDuplicates: true 
            })
            .select();

          if (error) {
            console.error('Import error:', error);
            errors += batch.length;
          } else {
            imported += data?.length || tradesData.length;
          }
        }

        setImportProgress(Math.round(((i + batch.length) / rowsToImport.length) * 100));
      }

      toast({
        title: 'Import Complete',
        description: `Imported ${imported} trades. ${duplicates} duplicates skipped. ${errors} errors.`,
      });

      setFile(null);
      setParseResult(null);
      onImportComplete?.();
    } catch (error) {
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Failed to import trades',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setImportProgress(0);
    }
  };

  const handleDownloadTemplate = () => {
    const csv = generateTestCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trade_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setFile(null);
    setParseResult(null);
  };

  // Group summary
  const groupSummary = useMemo(() => {
    if (!parseResult) return null;
    
    const validRows = parseResult.rows.filter(r => r.isValid);
    const bySymbol: Record<string, number> = {};
    const byStrategy: Record<string, number> = {};
    
    validRows.forEach(row => {
      if (row.data.symbol) {
        bySymbol[row.data.symbol] = (bySymbol[row.data.symbol] || 0) + 1;
      }
      if (row.data.strategy) {
        byStrategy[row.data.strategy] = (byStrategy[row.data.strategy] || 0) + 1;
      }
    });
    
    return { bySymbol, byStrategy };
  }, [parseResult]);

  if (isParsing) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardContent className="py-12 flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Parsing CSV file...</p>
        </CardContent>
      </Card>
    );
  }

  if (parseResult) {
    return (
      <div className="space-y-4">
        {/* Summary Card */}
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
          <CardContent className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-primary">{parseResult.validCount}</p>
                <p className="text-xs text-muted-foreground">Valid Trades</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-destructive">{parseResult.invalidCount}</p>
                <p className="text-xs text-muted-foreground">Invalid Rows</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{parseResult.detectedTimezone.toUpperCase()}</p>
                <p className="text-xs text-muted-foreground">Timezone</p>
              </div>
            </div>

            {/* Field Mappings */}
            <Collapsible open={showFieldMappings} onOpenChange={setShowFieldMappings}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between" size="sm">
                  <span className="text-sm">Field Mappings ({Object.keys(parseResult.fieldMappings).length} mapped)</span>
                  {showFieldMappings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="flex flex-wrap gap-2">
                  {Object.entries(parseResult.fieldMappings).map(([header, field]) => (
                    <Badge key={header} variant="secondary" className="text-xs">
                      {header} → {field}
                    </Badge>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Group Summary */}
            {groupSummary && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Trade Groups</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(groupSummary.bySymbol).slice(0, 5).map(([symbol, count]) => (
                    <Badge key={symbol} variant="outline">
                      {symbol}: {count}
                    </Badge>
                  ))}
                  {Object.keys(groupSummary.bySymbol).length > 5 && (
                    <Badge variant="outline">+{Object.keys(groupSummary.bySymbol).length - 5} more</Badge>
                  )}
                </div>
              </div>
            )}

            {isUploading && (
              <div className="space-y-2">
                <Progress value={importProgress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  Importing... {importProgress}%
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview Table */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Preview (first 50 rows)</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] rounded-md border">
              <div className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead className="w-10">Status</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Side</TableHead>
                      <TableHead>Entry</TableHead>
                      <TableHead>Exit</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>P/L</TableHead>
                      <TableHead>Date (UTC)</TableHead>
                      <TableHead>Strategy</TableHead>
                      <TableHead>Broker</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parseResult.rows.slice(0, 50).map((row) => (
                      <TableRow
                        key={row.rowNumber}
                        className={row.isValid ? '' : 'bg-destructive/10'}
                      >
                        <TableCell className="text-xs text-muted-foreground">{row.rowNumber}</TableCell>
                        <TableCell>
                          {row.isValid ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <AlertCircle className="h-4 w-4 text-destructive" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <ul className="text-xs space-y-1">
                                    {row.errors.map((e, i) => (
                                      <li key={i}>{e.field}: {e.message}</li>
                                    ))}
                                  </ul>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{row.data.symbol || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={row.data.side === 'long' || row.data.side === 'buy' ? 'default' : 'destructive'}>
                            {row.data.side || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{row.data.entry_price?.toFixed(2) || '-'}</TableCell>
                        <TableCell className="text-sm">{row.data.exit_price?.toFixed(2) || '-'}</TableCell>
                        <TableCell className="text-sm">{row.data.quantity || '-'}</TableCell>
                        <TableCell className={`text-sm ${row.data.profit_loss && row.data.profit_loss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {row.data.profit_loss?.toFixed(2) || '-'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.data.entry_datetime_utc 
                            ? new Date(row.data.entry_datetime_utc).toLocaleString() 
                            : '-'}
                        </TableCell>
                        <TableCell className="text-sm">{row.data.strategy || '-'}</TableCell>
                        <TableCell className="text-sm">{row.data.broker_id || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={() => handleImport(false)}
            disabled={isUploading || parseResult.validCount === 0}
            className="flex-1"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Import {parseResult.validCount} Valid Trades
              </>
            )}
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={isUploading}>
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
          <Upload className="h-12 w-12 text-muted-foreground" />
          <div className="text-center">
            <p className="font-medium">Drop your trade log CSV here</p>
            <p className="text-sm text-muted-foreground">or click to browse</p>
          </div>

          <input
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
            id="csv-import"
          />
          
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <label htmlFor="csv-import" className="cursor-pointer">Browse Files</label>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDownloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
          </div>
        </div>

        <div className="mt-4 text-xs text-muted-foreground space-y-2">
          <p className="font-medium">Supported Fields:</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="font-medium text-foreground">Required:</p>
              <p>Symbol, Side, Entry Price, Exit Price, Date/Time</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Optional:</p>
              <p>Quantity, P/L, Commission, Stop Loss, Take Profit, Leverage, Margin, Strategy, Broker, Account, Notes</p>
            </div>
          </div>
          <p className="mt-2">
            <span className="font-medium text-foreground">Flexible column names:</span> The system automatically detects and maps common column name variations.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
