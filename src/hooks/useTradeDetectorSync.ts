import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useTradeDetectorSync() {
  useEffect(() => {
    async function syncApiKey() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          console.log("[TD WEB] User not logged in, skipping sync");
          return;
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("api_key")
          .eq("user_id", session.user.id)
          .single();

        if (error || !profile?.api_key) {
          console.warn("[TD WEB] No api_key found on profile");
          return;
        }

        window.postMessage(
          {
            source: "TD_WEB",
            type: "SET_API_KEY",
            apiKey: profile.api_key,
          },
          "*"
        );

        console.log("[TD WEB] Sent API key to Chrome extension");
      } catch (err) {
        console.warn("[TD WEB] Failed to sync API key:", err);
      }
    }

    syncApiKey();
  }, []);
}
