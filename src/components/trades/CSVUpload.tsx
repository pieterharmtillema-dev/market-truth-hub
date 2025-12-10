import { useState, useCallback } from 'react';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ParsedPosition {
  symbol: string;
  side: string;
  entry_price: number;
  entry_timestamp: string;
  exit_price?: number;
  exit_timestamp?: string;
  quantity: number;
  pnl?: number;
  platform?: string;
}

interface CSVUploadProps {
  onUploadComplete?: () => void;
}

export function CSVUpload({ onUploadComplete }: CSVUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const parseCSV = (text: string): ParsedPosition[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row');

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    
    const requiredColumns = ['symbol', 'side', 'entry_price', 'entry_timestamp', 'quantity'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    const positions: ParsedPosition[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length !== headers.length) continue;

      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });

      const position: ParsedPosition = {
        symbol: row.symbol.toUpperCase(),
        side: row.side.toLowerCase(),
        entry_price: parseFloat(row.entry_price),
        entry_timestamp: new Date(row.entry_timestamp).toISOString(),
        quantity: parseFloat(row.quantity),
      };

      if (row.exit_price) position.exit_price = parseFloat(row.exit_price);
      if (row.exit_timestamp) position.exit_timestamp = new Date(row.exit_timestamp).toISOString();
      if (row.pnl) position.pnl = parseFloat(row.pnl);
      if (row.platform) position.platform = row.platform;

      positions.push(position);
    }

    return positions;
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Error', description: 'You must be logged in to upload positions', variant: 'destructive' });
        return;
      }

      const text = await file.text();
      const positions = parseCSV(text);

      const positionsWithUserId = positions.map(position => ({
        ...position,
        user_id: user.id,
        open: !position.exit_price,
      }));

      const { error } = await supabase.from('positions').insert(positionsWithUserId);

      if (error) throw error;

      toast({ title: 'Success', description: `Imported ${positions.length} positions successfully` });
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
                  'Import Positions'
                )}
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4 text-xs text-muted-foreground">
          <p className="font-medium mb-1">Required columns:</p>
          <p>symbol, side, entry_price, entry_timestamp, quantity</p>
          <p className="font-medium mt-2 mb-1">Optional columns:</p>
          <p>exit_price, exit_timestamp, pnl, platform</p>
        </div>
      </CardContent>
    </Card>
  );
}
