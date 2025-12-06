import { AppLayout } from "@/components/layout/AppLayout";
import { DefaultStatsGrid } from "@/components/profile/StatsGrid";
import { PredictionCard } from "@/components/predictions/PredictionCard";
import { mockPredictions } from "@/data/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle, Settings, Share2, Edit2, Target, TrendingUp, BookOpen, Users } from "lucide-react";

const Profile = () => {
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
                  <h1 className="font-bold text-xl">Alex Chen</h1>
                  <CheckCircle className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">@alextrader</p>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="rank" className="gap-1">
                🏆 #47 Global
              </Badge>
              <Badge className="bg-cyan-400/20 text-cyan-300 border-cyan-400/30">
                Platinum Tier
              </Badge>
              <Badge variant="success" className="gap-1">
                <Target className="w-3 h-3" />
                78% Accuracy
              </Badge>
            </div>

            {/* Bio */}
            <p className="text-sm text-muted-foreground mb-4">
              Swing trader focused on crypto and tech stocks. 5+ years experience. Sharing transparent calls with full accountability.
            </p>

            {/* Follow Stats */}
            <div className="flex items-center gap-6 mb-4 text-sm">
              <div>
                <span className="font-bold">2,847</span>
                <span className="text-muted-foreground ml-1">Followers</span>
              </div>
              <div>
                <span className="font-bold">156</span>
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

          <TabsContent value="journal" className="mt-4">
            <Card variant="glass" className="p-8 text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">Your trade journal entries will appear here</p>
              <Button variant="outline" className="mt-4">
                Start Journaling
              </Button>
            </Card>
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
