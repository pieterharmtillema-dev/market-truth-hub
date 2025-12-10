import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  syncExtensionWithUser,
  sendActivityState,
  sendPageChange,
  sendSiteClosed,
} from "@/utils/tdExtensionSync";

// Extend Window interface for global variables
declare global {
  interface Window {
    __USER_API_KEY?: string;
    __USER_ID?: string;
    __USER_ROLE?: string;
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
          console.log("[TD WEB] No user logged in, clearing extension credentials");
          syncExtensionWithUser(null);
          return;
        }

        const userId = session.user.id;

        // Fetch profile with api_key
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("api_key")
          .eq("user_id", userId)
          .single();

        if (profileError || !profile?.api_key) {
          console.warn("[TD WEB] No api_key found for user, clearing extension credentials");
          syncExtensionWithUser(null);
          return;
        }

        // Fetch user's role from user_roles table using the security definer function
        const { data: roleData } = await supabase
          .rpc('get_user_role', { _user_id: userId });

        const userRole = roleData || 'user';

        // Sync credentials with extension (including role)
        syncExtensionWithUser({
          api_key: profile.api_key,
          user_id: userId,
          role: userRole,
        });

        // Fetch and send current activity state
        const { data: activity } = await supabase
          .from("trader_activity")
          .select("is_active, platform, last_activity_at")
          .eq("user_id", userId)
          .order("last_activity_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (activity) {
          sendActivityState(activity);
        }
      } catch (err) {
        console.error("[TD WEB] Error syncing details:", err);
        syncExtensionWithUser(null);
      }
    }

    // Run sync immediately
    sync();

    // Re-sync on auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        syncExtensionWithUser(null);
      }
      sync();
    });

    // Notify extension when tab is closed
    const handleBeforeUnload = () => {
      sendSiteClosed();
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
      sendPageChange(location.pathname);
    }
  }, [location.pathname]);
}
