import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface AlpacaOrder {
  id: string;
  order_id: string;
  client_order_id: string | null;
  symbol: string;
  side: "buy" | "sell";
  order_type: "market" | "limit" | "stop" | "stop_limit" | "trailing_stop" | "other";
  limit_price: number | null;
  stop_price: number | null;
  qty: number;
  filled_qty: number;
  filled_avg_price: number | null;
  status: string;
  submitted_at: string;
  updated_at: string;
  filled_at: string | null;
  canceled_at: string | null;
  expired_at: string | null;
  replaced_at: string | null;
  replaced_by: string | null;
  replaces: string | null;
  time_in_force: string | null;
  extended_hours: boolean;
  asset_class: string | null;
  environment: "paper" | "live" | null;
  raw: Record<string, unknown>;
  created_at: string;
  user_id: string;
}

export interface OrderFilters {
  symbol?: string;
  status?: "all" | "open" | "filled" | "canceled" | "replaced";
  orderType?: "all" | "market" | "limit" | "stop" | "stop_limit";
  timeRange?: "today" | "7d" | "30d" | "all";
}

export interface OrderChain {
  clientOrderId: string;
  orders: AlpacaOrder[];
  latestOrder: AlpacaOrder;
}

export function useAlpacaOrders(filters: OrderFilters = {}) {
  const { user, session } = useAuth();
  const [orders, setOrders] = useState<AlpacaOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch orders from database
  const fetchOrders = useCallback(async () => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from("alpaca_orders")
        .select("*")
        .eq("user_id", user.id)
        .order("submitted_at", { ascending: false })
        .limit(500);

      // Apply filters
      if (filters.symbol) {
        query = query.ilike("symbol", `%${filters.symbol}%`);
      }

      if (filters.status && filters.status !== "all") {
        if (filters.status === "open") {
          query = query.in("status", ["new", "accepted", "pending_new", "accepted_for_bidding", "partially_filled"]);
        } else if (filters.status === "filled") {
          query = query.eq("status", "filled");
        } else if (filters.status === "canceled") {
          query = query.in("status", ["canceled", "expired", "rejected"]);
        } else if (filters.status === "replaced") {
          query = query.eq("status", "replaced");
        }
      }

      if (filters.orderType && filters.orderType !== "all") {
        query = query.eq("order_type", filters.orderType);
      }

      if (filters.timeRange && filters.timeRange !== "all") {
        const now = new Date();
        let since: Date;
        
        switch (filters.timeRange) {
          case "today":
            since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case "7d":
            since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "30d":
            since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            since = new Date(0);
        }
        
        query = query.gte("submitted_at", since.toISOString());
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setOrders((data as AlpacaOrder[]) || []);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }, [user, filters.symbol, filters.status, filters.orderType, filters.timeRange]);

  // Sync orders from Alpaca API
  const syncOrders = useCallback(async (): Promise<{ success: boolean; synced: number; error?: string }> => {
    if (!session) {
      return { success: false, synced: 0, error: "Not authenticated" };
    }

    setSyncing(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/alpaca-orders`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ limit: 200 }),
        }
      );

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Sync failed");
      }

      // Refresh orders after sync
      await fetchOrders();

      return { success: true, synced: data.synced || 0 };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Sync failed";
      setError(errorMessage);
      return { success: false, synced: 0, error: errorMessage };
    } finally {
      setSyncing(false);
    }
  }, [session, fetchOrders]);

  // Set up realtime subscription
  useEffect(() => {
    if (!user) return;

    let channel: RealtimeChannel | null = null;

    const setupRealtimeSubscription = () => {
      channel = supabase
        .channel("alpaca_orders_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "alpaca_orders",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log("Order update received:", payload);
            
            if (payload.eventType === "INSERT") {
              setOrders((prev) => [payload.new as AlpacaOrder, ...prev]);
            } else if (payload.eventType === "UPDATE") {
              setOrders((prev) =>
                prev.map((order) =>
                  order.order_id === (payload.new as AlpacaOrder).order_id
                    ? (payload.new as AlpacaOrder)
                    : order
                )
              );
            } else if (payload.eventType === "DELETE") {
              setOrders((prev) =>
                prev.filter((order) => order.order_id !== (payload.old as { order_id: string }).order_id)
              );
            }
          }
        )
        .subscribe();
    };

    setupRealtimeSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user]);

  // Fetch orders on mount and when filters change
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Group orders by client_order_id for order chains
  const orderChains = useMemo((): OrderChain[] => {
    const chainsMap = new Map<string, AlpacaOrder[]>();
    const standaloneOrders: AlpacaOrder[] = [];

    for (const order of orders) {
      const chainKey = order.client_order_id || order.order_id;
      
      // Check if this order is part of a replacement chain
      if (order.replaces || order.replaced_by) {
        const existingChain = chainsMap.get(chainKey);
        if (existingChain) {
          existingChain.push(order);
        } else {
          chainsMap.set(chainKey, [order]);
        }
      } else if (order.client_order_id) {
        const existingChain = chainsMap.get(chainKey);
        if (existingChain) {
          existingChain.push(order);
        } else {
          chainsMap.set(chainKey, [order]);
        }
      } else {
        standaloneOrders.push(order);
      }
    }

    const chains: OrderChain[] = [];

    // Process chains with multiple orders
    for (const [clientOrderId, chainOrders] of chainsMap) {
      // Sort by submitted_at descending (newest first)
      const sortedOrders = chainOrders.sort(
        (a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
      );

      chains.push({
        clientOrderId,
        orders: sortedOrders,
        latestOrder: sortedOrders[0],
      });
    }

    // Add standalone orders as single-order chains
    for (const order of standaloneOrders) {
      chains.push({
        clientOrderId: order.order_id,
        orders: [order],
        latestOrder: order,
      });
    }

    // Sort chains by latest order's submitted_at
    return chains.sort(
      (a, b) =>
        new Date(b.latestOrder.submitted_at).getTime() -
        new Date(a.latestOrder.submitted_at).getTime()
    );
  }, [orders]);

  return {
    orders,
    orderChains,
    loading,
    syncing,
    error,
    syncOrders,
    refetch: fetchOrders,
  };
}

// Helper functions for order display
export function getOrderTypeDisplay(order: AlpacaOrder): string {
  switch (order.order_type) {
    case "market":
      return "Market";
    case "limit":
      return order.limit_price ? `Limit @ $${order.limit_price.toFixed(2)}` : "Limit";
    case "stop":
      return order.stop_price ? `Stop @ $${order.stop_price.toFixed(2)}` : "Stop";
    case "stop_limit":
      return `Stop Limit @ $${order.stop_price?.toFixed(2) || "—"} / $${order.limit_price?.toFixed(2) || "—"}`;
    case "trailing_stop":
      return "Trailing Stop";
    default:
      return order.order_type;
  }
}

export function getFillStatus(order: AlpacaOrder): "unfilled" | "partial" | "filled" {
  const qty = Number(order.qty) || 0;
  const filledQty = Number(order.filled_qty) || 0;

  if (filledQty <= 0) return "unfilled";
  if (filledQty < qty) return "partial";
  return "filled";
}

export function getStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status.toLowerCase()) {
    case "filled":
      return "default";
    case "partially_filled":
      return "secondary";
    case "new":
    case "accepted":
    case "pending_new":
      return "outline";
    case "canceled":
    case "expired":
    case "rejected":
      return "destructive";
    case "replaced":
      return "secondary";
    default:
      return "outline";
  }
}