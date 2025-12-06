import { AppLayout } from "@/components/layout/AppLayout";
import { GroupCard } from "@/components/groups/GroupCard";
import { mockGroups } from "@/data/mockData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, Sparkles, Users, Crown, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";

const Groups = () => {
  return (
    <AppLayout title="Groups">
      <div className="px-4 py-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search groups..." 
            className="pl-10 bg-card border-border"
          />
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <Badge variant="default" className="cursor-pointer whitespace-nowrap gap-1">
            <Sparkles className="w-3 h-3" />
            Featured
          </Badge>
          <Badge variant="outline" className="cursor-pointer whitespace-nowrap gap-1">
            <Crown className="w-3 h-3" />
            Premium
          </Badge>
          <Badge variant="outline" className="cursor-pointer whitespace-nowrap">Crypto</Badge>
          <Badge variant="outline" className="cursor-pointer whitespace-nowrap">Stocks</Badge>
          <Badge variant="outline" className="cursor-pointer whitespace-nowrap">Forex</Badge>
          <Badge variant="outline" className="cursor-pointer whitespace-nowrap">Education</Badge>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="discover" className="w-full">
          <TabsList className="w-full bg-card border border-border">
            <TabsTrigger value="discover" className="flex-1 gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Sparkles className="w-4 h-4" />
              Discover
            </TabsTrigger>
            <TabsTrigger value="joined" className="flex-1 gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Users className="w-4 h-4" />
              Joined
            </TabsTrigger>
            <TabsTrigger value="trending" className="flex-1 gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Zap className="w-4 h-4" />
              Trending
            </TabsTrigger>
          </TabsList>

          <TabsContent value="discover" className="mt-4 space-y-4">
            {mockGroups.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </TabsContent>

          <TabsContent value="joined" className="mt-4">
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Join groups to see them here</p>
            </div>
          </TabsContent>

          <TabsContent value="trending" className="mt-4 space-y-4">
            {[...mockGroups]
              .sort((a, b) => b.members - a.members)
              .map((group) => (
                <GroupCard key={group.id} group={group} />
              ))}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Groups;
