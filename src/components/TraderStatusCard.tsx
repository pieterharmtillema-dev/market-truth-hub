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
  timestamp: string;
}

export function TraderStatusCard() {
  const [activity, setActivity] = useState<TraderActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchActivity = async (uid?: string) => {
    try {
      const userIdToUse = uid || userId;
      if (!userIdToUse) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setLoading(false);
          return;
        }
        setUserId(session.user.id);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("user_activity")
        .select("is_active, platform, timestamp")
        .eq("user_id", session.user.id)
        .order("timestamp", { ascending: false })
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
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        await fetchActivity(session.user.id);
      } else {
        setLoading(false);
      }
    };

    init();

    // Poll every 30 seconds as fallback
    const interval = setInterval(fetchActivity, 30000);

    return () => clearInterval(interval);
  }, []);

  // Subscribe to realtime updates on user_activity table
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('user-activity-profile')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_activity',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Activity update received on profile:', payload);
          const newData = payload.new as { is_active: boolean; platform: string | null; timestamp: string; user_id: string };
          if (newData && newData.user_id === userId) {
            setActivity({
              is_active: newData.is_active,
              platform: newData.platform,
              timestamp: newData.timestamp,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

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

  const lastSeenText = formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true });

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
