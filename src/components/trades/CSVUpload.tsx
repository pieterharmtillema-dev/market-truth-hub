import { useState, useCallback } from 'react';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ParsedTrade {
  asset: string;
  direction: string;
  entry_price: number;
  entry_date: string;
  exit_price?: number;
  exit_date?: string;
  quantity?: number;
  profit_loss?: number;
  profit_loss_percent?: number;
  notes?: string;
}

interface CSVUploadProps {
  onUploadComplete?: () => void;
}

export function CSVUpload({ onUploadComplete }: CSVUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const parseCSV = (text: string): ParsedTrade[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row');

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    
    const requiredColumns = ['asset', 'direction', 'entry_price', 'entry_date'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    const trades: ParsedTrade[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length !== headers.length) continue;

      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });

      const trade: ParsedTrade = {
        asset: row.asset,
        direction: row.direction.toLowerCase(),
        entry_price: parseFloat(row.entry_price),
        entry_date: new Date(row.entry_date).toISOString(),
      };

      if (row.exit_price) trade.exit_price = parseFloat(row.exit_price);
      if (row.exit_date) trade.exit_date = new Date(row.exit_date).toISOString();
      if (row.quantity) trade.quantity = parseFloat(row.quantity);
      if (row.profit_loss) trade.profit_loss = parseFloat(row.profit_loss);
      if (row.profit_loss_percent) trade.profit_loss_percent = parseFloat(row.profit_loss_percent);
      if (row.notes) trade.notes = row.notes;

      trades.push(trade);
    }

    return trades;
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Error', description: 'You must be logged in to upload trades', variant: 'destructive' });
        return;
      }

      const text = await file.text();
      const trades = parseCSV(text);

      const tradesWithUserId = trades.map(trade => ({
        ...trade,
        user_id: user.id,
      }));

      const { error } = await supabase.from('trader_trades').insert(tradesWithUserId);

      if (error) throw error;

      toast({ title: 'Success', description: `Imported ${trades.length} trades successfully` });
      setFile(null);
      onUploadComplete?.();
    } catch (error) {
      toast({ 
        title: 'Upload failed', 
        description: error instanceof Error ? error.message : 'Failed to parse CSV', 
        variant: 'destructive' 
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === 'text/csv' || droppedFile?.name.endsWith('.csv')) {
      setFile(droppedFile);
    } else {
      toast({ title: 'Invalid file', description: 'Please upload a CSV file', variant: 'destructive' });
    }
  }, [toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) setFile(selectedFile);
  };

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
          {file ? (
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <FileText className="h-8 w-8 text-primary" />
              <div className="flex-1">
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <Upload className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">Drop your CSV file here</p>
                <p className="text-sm text-muted-foreground">or click to browse</p>
              </div>
            </>
          )}

          <input
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
            id="csv-upload"
          />
          
          <div className="flex gap-2">
            {!file && (
              <Button variant="outline" asChild>
                <label htmlFor="csv-upload" className="cursor-pointer">Browse Files</label>
              </Button>
            )}
            {file && (
              <Button onClick={handleUpload} disabled={isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  'Import Trades'
                )}
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4 text-xs text-muted-foreground">
          <p className="font-medium mb-1">Required columns:</p>
          <p>asset, direction, entry_price, entry_date</p>
          <p className="font-medium mt-2 mb-1">Optional columns:</p>
          <p>exit_price, exit_date, quantity, profit_loss, profit_loss_percent, notes</p>
        </div>
      </CardContent>
    </Card>
  );
}
