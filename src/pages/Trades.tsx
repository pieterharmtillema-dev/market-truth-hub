import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { CSVUpload } from '@/components/trades/CSVUpload';
import { TradeHistoryTable } from '@/components/trades/TradeHistoryTable';

export default function Trades() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadComplete = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <AppLayout title="Trade Journal">
      <div className="px-4 py-6 space-y-6 pb-24">
        <div>
          <h2 className="text-xl font-semibold mb-2">Import Trades</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Upload a CSV file to import your trade history
          </p>
          <CSVUpload onUploadComplete={handleUploadComplete} />
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Trade History</h2>
          <TradeHistoryTable refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </AppLayout>
  );
}
