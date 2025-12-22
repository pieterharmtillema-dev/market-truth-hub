import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface TradingMetrics {
  total_verified_trades: number;
  total_wins: number;
  total_losses: number;
  total_breakeven: number;
  win_rate: number | null;
  average_r: number | null;
  total_r: number | null;
  positive_r_percentage: number | null;
  r_variance: number | null;
  accuracy_score: number | null;
  is_verified: boolean;
  last_api_sync_at: string | null;
  api_status: 'connected' | 'disconnected';
}

export function useTradingMetrics() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<TradingMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);

  const fetchMetrics = useCallback(async () => {
    if (!user) {
      setMetrics(null);
      setLoading(false);
      return;
    }

    try {
      // Fetch from user_trading_metrics table
      const { data, error: fetchError } = await supabase
        .from('user_trading_metrics')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching metrics:', fetchError);
        setError(fetchError.message);
        return;
      }

      if (data) {
        setMetrics({
          total_verified_trades: data.total_verified_trades,
          total_wins: data.total_wins,
          total_losses: data.total_losses,
          total_breakeven: data.total_breakeven,
          win_rate: data.win_rate,
          average_r: data.average_r,
          total_r: data.total_r,
          positive_r_percentage: data.positive_r_percentage,
          r_variance: data.r_variance,
          accuracy_score: data.accuracy_score,
          is_verified: data.is_verified,
          last_api_sync_at: data.last_api_sync_at,
          api_status: data.api_status as 'connected' | 'disconnected',
        });
      } else {
        setMetrics(null);
      }
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError('Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const recalculateMetrics = useCallback(async () => {
    if (!user) return;

    setCalculating(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('calculate-trade-metrics', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.metrics) {
        setMetrics({
          total_verified_trades: response.data.metrics.total_verified_trades,
          total_wins: response.data.metrics.total_wins,
          total_losses: response.data.metrics.total_losses,
          total_breakeven: 0,
          win_rate: response.data.metrics.win_rate,
          average_r: response.data.metrics.average_r,
          total_r: null,
          positive_r_percentage: response.data.metrics.positive_r_percentage,
          r_variance: null,
          accuracy_score: response.data.metrics.accuracy_score,
          is_verified: response.data.metrics.is_verified,
          last_api_sync_at: response.data.metrics.last_sync_at,
          api_status: response.data.metrics.api_status,
        });
      }

      return response.data;
    } catch (err) {
      console.error('Error calculating metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to calculate metrics');
      throw err;
    } finally {
      setCalculating(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    metrics,
    loading,
    error,
    calculating,
    refetch: fetchMetrics,
    recalculate: recalculateMetrics,
  };
}