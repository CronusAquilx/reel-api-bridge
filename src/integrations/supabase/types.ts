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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      account_attempts: {
        Row: {
          attempts: number
          bucket: string
          started_at: string
        }
        Insert: {
          attempts?: number
          bucket: string
          started_at?: string
        }
        Update: {
          attempts?: number
          bucket?: string
          started_at?: string
        }
        Relationships: []
      }
      developer_games: {
        Row: {
          created_at: string
          created_by: string
          id: string
          kind: string
          name: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          kind: string
          name: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          kind?: string
          name?: string
          url?: string
        }
        Relationships: []
      }
      game_saves: {
        Row: {
          data: Json
          game: string
          updated_at: string
          user_id: string
        }
        Insert: {
          data?: Json
          game: string
          updated_at?: string
          user_id: string
        }
        Update: {
          data?: Json
          game?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      memories: {
        Row: {
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          created_at: string
          id: string
          parts: Json
          role: string
          thread_id: string
          ui_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parts?: Json
          role: string
          thread_id: string
          ui_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parts?: Json
          role?: string
          thread_id?: string
          ui_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      models: {
        Row: {
          capabilities: string[]
          config: Json
          context_length: number
          created_at: string
          description: string | null
          display_name: string
          enabled: boolean
          id: string
          provider: string
          sort_order: number
          usage_multiplier: number
        }
        Insert: {
          capabilities?: string[]
          config?: Json
          context_length?: number
          created_at?: string
          description?: string | null
          display_name: string
          enabled?: boolean
          id: string
          provider: string
          sort_order?: number
          usage_multiplier?: number
        }
        Update: {
          capabilities?: string[]
          config?: Json
          context_length?: number
          created_at?: string
          description?: string | null
          display_name?: string
          enabled?: boolean
          id?: string
          provider?: string
          sort_order?: number
          usage_multiplier?: number
        }
        Relationships: []
      }
      playlists: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          tracks: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          tracks?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          tracks?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          background_url: string | null
          contact_email: string | null
          created_at: string
          display_name: string | null
          focus: string | null
          id: string
          onboarding_complete: boolean
          theme: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          background_url?: string | null
          contact_email?: string | null
          created_at?: string
          display_name?: string | null
          focus?: string | null
          id: string
          onboarding_complete?: boolean
          theme?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          background_url?: string | null
          contact_email?: string | null
          created_at?: string
          display_name?: string | null
          focus?: string | null
          id?: string
          onboarding_complete?: boolean
          theme?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      provider_keys: {
        Row: {
          api_key: string | null
          base_url: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          api_key?: string | null
          base_url: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          api_key?: string | null
          base_url?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      reasoning_levels: {
        Row: {
          id: string
          label: string
          max_steps: number
          multiplier: number
          sort_order: number
        }
        Insert: {
          id: string
          label: string
          max_steps: number
          multiplier: number
          sort_order: number
        }
        Update: {
          id?: string
          label?: string
          max_steps?: number
          multiplier?: number
          sort_order?: number
        }
        Relationships: []
      }
      social_blocks: {
        Row: {
          target_id: string
          user_id: string
        }
        Insert: {
          target_id: string
          user_id: string
        }
        Update: {
          target_id?: string
          user_id?: string
        }
        Relationships: []
      }
      social_friends: {
        Row: {
          accepted: boolean
          created_at: string
          id: string
          recipient_id: string
          sender_id: string
        }
        Insert: {
          accepted?: boolean
          created_at?: string
          id?: string
          recipient_id: string
          sender_id: string
        }
        Update: {
          accepted?: boolean
          created_at?: string
          id?: string
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      social_members: {
        Row: {
          joined: boolean
          party_id: string
          user_id: string
        }
        Insert: {
          joined?: boolean
          party_id: string
          user_id: string
        }
        Update: {
          joined?: boolean
          party_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_members_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "social_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      social_parties: {
        Row: {
          created_at: string
          id: string
          kind: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      social_players: {
        Row: {
          allow_requests: boolean
          handle: string
          share_activity: boolean
          status: string
          user_id: string
        }
        Insert: {
          allow_requests?: boolean
          handle: string
          share_activity?: boolean
          status?: string
          user_id: string
        }
        Update: {
          allow_requests?: boolean
          handle?: string
          share_activity?: boolean
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      social_posts: {
        Row: {
          channel: string
          content: string
          created_at: string
          id: string
          link: string | null
          party_id: string | null
          user_id: string
        }
        Insert: {
          channel: string
          content: string
          created_at?: string
          id?: string
          link?: string | null
          party_id?: string | null
          user_id: string
        }
        Update: {
          channel?: string
          content?: string
          created_at?: string
          id?: string
          link?: string | null
          party_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "social_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      social_reports: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      threads: {
        Row: {
          created_at: string
          id: string
          model_id: string
          reasoning: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          model_id?: string
          reasoning?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          model_id?: string
          reasoning?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tools: {
        Row: {
          description: string
          display_name: string
          enabled: boolean
          id: string
          permission: string
          sort_order: number
        }
        Insert: {
          description: string
          display_name: string
          enabled?: boolean
          id: string
          permission?: string
          sort_order?: number
        }
        Update: {
          description?: string
          display_name?: string
          enabled?: boolean
          id?: string
          permission?: string
          sort_order?: number
        }
        Relationships: []
      }
      usage_events: {
        Row: {
          created_at: string
          id: string
          input_tokens: number
          model_id: string
          output_tokens: number
          reasoning: string
          thread_id: string | null
          units: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          input_tokens?: number
          model_id: string
          output_tokens?: number
          reasoning: string
          thread_id?: string | null
          units?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          input_tokens?: number
          model_id?: string
          output_tokens?: number
          reasoning?: string
          thread_id?: string | null
          units?: number
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          data?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      watch_history: {
        Row: {
          episode: number | null
          id: string
          media_type: string
          poster_path: string | null
          progress: number | null
          season: number | null
          title: string | null
          tmdb_id: number
          user_id: string
          watched_at: string
        }
        Insert: {
          episode?: number | null
          id?: string
          media_type?: string
          poster_path?: string | null
          progress?: number | null
          season?: number | null
          title?: string | null
          tmdb_id: number
          user_id: string
          watched_at?: string
        }
        Update: {
          episode?: number | null
          id?: string
          media_type?: string
          poster_path?: string | null
          progress?: number | null
          season?: number | null
          title?: string | null
          tmdb_id?: number
          user_id?: string
          watched_at?: string
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          added_at: string
          id: string
          media_type: string
          poster_path: string | null
          title: string | null
          tmdb_id: number
          user_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          media_type?: string
          poster_path?: string | null
          title?: string | null
          tmdb_id: number
          user_id: string
        }
        Update: {
          added_at?: string
          id?: string
          media_type?: string
          poster_path?: string | null
          title?: string | null
          tmdb_id?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_account_attempt: { Args: { _bucket: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      social_action: { Args: { action: string; payload?: Json }; Returns: Json }
      social_blocked: { Args: { a: string; b: string }; Returns: boolean }
      social_directory: {
        Args: { ids: string[] }
        Returns: {
          handle: string
          status: string
          user_id: string
        }[]
      }
      social_member: { Args: { p: string; u: string }; Returns: boolean }
      social_party_owner: { Args: { p: string }; Returns: boolean }
      social_party_visible: { Args: { p: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
    },
  },
} as const
