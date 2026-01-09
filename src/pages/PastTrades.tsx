import { useState, useEffect } from 'react';
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TestTube, Trash2, List, BarChart3 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { TradeAnalytics } from "@/components/trades/TradeAnalytics";
import { TradeHistoryTable } from "@/components/trades/TradeHistoryTable";

export default function PastTrades() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'trades' | 'analytics'>('analytics');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [userRole, setUserRole] = useState<string>('user');

  useEffect(() => {
    if (user) {
      fetchUserRole();
    }
  }, [user]);

  const fetchUserRole = async () => {
    const { data } = await supabase.rpc('get_user_role', { _user_id: user!.id });
    setUserRole(data || 'user');
  };

  if (!user) {
    return (
      <AppLayout title="Past Trades">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Please log in to view your trades.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Past Trades">
      <div className="px-4 py-4 space-y-4 pb-24">
        {/* Developer Mode Banner */}
        {userRole === 'developer' && (
          <Card className="border-amber-500/50 bg-amber-500/10">
            <CardContent className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TestTube className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-amber-200">Developer mode – simulations allowed</span>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-1">
                    <Trash2 className="h-3 w-3" />
                    Delete All Trades
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete all past trades?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all your positions and trade logs. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        const { error: posError } = await supabase
                          .from('positions')
                          .delete()
                          .eq('user_id', user!.id);
                        const { error: logError } = await supabase
                          .from('trade_log')
                          .delete()
                          .eq('user_id', user!.id);
                        if (posError || logError) {
                          toast.error('Failed to delete trades');
                        } else {
                          toast.success('All trades deleted');
                          setRefreshTrigger(prev => prev + 1);
                        }
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'trades' | 'analytics')} className="w-full">
          <TabsList className="w-full bg-card border border-border">
            <TabsTrigger value="analytics" className="flex-1 gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="trades" className="flex-1 gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <List className="w-4 h-4" />
              Trades
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trades" className="mt-4">
            <TradeHistoryTable refreshTrigger={refreshTrigger} />
          </TabsContent>

          <TabsContent value="analytics" className="mt-4">
            <TradeAnalytics refreshTrigger={refreshTrigger} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
