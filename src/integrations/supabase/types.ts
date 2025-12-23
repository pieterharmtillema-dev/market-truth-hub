export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      exchange_connections: {
        Row: {
          api_key_encrypted: string
          api_secret_encrypted: string
          created_at: string
          error_message: string | null
          exchange: string
          id: string
          label: string | null
          last_sync_at: string | null
          status: string
          updated_at: string
          user_id: string
          verified_trades_count: number | null
        }
        Insert: {
          api_key_encrypted: string
          api_secret_encrypted: string
          created_at?: string
          error_message?: string | null
          exchange: string
          id?: string
          label?: string | null
          last_sync_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          verified_trades_count?: number | null
        }
        Update: {
          api_key_encrypted?: string
          api_secret_encrypted?: string
          created_at?: string
          error_message?: string | null
          exchange?: string
          id?: string
          label?: string | null
          last_sync_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          verified_trades_count?: number | null
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          message: string
          prediction_id: string | null
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          message: string
          prediction_id?: string | null
          read?: boolean
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          message?: string
          prediction_id?: string | null
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "predictions"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          asset_class: string | null
          created_at: string | null
          entry_price: number
          entry_timestamp: string
          estimated_risk: number | null
          exchange_source: string | null
          exit_price: number | null
          exit_timestamp: string | null
          fees_total: number | null
          id: number
          is_exchange_verified: boolean | null
          is_simulation: boolean
          mae: number | null
          metrics_calculated_at: string | null
          mfe: number | null
          open: boolean
          pip_size: number | null
          pip_value: number | null
          pips: number | null
          platform: string | null
          pnl: number | null
          pnl_pct: number | null
          quantity: number
          quantity_lots: number | null
          r_multiple: number | null
          side: string
          symbol: string
          tags: string[] | null
          tick_size: number | null
          tick_value: number | null
          ticks: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          asset_class?: string | null
          created_at?: string | null
          entry_price: number
          entry_timestamp: string
          estimated_risk?: number | null
          exchange_source?: string | null
          exit_price?: number | null
          exit_timestamp?: string | null
          fees_total?: number | null
          id?: never
          is_exchange_verified?: boolean | null
          is_simulation?: boolean
          mae?: number | null
          metrics_calculated_at?: string | null
          mfe?: number | null
          open?: boolean
          pip_size?: number | null
          pip_value?: number | null
          pips?: number | null
          platform?: string | null
          pnl?: number | null
          pnl_pct?: number | null
          quantity: number
          quantity_lots?: number | null
          r_multiple?: number | null
          side: string
          symbol: string
          tags?: string[] | null
          tick_size?: number | null
          tick_value?: number | null
          ticks?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          asset_class?: string | null
          created_at?: string | null
          entry_price?: number
          entry_timestamp?: string
          estimated_risk?: number | null
          exchange_source?: string | null
          exit_price?: number | null
          exit_timestamp?: string | null
          fees_total?: number | null
          id?: never
          is_exchange_verified?: boolean | null
          is_simulation?: boolean
          mae?: number | null
          metrics_calculated_at?: string | null
          mfe?: number | null
          open?: boolean
          pip_size?: number | null
          pip_value?: number | null
          pips?: number | null
          platform?: string | null
          pnl?: number | null
          pnl_pct?: number | null
          quantity?: number
          quantity_lots?: number | null
          r_multiple?: number | null
          side?: string
          symbol?: string
          tags?: string[] | null
          tick_size?: number | null
          tick_value?: number | null
          ticks?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      predictions: {
        Row: {
          asset: string
          asset_type: string
          comments: number
          confidence: number
          created_at: string
          current_price: number
          data_source: string | null
          direction: string
          expiry_timestamp: string | null
          explanation: string | null
          explanation_public: boolean | null
          hit_timestamp: string | null
          id: string
          is_public: boolean | null
          last_checked_price: number | null
          last_price_check: string | null
          likes: number
          rationale: string | null
          resolved_at: string | null
          resolved_price: number | null
          source_position_id: number | null
          status: string
          tags: string[] | null
          target_price: number
          time_horizon: string
          timeframe_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asset: string
          asset_type?: string
          comments?: number
          confidence: number
          created_at?: string
          current_price: number
          data_source?: string | null
          direction: string
          expiry_timestamp?: string | null
          explanation?: string | null
          explanation_public?: boolean | null
          hit_timestamp?: string | null
          id?: string
          is_public?: boolean | null
          last_checked_price?: number | null
          last_price_check?: string | null
          likes?: number
          rationale?: string | null
          resolved_at?: string | null
          resolved_price?: number | null
          source_position_id?: number | null
          status?: string
          tags?: string[] | null
          target_price: number
          time_horizon: string
          timeframe_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          asset?: string
          asset_type?: string
          comments?: number
          confidence?: number
          created_at?: string
          current_price?: number
          data_source?: string | null
          direction?: string
          expiry_timestamp?: string | null
          explanation?: string | null
          explanation_public?: boolean | null
          hit_timestamp?: string | null
          id?: string
          is_public?: boolean | null
          last_checked_price?: number | null
          last_price_check?: string | null
          likes?: number
          rationale?: string | null
          resolved_at?: string | null
          resolved_price?: number | null
          source_position_id?: number | null
          status?: string
          tags?: string[] | null
          target_price?: number
          time_horizon?: string
          timeframe_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictions_source_position_id_fkey"
            columns: ["source_position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      price_cache: {
        Row: {
          close: number
          created_at: string
          date: string
          high: number
          id: string
          low: number
          open: number
          provider: string
          symbol: string
          volume: number | null
        }
        Insert: {
          close: number
          created_at?: string
          date: string
          high: number
          id?: string
          low: number
          open: number
          provider?: string
          symbol: string
          volume?: number | null
        }
        Update: {
          close?: number
          created_at?: string
          date?: string
          high?: number
          id?: string
          low?: number
          open?: number
          provider?: string
          symbol?: string
          volume?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          api_key: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          current_streak: number | null
          display_name: string | null
          id: string
          streak_type: string | null
          total_hits: number | null
          total_predictions: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          current_streak?: number | null
          display_name?: string | null
          id?: string
          streak_type?: string | null
          total_hits?: number | null
          total_predictions?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          current_streak?: number | null
          display_name?: string | null
          id?: string
          streak_type?: string | null
          total_hits?: number | null
          total_predictions?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trade_attachments: {
        Row: {
          content_type: string | null
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          position_id: number
          user_id: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          position_id: number
          user_id: string
        }
        Update: {
          content_type?: string | null
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          position_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_attachments_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_log: {
        Row: {
          asset_class: string | null
          created_at: string | null
          event_type: string
          id: number
          is_simulation: boolean
          pip_size: number | null
          pip_value: number | null
          platform: string | null
          pnl: number | null
          pnl_pct: number | null
          price: number | null
          quantity: number | null
          quantity_lots: number | null
          raw: Json | null
          raw_quantity: number | null
          side: string | null
          symbol: string | null
          tick_size: number | null
          tick_value: number | null
          timestamp: string
          user_id: string
        }
        Insert: {
          asset_class?: string | null
          created_at?: string | null
          event_type: string
          id?: never
          is_simulation?: boolean
          pip_size?: number | null
          pip_value?: number | null
          platform?: string | null
          pnl?: number | null
          pnl_pct?: number | null
          price?: number | null
          quantity?: number | null
          quantity_lots?: number | null
          raw?: Json | null
          raw_quantity?: number | null
          side?: string | null
          symbol?: string | null
          tick_size?: number | null
          tick_value?: number | null
          timestamp: string
          user_id: string
        }
        Update: {
          asset_class?: string | null
          created_at?: string | null
          event_type?: string
          id?: never
          is_simulation?: boolean
          pip_size?: number | null
          pip_value?: number | null
          platform?: string | null
          pnl?: number | null
          pnl_pct?: number | null
          price?: number | null
          quantity?: number | null
          quantity_lots?: number | null
          raw?: Json | null
          raw_quantity?: number | null
          side?: string | null
          symbol?: string | null
          tick_size?: number | null
          tick_value?: number | null
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      trader_profiles: {
        Row: {
          created_at: string
          decision_style: string | null
          experience_level: string | null
          holding_time: string | null
          id: string
          loss_response: string | null
          onboarding_completed: boolean
          onboarding_skipped: boolean
          risk_per_trade: string | null
          trade_frequency: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decision_style?: string | null
          experience_level?: string | null
          holding_time?: string | null
          id?: string
          loss_response?: string | null
          onboarding_completed?: boolean
          onboarding_skipped?: boolean
          risk_per_trade?: string | null
          trade_frequency?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          decision_style?: string | null
          experience_level?: string | null
          holding_time?: string | null
          id?: string
          loss_response?: string | null
          onboarding_completed?: boolean
          onboarding_skipped?: boolean
          risk_per_trade?: string | null
          trade_frequency?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_activity: {
        Row: {
          created_at: string | null
          id: number
          is_active: boolean
          platform: string
          timestamp: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: never
          is_active?: boolean
          platform: string
          timestamp: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: never
          is_active?: boolean
          platform?: string
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_trading_metrics: {
        Row: {
          accuracy_score: number | null
          api_status: string | null
          average_r: number | null
          created_at: string
          id: string
          is_verified: boolean
          last_api_sync_at: string | null
          positive_r_percentage: number | null
          r_variance: number | null
          total_breakeven: number
          total_losses: number
          total_r: number | null
          total_verified_trades: number
          total_wins: number
          updated_at: string
          user_id: string
          win_rate: number | null
        }
        Insert: {
          accuracy_score?: number | null
          api_status?: string | null
          average_r?: number | null
          created_at?: string
          id?: string
          is_verified?: boolean
          last_api_sync_at?: string | null
          positive_r_percentage?: number | null
          r_variance?: number | null
          total_breakeven?: number
          total_losses?: number
          total_r?: number | null
          total_verified_trades?: number
          total_wins?: number
          updated_at?: string
          user_id: string
          win_rate?: number | null
        }
        Update: {
          accuracy_score?: number | null
          api_status?: string | null
          average_r?: number | null
          created_at?: string
          id?: string
          is_verified?: boolean
          last_api_sync_at?: string | null
          positive_r_percentage?: number | null
          r_variance?: number | null
          total_breakeven?: number
          total_losses?: number
          total_r?: number | null
          total_verified_trades?: number
          total_wins?: number
          updated_at?: string
          user_id?: string
          win_rate?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          current_streak: number | null
          display_name: string | null
          streak_type: string | null
          total_hits: number | null
          total_predictions: number | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          current_streak?: number | null
          display_name?: string | null
          streak_type?: string | null
          total_hits?: number | null
          total_predictions?: number | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          current_streak?: number | null
          display_name?: string | null
          streak_type?: string | null
          total_hits?: number | null
          total_predictions?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      trader_activity: {
        Row: {
          id: number | null
          is_active: boolean | null
          last_activity_at: string | null
          platform: string | null
          user_id: string | null
        }
        Insert: {
          id?: number | null
          is_active?: boolean | null
          last_activity_at?: string | null
          platform?: string | null
          user_id?: string | null
        }
        Update: {
          id?: number | null
          is_active?: boolean | null
          last_activity_at?: string | null
          platform?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_api_key: { Args: never; Returns: string }
      get_user_role: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      regenerate_user_api_key: {
        Args: { target_user_id: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "developer" | "user"
      instrument_type:
        | "stock"
        | "crypto"
        | "forex"
        | "futures"
        | "options"
        | "other"
      trade_side: "buy" | "sell" | "long" | "short"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "developer", "user"],
      instrument_type: [
        "stock",
        "crypto",
        "forex",
        "futures",
        "options",
        "other",
      ],
      trade_side: ["buy", "sell", "long", "short"],
    },
  },
} as const
