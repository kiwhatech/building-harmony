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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          building_id: string
          content: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_urgent: boolean | null
          published_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          building_id: string
          content: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_urgent?: boolean | null
          published_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          building_id?: string
          content?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_urgent?: boolean | null
          published_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_categories: {
        Row: {
          budget_id: string
          code: string
          created_at: string
          id: string
          label: string
          millesimi_table_id: string
          total: number
          updated_at: string
        }
        Insert: {
          budget_id: string
          code: string
          created_at?: string
          id?: string
          label: string
          millesimi_table_id: string
          total?: number
          updated_at?: string
        }
        Update: {
          budget_id?: string
          code?: string
          created_at?: string
          id?: string
          label?: string
          millesimi_table_id?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_categories_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "building_budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_categories_millesimi_table_id_fkey"
            columns: ["millesimi_table_id"]
            isOneToOne: false
            referencedRelation: "millesimi_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      building_budgets: {
        Row: {
          building_id: string
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          start_date: string
          total_amount: number
          updated_at: string
          year: number
        }
        Insert: {
          building_id: string
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          start_date: string
          total_amount?: number
          updated_at?: string
          year: number
        }
        Update: {
          building_id?: string
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          start_date?: string
          total_amount?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "building_budgets_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      building_members: {
        Row: {
          building_id: string
          created_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          building_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          building_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "building_members_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      buildings: {
        Row: {
          address: string
          admin_name: string | null
          bank_details: Json | null
          city: string | null
          contract_info: string | null
          created_at: string
          created_by: string | null
          email: string | null
          fiscal_code: string | null
          id: string
          image_url: string | null
          legal_notes: string | null
          name: string
          notes: string | null
          phone: string | null
          state: string | null
          updated_at: string
          year_of_construction: number | null
          zip_code: string | null
        }
        Insert: {
          address: string
          admin_name?: string | null
          bank_details?: Json | null
          city?: string | null
          contract_info?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          fiscal_code?: string | null
          id?: string
          image_url?: string | null
          legal_notes?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          year_of_construction?: number | null
          zip_code?: string | null
        }
        Update: {
          address?: string
          admin_name?: string | null
          bank_details?: Json | null
          city?: string | null
          contract_info?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          fiscal_code?: string | null
          id?: string
          image_url?: string | null
          legal_notes?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          year_of_construction?: number | null
          zip_code?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          building_id: string | null
          category: Database["public"]["Enums"]["document_category"]
          created_at: string
          description: string | null
          expires_at: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          status: Database["public"]["Enums"]["document_status"]
          title: string
          unit_id: string | null
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          building_id?: string | null
          category: Database["public"]["Enums"]["document_category"]
          created_at?: string
          description?: string | null
          expires_at?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          status?: Database["public"]["Enums"]["document_status"]
          title: string
          unit_id?: string | null
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          building_id?: string | null
          category?: Database["public"]["Enums"]["document_category"]
          created_at?: string
          description?: string | null
          expires_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          status?: Database["public"]["Enums"]["document_status"]
          title?: string
          unit_id?: string | null
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_requests: {
        Row: {
          building_id: string
          category: Database["public"]["Enums"]["estimate_category"]
          created_at: string
          created_by: string
          description: string | null
          estimated_amount: number | null
          id: string
          internal_notes: string | null
          linked_request_id: string | null
          priority: Database["public"]["Enums"]["estimate_priority"]
          provider: string | null
          status: Database["public"]["Enums"]["estimate_request_status"]
          title: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          building_id: string
          category?: Database["public"]["Enums"]["estimate_category"]
          created_at?: string
          created_by: string
          description?: string | null
          estimated_amount?: number | null
          id?: string
          internal_notes?: string | null
          linked_request_id?: string | null
          priority?: Database["public"]["Enums"]["estimate_priority"]
          provider?: string | null
          status?: Database["public"]["Enums"]["estimate_request_status"]
          title: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          building_id?: string
          category?: Database["public"]["Enums"]["estimate_category"]
          created_at?: string
          created_by?: string
          description?: string | null
          estimated_amount?: number | null
          id?: string
          internal_notes?: string | null
          linked_request_id?: string | null
          priority?: Database["public"]["Enums"]["estimate_priority"]
          provider?: string | null
          status?: Database["public"]["Enums"]["estimate_request_status"]
          title?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimate_requests_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_requests_linked_request_id_fkey"
            columns: ["linked_request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_requests_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          description: string | null
          estimated_days: number | null
          id: string
          maintenance_request_id: string
          provider_id: string
          status: Database["public"]["Enums"]["estimate_status"]
          submitted_at: string
          updated_at: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string | null
          estimated_days?: number | null
          id?: string
          maintenance_request_id: string
          provider_id: string
          status?: Database["public"]["Enums"]["estimate_status"]
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string | null
          estimated_days?: number | null
          id?: string
          maintenance_request_id?: string
          provider_id?: string
          status?: Database["public"]["Enums"]["estimate_status"]
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimates_maintenance_request_id_fkey"
            columns: ["maintenance_request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      fees: {
        Row: {
          amount: number
          building_id: string
          created_at: string
          created_by: string | null
          description: string
          due_date: string
          id: string
          status: Database["public"]["Enums"]["payment_status"]
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          building_id: string
          created_at?: string
          created_by?: string | null
          description: string
          due_date: string
          id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          building_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string
          id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fees_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fees_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          assigned_to: string | null
          category: Database["public"]["Enums"]["maintenance_category"]
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          priority: number | null
          requested_by: string
          status: Database["public"]["Enums"]["request_status"]
          title: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["maintenance_category"]
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: number | null
          requested_by: string
          status?: Database["public"]["Enums"]["request_status"]
          title: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["maintenance_category"]
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: number | null
          requested_by?: string
          status?: Database["public"]["Enums"]["request_status"]
          title?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      millesimi_tables: {
        Row: {
          building_id: string
          code: string
          created_at: string
          id: string
          label: string
          updated_at: string
        }
        Insert: {
          building_id: string
          code: string
          created_at?: string
          id?: string
          label: string
          updated_at?: string
        }
        Update: {
          building_id?: string
          code?: string
          created_at?: string
          id?: string
          label?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "millesimi_tables_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      millesimi_values: {
        Row: {
          created_at: string
          id: string
          millesimi_table_id: string
          unit_id: string
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          millesimi_table_id: string
          unit_id: string
          updated_at?: string
          value?: number
        }
        Update: {
          created_at?: string
          id?: string
          millesimi_table_id?: string
          unit_id?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "millesimi_values_millesimi_table_id_fkey"
            columns: ["millesimi_table_id"]
            isOneToOne: false
            referencedRelation: "millesimi_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "millesimi_values_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string | null
          resource_id: string | null
          resource_type: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string | null
          resource_id?: string | null
          resource_type?: string | null
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string | null
          resource_id?: string | null
          resource_type?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          currency: string
          fee_id: string | null
          gateway_payment_id: string | null
          id: string
          metadata: Json | null
          notes: string | null
          payment_date: string
          payment_method: string | null
          payment_type: string
          reference_number: string | null
          request_id: string | null
          status: string
          stripe_session_id: string | null
          trn: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          currency?: string
          fee_id?: string | null
          gateway_payment_id?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_type?: string
          reference_number?: string | null
          request_id?: string | null
          status?: string
          stripe_session_id?: string | null
          trn?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          fee_id?: string | null
          gateway_payment_id?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_type?: string
          reference_number?: string | null
          request_id?: string | null
          status?: string
          stripe_session_id?: string | null
          trn?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_fee_id_fkey"
            columns: ["fee_id"]
            isOneToOne: false
            referencedRelation: "fees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "unified_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      provider_ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          provider_id: string
          rating: number
          request_id: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          provider_id: string
          rating: number
          request_id: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          provider_id?: string
          rating?: number
          request_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_ratings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_ratings_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "unified_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          address: string | null
          category: Database["public"]["Enums"]["provider_category"]
          contact_email: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          rating: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          category?: Database["public"]["Enums"]["provider_category"]
          contact_email?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          rating?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          category?: Database["public"]["Enums"]["provider_category"]
          contact_email?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          rating?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      request_activities: {
        Row: {
          activity_type: string
          created_at: string
          id: string
          message: string | null
          metadata: Json | null
          new_status: string | null
          old_status: string | null
          request_id: string
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          new_status?: string | null
          old_status?: string | null
          request_id: string
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          new_status?: string | null
          old_status?: string | null
          request_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_activities_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "unified_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      residents: {
        Row: {
          additional_info: string | null
          created_at: string
          created_by: string | null
          email: string
          fiscal_code: string | null
          id: string
          is_owner: boolean | null
          move_in_date: string | null
          move_out_date: string | null
          name: string
          surname: string
          telephone: string | null
          unit_id: string
          updated_at: string
        }
        Insert: {
          additional_info?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          fiscal_code?: string | null
          id?: string
          is_owner?: boolean | null
          move_in_date?: string | null
          move_out_date?: string | null
          name: string
          surname: string
          telephone?: string | null
          unit_id: string
          updated_at?: string
        }
        Update: {
          additional_info?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          fiscal_code?: string | null
          id?: string
          is_owner?: boolean | null
          move_in_date?: string | null
          move_out_date?: string | null
          name?: string
          surname?: string
          telephone?: string | null
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "residents_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          permission: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          permission?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      unified_requests: {
        Row: {
          assigned_provider_id: string | null
          assigned_to: string | null
          attachment_urls: string[] | null
          building_id: string
          category: Database["public"]["Enums"]["maintenance_category"]
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          estimated_amount: number | null
          id: string
          internal_notes: string | null
          preferred_provider_id: string | null
          priority: number
          provider: string | null
          quotation_notes: string | null
          quotation_valid_until: string | null
          request_type: Database["public"]["Enums"]["unified_request_type"]
          scheduled_date: string | null
          status: Database["public"]["Enums"]["unified_request_status"]
          title: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          assigned_provider_id?: string | null
          assigned_to?: string | null
          attachment_urls?: string[] | null
          building_id: string
          category?: Database["public"]["Enums"]["maintenance_category"]
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          estimated_amount?: number | null
          id?: string
          internal_notes?: string | null
          preferred_provider_id?: string | null
          priority?: number
          provider?: string | null
          quotation_notes?: string | null
          quotation_valid_until?: string | null
          request_type?: Database["public"]["Enums"]["unified_request_type"]
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["unified_request_status"]
          title: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          assigned_provider_id?: string | null
          assigned_to?: string | null
          attachment_urls?: string[] | null
          building_id?: string
          category?: Database["public"]["Enums"]["maintenance_category"]
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          estimated_amount?: number | null
          id?: string
          internal_notes?: string | null
          preferred_provider_id?: string | null
          priority?: number
          provider?: string | null
          quotation_notes?: string | null
          quotation_valid_until?: string | null
          request_type?: Database["public"]["Enums"]["unified_request_type"]
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["unified_request_status"]
          title?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unified_requests_assigned_provider_id_fkey"
            columns: ["assigned_provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_requests_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_requests_preferred_provider_id_fkey"
            columns: ["preferred_provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_requests_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_residents: {
        Row: {
          created_at: string
          id: string
          is_owner: boolean | null
          move_in_date: string | null
          move_out_date: string | null
          unit_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_owner?: boolean | null
          move_in_date?: string | null
          move_out_date?: string | null
          unit_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_owner?: boolean | null
          move_in_date?: string | null
          move_out_date?: string | null
          unit_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_residents_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          area_sqft: number | null
          bathrooms: number | null
          bedrooms: number | null
          building_id: string
          created_at: string
          floor: number | null
          id: string
          unit_number: string
          updated_at: string
        }
        Insert: {
          area_sqft?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          building_id: string
          created_at?: string
          floor?: number | null
          id?: string
          unit_number: string
          updated_at?: string
        }
        Update: {
          area_sqft?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          building_id?: string
          created_at?: string
          floor?: number | null
          id?: string
          unit_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      convert_estimate_to_request: {
        Args: { _estimate_id: string }
        Returns: string
      }
      get_building_from_unit: { Args: { _unit_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_building_admin: {
        Args: { _building_id: string; _user_id: string }
        Returns: boolean
      }
      is_building_member: {
        Args: { _building_id: string; _user_id: string }
        Returns: boolean
      }
      is_unit_resident: {
        Args: { _unit_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "resident" | "provider"
      document_category: "building" | "insurance" | "unit"
      document_status: "active" | "expired" | "expiring_soon" | "archived"
      estimate_category: "electrical" | "plumbing" | "cleaning" | "other"
      estimate_priority: "low" | "normal" | "urgent"
      estimate_request_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "approved"
        | "rejected"
        | "converted"
      estimate_status: "pending" | "approved" | "rejected"
      maintenance_category:
        | "plumbing"
        | "electrical"
        | "construction"
        | "general"
      notification_type:
        | "payment_reminder"
        | "maintenance_update"
        | "announcement"
        | "estimate_received"
        | "estimate_approved"
        | "general"
      payment_status: "pending" | "paid" | "overdue"
      provider_category: "general" | "plumbing" | "electrical" | "structural"
      request_status:
        | "requested"
        | "under_review"
        | "approved"
        | "in_progress"
        | "completed"
        | "paid"
      unified_request_status:
        | "new"
        | "in_review"
        | "quotation_sent"
        | "approved"
        | "scheduled"
        | "in_progress"
        | "completed"
        | "rejected"
        | "draft"
        | "submitted"
        | "quoted"
        | "waiting_approval"
        | "intervention"
        | "ready_for_payment"
      unified_request_type: "quotation" | "intervention"
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
      app_role: ["admin", "resident", "provider"],
      document_category: ["building", "insurance", "unit"],
      document_status: ["active", "expired", "expiring_soon", "archived"],
      estimate_category: ["electrical", "plumbing", "cleaning", "other"],
      estimate_priority: ["low", "normal", "urgent"],
      estimate_request_status: [
        "draft",
        "submitted",
        "under_review",
        "approved",
        "rejected",
        "converted",
      ],
      estimate_status: ["pending", "approved", "rejected"],
      maintenance_category: [
        "plumbing",
        "electrical",
        "construction",
        "general",
      ],
      notification_type: [
        "payment_reminder",
        "maintenance_update",
        "announcement",
        "estimate_received",
        "estimate_approved",
        "general",
      ],
      payment_status: ["pending", "paid", "overdue"],
      provider_category: ["general", "plumbing", "electrical", "structural"],
      request_status: [
        "requested",
        "under_review",
        "approved",
        "in_progress",
        "completed",
        "paid",
      ],
      unified_request_status: [
        "new",
        "in_review",
        "quotation_sent",
        "approved",
        "scheduled",
        "in_progress",
        "completed",
        "rejected",
        "draft",
        "submitted",
        "quoted",
        "waiting_approval",
        "intervention",
        "ready_for_payment",
      ],
      unified_request_type: ["quotation", "intervention"],
    },
  },
} as const
