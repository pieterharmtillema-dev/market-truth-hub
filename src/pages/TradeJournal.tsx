import { useState } from 'react';
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Upload, BarChart3, Lock } from "lucide-react";
import { OrderCSVImporter } from "@/components/trades/OrderCSVImporter";
import { TradeJournalList } from "@/components/trades/TradeJournalList";
import { TradeJournalSummary } from "@/components/trades/TradeJournalSummary";

export default function TradeJournal() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleImportComplete = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <AppLayout title="Trade Journal">
      <div className="px-4 py-4 space-y-4 pb-24">
        {/* Private indicator */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
          <Lock className="h-4 w-4" />
          <span>Your personal trade journal - only visible to you</span>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="journal" className="w-full">
          <TabsList className="w-full bg-card border border-border">
            <TabsTrigger value="journal" className="flex-1 gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <BookOpen className="w-4 h-4" />
              Journal
            </TabsTrigger>
            <TabsTrigger value="import" className="flex-1 gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Upload className="w-4 h-4" />
              Import
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex-1 gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="journal" className="mt-4 space-y-4">
            <TradeJournalList refreshTrigger={refreshTrigger} />
          </TabsContent>

          <TabsContent value="import" className="mt-4">
            <OrderCSVImporter onImportComplete={handleImportComplete} />
          </TabsContent>

          <TabsContent value="analytics" className="mt-4">
            <TradeJournalSummary refreshTrigger={refreshTrigger} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
