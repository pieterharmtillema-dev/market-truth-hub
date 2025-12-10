import { useState, useEffect, useCallback, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { syncExtensionWithUser, sendLogout } from "@/utils/tdExtensionSync";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const isSigningOut = useRef(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    // Prevent multiple simultaneous logout calls
    if (isSigningOut.current) {
      return;
    }
    
    isSigningOut.current = true;
    
    try {
      // Send logout notification to Chrome extension
      sendLogout();
      // Clear extension credentials
      syncExtensionWithUser(null);
      // Clear local state immediately
      setUser(null);
      setSession(null);
      // Sign out from Supabase (use scope: 'local' to avoid server errors if session already gone)
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      isSigningOut.current = false;
    }
  }, []);

  return { user, session, loading, signOut };
}
