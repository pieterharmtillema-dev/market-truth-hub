import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { DefaultStatsGrid } from "@/components/profile/StatsGrid";
import { PredictionCard } from "@/components/predictions/PredictionCard";
import { mockPredictions, tradingStyleLabels, marketFocusLabels, TradingStyle, MarketFocus } from "@/data/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CheckCircle, Settings, Share2, Edit2, Target, BookOpen, Users, ArrowUpRight, ArrowDownRight, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const userProfile = {
  name: "Alex Chen",
  username: "alextrader",
  isVerified: true,
  tier: "platinum" as const,
  traderType: {
    style: "swing-trader" as TradingStyle,
    markets: ["crypto", "stocks"] as MarketFocus[],
  },
  bio: "Swing trader focused on crypto and tech stocks. 5+ years experience. Sharing transparent calls with full accountability.",
  followers: 2847,
  following: 156,
  rank: 47,
};

interface Trade {
  id: string;
  asset: string;
  direction: string;
  entry_price: number;
  exit_price: number | null;
  profit_loss: number | null;
  entry_date: string;
  entry_datetime_utc?: string | null;
}

const Profile = () => {
  const navigate = useNavigate();
  const styleInfo = tradingStyleLabels[userProfile.traderType.style];
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [loadingTrades, setLoadingTrades] = useState(true);

  useEffect(() => {
    const fetchRecentTrades = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoadingTrades(false);
          return;
        }

        const { data, error } = await supabase
          .from('trader_trades')
          .select('id, asset, direction, entry_price, exit_price, profit_loss, entry_date, entry_datetime_utc')
          .eq('user_id', user.id)
          .order('entry_date', { ascending: false })
          .limit(5);

        if (!error && data) {
          setRecentTrades(data);
        }
      } catch (err) {
        console.error('Failed to fetch trades:', err);
      } finally {
        setLoadingTrades(false);
      }
    };

    fetchRecentTrades();
  }, []);
  return (
    <AppLayout title="Profile">
      <div className="px-4 py-4 space-y-4">
        {/* Profile Header */}
        <Card variant="glass" className="overflow-hidden">
          {/* Banner */}
          <div className="h-24 bg-gradient-to-br from-primary/40 via-primary/20 to-transparent" />
          
          <CardContent className="p-4 -mt-12">
            <div className="flex items-end gap-4 mb-4">
              <Avatar className="w-20 h-20 border-4 border-card shadow-lg">
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                  AC
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-xl">{userProfile.name}</h1>
                  {userProfile.isVerified && <CheckCircle className="w-5 h-5 text-primary" />}
                </div>
                <p className="text-sm text-muted-foreground">@{userProfile.username}</p>
              </div>
            </div>

            {/* Tier & Rank Badges */}
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge variant="rank" className="gap-1">
                🏆 #{userProfile.rank} Global
              </Badge>
              <Badge className="bg-cyan-400/20 text-cyan-300 border-cyan-400/30 capitalize">
                {userProfile.tier} Tier
              </Badge>
            </div>

            {/* Trader Type Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border", styleInfo.color)}>
                {styleInfo.icon} {styleInfo.label}
              </span>
              {userProfile.traderType.markets.map((market) => {
                const marketInfo = marketFocusLabels[market];
                return (
                  <span key={market} className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border", marketInfo.color)}>
                    {marketInfo.icon} {marketInfo.label}
                  </span>
                );
              })}
            </div>

            {/* Bio */}
            <p className="text-sm text-muted-foreground mb-4">
              {userProfile.bio}
            </p>

            {/* Follow Stats */}
            <div className="flex items-center gap-6 mb-4 text-sm">
              <div>
                <span className="font-bold">{userProfile.followers.toLocaleString()}</span>
                <span className="text-muted-foreground ml-1">Followers</span>
              </div>
              <div>
                <span className="font-bold">{userProfile.following}</span>
                <span className="text-muted-foreground ml-1">Following</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button className="flex-1 gap-2">
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </Button>
              <Button variant="outline" size="icon">
                <Share2 className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <DefaultStatsGrid />

        {/* Content Tabs */}
        <Tabs defaultValue="predictions" className="w-full">
          <TabsList className="w-full bg-card border border-border">
            <TabsTrigger value="predictions" className="flex-1 gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Target className="w-4 h-4" />
              Predictions
            </TabsTrigger>
            <TabsTrigger value="journal" className="flex-1 gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <BookOpen className="w-4 h-4" />
              Journal
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex-1 gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Users className="w-4 h-4" />
              Groups
            </TabsTrigger>
          </TabsList>

          <TabsContent value="predictions" className="mt-4 space-y-4">
            {mockPredictions.slice(0, 2).map((prediction) => (
              <PredictionCard key={prediction.id} prediction={prediction} />
            ))}
          </TabsContent>

          <TabsContent value="journal" className="mt-4 space-y-3">
            {loadingTrades ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : recentTrades.length === 0 ? (
              <Card variant="glass" className="p-8 text-center">
                <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">No trades yet. Import your first trades.</p>
                <Button variant="outline" className="mt-4" onClick={() => navigate('/journal')}>
                  Open Trading Journal
                </Button>
              </Card>
            ) : (
              <>
                {recentTrades.map((trade) => (
                  <Card key={trade.id} variant="glass" className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant={trade.direction === 'long' || trade.direction === 'buy' ? 'default' : 'destructive'} 
                          className="gap-1"
                        >
                          {trade.direction === 'long' || trade.direction === 'buy' ? (
                            <ArrowUpRight className="h-3 w-3" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3" />
                          )}
                          {trade.direction}
                        </Badge>
                        <div>
                          <span className="font-mono font-medium">{trade.asset}</span>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(trade.entry_datetime_utc || trade.entry_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`font-medium ${(trade.profit_loss || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {(trade.profit_loss || 0) >= 0 ? '+' : ''}${(trade.profit_loss || 0).toFixed(2)}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          ${trade.entry_price.toLocaleString()} → {trade.exit_price ? `$${trade.exit_price.toLocaleString()}` : '—'}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
                <Button 
                  variant="outline" 
                  className="w-full gap-2" 
                  onClick={() => navigate('/journal')}
                >
                  View All Trades
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="groups" className="mt-4">
            <Card variant="glass" className="p-8 text-center">
              <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">Groups you manage or are a member of</p>
              <Button variant="outline" className="mt-4">
                Create Group
              </Button>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Profile;
