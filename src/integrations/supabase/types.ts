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
      positions: {
        Row: {
          asset_class: string | null
          created_at: string | null
          entry_price: number
          entry_timestamp: string
          exit_price: number | null
          exit_timestamp: string | null
          id: number
          is_simulation: boolean
          open: boolean
          pip_size: number | null
          pip_value: number | null
          pips: number | null
          platform: string | null
          pnl: number | null
          pnl_pct: number | null
          quantity: number
          quantity_lots: number | null
          side: string
          symbol: string
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
          exit_price?: number | null
          exit_timestamp?: string | null
          id?: never
          is_simulation?: boolean
          open?: boolean
          pip_size?: number | null
          pip_value?: number | null
          pips?: number | null
          platform?: string | null
          pnl?: number | null
          pnl_pct?: number | null
          quantity: number
          quantity_lots?: number | null
          side: string
          symbol: string
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
          exit_price?: number | null
          exit_timestamp?: string | null
          id?: never
          is_simulation?: boolean
          open?: boolean
          pip_size?: number | null
          pip_value?: number | null
          pips?: number | null
          platform?: string | null
          pnl?: number | null
          pnl_pct?: number | null
          quantity?: number
          quantity_lots?: number | null
          side?: string
          symbol?: string
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
          hit_timestamp: string | null
          id: string
          last_checked_price: number | null
          last_price_check: string | null
          likes: number
          rationale: string | null
          resolved_at: string | null
          resolved_price: number | null
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
          hit_timestamp?: string | null
          id?: string
          last_checked_price?: number | null
          last_price_check?: string | null
          likes?: number
          rationale?: string | null
          resolved_at?: string | null
          resolved_price?: number | null
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
          hit_timestamp?: string | null
          id?: string
          last_checked_price?: number | null
          last_price_check?: string | null
          likes?: number
          rationale?: string | null
          resolved_at?: string | null
          resolved_price?: number | null
          status?: string
          tags?: string[] | null
          target_price?: number
          time_horizon?: string
          timeframe_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          api_key: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
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
