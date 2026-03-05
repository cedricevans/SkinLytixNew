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
    PostgrestVersion: "13.0.4"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      academic_institutions: {
        Row: {
          active: boolean | null
          contact_email: string | null
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
          partnership_tier: string
          short_code: string
        }
        Insert: {
          active?: boolean | null
          contact_email?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          partnership_tier?: string
          short_code: string
        }
        Update: {
          active?: boolean | null
          contact_email?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          partnership_tier?: string
          short_code?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          admin_email: string | null
          admin_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          target_user_email: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_email?: string | null
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          target_user_email?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_email?: string | null
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          target_user_email?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
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
      expert_reviews: {
        Row: {
          analysis_id: string | null
          comments: string | null
          created_at: string | null
          epiq_calibration_note: string | null
          id: string
          ingredient_accuracy_score: number | null
          recommendation_quality_score: number | null
          review_status: string
          reviewed_at: string | null
          reviewer_id: string
          reviewer_institution: string
        }
        Insert: {
          analysis_id?: string | null
          comments?: string | null
          created_at?: string | null
          epiq_calibration_note?: string | null
          id?: string
          ingredient_accuracy_score?: number | null
          recommendation_quality_score?: number | null
          review_status?: string
          reviewed_at?: string | null
          reviewer_id: string
          reviewer_institution: string
        }
        Update: {
          analysis_id?: string | null
          comments?: string | null
          created_at?: string | null
          epiq_calibration_note?: string | null
          id?: string
          ingredient_accuracy_score?: number | null
          recommendation_quality_score?: number | null
          review_status?: string
          reviewed_at?: string | null
          reviewer_id?: string
          reviewer_institution?: string
        }
        Relationships: [
          {
            foreignKeyName: "expert_reviews_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "reviewer_ingredient_work_queue"
            referencedColumns: ["analysis_id"]
          },
          {
            foreignKeyName: "expert_reviews_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "user_analyses"
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
      ingredient_articles: {
        Row: {
          author_id: string
          author_institution: string | null
          author_name: string | null
          content_markdown: string
          created_at: string | null
          featured_image_url: string | null
          id: string
          ingredient_name: string
          published_at: string | null
          slug: string
          status: string
          summary: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          author_institution?: string | null
          author_name?: string | null
          content_markdown: string
          created_at?: string | null
          featured_image_url?: string | null
          id?: string
          ingredient_name: string
          published_at?: string | null
          slug: string
          status?: string
          summary?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          author_institution?: string | null
          author_name?: string | null
          content_markdown?: string
          created_at?: string | null
          featured_image_url?: string | null
          id?: string
          ingredient_name?: string
          published_at?: string | null
          slug?: string
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string | null
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
      ingredient_validation_citations: {
        Row: {
          authors: string
          citation_type: string
          created_at: string | null
          doi_or_pmid: string | null
          id: string
          journal_name: string
          publication_year: number | null
          requested_source_type: string | null
          source_id: string | null
          source_url: string
          title: string
          validation_id: string
        }
        Insert: {
          authors: string
          citation_type: string
          created_at?: string | null
          doi_or_pmid?: string | null
          id?: string
          journal_name: string
          publication_year?: number | null
          requested_source_type?: string | null
          source_id?: string | null
          source_url: string
          title: string
          validation_id: string
        }
        Update: {
          authors?: string
          citation_type?: string
          created_at?: string | null
          doi_or_pmid?: string | null
          id?: string
          journal_name?: string
          publication_year?: number | null
          requested_source_type?: string | null
          source_id?: string | null
          source_url?: string
          title?: string
          validation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_validation_citations_validation_id_fkey"
            columns: ["validation_id"]
            isOneToOne: false
            referencedRelation: "ingredient_validations"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredient_validations: {
        Row: {
          ai_claim_summary: string | null
          ai_explanation_accurate: boolean | null
          ai_role_classification_correct: boolean | null
          analysis_id: string | null
          compatibility_assessment: string
          compatibility_notes: string | null
          confidence_level: string | null
          corrected_role: string | null
          corrected_safety_level: string | null
          correction_notes: string | null
          created_at: string | null
          escalation_reason: string | null
          id: string
          ingredient_name: string
          internal_notes: string | null
          is_escalated: boolean | null
          moderator_feedback: string | null
          moderator_reviewed_at: string | null
          moderator_reviewer_id: string | null
          moderator_review_status: string | null
          molecular_weight_correct: boolean | null
          nuance_flags: Json
          pubchem_cid_verified: string | null
          pubchem_data_correct: boolean | null
          public_explanation: string | null
          reference_sources: Json | null
          updated_at: string | null
          validation_status: string | null
          validator_id: string
          validator_institution: string | null
          verdict: string | null
        }
        Insert: {
          ai_claim_summary?: string | null
          ai_explanation_accurate?: boolean | null
          ai_role_classification_correct?: boolean | null
          analysis_id?: string | null
          compatibility_assessment?: string
          compatibility_notes?: string | null
          confidence_level?: string | null
          corrected_role?: string | null
          corrected_safety_level?: string | null
          correction_notes?: string | null
          created_at?: string | null
          escalation_reason?: string | null
          id?: string
          ingredient_name: string
          internal_notes?: string | null
          is_escalated?: boolean | null
          moderator_feedback?: string | null
          moderator_reviewed_at?: string | null
          moderator_reviewer_id?: string | null
          moderator_review_status?: string | null
          molecular_weight_correct?: boolean | null
          nuance_flags?: Json
          pubchem_cid_verified?: string | null
          pubchem_data_correct?: boolean | null
          public_explanation?: string | null
          reference_sources?: Json | null
          updated_at?: string | null
          validation_status?: string | null
          validator_id: string
          validator_institution?: string | null
          verdict?: string | null
        }
        Update: {
          ai_claim_summary?: string | null
          ai_explanation_accurate?: boolean | null
          ai_role_classification_correct?: boolean | null
          analysis_id?: string | null
          compatibility_assessment?: string
          compatibility_notes?: string | null
          confidence_level?: string | null
          corrected_role?: string | null
          corrected_safety_level?: string | null
          correction_notes?: string | null
          created_at?: string | null
          escalation_reason?: string | null
          id?: string
          ingredient_name?: string
          internal_notes?: string | null
          is_escalated?: boolean | null
          moderator_feedback?: string | null
          moderator_reviewed_at?: string | null
          moderator_reviewer_id?: string | null
          moderator_review_status?: string | null
          molecular_weight_correct?: boolean | null
          nuance_flags?: Json
          pubchem_cid_verified?: string | null
          pubchem_data_correct?: boolean | null
          public_explanation?: string | null
          reference_sources?: Json | null
          updated_at?: string | null
          validation_status?: string | null
          validator_id?: string
          validator_institution?: string | null
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_validations_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "reviewer_ingredient_work_queue"
            referencedColumns: ["analysis_id"]
          },
          {
            foreignKeyName: "ingredient_validations_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "user_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      market_dupe_cache: {
        Row: {
          created_at: string | null
          dupes: Json | null
          dupes_count: number | null
          id: string
          source_product_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dupes?: Json | null
          dupes_count?: number | null
          id?: string
          source_product_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dupes?: Json | null
          dupes_count?: number | null
          id?: string
          source_product_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_dupe_cache_source_product_id_fkey"
            columns: ["source_product_id"]
            isOneToOne: false
            referencedRelation: "reviewer_ingredient_work_queue"
            referencedColumns: ["analysis_id"]
          },
          {
            foreignKeyName: "market_dupe_cache_source_product_id_fkey"
            columns: ["source_product_id"]
            isOneToOne: false
            referencedRelation: "user_analyses"
            referencedColumns: ["id"]
          },
        ]
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
          melanin_level: number | null
          pregnancy_safe: boolean | null
          product_preferences: Json | null
          scalp_type: string | null
          sensitivities: Json | null
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
          vegan: boolean | null
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
          melanin_level?: number | null
          pregnancy_safe?: boolean | null
          product_preferences?: Json | null
          scalp_type?: string | null
          sensitivities?: Json | null
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
          vegan?: boolean | null
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
          melanin_level?: number | null
          pregnancy_safe?: boolean | null
          product_preferences?: Json | null
          scalp_type?: string | null
          sensitivities?: Json | null
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
          vegan?: boolean | null
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
      reviewer_group_members: {
        Row: {
          added_by: string | null
          created_at: string | null
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string | null
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string | null
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviewer_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "reviewer_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviewer_group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviewer_groups: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
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
            referencedRelation: "reviewer_ingredient_work_queue"
            referencedColumns: ["analysis_id"]
          },
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
            referencedRelation: "reviewer_ingredient_work_queue"
            referencedColumns: ["analysis_id"]
          },
          {
            foreignKeyName: "saved_dupes_source_product_id_fkey"
            columns: ["source_product_id"]
            isOneToOne: false
            referencedRelation: "user_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      student_certifications: {
        Row: {
          articles_published: number | null
          certification_level: string
          certified_at: string | null
          courses_completed: Json | null
          created_at: string | null
          expires_at: string | null
          id: string
          institution: string
          reviews_completed: number | null
          user_id: string
        }
        Insert: {
          articles_published?: number | null
          certification_level?: string
          certified_at?: string | null
          courses_completed?: Json | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          institution: string
          reviews_completed?: number | null
          user_id: string
        }
        Update: {
          articles_published?: number | null
          certification_level?: string
          certified_at?: string | null
          courses_completed?: Json | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          institution?: string
          reviews_completed?: number | null
          user_id?: string
        }
        Relationships: []
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
          confidence_score: string | null
          epiq_engine_version: string | null
          epiq_match_color: string | null
          epiq_match_pct: number | null
          epiq_match_tier: string | null
          epiq_score: number | null
          id: string
          image_url: string | null
          ingredients_list: string
          melanin_alert: boolean | null
          melanin_alert_message: string | null
          product_name: string
          product_price: number | null
          recommendations_json: Json | null
          score_breakdown: Json | null
          show_epiq_score_sublabel: boolean | null
          user_id: string
          validation_status: string | null
          verdict: string | null
        }
        Insert: {
          analyzed_at?: string | null
          brand?: string | null
          category?: string | null
          confidence_score?: string | null
          epiq_engine_version?: string | null
          epiq_match_color?: string | null
          epiq_match_pct?: number | null
          epiq_match_tier?: string | null
          epiq_score?: number | null
          id?: string
          image_url?: string | null
          ingredients_list: string
          melanin_alert?: boolean | null
          melanin_alert_message?: string | null
          product_name: string
          product_price?: number | null
          recommendations_json?: Json | null
          score_breakdown?: Json | null
          show_epiq_score_sublabel?: boolean | null
          user_id: string
          validation_status?: string | null
          verdict?: string | null
        }
        Update: {
          analyzed_at?: string | null
          brand?: string | null
          category?: string | null
          confidence_score?: string | null
          epiq_engine_version?: string | null
          epiq_match_color?: string | null
          epiq_match_pct?: number | null
          epiq_match_tier?: string | null
          epiq_score?: number | null
          id?: string
          image_url?: string | null
          ingredients_list?: string
          melanin_alert?: boolean | null
          melanin_alert_message?: string | null
          product_name?: string
          product_price?: number | null
          recommendations_json?: Json | null
          score_breakdown?: Json | null
          show_epiq_score_sublabel?: boolean | null
          user_id?: string
          validation_status?: string | null
          verdict?: string | null
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
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
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
      waitlist_special_pricing: {
        Row: {
          activated_at: string | null
          activated_subscription_id: string | null
          billing_cycle: string | null
          created_at: string
          discount_percentage: number
          discounted_price: number | null
          email: string
          email_sent_at: string | null
          id: string
          metadata: Json
          original_price: number | null
          promo_code: string
          status: string
          tier_offering: string
          updated_at: string
          user_id: string | null
          valid_from: string
          valid_until: string
          waitlist_user_id: string | null
        }
        Insert: {
          activated_at?: string | null
          activated_subscription_id?: string | null
          billing_cycle?: string | null
          created_at?: string
          discount_percentage: number
          discounted_price?: number | null
          email: string
          email_sent_at?: string | null
          id?: string
          metadata?: Json
          original_price?: number | null
          promo_code: string
          status?: string
          tier_offering: string
          updated_at?: string
          user_id?: string | null
          valid_from?: string
          valid_until: string
          waitlist_user_id?: string | null
        }
        Update: {
          activated_at?: string | null
          activated_subscription_id?: string | null
          billing_cycle?: string | null
          created_at?: string
          discount_percentage?: number
          discounted_price?: number | null
          email?: string
          email_sent_at?: string | null
          id?: string
          metadata?: Json
          original_price?: number | null
          promo_code?: string
          status?: string
          tier_offering?: string
          updated_at?: string
          user_id?: string | null
          valid_from?: string
          valid_until?: string
          waitlist_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_special_pricing_waitlist_user_id_fkey"
            columns: ["waitlist_user_id"]
            isOneToOne: false
            referencedRelation: "waitlist"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      reviewer_ingredient_work_queue: {
        Row: {
          analysis_id: string | null
          brand: string | null
          final_label: string | null
          ingredient_name: string | null
          last_activity_at: string | null
          needs_review: boolean | null
          product_name: string | null
          user_id: string | null
          validation_status: string | null
          validator_id: string | null
          verdict: string | null
          worked_on: boolean | null
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
      reviewer_stats: {
        Row: {
          approval_rate: number | null
          approved_count: number | null
          confirmed_validations: number | null
          corrected_validations: number | null
          escalated_validations: number | null
          high_confidence_count: number | null
          institution: string | null
          last_validation_date: string | null
          limited_confidence_count: number | null
          moderate_confidence_count: number | null
          rejected_count: number | null
          total_validations: number | null
          user_id: string | null
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
      derive_epiq_match: {
        Args: { p_epiq_score: number; p_melanin_alert: boolean }
        Returns: {
          color: string
          pct: number
          show_epiq_score_sublabel: boolean
          tier: string
          verdict: string
        }[]
      }
      get_reviewer_emails: {
        Args: { p_user_ids: string[] }
        Returns: {
          email: string
          id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      recalculate_analysis_score_from_validations: {
        Args: { p_analysis_id: string }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "reviewer" | "user"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "moderator", "reviewer", "user"],
      skin_type_enum: ["oily", "dry", "combination", "sensitive", "normal"],
      subscription_tier: ["free", "premium", "pro"],
    },
  },
} as const
