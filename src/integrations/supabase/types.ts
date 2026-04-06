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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_prompts: {
        Row: {
          context: string
          created_at: string
          id: string
          is_active: boolean
          label: string
          prompt_text: string
          test_module_id: string | null
          updated_at: string
        }
        Insert: {
          context: string
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          prompt_text?: string
          test_module_id?: string | null
          updated_at?: string
        }
        Update: {
          context?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          prompt_text?: string
          test_module_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_prompts_test_module_id_fkey"
            columns: ["test_module_id"]
            isOneToOne: false
            referencedRelation: "test_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_answers: {
        Row: {
          answer_value: number
          created_at: string
          id: string
          question_id: number
          session_id: string
        }
        Insert: {
          answer_value: number
          created_at?: string
          id?: string
          question_id: number
          session_id: string
        }
        Update: {
          answer_value?: number
          created_at?: string
          id?: string
          question_id?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_results: {
        Row: {
          all_scores: Json | null
          blocking_point: string
          combined_title: string
          contradiction: string
          core_pain: string
          created_at: string
          critical_diagnosis: string
          direction: string
          dominant_pattern: string
          exit_strategy: Json | null
          id: string
          impact: string
          intensity: string
          key_unlock_area: string
          life_impact: Json | null
          mechanism: string
          mental_state: string
          profile_name: string
          secondary_patterns: string[] | null
          self_sabotage_cycle: string[] | null
          session_id: string
          state_summary: string
          traps: string[] | null
          triggers: string[] | null
          what_not_to_do: string[]
        }
        Insert: {
          all_scores?: Json | null
          blocking_point: string
          combined_title: string
          contradiction: string
          core_pain?: string
          created_at?: string
          critical_diagnosis?: string
          direction: string
          dominant_pattern: string
          exit_strategy?: Json | null
          id?: string
          impact?: string
          intensity: string
          key_unlock_area?: string
          life_impact?: Json | null
          mechanism: string
          mental_state: string
          profile_name: string
          secondary_patterns?: string[] | null
          self_sabotage_cycle?: string[] | null
          session_id: string
          state_summary: string
          traps?: string[] | null
          triggers?: string[] | null
          what_not_to_do?: string[]
        }
        Update: {
          all_scores?: Json | null
          blocking_point?: string
          combined_title?: string
          contradiction?: string
          core_pain?: string
          created_at?: string
          critical_diagnosis?: string
          direction?: string
          dominant_pattern?: string
          exit_strategy?: Json | null
          id?: string
          impact?: string
          intensity?: string
          key_unlock_area?: string
          life_impact?: Json | null
          mechanism?: string
          mental_state?: string
          profile_name?: string
          secondary_patterns?: string[] | null
          self_sabotage_cycle?: string[] | null
          session_id?: string
          state_summary?: string
          traps?: string[] | null
          triggers?: string[] | null
          what_not_to_do?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "diagnostic_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          test_module_id: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          test_module_id?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          test_module_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_sessions_test_module_id_fkey"
            columns: ["test_module_id"]
            isOneToOne: false
            referencedRelation: "test_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      global_ai_config: {
        Row: {
          ai_enabled: boolean
          ai_model: string
          created_at: string
          depth_level: number
          id: string
          max_tokens: number
          report_style: string
          temperature: number
          tone: string
          updated_at: string
        }
        Insert: {
          ai_enabled?: boolean
          ai_model?: string
          created_at?: string
          depth_level?: number
          id?: string
          max_tokens?: number
          report_style?: string
          temperature?: number
          tone?: string
          updated_at?: string
        }
        Update: {
          ai_enabled?: boolean
          ai_model?: string
          created_at?: string
          depth_level?: number
          id?: string
          max_tokens?: number
          report_style?: string
          temperature?: number
          tone?: string
          updated_at?: string
        }
        Relationships: []
      }
      pattern_definitions: {
        Row: {
          blocking_point: string
          contradiction: string
          core_pain: string
          created_at: string
          critical_diagnosis: string
          description: string
          direction: string
          exit_strategy: Json
          id: string
          impact: string
          key_unlock_area: string
          label: string
          life_impact: Json
          mechanism: string
          mental_state: string
          mental_traps: string[]
          pattern_key: string
          profile_name: string
          self_sabotage_cycle: string[]
          sort_order: number
          test_module_id: string | null
          triggers: string[]
          updated_at: string
          what_not_to_do: string[]
        }
        Insert: {
          blocking_point?: string
          contradiction?: string
          core_pain?: string
          created_at?: string
          critical_diagnosis?: string
          description?: string
          direction?: string
          exit_strategy?: Json
          id?: string
          impact?: string
          key_unlock_area?: string
          label: string
          life_impact?: Json
          mechanism?: string
          mental_state?: string
          mental_traps?: string[]
          pattern_key: string
          profile_name?: string
          self_sabotage_cycle?: string[]
          sort_order?: number
          test_module_id?: string | null
          triggers?: string[]
          updated_at?: string
          what_not_to_do?: string[]
        }
        Update: {
          blocking_point?: string
          contradiction?: string
          core_pain?: string
          created_at?: string
          critical_diagnosis?: string
          description?: string
          direction?: string
          exit_strategy?: Json
          id?: string
          impact?: string
          key_unlock_area?: string
          label?: string
          life_impact?: Json
          mechanism?: string
          mental_state?: string
          mental_traps?: string[]
          pattern_key?: string
          profile_name?: string
          self_sabotage_cycle?: string[]
          sort_order?: number
          test_module_id?: string | null
          triggers?: string[]
          updated_at?: string
          what_not_to_do?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "pattern_definitions_test_module_id_fkey"
            columns: ["test_module_id"]
            isOneToOne: false
            referencedRelation: "test_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_change_history: {
        Row: {
          changed_at: string
          changed_by: string
          id: string
          new_plan: string
          previous_plan: string
          user_id: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          id?: string
          new_plan: string
          previous_plan: string
          user_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          id?: string
          new_plan?: string
          previous_plan?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          birth_date: string
          cpf: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number | null
          birth_date: string
          cpf?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number | null
          birth_date?: string
          cpf?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prompt_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_content: string
          old_content: string
          prompt_id: string
          prompt_type: string
          test_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_content: string
          old_content: string
          prompt_id: string
          prompt_type: string
          test_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_content?: string
          old_content?: string
          prompt_id?: string
          prompt_type?: string
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompt_history_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "test_prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_history_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "test_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          axes: string[]
          context: string | null
          created_at: string
          id: string
          option_scores: number[] | null
          options: string[] | null
          sort_order: number
          test_id: string
          text: string
          type: Database["public"]["Enums"]["question_type"]
          weight: number
        }
        Insert: {
          axes?: string[]
          context?: string | null
          created_at?: string
          id?: string
          option_scores?: number[] | null
          options?: string[] | null
          sort_order?: number
          test_id: string
          text: string
          type?: Database["public"]["Enums"]["question_type"]
          weight?: number
        }
        Update: {
          axes?: string[]
          context?: string | null
          created_at?: string
          id?: string
          option_scores?: number[] | null
          options?: string[] | null
          sort_order?: number
          test_id?: string
          text?: string
          type?: Database["public"]["Enums"]["question_type"]
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "questions_test_module_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "test_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_tasks: {
        Row: {
          id: string
          status: string
          task_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          status?: string
          task_key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          status?: string
          task_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          asaas_customer_id: string | null
          asaas_subscription_id: string | null
          billing_type: string
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          next_due_date: string | null
          plan: Database["public"]["Enums"]["subscription_plan"]
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          billing_type?: string
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          next_due_date?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id: string
          value?: number
        }
        Update: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          billing_type?: string
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          next_due_date?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      test_ai_config: {
        Row: {
          ai_enabled: boolean
          created_at: string
          depth_level: number
          id: string
          max_tokens: number
          report_style: string
          temperature: number
          test_id: string
          tone: string
          updated_at: string
          use_global_defaults: boolean
        }
        Insert: {
          ai_enabled?: boolean
          created_at?: string
          depth_level?: number
          id?: string
          max_tokens?: number
          report_style?: string
          temperature?: number
          test_id: string
          tone?: string
          updated_at?: string
          use_global_defaults?: boolean
        }
        Update: {
          ai_enabled?: boolean
          created_at?: string
          depth_level?: number
          id?: string
          max_tokens?: number
          report_style?: string
          temperature?: number
          test_id?: string
          tone?: string
          updated_at?: string
          use_global_defaults?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "test_ai_config_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: true
            referencedRelation: "test_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      test_modules: {
        Row: {
          category: string
          created_at: string
          description: string
          icon: string
          id: string
          is_active: boolean
          name: string
          question_count: number
          slug: string
          sort_order: number
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          question_count?: number
          slug: string
          sort_order?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          question_count?: number
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      test_prompts: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean
          prompt_type: Database["public"]["Enums"]["prompt_type"]
          test_id: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          prompt_type: Database["public"]["Enums"]["prompt_type"]
          test_id: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          prompt_type?: Database["public"]["Enums"]["prompt_type"]
          test_id?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_prompts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "test_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      test_results: {
        Row: {
          created_at: string
          id: string
          normalized_score: Json
          raw_score: Json
          test_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          normalized_score?: Json
          raw_score?: Json
          test_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          normalized_score?: Json
          raw_score?: Json
          test_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      user_central_profile: {
        Row: {
          aggregated_scores: Json
          core_pain: string | null
          created_at: string
          dominant_patterns: Json
          id: string
          key_unlock_area: string | null
          last_test_at: string | null
          mental_state: string | null
          profile_name: string | null
          tests_completed: number
          updated_at: string
          user_id: string
        }
        Insert: {
          aggregated_scores?: Json
          core_pain?: string | null
          created_at?: string
          dominant_patterns?: Json
          id?: string
          key_unlock_area?: string | null
          last_test_at?: string | null
          mental_state?: string | null
          profile_name?: string | null
          tests_completed?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          aggregated_scores?: Json
          core_pain?: string | null
          created_at?: string
          dominant_patterns?: Json
          id?: string
          key_unlock_area?: string | null
          last_test_at?: string | null
          mental_state?: string | null
          profile_name?: string | null
          tests_completed?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profile: {
        Row: {
          behavioral_profile: Json
          dominant_pattern: string | null
          emotional_profile: Json
          id: string
          last_updated: string
          secondary_patterns: string[] | null
          user_id: string
        }
        Insert: {
          behavioral_profile?: Json
          dominant_pattern?: string | null
          emotional_profile?: Json
          id?: string
          last_updated?: string
          secondary_patterns?: string[] | null
          user_id: string
        }
        Update: {
          behavioral_profile?: Json
          dominant_pattern?: string | null
          emotional_profile?: Json
          id?: string
          last_updated?: string
          secondary_patterns?: string[] | null
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
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "premium" | "super_admin"
      prompt_type:
        | "interpretation"
        | "diagnosis"
        | "profile"
        | "core_pain"
        | "triggers"
        | "direction"
        | "restrictions"
      question_type: "likert" | "behavior_choice" | "frequency" | "intensity"
      subscription_plan: "monthly" | "yearly"
      subscription_status:
        | "pending"
        | "active"
        | "overdue"
        | "canceled"
        | "expired"
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
      app_role: ["admin", "user", "premium", "super_admin"],
      prompt_type: [
        "interpretation",
        "diagnosis",
        "profile",
        "core_pain",
        "triggers",
        "direction",
        "restrictions",
      ],
      question_type: ["likert", "behavior_choice", "frequency", "intensity"],
      subscription_plan: ["monthly", "yearly"],
      subscription_status: [
        "pending",
        "active",
        "overdue",
        "canceled",
        "expired",
      ],
    },
  },
} as const
