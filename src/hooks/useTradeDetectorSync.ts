import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useTradeDetectorSync() {
  useEffect(() => {
    async function sync() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          console.log("[TD WEB] No user logged in, skipping sync");
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
      } catch (err) {
        console.error("[TD WEB] Error syncing details:", err);
      }
    }

    // Run sync immediately
    sync();

    // Re-sync on auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      sync();
    });

    // Notify extension when tab is closed
    const handleBeforeUnload = () => {
      window.postMessage(
        {
          source: "TD_WEB",
          type: "WEB_TAB_CLOSED"
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
}
