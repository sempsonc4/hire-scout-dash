export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      companies: {
        Row: {
          company_id: string
          created_at: string
          domain: string | null
          industry: string | null
          linkedin: string | null
          name: string
          size: string | null
        }
        Insert: {
          company_id?: string
          created_at?: string
          domain?: string | null
          industry?: string | null
          linkedin?: string | null
          name: string
          size?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          domain?: string | null
          industry?: string | null
          linkedin?: string | null
          name?: string
          size?: string | null
        }
        Relationships: []
      }
      contact_sources: {
        Row: {
          contact_id: string | null
          found_at: string
          id: string
          payload: Json | null
          provider: string
          provider_id: string | null
        }
        Insert: {
          contact_id?: string | null
          found_at?: string
          id?: string
          payload?: Json | null
          provider: string
          provider_id?: string | null
        }
        Update: {
          contact_id?: string | null
          found_at?: string
          id?: string
          payload?: Json | null
          provider?: string
          provider_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_sources_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["contact_id"]
          },
        ]
      }
      contacts: {
        Row: {
          company_id: string | null
          confidence: number | null
          contact_id: string
          created_at: string
          email: string | null
          email_status: string | null
          job_id: string | null
          linkedin: string | null
          name: string
          notes: string | null
          phone: string | null
          source: string | null
          title: string | null
          verified_at: string | null
        }
        Insert: {
          company_id?: string | null
          confidence?: number | null
          contact_id?: string
          created_at?: string
          email?: string | null
          email_status?: string | null
          job_id?: string | null
          linkedin?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          title?: string | null
          verified_at?: string | null
        }
        Update: {
          company_id?: string | null
          confidence?: number | null
          contact_id?: string
          created_at?: string
          email?: string | null
          email_status?: string | null
          job_id?: string | null
          linkedin?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          title?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "contacts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["job_id"]
          },
        ]
      }
      domains: {
        Row: {
          company_id: string | null
          domain: string
        }
        Insert: {
          company_id?: string | null
          domain: string
        }
        Update: {
          company_id?: string | null
          domain?: string
        }
        Relationships: [
          {
            foreignKeyName: "domains_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "domains_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_overview"
            referencedColumns: ["company_id"]
          },
        ]
      }
      enrichment_events: {
        Row: {
          created_at: string
          event_id: string
          event_type: string
          input: Json | null
          job_id: string | null
          patch: Json | null
          run_id: string | null
        }
        Insert: {
          created_at?: string
          event_id?: string
          event_type: string
          input?: Json | null
          job_id?: string | null
          patch?: Json | null
          run_id?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          event_type?: string
          input?: Json | null
          job_id?: string | null
          patch?: Json | null
          run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrichment_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "enrichment_events_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "run_summary"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "enrichment_events_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["run_id"]
          },
        ]
      }
      job_ingestions: {
        Row: {
          fetched_at: string
          ingestion_id: string
          job_id: string | null
          raw_payload: Json
          source_name: string
          source_url: string | null
        }
        Insert: {
          fetched_at?: string
          ingestion_id?: string
          job_id?: string | null
          raw_payload: Json
          source_name: string
          source_url?: string | null
        }
        Update: {
          fetched_at?: string
          ingestion_id?: string
          job_id?: string | null
          raw_payload?: Json
          source_name?: string
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_ingestions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["job_id"]
          },
        ]
      }
      job_search_map: {
        Row: {
          first_seen_at: string
          job_id: string
          last_seen_at: string
          search_id: string
        }
        Insert: {
          first_seen_at?: string
          job_id: string
          last_seen_at?: string
          search_id: string
        }
        Update: {
          first_seen_at?: string
          job_id?: string
          last_seen_at?: string
          search_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_search_map_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "searches"
            referencedColumns: ["search_id"]
          },
        ]
      }
      job_taxonomy: {
        Row: {
          job_id: string
          last_extracted_at: string | null
          must_have: string[] | null
          nice_to_have: string[] | null
          skills: string[]
        }
        Insert: {
          job_id: string
          last_extracted_at?: string | null
          must_have?: string[] | null
          nice_to_have?: string[] | null
          skills?: string[]
        }
        Update: {
          job_id?: string
          last_extracted_at?: string | null
          must_have?: string[] | null
          nice_to_have?: string[] | null
          skills?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "job_taxonomy_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["job_id"]
          },
        ]
      }
      jobs: {
        Row: {
          company_id: string | null
          company_name: string
          created_at: string
          function: string | null
          job_id: string
          link: string | null
          location: string | null
          posted_at: string | null
          relevance_score: number | null
          run_id: string | null
          salary: string | null
          schedule_type: string | null
          scraped_at: string
          source: string | null
          source_type: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          company_name: string
          created_at?: string
          function?: string | null
          job_id: string
          link?: string | null
          location?: string | null
          posted_at?: string | null
          relevance_score?: number | null
          run_id?: string | null
          salary?: string | null
          schedule_type?: string | null
          scraped_at: string
          source?: string | null
          source_type?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          company_name?: string
          created_at?: string
          function?: string | null
          job_id?: string
          link?: string | null
          location?: string | null
          posted_at?: string | null
          relevance_score?: number | null
          run_id?: string | null
          salary?: string | null
          schedule_type?: string | null
          scraped_at?: string
          source?: string | null
          source_type?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_overview"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "jobs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "run_summary"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "jobs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["run_id"]
          },
        ]
      }
      message_variants: {
        Row: {
          body: string | null
          created_at: string
          message_id: string | null
          subject: string | null
          variant_id: string
          variant_index: number
        }
        Insert: {
          body?: string | null
          created_at?: string
          message_id?: string | null
          subject?: string | null
          variant_id?: string
          variant_index: number
        }
        Update: {
          body?: string | null
          created_at?: string
          message_id?: string | null
          subject?: string | null
          variant_id?: string
          variant_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "message_variants_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["message_id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string | null
          channel: string
          contact_id: string | null
          created_at: string
          job_id: string | null
          message_id: string
          quality_score: number | null
          subject: string | null
          tone: string | null
          updated_at: string
        }
        Insert: {
          body?: string | null
          channel: string
          contact_id?: string | null
          created_at?: string
          job_id?: string | null
          message_id?: string
          quality_score?: number | null
          subject?: string | null
          tone?: string | null
          updated_at?: string
        }
        Update: {
          body?: string | null
          channel?: string
          contact_id?: string | null
          created_at?: string
          job_id?: string | null
          message_id?: string
          quality_score?: number | null
          subject?: string | null
          tone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "messages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["job_id"]
          },
        ]
      }
      provider_calls: {
        Row: {
          cost: number | null
          created_at: string
          duration_ms: number | null
          endpoint: string
          id: string
          provider: string
          request: Json | null
          response: Json | null
          run_id: string | null
          search_id: string | null
          status_code: number | null
        }
        Insert: {
          cost?: number | null
          created_at?: string
          duration_ms?: number | null
          endpoint: string
          id?: string
          provider: string
          request?: Json | null
          response?: Json | null
          run_id?: string | null
          search_id?: string | null
          status_code?: number | null
        }
        Update: {
          cost?: number | null
          created_at?: string
          duration_ms?: number | null
          endpoint?: string
          id?: string
          provider?: string
          request?: Json | null
          response?: Json | null
          run_id?: string | null
          search_id?: string | null
          status_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_calls_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "run_summary"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "provider_calls_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "provider_calls_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "searches"
            referencedColumns: ["search_id"]
          },
        ]
      }
      qa_flags: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          flag: string
          flag_id: string
          notes: string | null
          resolved_at: string | null
          severity: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          flag: string
          flag_id?: string
          notes?: string | null
          resolved_at?: string | null
          severity?: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          flag?: string
          flag_id?: string
          notes?: string | null
          resolved_at?: string | null
          severity?: string
        }
        Relationships: []
      }
      runs: {
        Row: {
          created_at: string
          params: Json
          query: string
          run_id: string
          search_id: string | null
          stats: Json
          status: string
          updated_at: string
          view_token: string | null
        }
        Insert: {
          created_at?: string
          params?: Json
          query: string
          run_id: string
          search_id?: string | null
          stats?: Json
          status?: string
          updated_at?: string
          view_token?: string | null
        }
        Update: {
          created_at?: string
          params?: Json
          query?: string
          run_id?: string
          search_id?: string | null
          stats?: Json
          status?: string
          updated_at?: string
          view_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "runs_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "searches"
            referencedColumns: ["search_id"]
          },
        ]
      }
      search_cursors: {
        Row: {
          consecutive_empty_pages: number
          last_cutoff_date: string | null
          last_next_page_token: string | null
          last_page_count: number | null
          last_run_at: string | null
          search_id: string
          updated_at: string
        }
        Insert: {
          consecutive_empty_pages?: number
          last_cutoff_date?: string | null
          last_next_page_token?: string | null
          last_page_count?: number | null
          last_run_at?: string | null
          search_id: string
          updated_at?: string
        }
        Update: {
          consecutive_empty_pages?: number
          last_cutoff_date?: string | null
          last_next_page_token?: string | null
          last_page_count?: number | null
          last_run_at?: string | null
          search_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "search_cursors_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: true
            referencedRelation: "searches"
            referencedColumns: ["search_id"]
          },
        ]
      }
      search_executions: {
        Row: {
          exec_id: string
          finished_at: string | null
          run_id: string | null
          search_id: string | null
          started_at: string
          stats: Json
          status: string
        }
        Insert: {
          exec_id?: string
          finished_at?: string | null
          run_id?: string | null
          search_id?: string | null
          started_at?: string
          stats?: Json
          status?: string
        }
        Update: {
          exec_id?: string
          finished_at?: string | null
          run_id?: string | null
          search_id?: string | null
          started_at?: string
          stats?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "search_executions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "run_summary"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "search_executions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "search_executions_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "searches"
            referencedColumns: ["search_id"]
          },
        ]
      }
      searches: {
        Row: {
          created_at: string
          location: string
          params: Json
          query: string
          search_id: string
        }
        Insert: {
          created_at?: string
          location: string
          params?: Json
          query: string
          search_id: string
        }
        Update: {
          created_at?: string
          location?: string
          params?: Json
          query?: string
          search_id?: string
        }
        Relationships: []
      }
      serpapi_pages: {
        Row: {
          exec_id: string | null
          fetched_at: string
          fetched_job_ids: string[]
          next_page_token: string | null
          page_id: string
          page_index: number
          request: Json
          response_hash: string | null
          search_id: string | null
        }
        Insert: {
          exec_id?: string | null
          fetched_at?: string
          fetched_job_ids?: string[]
          next_page_token?: string | null
          page_id?: string
          page_index: number
          request: Json
          response_hash?: string | null
          search_id?: string | null
        }
        Update: {
          exec_id?: string | null
          fetched_at?: string
          fetched_job_ids?: string[]
          next_page_token?: string | null
          page_id?: string
          page_index?: number
          request?: Json
          response_hash?: string | null
          search_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "serpapi_pages_exec_id_fkey"
            columns: ["exec_id"]
            isOneToOne: false
            referencedRelation: "search_executions"
            referencedColumns: ["exec_id"]
          },
          {
            foreignKeyName: "serpapi_pages_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "searches"
            referencedColumns: ["search_id"]
          },
        ]
      }
      suppressions: {
        Row: {
          created_at: string
          domain: string | null
          email: string | null
          reason: string | null
          suppression_id: string
        }
        Insert: {
          created_at?: string
          domain?: string | null
          email?: string | null
          reason?: string | null
          suppression_id?: string
        }
        Update: {
          created_at?: string
          domain?: string | null
          email?: string | null
          reason?: string | null
          suppression_id?: string
        }
        Relationships: []
      }
      user_feedback: {
        Row: {
          comment: string | null
          created_at: string
          entity_id: string
          entity_type: string
          feedback_id: string
          rating: number | null
          user: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          feedback_id?: string
          rating?: number | null
          user?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          feedback_id?: string
          rating?: number | null
          user?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      company_overview: {
        Row: {
          company_id: string | null
          contact_count: number | null
          domain: string | null
          industry: string | null
          job_count: number | null
          last_job_scraped: string | null
          name: string | null
          size: string | null
        }
        Relationships: []
      }
      run_summary: {
        Row: {
          contacts: number | null
          created_at: string | null
          drafts: number | null
          jobs: number | null
          params: Json | null
          query: string | null
          run_id: string | null
          search_id: string | null
          stats: Json | null
          status: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "runs_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "searches"
            referencedColumns: ["search_id"]
          },
        ]
      }
    }
    Functions: {
      citext: {
        Args: { "": boolean } | { "": string } | { "": unknown }
        Returns: string
      }
      citext_hash: {
        Args: { "": string }
        Returns: number
      }
      citextin: {
        Args: { "": unknown }
        Returns: string
      }
      citextout: {
        Args: { "": string }
        Returns: unknown
      }
      citextrecv: {
        Args: { "": unknown }
        Returns: string
      }
      citextsend: {
        Args: { "": string }
        Returns: string
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
