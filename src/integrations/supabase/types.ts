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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      answers: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          order_index: number
          question_id: string
          text: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean
          order_index?: number
          question_id: string
          text: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          order_index?: number
          question_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_tags: {
        Row: {
          created_at: string
          exam_id: string
          tag: string
        }
        Insert: {
          created_at?: string
          exam_id: string
          tag: string
        }
        Update: {
          created_at?: string
          exam_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_tags_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          category: Database["public"]["Enums"]["exam_category"]
          created_at: string
          description: string | null
          exam_number: number | null
          id: string
          is_sample: boolean
          is_timed_final: boolean
          price_cents: number | null
          product_id: string | null
          question_count: number
          slug: string
          status: Database["public"]["Enums"]["exam_status"]
          time_limit_minutes: number | null
          title: string
          updated_at: string
          youtube_url: string | null
          youtube_video_id: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["exam_category"]
          created_at?: string
          description?: string | null
          exam_number?: number | null
          id?: string
          is_sample?: boolean
          is_timed_final?: boolean
          price_cents?: number | null
          product_id?: string | null
          question_count?: number
          slug: string
          status?: Database["public"]["Enums"]["exam_status"]
          time_limit_minutes?: number | null
          title: string
          updated_at?: string
          youtube_url?: string | null
          youtube_video_id?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["exam_category"]
          created_at?: string
          description?: string | null
          exam_number?: number | null
          id?: string
          is_sample?: boolean
          is_timed_final?: boolean
          price_cents?: number | null
          product_id?: string | null
          question_count?: number
          slug?: string
          status?: Database["public"]["Enums"]["exam_status"]
          time_limit_minutes?: number | null
          title?: string
          updated_at?: string
          youtube_url?: string | null
          youtube_video_id?: string | null
        }
        Relationships: []
      }
      ghl_sync_runs: {
        Row: {
          created_at: string
          duration_ms: number
          errors: Json
          failed: number
          finished_at: string | null
          id: string
          processed: number
          skipped: number
          started_at: string
          succeeded: number
          trigger: string
          truncated: boolean
        }
        Insert: {
          created_at?: string
          duration_ms?: number
          errors?: Json
          failed?: number
          finished_at?: string | null
          id?: string
          processed?: number
          skipped?: number
          started_at?: string
          succeeded?: number
          trigger: string
          truncated?: boolean
        }
        Update: {
          created_at?: string
          duration_ms?: number
          errors?: Json
          failed?: number
          finished_at?: string | null
          id?: string
          processed?: number
          skipped?: number
          started_at?: string
          succeeded?: number
          trigger?: string
          truncated?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_track: string | null
          created_at: string
          display_name: string | null
          ghl_synced_at: string | null
          id: string
          test_date: string | null
          updated_at: string
        }
        Insert: {
          active_track?: string | null
          created_at?: string
          display_name?: string | null
          ghl_synced_at?: string | null
          id: string
          test_date?: string | null
          updated_at?: string
        }
        Update: {
          active_track?: string | null
          created_at?: string
          display_name?: string | null
          ghl_synced_at?: string | null
          id?: string
          test_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          created_at: string
          environment: string
          id: string
          price_id: string
          product_id: string
          ref: string | null
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string
          environment?: string
          id?: string
          price_id: string
          product_id: string
          ref?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string
          environment?: string
          id?: string
          price_id?: string
          product_id?: string
          ref?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          created_at: string
          exam_id: string
          explanation: string | null
          id: string
          order_index: number
          text: string
        }
        Insert: {
          created_at?: string
          exam_id: string
          explanation?: string | null
          id?: string
          order_index?: number
          text: string
        }
        Update: {
          created_at?: string
          exam_id?: string
          explanation?: string | null
          id?: string
          order_index?: number
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_answers: {
        Row: {
          answer_id: string
          answered_at: string
          attempt_id: string
          id: string
          is_correct: boolean
          question_id: string
        }
        Insert: {
          answer_id: string
          answered_at?: string
          attempt_id: string
          id?: string
          is_correct?: boolean
          question_id: string
        }
        Update: {
          answer_id?: string
          answered_at?: string
          attempt_id?: string
          id?: string
          is_correct?: boolean
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_answers_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "user_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_attempts: {
        Row: {
          attempt_type: string
          category: Database["public"]["Enums"]["exam_category"] | null
          completed_at: string | null
          created_at: string
          exam_id: string | null
          id: string
          score: number | null
          started_at: string
          total: number
          user_id: string
          weekly_mix_id: string | null
        }
        Insert: {
          attempt_type?: string
          category?: Database["public"]["Enums"]["exam_category"] | null
          completed_at?: string | null
          created_at?: string
          exam_id?: string | null
          id?: string
          score?: number | null
          started_at?: string
          total: number
          user_id: string
          weekly_mix_id?: string | null
        }
        Update: {
          attempt_type?: string
          category?: Database["public"]["Enums"]["exam_category"] | null
          completed_at?: string | null
          created_at?: string
          exam_id?: string | null
          id?: string
          score?: number | null
          started_at?: string
          total?: number
          user_id?: string
          weekly_mix_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_attempts_weekly_mix_id_fkey"
            columns: ["weekly_mix_id"]
            isOneToOne: false
            referencedRelation: "weekly_mixes"
            referencedColumns: ["id"]
          },
        ]
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
          role: Database["public"]["Enums"]["app_role"]
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
      user_streaks: {
        Row: {
          best_streak: number
          created_at: string
          current_streak: number
          last_active_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          best_streak?: number
          created_at?: string
          current_streak?: number
          last_active_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          best_streak?: number
          created_at?: string
          current_streak?: number
          last_active_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_mix_questions: {
        Row: {
          mix_id: string
          order_index: number
          question_id: string
          wrong_rate: number | null
        }
        Insert: {
          mix_id: string
          order_index: number
          question_id: string
          wrong_rate?: number | null
        }
        Update: {
          mix_id?: string
          order_index?: number
          question_id?: string
          wrong_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_mix_questions_mix_id_fkey"
            columns: ["mix_id"]
            isOneToOne: false
            referencedRelation: "weekly_mixes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_mix_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_mixes: {
        Row: {
          created_at: string
          id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_weekly_mix: {
        Args: { target_week_start?: string }
        Returns: string
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
      app_role: "admin" | "user"
      exam_category: "real_estate" | "life_health_insurance"
      exam_status: "draft" | "published" | "archived"
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
      app_role: ["admin", "user"],
      exam_category: ["real_estate", "life_health_insurance"],
      exam_status: ["draft", "published", "archived"],
    },
  },
} as const
