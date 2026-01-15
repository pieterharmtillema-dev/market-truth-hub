import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, PenLine } from 'lucide-react';
import { ManualTradeEntryDialog } from './ManualTradeEntryDialog';
import { OrderCSVImporter } from './OrderCSVImporter';

interface AddTradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddTradeDialog({ open, onOpenChange, onSuccess }: AddTradeDialogProps) {
  const [mode, setMode] = useState<'choice' | 'manual' | 'csv'>('choice');

  const handleClose = () => {
    setMode('choice');
    onOpenChange(false);
  };

  const handleSuccess = () => {
    setMode('choice');
    onSuccess?.();
    onOpenChange(false);
  };

  if (mode === 'manual') {
    return (
      <ManualTradeEntryDialog
        open={open}
        onOpenChange={handleClose}
        onSuccess={handleSuccess}
      />
    );
  }

  if (mode === 'csv') {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import from CSV</DialogTitle>
          </DialogHeader>
          <OrderCSVImporter onImportComplete={handleSuccess} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Trade</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          <Card
            className="cursor-pointer transition-all hover:border-primary hover:bg-primary/5"
            onClick={() => setMode('manual')}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <PenLine className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Manual Entry</h3>
                <p className="text-sm text-muted-foreground">
                  Enter trade details manually
                </p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-all hover:border-primary hover:bg-primary/5"
            onClick={() => setMode('csv')}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Import CSV</h3>
                <p className="text-sm text-muted-foreground">
                  Upload your order history CSV
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
