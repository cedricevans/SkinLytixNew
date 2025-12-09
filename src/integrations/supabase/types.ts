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
      beta_feedback: {
        Row: {
          created_at: string | null
          email: string | null
          frustrations: string | null
          id: string
          missing_feature: string | null
          most_helpful_feature: string | null
          motivation: string | null
          perceived_accuracy: string | null
          pmf_core_value: string | null
          pmf_disappointment: string | null
          pmf_price_expectation: string | null
          pmf_substitute: string | null
          pmf_willing_to_pay: string | null
          report_clarity: string | null
          user_id: string | null
          wants_session: boolean | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          frustrations?: string | null
          id?: string
          missing_feature?: string | null
          most_helpful_feature?: string | null
          motivation?: string | null
          perceived_accuracy?: string | null
          pmf_core_value?: string | null
          pmf_disappointment?: string | null
          pmf_price_expectation?: string | null
          pmf_substitute?: string | null
          pmf_willing_to_pay?: string | null
          report_clarity?: string | null
          user_id?: string | null
          wants_session?: boolean | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          frustrations?: string | null
          id?: string
          missing_feature?: string | null
          most_helpful_feature?: string | null
          motivation?: string | null
          perceived_accuracy?: string | null
          pmf_core_value?: string | null
          pmf_disappointment?: string | null
          pmf_price_expectation?: string | null
          pmf_substitute?: string | null
          pmf_willing_to_pay?: string | null
          report_clarity?: string | null
          user_id?: string | null
          wants_session?: boolean | null
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          analysis_id: string
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_id: string
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_id?: string
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          context_id: string | null
          context_type: string | null
          created_at: string
          feedback_type: string
          id: string
          message: string
          page_url: string | null
          rating: number | null
          user_id: string | null
        }
        Insert: {
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          feedback_type: string
          id?: string
          message: string
          page_url?: string | null
          rating?: number | null
          user_id?: string | null
        }
        Update: {
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          feedback_type?: string
          id?: string
          message?: string
          page_url?: string | null
          rating?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      ingredient_cache: {
        Row: {
          cached_at: string | null
          id: string
          ingredient_name: string
          molecular_weight: number | null
          properties_json: Json | null
          pubchem_cid: string | null
        }
        Insert: {
          cached_at?: string | null
          id?: string
          ingredient_name: string
          molecular_weight?: number | null
          properties_json?: Json | null
          pubchem_cid?: string | null
        }
        Update: {
          cached_at?: string | null
          id?: string
          ingredient_name?: string
          molecular_weight?: number | null
          properties_json?: Json | null
          pubchem_cid?: string | null
        }
        Relationships: []
      }
      product_cache: {
        Row: {
          barcode: string
          cached_at: string | null
          id: string
          obf_data_json: Json
        }
        Insert: {
          barcode: string
          cached_at?: string | null
          id?: string
          obf_data_json: Json
        }
        Update: {
          barcode?: string
          cached_at?: string | null
          id?: string
          obf_data_json?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          body_concerns: Json | null
          created_at: string | null
          demo_mode_tier:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          display_name: string | null
          email: string | null
          has_seen_walkthrough: boolean | null
          id: string
          is_profile_complete: boolean | null
          last_activity_date: string | null
          product_preferences: Json | null
          scalp_type: string | null
          skin_concerns: Json | null
          skin_type: Database["public"]["Enums"]["skin_type_enum"] | null
          streak_count: number | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_tier:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string | null
        }
        Insert: {
          body_concerns?: Json | null
          created_at?: string | null
          demo_mode_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          display_name?: string | null
          email?: string | null
          has_seen_walkthrough?: boolean | null
          id: string
          is_profile_complete?: boolean | null
          last_activity_date?: string | null
          product_preferences?: Json | null
          scalp_type?: string | null
          skin_concerns?: Json | null
          skin_type?: Database["public"]["Enums"]["skin_type_enum"] | null
          streak_count?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string | null
        }
        Update: {
          body_concerns?: Json | null
          created_at?: string | null
          demo_mode_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          display_name?: string | null
          email?: string | null
          has_seen_walkthrough?: boolean | null
          id?: string
          is_profile_complete?: boolean | null
          last_activity_date?: string | null
          product_preferences?: Json | null
          scalp_type?: string | null
          skin_concerns?: Json | null
          skin_type?: Database["public"]["Enums"]["skin_type_enum"] | null
          streak_count?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rate_limit_log: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          identifier: string
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          identifier: string
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          identifier?: string
        }
        Relationships: []
      }
      routine_optimizations: {
        Row: {
          created_at: string
          id: string
          optimization_data: Json
          routine_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          optimization_data: Json
          routine_id: string
        }
        Update: {
          created_at?: string
          id?: string
          optimization_data?: Json
          routine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_optimizations_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_products: {
        Row: {
          analysis_id: string
          category: string | null
          created_at: string
          id: string
          product_price: number | null
          routine_id: string
          usage_frequency: string
        }
        Insert: {
          analysis_id: string
          category?: string | null
          created_at?: string
          id?: string
          product_price?: number | null
          routine_id: string
          usage_frequency: string
        }
        Update: {
          analysis_id?: string
          category?: string | null
          created_at?: string
          id?: string
          product_price?: number | null
          routine_id?: string
          usage_frequency?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_products_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "user_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_products_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          created_at: string
          id: string
          routine_name: string
          routine_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          routine_name: string
          routine_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          routine_name?: string
          routine_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_dupes: {
        Row: {
          brand: string | null
          id: string
          image_url: string | null
          price_estimate: string | null
          product_name: string
          reasons: string[] | null
          saved_at: string | null
          shared_ingredients: string[] | null
          source_product_id: string | null
          user_id: string
        }
        Insert: {
          brand?: string | null
          id?: string
          image_url?: string | null
          price_estimate?: string | null
          product_name: string
          reasons?: string[] | null
          saved_at?: string | null
          shared_ingredients?: string[] | null
          source_product_id?: string | null
          user_id: string
        }
        Update: {
          brand?: string | null
          id?: string
          image_url?: string | null
          price_estimate?: string | null
          product_name?: string
          reasons?: string[] | null
          saved_at?: string | null
          shared_ingredients?: string[] | null
          source_product_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_dupes_source_product_id_fkey"
            columns: ["source_product_id"]
            isOneToOne: false
            referencedRelation: "user_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_limits: {
        Row: {
          chat_messages_used: number | null
          created_at: string | null
          id: string
          pdf_exports_used: number | null
          period_start: string
          product_comparisons_used: number | null
          routine_optimizations_used: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          chat_messages_used?: number | null
          created_at?: string | null
          id?: string
          pdf_exports_used?: number | null
          period_start?: string
          product_comparisons_used?: number | null
          routine_optimizations_used?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          chat_messages_used?: number | null
          created_at?: string | null
          id?: string
          pdf_exports_used?: number | null
          period_start?: string
          product_comparisons_used?: number | null
          routine_optimizations_used?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_analyses: {
        Row: {
          analyzed_at: string | null
          brand: string | null
          category: string | null
          epiq_score: number | null
          id: string
          image_url: string | null
          ingredients_list: string
          product_name: string
          product_price: number | null
          recommendations_json: Json | null
          user_id: string
        }
        Insert: {
          analyzed_at?: string | null
          brand?: string | null
          category?: string | null
          epiq_score?: number | null
          id?: string
          image_url?: string | null
          ingredients_list: string
          product_name: string
          product_price?: number | null
          recommendations_json?: Json | null
          user_id: string
        }
        Update: {
          analyzed_at?: string | null
          brand?: string | null
          category?: string | null
          epiq_score?: number | null
          id?: string
          image_url?: string | null
          ingredients_list?: string
          product_name?: string
          product_price?: number | null
          recommendations_json?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_analyses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_type: string
          earned_at: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          badge_type: string
          earned_at?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          badge_type?: string
          earned_at?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_events: {
        Row: {
          created_at: string
          event_category: string
          event_name: string
          event_properties: Json | null
          id: string
          page_url: string | null
          referrer: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_category: string
          event_name: string
          event_properties?: Json | null
          id?: string
          page_url?: string | null
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_category?: string
          event_name?: string
          event_properties?: Json | null
          id?: string
          page_url?: string | null
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          money_spent: string
          skin_condition: string
          skin_type: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          money_spent: string
          skin_condition: string
          skin_type: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          money_spent?: string
          skin_condition?: string
          skin_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      analytics_daily_active_users: {
        Row: {
          active_users: number | null
          date: string | null
        }
        Relationships: []
      }
      analytics_feature_adoption: {
        Row: {
          event_category: string | null
          event_count: number | null
          event_name: string | null
          unique_users: number | null
        }
        Relationships: []
      }
      conversion_funnel_metrics: {
        Row: {
          completed_onboarding: number | null
          date: string | null
          demo_clicks: number | null
          demo_ctr: number | null
          first_analysis: number | null
          homepage_views: number | null
          onboarding_completion_rate: number | null
          signup_clicks: number | null
          signup_ctr: number | null
        }
        Relationships: []
      }
      cta_performance_metrics: {
        Row: {
          cta_text: string | null
          date: string | null
          event_name: string | null
          location: string | null
          total_clicks: number | null
          unique_users: number | null
        }
        Relationships: []
      }
      engagement_metrics_summary: {
        Row: {
          analyses: number | null
          avg_conversions_per_user: number | null
          avg_engagement_per_user: number | null
          conversion_events: number | null
          daily_active_users: number | null
          date: string | null
          engagement_events: number | null
          routines_created: number | null
          routines_optimized: number | null
        }
        Relationships: []
      }
      rate_limit_abuse_alerts: {
        Row: {
          endpoint: string | null
          first_request: string | null
          ip_address: string | null
          last_request: string | null
          requests_last_5min: number | null
          total_requests: number | null
        }
        Relationships: []
      }
      user_journey_analysis: {
        Row: {
          avg_minutes_to_complete_onboarding: number | null
          avg_minutes_to_demo: number | null
          avg_minutes_to_signup: number | null
          clicked_demo: number | null
          clicked_signup: number | null
          completed_first_analysis: number | null
          completed_onboarding: number | null
          homepage_to_demo_rate: number | null
          homepage_to_signup_rate: number | null
          onboarding_to_analysis_rate: number | null
          signup_to_onboarding_rate: number | null
          total_users: number | null
          viewed_homepage: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_rate_limit: {
        Args: {
          _endpoint: string
          _identifier: string
          _max_requests: number
          _window_minutes: number
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      skin_type_enum: "oily" | "dry" | "combination" | "sensitive" | "normal"
      subscription_tier: "free" | "premium" | "pro"
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
      app_role: ["admin", "moderator", "user"],
      skin_type_enum: ["oily", "dry", "combination", "sensitive", "normal"],
      subscription_tier: ["free", "premium", "pro"],
    },
  },
} as const
