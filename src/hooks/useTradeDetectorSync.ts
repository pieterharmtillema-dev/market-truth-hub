import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Extend Window interface for global variables
declare global {
  interface Window {
    __USER_API_KEY?: string;
    __USER_ID?: string;
    __TD_LAST_PLATFORM?: string;
    __TD_LAST_ACTIVE?: boolean;
  }
}

export function useTradeDetectorSync() {
  const location = useLocation();

  useEffect(() => {
    async function sync() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          console.log("[TD WEB] No user logged in, skipping sync");
          // Clear global variables when not logged in
          window.__USER_API_KEY = undefined;
          window.__USER_ID = undefined;
          return;
        }

        const userId = session.user.id;

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("api_key")
          .eq("user_id", userId)
          .single();

        if (error || !profile?.api_key) {
          console.warn("[TD WEB] No api_key found for user");
          return;
        }

        // Set global variables for extension access
        window.__USER_API_KEY = profile.api_key;
        window.__USER_ID = userId;

        // Send to extension via postMessage
        window.postMessage(
          {
            source: "TD_WEB",
            type: "SET_API_DETAILS",
            apiKey: profile.api_key,
            userId: userId,
          },
          "*"
        );

        console.log("[TD WEB] Sent api_key + user_id to extension");

        // Fetch and send current activity state
        const { data: activity } = await supabase
          .from("trader_activity")
          .select("is_active, platform, last_activity_at")
          .eq("user_id", userId)
          .order("last_activity_at", { ascending: false })
          .limit(1)
          .single();

        if (activity) {
          window.__TD_LAST_PLATFORM = activity.platform || undefined;
          window.__TD_LAST_ACTIVE = activity.is_active;

          window.postMessage(
            {
              source: "TD_WEB",
              type: "TD_ACTIVITY_STATE",
              platform: activity.platform,
              isActive: activity.is_active,
              lastActivity: activity.last_activity_at,
            },
            "*"
          );
        }
      } catch (err) {
        console.error("[TD WEB] Error syncing details:", err);
      }
    }

    // Run sync immediately
    sync();

    // Re-sync on auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        window.__USER_API_KEY = undefined;
        window.__USER_ID = undefined;
        window.__TD_LAST_PLATFORM = undefined;
        window.__TD_LAST_ACTIVE = undefined;
      }
      sync();
    });

    // Notify extension when tab is closed
    const handleBeforeUnload = () => {
      window.postMessage(
        {
          source: "TD_WEB",
          type: "TD_SITE_CLOSED"
        },
        "*"
      );
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // Send page change notifications
  useEffect(() => {
    if (window.__USER_ID) {
      window.postMessage(
        {
          source: "TD_WEB",
          type: "TD_PAGE_CHANGE",
          path: location.pathname,
          userId: window.__USER_ID,
        },
        "*"
      );
    }
  }, [location.pathname]);
}
