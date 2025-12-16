import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useUserRole() {
  const [role, setRole] = useState<string>("user");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }
        
        setUserId(user.id);

        // Use the secure database function to get role
        const { data, error } = await supabase.rpc('get_user_role', { _user_id: user.id });
        
        if (!error && data) {
          setRole(data);
        }
      } catch (err) {
        console.error("Error fetching user role:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRole();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        // Defer the role fetch
        setTimeout(() => {
          supabase.rpc('get_user_role', { _user_id: session.user.id })
            .then(({ data }) => {
              if (data) setRole(data);
            });
        }, 0);
      } else {
        setUserId(null);
        setRole("user");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = role === "admin";
  const isDeveloper = role === "developer" || role === "admin";

  return { role, isAdmin, isDeveloper, loading, userId };
}
