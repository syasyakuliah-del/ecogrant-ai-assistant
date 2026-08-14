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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          budget_category: string
          category: string
          created_at: string
          default_indicator: string | null
          default_output: string | null
          description: string
          id: string
          is_active: boolean
          lfa_level: string
          name: string
          sub_category: string | null
          target_unit: string
          updated_at: string
        }
        Insert: {
          budget_category?: string
          category?: string
          created_at?: string
          default_indicator?: string | null
          default_output?: string | null
          description?: string
          id?: string
          is_active?: boolean
          lfa_level?: string
          name: string
          sub_category?: string | null
          target_unit?: string
          updated_at?: string
        }
        Update: {
          budget_category?: string
          category?: string
          created_at?: string
          default_indicator?: string | null
          default_output?: string | null
          description?: string
          id?: string
          is_active?: boolean
          lfa_level?: string
          name?: string
          sub_category?: string | null
          target_unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_generations: {
        Row: {
          created_at: string
          duration_ms: number
          generation_type: string
          id: string
          model: string | null
          proposal_id: string | null
          status: string
          tokens_used: number
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number
          generation_type?: string
          id?: string
          model?: string | null
          proposal_id?: string | null
          status?: string
          tokens_used?: number
          user_id: string
        }
        Update: {
          created_at?: string
          duration_ms?: number
          generation_type?: string
          id?: string
          model?: string | null
          proposal_id?: string | null
          status?: string
          tokens_used?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_generations_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      budget_items: {
        Row: {
          activity_name: string | null
          category: string
          code: string | null
          created_at: string
          description: string
          frequency: number
          id: string
          lfa_row_id: string | null
          override_reason: string | null
          proposal_id: string
          sbm_id: string | null
          sbu_id: string | null
          sort_order: number
          source_type: string
          subtotal: number | null
          tax_amount: number | null
          tax_rate: number
          total: number | null
          unit: string
          unit_price: number
          updated_at: string
          validation_message: string | null
          validation_status: string
          volume: number
        }
        Insert: {
          activity_name?: string | null
          category?: string
          code?: string | null
          created_at?: string
          description?: string
          frequency?: number
          id?: string
          lfa_row_id?: string | null
          override_reason?: string | null
          proposal_id: string
          sbm_id?: string | null
          sbu_id?: string | null
          sort_order?: number
          source_type?: string
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number
          total?: number | null
          unit?: string
          unit_price?: number
          updated_at?: string
          validation_message?: string | null
          validation_status?: string
          volume?: number
        }
        Update: {
          activity_name?: string | null
          category?: string
          code?: string | null
          created_at?: string
          description?: string
          frequency?: number
          id?: string
          lfa_row_id?: string | null
          override_reason?: string | null
          proposal_id?: string
          sbm_id?: string | null
          sbu_id?: string | null
          sort_order?: number
          source_type?: string
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number
          total?: number | null
          unit?: string
          unit_price?: number
          updated_at?: string
          validation_message?: string | null
          validation_status?: string
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "budget_items_lfa_row_id_fkey"
            columns: ["lfa_row_id"]
            isOneToOne: false
            referencedRelation: "lfa_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_items_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_items_sbm_id_fkey"
            columns: ["sbm_id"]
            isOneToOne: false
            referencedRelation: "sbm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_items_sbu_id_fkey"
            columns: ["sbu_id"]
            isOneToOne: false
            referencedRelation: "sbu"
            referencedColumns: ["id"]
          },
        ]
      }
      community_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          status: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          status?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          author_id: string | null
          category: string
          content: string
          created_at: string
          excerpt: string | null
          id: string
          published_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          category?: string
          content?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          category?: string
          content?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      donor_matches: {
        Row: {
          created_at: string
          donor_id: string
          id: string
          met_requirements: string[]
          proposal_id: string
          reasons: string[]
          risks: string[]
          score: number
          unmet_requirements: string[]
        }
        Insert: {
          created_at?: string
          donor_id: string
          id?: string
          met_requirements?: string[]
          proposal_id: string
          reasons?: string[]
          risks?: string[]
          score?: number
          unmet_requirements?: string[]
        }
        Update: {
          created_at?: string
          donor_id?: string
          id?: string
          met_requirements?: string[]
          proposal_id?: string
          reasons?: string[]
          risks?: string[]
          score?: number
          unmet_requirements?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "donor_matches_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "donors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donor_matches_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "donors_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donor_matches_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      donors: {
        Row: {
          category: string
          country: string | null
          created_at: string
          currency: string
          deadline: string | null
          deleted_at: string | null
          email: string | null
          funding_fields: string[]
          id: string
          is_active: boolean
          max_grant: number
          min_grant: number
          name: string
          phone: string | null
          priorities: string[]
          requirements: string[]
          updated_at: string
          website: string | null
        }
        Insert: {
          category?: string
          country?: string | null
          created_at?: string
          currency?: string
          deadline?: string | null
          deleted_at?: string | null
          email?: string | null
          funding_fields?: string[]
          id?: string
          is_active?: boolean
          max_grant?: number
          min_grant?: number
          name: string
          phone?: string | null
          priorities?: string[]
          requirements?: string[]
          updated_at?: string
          website?: string | null
        }
        Update: {
          category?: string
          country?: string | null
          created_at?: string
          currency?: string
          deadline?: string | null
          deleted_at?: string | null
          email?: string | null
          funding_fields?: string[]
          id?: string
          is_active?: boolean
          max_grant?: number
          min_grant?: number
          name?: string
          phone?: string | null
          priorities?: string[]
          requirements?: string[]
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      help_articles: {
        Row: {
          category: string
          content: string
          created_at: string
          excerpt: string
          id: string
          is_published: boolean
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content?: string
          created_at?: string
          excerpt?: string
          id?: string
          is_published?: boolean
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          excerpt?: string
          id?: string
          is_published?: boolean
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      lfa_rows: {
        Row: {
          activity: string | null
          assumption: string | null
          baseline: string | null
          created_at: string
          goal: string | null
          id: string
          indicator: string | null
          means_of_verification: string | null
          outcome: string | null
          output: string | null
          proposal_id: string
          row_type: string
          sort_order: number
          target: string | null
          updated_at: string
        }
        Insert: {
          activity?: string | null
          assumption?: string | null
          baseline?: string | null
          created_at?: string
          goal?: string | null
          id?: string
          indicator?: string | null
          means_of_verification?: string | null
          outcome?: string | null
          output?: string | null
          proposal_id: string
          row_type?: string
          sort_order?: number
          target?: string | null
          updated_at?: string
        }
        Update: {
          activity?: string | null
          assumption?: string | null
          baseline?: string | null
          created_at?: string
          goal?: string | null
          id?: string
          indicator?: string | null
          means_of_verification?: string | null
          outcome?: string | null
          output?: string | null
          proposal_id?: string
          row_type?: string
          sort_order?: number
          target?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lfa_rows_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      login_histories: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          status: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          status?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          status?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          message: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          message?: string | null
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          message?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          last_login_at: string | null
          organization_name: string | null
          phone: string | null
          position: string | null
          status: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id: string
          last_login_at?: string | null
          organization_name?: string | null
          phone?: string | null
          position?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          last_login_at?: string | null
          organization_name?: string | null
          phone?: string | null
          position?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      proposal_sections: {
        Row: {
          ai_generated: boolean
          content: string
          created_at: string
          id: string
          proposal_id: string
          section_type: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          ai_generated?: boolean
          content?: string
          created_at?: string
          id?: string
          proposal_id: string
          section_type: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          ai_generated?: boolean
          content?: string
          created_at?: string
          id?: string
          proposal_id?: string
          section_type?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_sections_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_versions: {
        Row: {
          change_summary: string
          created_at: string
          created_by: string | null
          id: string
          proposal_id: string
          snapshot: Json | null
          version_number: number
        }
        Insert: {
          change_summary?: string
          created_at?: string
          created_by?: string | null
          id?: string
          proposal_id: string
          snapshot?: Json | null
          version_number?: number
        }
        Update: {
          change_summary?: string
          created_at?: string
          created_by?: string | null
          id?: string
          proposal_id?: string
          snapshot?: Json | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_versions_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          category: string | null
          city: string | null
          created_at: string
          currency: string
          current_step: number
          deleted_at: string | null
          donor_id: string | null
          duration_months: number
          end_date: string | null
          grant_amount: number
          id: string
          idea_summary: string | null
          location: string | null
          organization_name: string | null
          owner_id: string
          pic_name: string | null
          progress_percent: number
          province: string | null
          review_note: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["proposal_status"]
          submitted_at: string | null
          tax_rate: number
          title: string
          updated_at: string
          version_number: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          currency?: string
          current_step?: number
          deleted_at?: string | null
          donor_id?: string | null
          duration_months?: number
          end_date?: string | null
          grant_amount?: number
          id?: string
          idea_summary?: string | null
          location?: string | null
          organization_name?: string | null
          owner_id: string
          pic_name?: string | null
          progress_percent?: number
          province?: string | null
          review_note?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          submitted_at?: string | null
          tax_rate?: number
          title: string
          updated_at?: string
          version_number?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          currency?: string
          current_step?: number
          deleted_at?: string | null
          donor_id?: string | null
          duration_months?: number
          end_date?: string | null
          grant_amount?: number
          id?: string
          idea_summary?: string | null
          location?: string | null
          organization_name?: string | null
          owner_id?: string
          pic_name?: string | null
          progress_percent?: number
          province?: string | null
          review_note?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          submitted_at?: string | null
          tax_rate?: number
          title?: string
          updated_at?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposals_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "donors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "donors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      sbm: {
        Row: {
          category: string
          code: string
          created_at: string
          deleted_at: string | null
          description: string
          effective_from: string | null
          effective_until: string | null
          id: string
          is_active: boolean
          price: number
          region_code: string
          regulation_source: string | null
          unit: string
          updated_at: string
          version: string
          year: number
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          deleted_at?: string | null
          description: string
          effective_from?: string | null
          effective_until?: string | null
          id?: string
          is_active?: boolean
          price: number
          region_code?: string
          regulation_source?: string | null
          unit: string
          updated_at?: string
          version?: string
          year: number
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          deleted_at?: string | null
          description?: string
          effective_from?: string | null
          effective_until?: string | null
          id?: string
          is_active?: boolean
          price?: number
          region_code?: string
          regulation_source?: string | null
          unit?: string
          updated_at?: string
          version?: string
          year?: number
        }
        Relationships: []
      }
      sbu: {
        Row: {
          category: string
          city_code: string
          code: string
          created_at: string
          deleted_at: string | null
          description: string
          effective_from: string | null
          id: string
          is_active: boolean
          price: number
          province_code: string
          source: string | null
          unit: string
          updated_at: string
          version: string
          year: number
        }
        Insert: {
          category: string
          city_code?: string
          code: string
          created_at?: string
          deleted_at?: string | null
          description: string
          effective_from?: string | null
          id?: string
          is_active?: boolean
          price: number
          province_code: string
          source?: string | null
          unit: string
          updated_at?: string
          version?: string
          year: number
        }
        Update: {
          category?: string
          city_code?: string
          code?: string
          created_at?: string
          deleted_at?: string | null
          description?: string
          effective_from?: string | null
          id?: string
          is_active?: boolean
          price?: number
          province_code?: string
          source?: string | null
          unit?: string
          updated_at?: string
          version?: string
          year?: number
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
      donors_public: {
        Row: {
          category: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          deadline: string | null
          funding_fields: string[] | null
          id: string | null
          is_active: boolean | null
          max_grant: number | null
          min_grant: number | null
          name: string | null
          priorities: string[] | null
          requirements: string[] | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          category?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          deadline?: string | null
          funding_fields?: string[] | null
          id?: string | null
          is_active?: boolean | null
          max_grant?: number | null
          min_grant?: number | null
          name?: string | null
          priorities?: string[] | null
          requirements?: string[] | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          category?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          deadline?: string | null
          funding_fields?: string[] | null
          id?: string | null
          is_active?: boolean | null
          max_grant?: number | null
          min_grant?: number | null
          name?: string | null
          priorities?: string[] | null
          requirements?: string[] | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_donor_contacts: {
        Args: never
        Returns: {
          email: string
          id: string
          phone: string
        }[]
      }
      can_access_proposal: { Args: { _pid: string }; Returns: boolean }
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
      proposal_status:
        | "draft"
        | "sedang_disusun"
        | "siap_ditinjau"
        | "perlu_revisi"
        | "disetujui"
        | "selesai"
        | "diarsipkan"
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
      proposal_status: [
        "draft",
        "sedang_disusun",
        "siap_ditinjau",
        "perlu_revisi",
        "disetujui",
        "selesai",
        "diarsipkan",
      ],
    },
  },
} as const
