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
      product_ingredients: {
        Row: {
          created_at: string | null
          id: string
          ingredient_name: string
          ingredient_order: number
          product_id: string
          pubchem_cid: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ingredient_name: string
          ingredient_order: number
          product_id: string
          pubchem_cid?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ingredient_name?: string
          ingredient_order?: number
          product_id?: string
          pubchem_cid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_ingredients_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          brand: string | null
          category: string | null
          contributed_by_user_id: string | null
          date_added: string | null
          id: string
          image_url: string | null
          last_verified_date: string | null
          product_name: string
          updated_at: string | null
          verification_count: number | null
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          category?: string | null
          contributed_by_user_id?: string | null
          date_added?: string | null
          id?: string
          image_url?: string | null
          last_verified_date?: string | null
          product_name: string
          updated_at?: string | null
          verification_count?: number | null
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          category?: string | null
          contributed_by_user_id?: string | null
          date_added?: string | null
          id?: string
          image_url?: string | null
          last_verified_date?: string | null
          product_name?: string
          updated_at?: string | null
          verification_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_contributed_by_user_id_fkey"
            columns: ["contributed_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          body_concerns: Json | null
          created_at: string | null
          display_name: string | null
          email: string | null
          has_seen_walkthrough: boolean | null
          id: string
          is_profile_complete: boolean | null
          product_preferences: Json | null
          scalp_type: string | null
          skin_concerns: Json | null
          skin_type: Database["public"]["Enums"]["skin_type_enum"] | null
          updated_at: string | null
        }
        Insert: {
          body_concerns?: Json | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          has_seen_walkthrough?: boolean | null
          id: string
          is_profile_complete?: boolean | null
          product_preferences?: Json | null
          scalp_type?: string | null
          skin_concerns?: Json | null
          skin_type?: Database["public"]["Enums"]["skin_type_enum"] | null
          updated_at?: string | null
        }
        Update: {
          body_concerns?: Json | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          has_seen_walkthrough?: boolean | null
          id?: string
          is_profile_complete?: boolean | null
          product_preferences?: Json | null
          scalp_type?: string | null
          skin_concerns?: Json | null
          skin_type?: Database["public"]["Enums"]["skin_type_enum"] | null
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
          created_at: string
          id: string
          product_price: number | null
          routine_id: string
          usage_frequency: string
        }
        Insert: {
          analysis_id: string
          created_at?: string
          id?: string
          product_price?: number | null
          routine_id: string
          usage_frequency: string
        }
        Update: {
          analysis_id?: string
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
      user_analyses: {
        Row: {
          analyzed_at: string | null
          brand: string | null
          category: string | null
          epiq_score: number | null
          id: string
          ingredients_list: string
          product_id: string | null
          product_name: string
          recommendations_json: Json | null
          user_id: string
        }
        Insert: {
          analyzed_at?: string | null
          brand?: string | null
          category?: string | null
          epiq_score?: number | null
          id?: string
          ingredients_list: string
          product_id?: string | null
          product_name: string
          recommendations_json?: Json | null
          user_id: string
        }
        Update: {
          analyzed_at?: string | null
          brand?: string | null
          category?: string | null
          epiq_score?: number | null
          id?: string
          ingredients_list?: string
          product_id?: string | null
          product_name?: string
          recommendations_json?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_analyses_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_analyses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Enums: {
      skin_type_enum: "oily" | "dry" | "combination" | "sensitive" | "normal"
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
      skin_type_enum: ["oily", "dry", "combination", "sensitive", "normal"],
    },
  },
} as const
