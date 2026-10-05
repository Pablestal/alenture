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
    PostgrestVersion: "14.17"
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
      layers: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          sort: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          sort?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          sort?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      places: {
        Row: {
          address: string | null
          country_code: string | null
          created_at: string
          deleted_at: string | null
          geom: unknown
          id: string
          lat: number
          layer_id: string | null
          lng: number
          name: string
          notes: string | null
          population: number | null
          source: string
          source_ref: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          country_code?: string | null
          created_at?: string
          deleted_at?: string | null
          geom?: unknown
          id?: string
          lat: number
          layer_id?: string | null
          lng: number
          name: string
          notes?: string | null
          population?: number | null
          source?: string
          source_ref?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          address?: string | null
          country_code?: string | null
          created_at?: string
          deleted_at?: string | null
          geom?: unknown
          id?: string
          lat?: number
          layer_id?: string | null
          lng?: number
          name?: string
          notes?: string | null
          population?: number | null
          source?: string
          source_ref?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "places_layer_fk"
            columns: ["layer_id", "user_id"]
            isOneToOne: false
            referencedRelation: "layers"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      trips: {
        Row: {
          color: string | null
          created_at: string
          deleted_at: string | null
          ended_on: string | null
          id: string
          name: string
          notes: string | null
          started_on: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          ended_on?: string | null
          id?: string
          name: string
          notes?: string | null
          started_on?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          ended_on?: string | null
          id?: string
          name?: string
          notes?: string | null
          started_on?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      visits: {
        Row: {
          created_at: string
          deleted_at: string | null
          ended_on: string | null
          id: string
          notes: string | null
          place_id: string
          rating: number | null
          started_on: string
          trip_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          ended_on?: string | null
          id?: string
          notes?: string | null
          place_id: string
          rating?: number | null
          started_on: string
          trip_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          ended_on?: string | null
          id?: string
          notes?: string | null
          place_id?: string
          rating?: number | null
          started_on?: string
          trip_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visits_place_fk"
            columns: ["place_id", "user_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "visits_trip_fk"
            columns: ["trip_id", "user_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
    }
    Views: {
      places_active: {
        Row: {
          address: string | null
          country_code: string | null
          created_at: string | null
          first_visit: string | null
          id: string | null
          last_visit: string | null
          lat: number | null
          layer_id: string | null
          lng: number | null
          name: string | null
          notes: string | null
          updated_at: string | null
          visit_count: number | null
        }
        Relationships: []
      }
      visits_active: {
        Row: {
          country_code: string | null
          ended_on: string | null
          id: string | null
          lat: number | null
          lng: number | null
          notes: string | null
          place_id: string | null
          place_name: string | null
          rating: number | null
          started_on: string | null
          trip_color: string | null
          trip_id: string | null
          trip_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      changes_since: {
        Args: { since: string }
        Returns: {
          deleted: boolean
          entity: string
          id: string
          updated_at: string
        }[]
      }
      delete_layer: { Args: { p_layer_id: string }; Returns: boolean }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
