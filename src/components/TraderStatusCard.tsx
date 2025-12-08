import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Activity } from "lucide-react";

interface TraderActivity {
  is_active: boolean;
  platform: string | null;
  last_activity_at: string;
}

export function TraderStatusCard() {
  const [activity, setActivity] = useState<TraderActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivity = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("trader_activity")
        .select("is_active, platform, last_activity_at")
        .eq("user_id", session.user.id)
        .order("last_activity_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.error("Failed to fetch trader activity:", fetchError);
        setError("Failed to load status");
      } else {
        setActivity(data);
      }
    } catch (err) {
      console.error("Error fetching trader activity:", err);
      setError("Failed to load status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();

    // Poll every 10 seconds
    const interval = setInterval(fetchActivity, 10000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card variant="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Trader Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card variant="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Trader Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!activity) {
    return (
      <Card variant="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Trader Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/50" />
            <span className="text-sm text-muted-foreground">No activity data yet</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Connect your trading platform to see your status
          </p>
        </CardContent>
      </Card>
    );
  }

  const lastSeenText = formatDistanceToNow(new Date(activity.last_activity_at), { addSuffix: true });

  return (
    <Card variant="glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Trader Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "w-2.5 h-2.5 rounded-full animate-pulse",
              activity.is_active ? "bg-gain" : "bg-loss"
            )}
          />
          <span className={cn(
            "text-sm font-medium",
            activity.is_active ? "text-gain" : "text-loss"
          )}>
            {activity.is_active ? "Active" : "Inactive"}
            {activity.is_active && activity.platform && ` on ${activity.platform}`}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Last seen {lastSeenText}
          {!activity.is_active && activity.platform && ` on ${activity.platform}`}
        </p>
      </CardContent>
    </Card>
  );
}
