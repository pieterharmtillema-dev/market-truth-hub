import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface ExchangeConnection {
  id: string;
  exchange: string;
  status: "pending" | "connected" | "invalid" | "revoked";
  last_sync_at: string | null;
  verified_trades_count: number;
  error_message: string | null;
  created_at: string;
}

export function useExchangeConnections() {
  const { user, session } = useAuth();
  const [connections, setConnections] = useState<ExchangeConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    if (!user || !session) {
      setConnections([]);
      setLoading(false);
      return;
    }

    try {
      const response = await supabase.functions.invoke("exchange-connect", {
        method: "GET",
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setConnections(response.data.connections || []);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch exchange connections:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch connections");
    } finally {
      setLoading(false);
    }
  }, [user, session]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const connectExchange = async (
    exchange: string,
    apiKey: string,
    apiSecret: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!session) {
      return { success: false, error: "Not authenticated" };
    }

    try {
      const response = await supabase.functions.invoke("exchange-connect", {
        method: "POST",
        body: { exchange, apiKey, apiSecret },
      });

      if (response.error) {
        return { success: false, error: response.error.message };
      }

      if (response.data.error) {
        return { success: false, error: response.data.error };
      }

      // Refresh connections after successful connection
      await fetchConnections();
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Connection failed";
      return { success: false, error: errorMessage };
    }
  };

  const disconnectExchange = async (exchange: string): Promise<{ success: boolean; error?: string }> => {
    if (!session) {
      return { success: false, error: "Not authenticated" };
    }

    try {
      const response = await supabase.functions.invoke("exchange-connect", {
        method: "DELETE",
        body: JSON.stringify({ exchange }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.error) {
        return { success: false, error: response.error.message };
      }

      if (response.data?.error) {
        return { success: false, error: response.data.error };
      }

      // Refresh connections after disconnection
      await fetchConnections();
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Disconnection failed";
      return { success: false, error: errorMessage };
    }
  };

  const getConnectionStatus = (exchange: string): ExchangeConnection | undefined => {
    return connections.find((c) => c.exchange === exchange);
  };

  return {
    connections,
    loading,
    error,
    connectExchange,
    disconnectExchange,
    getConnectionStatus,
    refetch: fetchConnections,
  };
}
