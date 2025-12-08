import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface TraderActivity {
  is_active: boolean;
  platform: string | null;
  last_activity_at: string;
}

export function TraderStatusIndicator() {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [platform, setPlatform] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsActive(null);
      return;
    }

    // Default to inactive until we get data
    setIsActive(false);

    // Fetch initial status using raw query to bypass type checking
    const fetchStatus = async () => {
      const { data, error } = await supabase
        .from('trader_activity' as any)
        .select('is_active, platform, last_activity_at')
        .eq('user_id', user.id)
        .order('last_activity_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const activityData = data as unknown as TraderActivity;
        // Check if activity is recent (within last 2 minutes)
        const lastActivity = new Date(activityData.last_activity_at);
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
        
        if (lastActivity > twoMinutesAgo) {
          setIsActive(activityData.is_active);
          setPlatform(activityData.platform);
        } else {
          setIsActive(false);
        }
      }
    };

    fetchStatus();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('trader-activity-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trader_activity',
        },
        (payload) => {
          console.log('Activity update received:', payload);
          const newData = payload.new as TraderActivity & { user_id: string };
          if (newData && newData.user_id === user.id) {
            setIsActive(newData.is_active);
            setPlatform(newData.platform);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Don't show if no user or no activity data
  if (!user || isActive === null) {
    return null;
  }

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
      isActive 
        ? "bg-gain/20 text-gain border border-gain/30" 
        : "bg-loss/20 text-loss border border-loss/30"
    )}>
      <span className={cn(
        "w-2 h-2 rounded-full animate-pulse",
        isActive ? "bg-gain" : "bg-loss"
      )} />
      <span>
        {isActive ? "Trader Active" : "Trader Inactive"}
        {isActive && platform && ` • ${platform}`}
      </span>
    </div>
  );
}
