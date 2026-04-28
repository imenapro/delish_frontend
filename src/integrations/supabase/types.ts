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
      audit_logs: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string | null
          details: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          operation: string | null
          performed_by: string | null
          record_id: string | null
          table_name: string | null
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string | null
          details?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          operation?: string | null
          performed_by?: string | null
          record_id?: string | null
          table_name?: string | null
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string | null
          details?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          operation?: string | null
          performed_by?: string | null
          record_id?: string | null
          table_name?: string | null
        }
        Relationships: []
      }
      business_types: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      businesses: {
        Row: {
          bg_image_url: string | null
          business_type: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          created_date: string | null
          currency: string | null
          custom_domain: string | null
          deleted_by: string | null
          deleted_date: string | null
          deleted_status: boolean | null
          id: string
          invoice_settings: Json | null
          invoice_template_id: string | null
          locale: string | null
          logo_url: string | null
          metadata: Json | null
          name: string
          owner_id: string | null
          plan_type: string | null
          primary_color: string | null
          secondary_color: string | null
          show_login_background: boolean | null
          slogan: string | null
          slug: string | null
          status: string | null
          subscription_end_date: string | null
          subscription_start_date: string | null
          timezone: string | null
          trial_end_date: string | null
          trial_start_date: string | null
          updated_at: string | null
          updated_by: string | null
          updated_date: string | null
          website: string | null
        }
        Insert: {
          bg_image_url?: string | null
          business_type?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          created_date?: string | null
          currency?: string | null
          custom_domain?: string | null
          deleted_by?: string | null
          deleted_date?: string | null
          deleted_status?: boolean | null
          id?: string
          invoice_settings?: Json | null
          invoice_template_id?: string | null
          locale?: string | null
          logo_url?: string | null
          metadata?: Json | null
          name: string
          owner_id?: string | null
          plan_type?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          show_login_background?: boolean | null
          slogan?: string | null
          slug?: string | null
          status?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          timezone?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
          updated_by?: string | null
          updated_date?: string | null
          website?: string | null
        }
        Update: {
          bg_image_url?: string | null
          business_type?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          created_date?: string | null
          currency?: string | null
          custom_domain?: string | null
          deleted_by?: string | null
          deleted_date?: string | null
          deleted_status?: boolean | null
          id?: string
          invoice_settings?: Json | null
          invoice_template_id?: string | null
          locale?: string | null
          logo_url?: string | null
          metadata?: Json | null
          name?: string
          owner_id?: string | null
          plan_type?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          show_login_background?: boolean | null
          slogan?: string | null
          slug?: string | null
          status?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          timezone?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
          updated_by?: string | null
          updated_date?: string | null
          website?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string | null
          from_user_id: string
          id: string
          is_read: boolean | null
          message: string
          order_id: string | null
          shop_id: string | null
          to_user_id: string | null
        }
        Insert: {
          created_at?: string | null
          from_user_id: string
          id?: string
          is_read?: boolean | null
          message: string
          order_id?: string | null
          shop_id?: string | null
          to_user_id?: string | null
        }
        Update: {
          created_at?: string | null
          from_user_id?: string
          id?: string
          is_read?: boolean | null
          message?: string
          order_id?: string | null
          shop_id?: string | null
          to_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "waiter_performance"
            referencedColumns: ["waiter_id"]
          },
          {
            foreignKeyName: "chat_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "waiter_performance"
            referencedColumns: ["waiter_id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      country_currency_mapping: {
        Row: {
          country_code: string
          created_at: string | null
          currency_code: string
          currency_symbol: string | null
          is_active: boolean | null
          locale: string | null
          updated_at: string | null
        }
        Insert: {
          country_code: string
          created_at?: string | null
          currency_code: string
          currency_symbol?: string | null
          is_active?: boolean | null
          locale?: string | null
          updated_at?: string | null
        }
        Update: {
          country_code?: string
          created_at?: string | null
          currency_code?: string
          currency_symbol?: string | null
          is_active?: boolean | null
          locale?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      credit_audit_log: {
        Row: {
          action: string
          created_at: string | null
          customer_id: string
          id: string
          ip_address: string | null
          new_value: Json | null
          old_value: Json | null
          performed_by: string | null
          reason: string | null
          shop_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          customer_id: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          performed_by?: string | null
          reason?: string | null
          shop_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          customer_id?: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          performed_by?: string | null
          reason?: string | null
          shop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_audit_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_audit_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "waiter_performance"
            referencedColumns: ["waiter_id"]
          },
          {
            foreignKeyName: "credit_audit_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_audit_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "waiter_performance"
            referencedColumns: ["waiter_id"]
          },
          {
            foreignKeyName: "credit_audit_log_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          amount: number
          balance_after: number
          balance_before: number
          created_at: string | null
          created_by: string | null
          customer_id: string
          description: string | null
          id: string
          reference_invoice_id: string | null
          reference_order_id: string | null
          shop_id: string
          transaction_type: string
        }
        Insert: {
          amount: number
          balance_after: number
          balance_before: number
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          description?: string | null
          id?: string
          reference_invoice_id?: string | null
          reference_order_id?: string | null
          shop_id: string
          transaction_type: string
        }
        Update: {
          amount?: number
          balance_after?: number
          balance_before?: number
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          description?: string | null
          id?: string
          reference_invoice_id?: string | null
          reference_order_id?: string | null
          shop_id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "waiter_performance"
            referencedColumns: ["waiter_id"]
          },
          {
            foreignKeyName: "credit_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "waiter_performance"
            referencedColumns: ["waiter_id"]
          },
          {
            foreignKeyName: "credit_transactions_reference_invoice_id_fkey"
            columns: ["reference_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_reference_order_id_fkey"
            columns: ["reference_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      currency_rates: {
        Row: {
          created_at: string | null
          effective_date: string | null
          from_currency: string
          id: string
          rate: number
          to_currency: string
        }
        Insert: {
          created_at?: string | null
          effective_date?: string | null
          from_currency: string
          id?: string
          rate: number
          to_currency: string
        }
        Update: {
          created_at?: string | null
          effective_date?: string | null
          from_currency?: string
          id?: string
          rate?: number
          to_currency?: string
        }
        Relationships: []
      }
      customer_credit_settings: {
        Row: {
          block_reason: string | null
          blocked_at: string | null
          blocked_by: string | null
          created_at: string | null
          credit_limit: number
          credit_score: number | null
          credit_status: Database["public"]["Enums"]["credit_status"]
          current_debt: number
          customer_id: string
          id: string
          is_blocked: boolean | null
          last_payment_date: string | null
          oldest_unpaid_debt_date: string | null
          shop_id: string
          trust_level: Database["public"]["Enums"]["trust_level"]
          updated_at: string | null
        }
        Insert: {
          block_reason?: string | null
          blocked_at?: string | null
          blocked_by?: string | null
          created_at?: string | null
          credit_limit?: number
          credit_score?: number | null
          credit_status?: Database["public"]["Enums"]["credit_status"]
          current_debt?: number
          customer_id: string
          id?: string
          is_blocked?: boolean | null
          last_payment_date?: string | null
          oldest_unpaid_debt_date?: string | null
          shop_id: string
          trust_level?: Database["public"]["Enums"]["trust_level"]
          updated_at?: string | null
        }
        Update: {
          block_reason?: string | null
          blocked_at?: string | null
          blocked_by?: string | null
          created_at?: string | null
          credit_limit?: number
          credit_score?: number | null
          credit_status?: Database["public"]["Enums"]["credit_status"]
          current_debt?: number
          customer_id?: string
          id?: string
          is_blocked?: boolean | null
          last_payment_date?: string | null
          oldest_unpaid_debt_date?: string | null
          shop_id?: string
          trust_level?: Database["public"]["Enums"]["trust_level"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_credit_settings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_credit_settings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "waiter_performance"
            referencedColumns: ["waiter_id"]
          },
          {
            foreignKeyName: "customer_credit_settings_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_credits: {
        Row: {
          balance: number
          created_at: string | null
          currency: string | null
          customer_id: string
          id: string
          shop_id: string
          updated_at: string | null
        }
        Insert: {
          balance?: number
          created_at?: string | null
          currency?: string | null
          customer_id: string
          id?: string
          shop_id: string
          updated_at?: string | null
        }
        Update: {
          balance?: number
          created_at?: string | null
          currency?: string | null
          customer_id?: string
          id?: string
          shop_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_credits_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_credits_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "waiter_performance"
            referencedColumns: ["waiter_id"]
          },
          {
            foreignKeyName: "customer_credits_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_loyalty: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          points: number | null
          tier: string | null
          total_spent: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          points?: number | null
          tier?: string | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          points?: number | null
          tier?: string | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      customer_qr_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          is_active: boolean | null
          session_token: string
          table_session_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          is_active?: boolean | null
          session_token: string
          table_session_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean | null
          session_token?: string
          table_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_qr_sessions_table_session_id_fkey"
            columns: ["table_session_id"]
            isOneToOne: false
            referencedRelation: "table_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      debt_records: {
        Row: {
          authorization_notes: string | null
          authorized_by: string | null
          created_at: string | null
          customer_id: string
          due_date: string | null
          id: string
          invoice_id: string | null
          is_overdue: boolean | null
          original_amount: number
          remaining_amount: number
          shop_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          authorization_notes?: string | null
          authorized_by?: string | null
          created_at?: string | null
          customer_id: string
          due_date?: string | null
          id?: string
          invoice_id?: string | null
          is_overdue?: boolean | null
          original_amount: number
          remaining_amount: number
          shop_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          authorization_notes?: string | null
          authorized_by?: string | null
          created_at?: string | null
          customer_id?: string
          due_date?: string | null
          id?: string
          invoice_id?: string | null
          is_overdue?: boolean | null
          original_amount?: number
          remaining_amount?: number
          shop_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "debt_records_authorized_by_fkey"
            columns: ["authorized_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_records_authorized_by_fkey"
            columns: ["authorized_by"]
            isOneToOne: false
            referencedRelation: "waiter_performance"
            referencedColumns: ["waiter_id"]
          },
          {
            foreignKeyName: "debt_records_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_records_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "waiter_performance"
            referencedColumns: ["waiter_id"]
          },
          {
            foreignKeyName: "debt_records_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_records_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_tasks: {
        Row: {
          created_at: string | null
          delivered_time: string | null
          delivery_user_id: string
          id: string
          notes: string | null
          order_id: string
          pickup_time: string | null
          status: Database["public"]["Enums"]["delivery_status"] | null
        }
        Insert: {
          created_at?: string | null
          delivered_time?: string | null
          delivery_user_id: string
          id?: string
          notes?: string | null
          order_id: string
          pickup_time?: string | null
          status?: Database["public"]["Enums"]["delivery_status"] | null
        }
        Update: {
          created_at?: string | null
          delivered_time?: string | null
          delivery_user_id?: string
          id?: string
          notes?: string | null
          order_id?: string
          pickup_time?: string | null
          status?: Database["public"]["Enums"]["delivery_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_tasks_delivery_user_id_fkey"
            columns: ["delivery_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_tasks_delivery_user_id_fkey"
            columns: ["delivery_user_id"]
            isOneToOne: false
            referencedRelation: "waiter_performance"
            referencedColumns: ["waiter_id"]
          },
          {
            foreignKeyName: "delivery_tasks_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_zones: {
        Row: {
          created_at: string | null
          delivery_fee: number
          estimated_time_minutes: number | null
          id: string
          is_active: boolean | null
          shop_id: string
          zone_name: string
        }
        Insert: {
          created_at?: string | null
          delivery_fee: number
          estimated_time_minutes?: number | null
          id?: string
          is_active?: boolean | null
          shop_id: string
          zone_name: string
        }
        Update: {
          created_at?: string | null
          delivery_fee?: number
          estimated_time_minutes?: number | null
          id?: string
          is_active?: boolean | null
          shop_id?: string
          zone_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_zones_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          business_id: string | null
          created_at: string | null
          error_message: string | null
          from_email: string
          id: string
          metadata: Json | null
          provider: string | null
          status: string
          subject: string
          to_email: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          error_message?: string | null
          from_email: string
          id?: string
          metadata?: Json | null
          provider?: string | null
          status: string
          subject: string
          to_email: string
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          error_message?: string | null
          from_email?: string
          id?: string
          metadata?: Json | null
          provider?: string | null
          status?: string
          subject?: string
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_budgets: {
        Row: {
          business_id: string
          category: string
          created_at: string | null
          created_by: string | null
          currency: string
          id: string
          limit_amount: number
          period_start: string
          shop_id: string | null
          spent_amount: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          business_id: string
          category: string
          created_at?: string | null
          created_by?: string | null
          currency: string
          id?: string
          limit_amount: number
          period_start: string
          shop_id?: string | null
          spent_amount?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          business_id?: string
          category?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string
          id?: string
          limit_amount?: number
          period_start?: string
          shop_id?: string | null
          spent_amount?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_budgets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_budgets_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          account_id: string | null
          amount: number
          approved_by: string | null
          business_id: string | null
          category: string
          created_at: string | null
          currency: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string
          expense_date: string
          id: string
          receipt_url: string | null
          recorded_by: string
          rejected_reason: string | null
          shop_id: string | null
          status: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          account_id?: string | null
          amount: number
          approved_by?: string | null
          business_id?: string | null
          category: string
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description: string
          expense_date: string
          id?: string
          receipt_url?: string | null
          recorded_by: string
          rejected_reason?: string | null
          shop_id?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number
          approved_by?: string | null
          business_id?: string | null
          category?: string
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          receipt_url?: string | null
          recorded_by?: string
          rejected_reason?: string | null
          shop_id?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      factory_stock: {
        Row: {
          business_id: string | null
          category: string
          created_at: string
          id: string
          item_name: string
          min_stock_level: number | null
          purchase_price: number | null
          quantity: number
          supplier: string | null
          supplier_id: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          category: string
          created_at?: string
          id?: string
          item_name: string
          min_stock_level?: number | null
          purchase_price?: number | null
          quantity?: number
          supplier?: string | null
          supplier_id?: string | null
          unit: string
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          category?: string
          created_at?: string
          id?: string
          item_name?: string
          min_stock_level?: number | null
          purchase_price?: number | null
          quantity?: number
          supplier?: string | null
          supplier_id?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "factory_stock_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factory_stock_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_accounts: {
        Row: {
          balance: number
          business_id: string
          created_at: string | null
          created_by: string | null
          currency: string
          id: string
          is_active: boolean
          name: string
          shop_id: string | null
          type: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          balance?: number
          business_id: string
          created_at?: string | null
          created_by?: string | null
          currency: string
          id?: string
          is_active?: boolean
          name: string
          shop_id?: string | null
          type: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          balance?: number
          business_id?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string
          id?: string
          is_active?: boolean
          name?: string
          shop_id?: string | null
          type?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_accounts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_accounts_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_ledger_entries: {
        Row: {
          account_id: string | null
          amount: number
          business_id: string
          created_at: string | null
          created_by: string | null
          currency: string
          direction: string
          id: string
          occurred_at: string
          shop_id: string | null
          source_id: string | null
          source_table: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          business_id: string
          created_at?: string | null
          created_by?: string | null
          currency: string
          direction: string
          id?: string
          occurred_at?: string
          shop_id?: string | null
          source_id?: string | null
          source_table: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          business_id?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string
          direction?: string
          id?: string
          occurred_at?: string
          shop_id?: string | null
          source_id?: string | null
          source_table?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_ledger_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_ledger_entries_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_ledger_entries_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_monthly_summaries: {
        Row: {
          business_id: string
          currency: string
          id: string
          period_start: string
          total_expenses_approved: number
          total_expenses_pending: number
          total_expenses_rejected: number
          updated_at: string | null
        }
        Insert: {
          business_id: string
          currency: string
          id?: string
          period_start: string
          total_expenses_approved?: number
          total_expenses_pending?: number
          total_expenses_rejected?: number
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          currency?: string
          id?: string
          period_start?: string
          total_expenses_approved?: number
          total_expenses_pending?: number
          total_expenses_rejected?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_monthly_summaries_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      finished_product_dispatches: {
        Row: {
          created_at: string
          dispatch_date: string
          dispatched_by: string | null
          finished_product_id: string
          from_location: string | null
          id: string
          notes: string | null
          quantity: number
          received_by: string | null
          received_date: string | null
          status: string
          to_shop_id: string
          transport_info: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          dispatch_date?: string
          dispatched_by?: string | null
          finished_product_id: string
          from_location?: string | null
          id?: string
          notes?: string | null
          quantity: number
          received_by?: string | null
          received_date?: string | null
          status?: string
          to_shop_id: string
          transport_info?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          dispatch_date?: string
          dispatched_by?: string | null
          finished_product_id?: string
          from_location?: string | null
          id?: string
          notes?: string | null
          quantity?: number
          received_by?: string | null
          received_date?: string | null
          status?: string
          to_shop_id?: string
          transport_info?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finished_product_dispatches_finished_product_id_fkey"
            columns: ["finished_product_id"]
            isOneToOne: false
            referencedRelation: "finished_products_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finished_product_dispatches_to_shop_id_fkey"
            columns: ["to_shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      finished_products_stock: {
        Row: {
          batch_number: string | null
          cost_per_unit: number | null
          created_at: string
          expiry_date: string | null
          id: string
          product_id: string | null
          production_run_id: string | null
          quantity: number
          recipe_id: string | null
          shop_id: string | null
          status: string
          total_cost: number | null
          unit: string
          updated_at: string
          warehouse_location: string | null
        }
        Insert: {
          batch_number?: string | null
          cost_per_unit?: number | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          product_id?: string | null
          production_run_id?: string | null
          quantity?: number
          recipe_id?: string | null
          shop_id?: string | null
          status?: string
          total_cost?: number | null
          unit?: string
          updated_at?: string
          warehouse_location?: string | null
        }
        Update: {
          batch_number?: string | null
          cost_per_unit?: number | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          product_id?: string | null
          production_run_id?: string | null
          quantity?: number
          recipe_id?: string | null
          shop_id?: string | null
          status?: string
          total_cost?: number | null
          unit?: string
          updated_at?: string
          warehouse_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finished_products_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finished_products_stock_production_run_id_fkey"
            columns: ["production_run_id"]
            isOneToOne: false
            referencedRelation: "production_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finished_products_stock_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finished_products_stock_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_batches: {
        Row: {
          batch_number: string
          created_at: string | null
          expiry_date: string | null
          id: string
          product_id: string | null
          quantity: number
          shop_id: string | null
          updated_at: string | null
        }
        Insert: {
          batch_number: string
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          product_id?: string | null
          quantity?: number
          shop_id?: string | null
          updated_at?: string | null
        }
        Update: {
          batch_number?: string
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          product_id?: string | null
          quantity?: number
          shop_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_batches_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_reasons: {
        Row: {
          business_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name: string
          type: string
          updated_at: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          type: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_reasons_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          batch_number: string | null
          created_at: string | null
          created_by: string | null
          from_shop_id: string | null
          id: string
          notes: string | null
          product_id: string
          purchase_price: number | null
          quantity: number
          reason_id: string | null
          reference_order_id: string | null
          shop_id: string
          to_shop_id: string | null
          transaction_type: string
          transfer_from_location: string | null
          transfer_to_location: string | null
        }
        Insert: {
          batch_number?: string | null
          created_at?: string | null
          created_by?: string | null
          from_shop_id?: string | null
          id?: string
          notes?: string | null
          product_id: string
          purchase_price?: number | null
          quantity: number
          reason_id?: string | null
          reference_order_id?: string | null
          shop_id: string
          to_shop_id?: string | null
          transaction_type: string
          transfer_from_location?: string | null
          transfer_to_location?: string | null
        }
        Update: {
          batch_number?: string | null
          created_at?: string | null
          created_by?: string | null
          from_shop_id?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          purchase_price?: number | null
          quantity?: number
          reason_id?: string | null
          reference_order_id?: string | null
          shop_id?: string
          to_shop_id?: string | null
          transaction_type?: string
          transfer_from_location?: string | null
          transfer_to_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_from_shop_id_fkey"
            columns: ["from_shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_reason_id_fkey"
            columns: ["reason_id"]
            isOneToOne: false
            referencedRelation: "inventory_reasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_reference_order_id_fkey"
            columns: ["reference_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_to_shop_id_fkey"
            columns: ["to_shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_daily_counter: {
        Row: {
          current_count: number | null
          date_key: string
        }
        Insert: {
          current_count?: number | null
          date_key?: string
        }
        Update: {
          current_count?: number | null
          date_key?: string
        }
        Relationships: []
      }
      invoice_daily_shop_counter: {
        Row: {
          current_count: number | null
          date_key: string
          shop_id: string
        }
        Insert: {
          current_count?: number | null
          date_key?: string
          shop_id: string
        }
        Update: {
          current_count?: number | null
          date_key?: string
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_daily_shop_counter_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_info: Json | null
          id: string
          invoice_number: string
          items_snapshot: Json | null
          payment_method: string | null
          shop_id: string | null
          staff_id: string | null
          status: string | null
          subtotal: number
          tax_amount: number
          total_amount: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_info?: Json | null
          id?: string
          invoice_number: string
          items_snapshot?: Json | null
          payment_method?: string | null
          shop_id?: string | null
          staff_id?: string | null
          status?: string | null
          subtotal?: number
          tax_amount?: number
          total_amount?: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_info?: Json | null
          id?: string
          invoice_number?: string
          items_snapshot?: Json | null
          payment_method?: string | null
          shop_id?: string | null
          staff_id?: string | null
          status?: string | null
          subtotal?: number
          tax_amount?: number
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "waiter_performance"
            referencedColumns: ["waiter_id"]
          },
        ]
      }
      kitchen_quotas: {
        Row: {
          created_at: string | null
          date: string
          id: string
          product_id: string
          quota_total: number
          quota_used: number | null
          shift: string | null
          shop_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          product_id: string
          quota_total: number
          quota_used?: number | null
          shift?: string | null
          shop_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          product_id?: string
          quota_total?: number
          quota_used?: number | null
          shift?: string | null
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kitchen_quotas_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitchen_quotas_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          created_at: string | null
          days_count: number
          end_date: string
          id: string
          leave_type: string
          reason: string | null
          review_notes: string | null
          reviewed_by: string | null
          start_date: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          days_count: number
          end_date: string
          id?: string
          leave_type: string
          reason?: string | null
          review_notes?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          days_count?: number
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          review_notes?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      loyalty_transactions: {
        Row: {
          created_at: string | null
          customer_id: string
          description: string | null
          id: string
          points_change: number
          reference_order_id: string | null
          transaction_type: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          description?: string | null
          id?: string
          points_change: number
          reference_order_id?: string | null
          transaction_type: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          description?: string | null
          id?: string
          points_change?: number
          reference_order_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_reference_order_id_fkey"
            columns: ["reference_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      material_requests: {
        Row: {
          approved_by: string | null
          created_at: string
          delivery_date: string | null
          id: string
          notes: string | null
          production_run_id: string | null
          quantity_approved: number | null
          quantity_requested: number
          received_by: string | null
          received_quantity: number | null
          rejected_reason: string | null
          requested_by: string | null
          status: string
          updated_at: string
          warehouse_item_id: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          delivery_date?: string | null
          id?: string
          notes?: string | null
          production_run_id?: string | null
          quantity_approved?: number | null
          quantity_requested: number
          received_by?: string | null
          received_quantity?: number | null
          rejected_reason?: string | null
          requested_by?: string | null
          status?: string
          updated_at?: string
          warehouse_item_id: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          delivery_date?: string | null
          id?: string
          notes?: string | null
          production_run_id?: string | null
          quantity_approved?: number | null
          quantity_requested?: number
          received_by?: string | null
          received_quantity?: number | null
          rejected_reason?: string | null
          requested_by?: string | null
          status?: string
          updated_at?: string
          warehouse_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_requests_production_run_id_fkey"
            columns: ["production_run_id"]
            isOneToOne: false
            referencedRelation: "production_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_requests_warehouse_item_id_fkey"
            columns: ["warehouse_item_id"]
            isOneToOne: false
            referencedRelation: "factory_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_ingredients: {
        Row: {
          created_at: string | null
          id: string
          menu_item_id: string
          product_id: string | null
          quantity_required: number
          stock_item_id: string | null
          unit: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          menu_item_id: string
          product_id?: string | null
          quantity_required: number
          stock_item_id?: string | null
          unit: string
        }
        Update: {
          created_at?: string | null
          id?: string
          menu_item_id?: string
          product_id?: string | null
          quantity_required?: number
          stock_item_id?: string | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_ingredients_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "restaurant_menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_item_ingredients_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_item_ingredients_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "factory_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      menus: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          label: string
          parent_id: string | null
          path: string
          permission_required_id: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          parent_id?: string | null
          path: string
          permission_required_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          parent_id?: string | null
          path?: string
          permission_required_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menus_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menus_permission_required_id_fkey"
            columns: ["permission_required_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          created_at: string | null
          expiration_warning_days: number | null
          id: string
          reminder_emails: number[] | null
          send_dashboard_alerts: boolean | null
          send_email_reminders: boolean | null
          shop_id: string | null
        }
        Insert: {
          created_at?: string | null
          expiration_warning_days?: number | null
          id?: string
          reminder_emails?: number[] | null
          send_dashboard_alerts?: boolean | null
          send_email_reminders?: boolean | null
          shop_id?: string | null
        }
        Update: {
          created_at?: string | null
          expiration_warning_days?: number | null
          id?: string
          reminder_emails?: number[] | null
          send_dashboard_alerts?: boolean | null
          send_email_reminders?: boolean | null
          shop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          product_id: string
          quantity: number
          subtotal: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          product_id: string
          quantity: number
          subtotal: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancelled_at: string | null
          confirmed_at: string | null
          created_at: string | null
          customer_id: string
          customer_phone: string | null
          delivered_at: string | null
          id: string
          notes: string | null
          order_code: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          pos_session_id: string | null
          prepared_at: string | null
          receipt_number: string | null
          receipt_url: string | null
          seller_id: string | null
          shop_id_fulfill: string
          shop_id_origin: string
          sms_sent: boolean | null
          source: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          total_amount: number
        }
        Insert: {
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          customer_id: string
          customer_phone?: string | null
          delivered_at?: string | null
          id?: string
          notes?: string | null
          order_code: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          pos_session_id?: string | null
          prepared_at?: string | null
          receipt_number?: string | null
          receipt_url?: string | null
          seller_id?: string | null
          shop_id_fulfill: string
          shop_id_origin: string
          sms_sent?: boolean | null
          source?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_amount: number
        }
        Update: {
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          customer_id?: string
          customer_phone?: string | null
          delivered_at?: string | null
          id?: string
          notes?: string | null
          order_code?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          pos_session_id?: string | null
          prepared_at?: string | null
          receipt_number?: string | null
          receipt_url?: string | null
          seller_id?: string | null
          shop_id_fulfill?: string
          shop_id_origin?: string
          sms_sent?: boolean | null
          source?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "waiter_performance"
            referencedColumns: ["waiter_id"]
          },
          {
            foreignKeyName: "orders_pos_session_id_fkey"
            columns: ["pos_session_id"]
            isOneToOne: false
            referencedRelation: "pos_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "waiter_performance"
            referencedColumns: ["waiter_id"]
          },
          {
            foreignKeyName: "orders_shop_id_fulfill_fkey"
            columns: ["shop_id_fulfill"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shop_id_origin_fkey"
            columns: ["shop_id_origin"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      parked_orders: {
        Row: {
          code: string
          created_at: string | null
          id: string
          items: Json
          note: string | null
          resumed_at: string | null
          resumed_by: string | null
          seller_id: string | null
          seller_name: string | null
          shop_id: string
          status: string
          total: number
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          items: Json
          note?: string | null
          resumed_at?: string | null
          resumed_by?: string | null
          seller_id?: string | null
          seller_name?: string | null
          shop_id: string
          status?: string
          total: number
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          items?: Json
          note?: string | null
          resumed_at?: string | null
          resumed_by?: string | null
          seller_id?: string | null
          seller_name?: string | null
          shop_id?: string
          status?: string
          total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parked_orders_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          token: string
          used: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          token: string
          used?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          token?: string
          used?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          next_due_date: string | null
          payment_date: string | null
          payment_method: string | null
          plan_id: string | null
          shop_id: string | null
          status: string | null
          transaction_reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          next_due_date?: string | null
          payment_date?: string | null
          payment_method?: string | null
          plan_id?: string | null
          shop_id?: string | null
          status?: string | null
          transaction_reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          next_due_date?: string | null
          payment_date?: string | null
          payment_method?: string | null
          plan_id?: string | null
          shop_id?: string | null
          status?: string | null
          transaction_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll: {
        Row: {
          base_salary: number
          bonuses: number | null
          created_at: string | null
          currency: string | null
          deductions: number | null
          id: string
          notes: string | null
          payment_date: string | null
          period_end: string
          period_start: string
          processed_by: string | null
          shop_id: string | null
          status: string | null
          total_amount: number
          user_id: string
        }
        Insert: {
          base_salary: number
          bonuses?: number | null
          created_at?: string | null
          currency?: string | null
          deductions?: number | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          period_end: string
          period_start: string
          processed_by?: string | null
          shop_id?: string | null
          status?: string | null
          total_amount: number
          user_id: string
        }
        Update: {
          base_salary?: number
          bonuses?: number | null
          created_at?: string | null
          currency?: string | null
          deductions?: number | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          period_end?: string
          period_start?: string
          processed_by?: string | null
          shop_id?: string | null
          status?: string | null
          total_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: string
          module: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          module?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          module?: string | null
        }
        Relationships: []
      }
      pos_session_inventory_snapshots: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          product_name: string
          quantity: number
          session_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          product_name: string
          quantity?: number
          session_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_session_inventory_snapshots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_session_inventory_snapshots_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "pos_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_sessions: {
        Row: {
          business_id: string
          closed_at: string | null
          closing_cash: number | null
          created_at: string | null
          expected_cash: number | null
          id: string
          notes: string | null
          opened_at: string
          opening_cash: number
          shop_id: string
          status: string
          total_orders: number | null
          total_sales: number | null
          user_id: string
        }
        Insert: {
          business_id: string
          closed_at?: string | null
          closing_cash?: number | null
          created_at?: string | null
          expected_cash?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opening_cash?: number
          shop_id: string
          status?: string
          total_orders?: number | null
          total_sales?: number | null
          user_id: string
        }
        Update: {
          business_id?: string
          closed_at?: string | null
          closing_cash?: number | null
          created_at?: string | null
          expected_cash?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opening_cash?: number
          shop_id?: string
          status?: string
          total_orders?: number | null
          total_sales?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_sessions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sessions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "waiter_performance"
            referencedColumns: ["waiter_id"]
          },
        ]
      }
      product_requests: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          product_id: string
          quantity: number
          requested_by: string
          shop_id: string
          status: Database["public"]["Enums"]["request_status"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id: string
          quantity: number
          requested_by: string
          shop_id: string
          status?: Database["public"]["Enums"]["request_status"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          requested_by?: string
          shop_id?: string
          status?: Database["public"]["Enums"]["request_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_requests_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      production_ingredients: {
        Row: {
          created_at: string | null
          id: string
          quantity: number
          raw_material_id: string | null
          run_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          quantity: number
          raw_material_id?: string | null
          run_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          quantity?: number
          raw_material_id?: string | null
          run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_ingredients_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_ingredients_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "production_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      production_material_usage: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          production_run_id: string
          quantity_allocated: number
          quantity_remaining: number | null
          quantity_spoiled: number | null
          quantity_used: number
          quantity_wasted: number | null
          recorded_by: string | null
          updated_at: string
          usage_date: string | null
          warehouse_item_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          production_run_id: string
          quantity_allocated?: number
          quantity_remaining?: number | null
          quantity_spoiled?: number | null
          quantity_used?: number
          quantity_wasted?: number | null
          recorded_by?: string | null
          updated_at?: string
          usage_date?: string | null
          warehouse_item_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          production_run_id?: string
          quantity_allocated?: number
          quantity_remaining?: number | null
          quantity_spoiled?: number | null
          quantity_used?: number
          quantity_wasted?: number | null
          recorded_by?: string | null
          updated_at?: string
          usage_date?: string | null
          warehouse_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_material_usage_production_run_id_fkey"
            columns: ["production_run_id"]
            isOneToOne: false
            referencedRelation: "production_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_material_usage_warehouse_item_id_fkey"
            columns: ["warehouse_item_id"]
            isOneToOne: false
            referencedRelation: "factory_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      production_runs: {
        Row: {
          batch_number: string
          created_at: string | null
          end_time: string | null
          id: string
          notes: string | null
          product_id: string | null
          quantity_produced: number
          shop_id: string | null
          start_time: string
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          batch_number: string
          created_at?: string | null
          end_time?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity_produced?: number
          shop_id?: string | null
          start_time?: string
          status: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          batch_number?: string
          created_at?: string | null
          end_time?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity_produced?: number
          shop_id?: string | null
          start_time?: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_runs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_runs_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      production_stock: {
        Row: {
          created_at: string
          factory_item_id: string
          id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          factory_item_id: string
          id?: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          factory_item_id?: string
          id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_stock_factory_item_id_fkey"
            columns: ["factory_item_id"]
            isOneToOne: false
            referencedRelation: "factory_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          business_id: string | null
          category: string
          created_at: string | null
          description: string | null
          discount_price: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          price: number
          promotion_description: string | null
          updated_at: string | null
        }
        Insert: {
          barcode?: string | null
          business_id?: string | null
          category: string
          created_at?: string | null
          description?: string | null
          discount_price?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          price: number
          promotion_description?: string | null
          updated_at?: string | null
        }
        Update: {
          barcode?: string | null
          business_id?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          discount_price?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          price?: number
          promotion_description?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          id: string
          is_suspended: boolean | null
          must_change_password: boolean | null
          name: string
          password_changed_at: string | null
          phone: string | null
          shop_id: string | null
          suspended_at: string | null
          suspended_by: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          is_suspended?: boolean | null
          must_change_password?: boolean | null
          name: string
          password_changed_at?: string | null
          phone?: string | null
          shop_id?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_suspended?: boolean | null
          must_change_password?: boolean | null
          name?: string
          password_changed_at?: string | null
          phone?: string | null
          shop_id?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_daily_shop_counter: {
        Row: {
          current_count: number | null
          date_key: string
          shop_id: string
        }
        Insert: {
          current_count?: number | null
          date_key?: string
          shop_id: string
        }
        Update: {
          current_count?: number | null
          date_key?: string
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotation_daily_shop_counter_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          converted_to_invoice_id: string | null
          created_at: string
          created_by: string | null
          customer_info: Json | null
          id: string
          items_snapshot: Json | null
          notes: string | null
          quotation_number: string
          shop_id: string | null
          status: string
          subtotal: number
          tax_amount: number
          total_amount: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          converted_to_invoice_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_info?: Json | null
          id?: string
          items_snapshot?: Json | null
          notes?: string | null
          quotation_number: string
          shop_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          converted_to_invoice_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_info?: Json | null
          id?: string
          items_snapshot?: Json | null
          notes?: string | null
          quotation_number?: string
          shop_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_converted_to_invoice_id_fkey"
            columns: ["converted_to_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          cost_per_ingredient: number | null
          created_at: string
          id: string
          notes: string | null
          quantity_per_unit: number
          recipe_id: string
          unit: string
          warehouse_item_id: string
        }
        Insert: {
          cost_per_ingredient?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          quantity_per_unit: number
          recipe_id: string
          unit: string
          warehouse_item_id: string
        }
        Update: {
          cost_per_ingredient?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          quantity_per_unit?: number
          recipe_id?: string
          unit?: string
          warehouse_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_warehouse_item_id_fkey"
            columns: ["warehouse_item_id"]
            isOneToOne: false
            referencedRelation: "factory_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          business_id: string | null
          cost_per_unit: number | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          output_quantity: number
          output_unit: string
          product_id: string | null
          total_cost: number | null
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          cost_per_unit?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          output_quantity?: number
          output_unit?: string
          product_id?: string | null
          total_cost?: number | null
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          cost_per_unit?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          output_quantity?: number
          output_unit?: string
          product_id?: string | null
          total_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          id: string
          image_url: string
          order_id: string
          reason: string
          shop_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_url: string
          order_id: string
          reason: string
          shop_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_url?: string
          order_id?: string
          reason?: string
          shop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_locations: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          shop_id: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          shop_id: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          shop_id?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_locations_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_menu_items: {
        Row: {
          allergens: string[] | null
          category: string
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_available: boolean | null
          linked_product_id: string | null
          modifiers: Json | null
          name: string
          preparation_time_minutes: number | null
          price: number
          shop_id: string
          station: string | null
          subcategory: string | null
          updated_at: string | null
        }
        Insert: {
          allergens?: string[] | null
          category: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_available?: boolean | null
          linked_product_id?: string | null
          modifiers?: Json | null
          name: string
          preparation_time_minutes?: number | null
          price: number
          shop_id: string
          station?: string | null
          subcategory?: string | null
          updated_at?: string | null
        }
        Update: {
          allergens?: string[] | null
          category?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_available?: boolean | null
          linked_product_id?: string | null
          modifiers?: Json | null
          name?: string
          preparation_time_minutes?: number | null
          price?: number
          shop_id?: string
          station?: string | null
          subcategory?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_menu_items_linked_product_id_fkey"
            columns: ["linked_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_menu_items_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_order_items: {
        Row: {
          created_at: string | null
          id: string
          menu_item_id: string
          modifiers: Json | null
          order_id: string
          prepared_at: string | null
          quantity: number
          sent_to_station_at: string | null
          served_at: string | null
          special_instructions: string | null
          station: string
          status: string | null
          subtotal: number
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          menu_item_id: string
          modifiers?: Json | null
          order_id: string
          prepared_at?: string | null
          quantity?: number
          sent_to_station_at?: string | null
          served_at?: string | null
          special_instructions?: string | null
          station: string
          status?: string | null
          subtotal: number
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          menu_item_id?: string
          modifiers?: Json | null
          order_id?: string
          prepared_at?: string | null
          quantity?: number
          sent_to_station_at?: string | null
          served_at?: string | null
          special_instructions?: string | null
          station?: string
          status?: string | null
          subtotal?: number
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "restaurant_menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "restaurant_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_orders: {
        Row: {
          created_at: string | null
          customer_created: boolean | null
          id: string
          notes: string | null
          order_number: string
          session_id: string
          shop_id: string
          status: string | null
          subtotal: number | null
          table_id: string
          tax_amount: number | null
          total_amount: number | null
          updated_at: string | null
          waiter_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_created?: boolean | null
          id?: string
          notes?: string | null
          order_number: string
          session_id: string
          shop_id: string
          status?: string | null
          subtotal?: number | null
          table_id: string
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
          waiter_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_created?: boolean | null
          id?: string
          notes?: string | null
          order_number?: string
          session_id?: string
          shop_id?: string
          status?: string | null
          subtotal?: number | null
          table_id?: string
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
          waiter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_orders_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "table_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_orders_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_orders_waiter_id_fkey"
            columns: ["waiter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_orders_waiter_id_fkey"
            columns: ["waiter_id"]
            isOneToOne: false
            referencedRelation: "waiter_performance"
            referencedColumns: ["waiter_id"]
          },
        ]
      }
      restaurant_tables: {
        Row: {
          capacity: number | null
          created_at: string | null
          current_session_id: string | null
          id: string
          is_active: boolean | null
          location_id: string | null
          name: string | null
          position_x: number | null
          position_y: number | null
          qr_code: string | null
          shop_id: string
          status: string
          table_number: string
          updated_at: string | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string | null
          current_session_id?: string | null
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          name?: string | null
          position_x?: number | null
          position_y?: number | null
          qr_code?: string | null
          shop_id: string
          status?: string
          table_number: string
          updated_at?: string | null
        }
        Update: {
          capacity?: number | null
          created_at?: string | null
          current_session_id?: string | null
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          name?: string | null
          position_x?: number | null
          position_y?: number | null
          qr_code?: string | null
          shop_id?: string
          status?: string
          table_number?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_current_session"
            columns: ["current_session_id"]
            isOneToOne: false
            referencedRelation: "table_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_tables_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "restaurant_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_tables_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      role_hierarchy: {
        Row: {
          child_role: string
          created_at: string | null
          id: string
          parent_role: string
        }
        Insert: {
          child_role: string
          created_at?: string | null
          id?: string
          parent_role: string
        }
        Update: {
          child_role?: string
          created_at?: string | null
          id?: string
          parent_role?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string | null
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string | null
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string | null
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          business_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_system: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      roles_catalog: {
        Row: {
          description: string | null
          id: number
          name: string
        }
        Insert: {
          description?: string | null
          id?: number
          name: string
        }
        Update: {
          description?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      salary_settings: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          role: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          role: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      shift_attendance: {
        Row: {
          clock_in: string
          clock_out: string | null
          created_at: string | null
          id: string
          notes: string | null
          shift_id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          shift_id: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          shift_id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_attendance_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          created_at: string | null
          created_by: string | null
          end_time: string
          id: string
          notes: string | null
          shift_date: string
          shift_type: string
          shop_id: string
          start_time: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          end_time: string
          id?: string
          notes?: string | null
          shift_date: string
          shift_type: string
          shop_id: string
          start_time: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          end_time?: string
          id?: string
          notes?: string | null
          shift_date?: string
          shift_type?: string
          shop_id?: string
          start_time?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_documents: {
        Row: {
          created_at: string | null
          document_name: string
          document_type: string
          document_url: string
          id: string
          shop_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          document_name: string
          document_type: string
          document_url: string
          id?: string
          shop_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          document_name?: string
          document_type?: string
          document_url?: string
          id?: string
          shop_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_documents_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_inventory: {
        Row: {
          id: string
          price: number
          product_id: string
          quota_per_day: number | null
          shop_id: string
          stock: number | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          price?: number
          product_id: string
          quota_per_day?: number | null
          shop_id: string
          stock?: number | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          price?: number
          product_id?: string
          quota_per_day?: number | null
          shop_id?: string
          stock?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_inventory_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          address: string
          bg_image_url: string | null
          business_id: string | null
          capacity: number | null
          created_at: string | null
          custom_domain: string | null
          grace_period_days: number | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          linked_factory_id: string | null
          linked_warehouse_id: string | null
          locale: string | null
          logo_url: string | null
          name: string
          open_hours: string | null
          owner_email: string | null
          owner_id: string | null
          phone: string | null
          plan_type: string | null
          primary_color: string | null
          secondary_color: string | null
          shop_type: string | null
          slogan: string | null
          slug: string | null
          status: string | null
          subscription_end_date: string | null
          subscription_start_date: string | null
          updated_at: string | null
        }
        Insert: {
          address: string
          bg_image_url?: string | null
          business_id?: string | null
          capacity?: number | null
          created_at?: string | null
          custom_domain?: string | null
          grace_period_days?: number | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          linked_factory_id?: string | null
          linked_warehouse_id?: string | null
          locale?: string | null
          logo_url?: string | null
          name: string
          open_hours?: string | null
          owner_email?: string | null
          owner_id?: string | null
          phone?: string | null
          plan_type?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          shop_type?: string | null
          slogan?: string | null
          slug?: string | null
          status?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string
          bg_image_url?: string | null
          business_id?: string | null
          capacity?: number | null
          created_at?: string | null
          custom_domain?: string | null
          grace_period_days?: number | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          linked_factory_id?: string | null
          linked_warehouse_id?: string | null
          locale?: string | null
          logo_url?: string | null
          name?: string
          open_hours?: string | null
          owner_email?: string | null
          owner_id?: string | null
          phone?: string | null
          plan_type?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          shop_type?: string | null
          slogan?: string | null
          slug?: string | null
          status?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shops_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shops_linked_factory_id_fkey"
            columns: ["linked_factory_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shops_linked_warehouse_id_fkey"
            columns: ["linked_warehouse_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_logs: {
        Row: {
          business_id: string | null
          cost: number | null
          created_at: string | null
          error_message: string | null
          id: string
          message: string
          phone_number: string
          status: string
          units: number | null
        }
        Insert: {
          business_id?: string | null
          cost?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          message: string
          phone_number: string
          status: string
          units?: number | null
        }
        Update: {
          business_id?: string | null
          cost?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          message?: string
          phone_number?: string
          status?: string
          units?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      station_tickets: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          id: string
          order_id: string
          priority: number | null
          shop_id: string
          started_at: string | null
          station: string
          status: string | null
          table_id: string
          ticket_number: string
          time_elapsed_seconds: number | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          id?: string
          order_id: string
          priority?: number | null
          shop_id: string
          started_at?: string | null
          station: string
          status?: string | null
          table_id: string
          ticket_number: string
          time_elapsed_seconds?: number | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          id?: string
          order_id?: string
          priority?: number | null
          shop_id?: string
          started_at?: string | null
          station?: string
          status?: string | null
          table_id?: string
          ticket_number?: string
          time_elapsed_seconds?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "station_tickets_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "station_tickets_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "waiter_performance"
            referencedColumns: ["waiter_id"]
          },
          {
            foreignKeyName: "station_tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "restaurant_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "station_tickets_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "station_tickets_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          factory_item_id: string
          from_stock: string | null
          id: string
          movement_type: string
          notes: string | null
          quantity: number
          to_stock: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          factory_item_id: string
          from_stock?: string | null
          id?: string
          movement_type: string
          notes?: string | null
          quantity: number
          to_stock?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          factory_item_id?: string
          from_stock?: string | null
          id?: string
          movement_type?: string
          notes?: string | null
          quantity?: number
          to_stock?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_factory_item_id_fkey"
            columns: ["factory_item_id"]
            isOneToOne: false
            referencedRelation: "factory_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfers: {
        Row: {
          approved_by: string | null
          batch_number: string | null
          created_at: string | null
          from_shop_id: string
          id: string
          notes: string | null
          product_id: string
          quantity: number
          requested_by: string
          status: string | null
          to_shop_id: string
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          batch_number?: string | null
          created_at?: string | null
          from_shop_id: string
          id?: string
          notes?: string | null
          product_id: string
          quantity: number
          requested_by: string
          status?: string | null
          to_shop_id: string
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          batch_number?: string | null
          created_at?: string | null
          from_shop_id?: string
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          requested_by?: string
          status?: string | null
          to_shop_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_from_shop_id_fkey"
            columns: ["from_shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_to_shop_id_fkey"
            columns: ["to_shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      store_product_requests: {
        Row: {
          created_at: string
          delivery_date: string | null
          dispatch_date: string | null
          fulfilled_by: string | null
          id: string
          notes: string | null
          priority: string | null
          product_id: string | null
          quantity_fulfilled: number | null
          quantity_requested: number
          received_by: string | null
          recipe_id: string | null
          rejected_reason: string | null
          requested_by: string | null
          shop_id: string
          status: string
          transport_info: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_date?: string | null
          dispatch_date?: string | null
          fulfilled_by?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          product_id?: string | null
          quantity_fulfilled?: number | null
          quantity_requested: number
          received_by?: string | null
          recipe_id?: string | null
          rejected_reason?: string | null
          requested_by?: string | null
          shop_id: string
          status?: string
          transport_info?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_date?: string | null
          dispatch_date?: string | null
          fulfilled_by?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          product_id?: string | null
          quantity_fulfilled?: number | null
          quantity_requested?: number
          received_by?: string | null
          recipe_id?: string | null
          rejected_reason?: string | null
          requested_by?: string | null
          shop_id?: string
          status?: string
          transport_info?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_product_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_product_requests_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_product_requests_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          description: string | null
          duration_days: number
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          duration_days?: number
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          price?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          duration_days?: number
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      subscription_statuses: {
        Row: {
          business_id: string | null
          created_at: string | null
          deleted_at: string | null
          end_date: string | null
          id: string
          plan_id: string | null
          start_date: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          plan_id?: string | null
          start_date?: string | null
          status: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          end_date?: string | null
          id?: string
          plan_id?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_statuses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_statuses_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      table_sessions: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string | null
          customer_count: number | null
          id: string
          notes: string | null
          opened_at: string | null
          opened_by: string | null
          session_token: string | null
          status: string | null
          table_id: string
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          customer_count?: number | null
          id?: string
          notes?: string | null
          opened_at?: string | null
          opened_by?: string | null
          session_token?: string | null
          status?: string | null
          table_id: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          customer_count?: number | null
          id?: string
          notes?: string | null
          opened_at?: string | null
          opened_by?: string | null
          session_token?: string | null
          status?: string | null
          table_id?: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "table_sessions_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_sessions_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "waiter_performance"
            referencedColumns: ["waiter_id"]
          },
          {
            foreignKeyName: "table_sessions_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_sessions_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "waiter_performance"
            referencedColumns: ["waiter_id"]
          },
          {
            foreignKeyName: "table_sessions_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_email_settings: {
        Row: {
          business_id: string
          created_at: string | null
          id: string
          is_verified: boolean | null
          sender_email: string
          sender_name: string
          smtp_host: string | null
          smtp_pass: string | null
          smtp_port: number | null
          smtp_user: string | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          id?: string
          is_verified?: boolean | null
          sender_email: string
          sender_name: string
          smtp_host?: string | null
          smtp_pass?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          id?: string
          is_verified?: boolean | null
          sender_email?: string
          sender_name?: string
          smtp_host?: string | null
          smtp_pass?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_email_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_payment_methods: {
        Row: {
          business_id: string
          config: Json
          created_at: string | null
          encrypted_data: string | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          last_used_at: string | null
          type: Database["public"]["Enums"]["payment_method_type"]
          updated_at: string | null
        }
        Insert: {
          business_id: string
          config?: Json
          created_at?: string | null
          encrypted_data?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          last_used_at?: string | null
          type: Database["public"]["Enums"]["payment_method_type"]
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          config?: Json
          created_at?: string | null
          encrypted_data?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          last_used_at?: string | null
          type?: Database["public"]["Enums"]["payment_method_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_payment_methods_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_taxes: {
        Row: {
          business_id: string
          category: string | null
          country: string | null
          created_at: string
          description: string | null
          effective_from: string | null
          effective_to: string | null
          id: string
          is_active: boolean
          is_compound: boolean | null
          name: string
          rate: number
          region: string | null
          shop_id: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          category?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_active?: boolean
          is_compound?: boolean | null
          name: string
          rate: number
          region?: string | null
          shop_id?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          category?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_active?: boolean
          is_compound?: boolean | null
          name?: string
          rate?: number
          region?: string | null
          shop_id?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_taxes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_taxes_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      time_tracking: {
        Row: {
          check_in: string
          check_out: string | null
          created_at: string | null
          id: string
          image_url: string | null
          method: Database["public"]["Enums"]["attendance_method"]
          user_id: string
          verification_data: string | null
        }
        Insert: {
          check_in?: string
          check_out?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          method: Database["public"]["Enums"]["attendance_method"]
          user_id: string
          verification_data?: string | null
        }
        Update: {
          check_in?: string
          check_out?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          method?: Database["public"]["Enums"]["attendance_method"]
          user_id?: string
          verification_data?: string | null
        }
        Relationships: []
      }
      user_businesses: {
        Row: {
          business_id: string
          id: string
          joined_at: string | null
          user_id: string
        }
        Insert: {
          business_id: string
          id?: string
          joined_at?: string | null
          user_id: string
        }
        Update: {
          business_id?: string
          id?: string
          joined_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_businesses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          created_at: string | null
          is_granted: boolean | null
          permission_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          is_granted?: boolean | null
          permission_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          is_granted?: boolean | null
          permission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_role_assignments: {
        Row: {
          created_at: string | null
          id: string
          role_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          role_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          role_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_role_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          business_id: string | null
          created_at: string | null
          id: string
          role: string
          shop_id: string | null
          user_id: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          id?: string
          role: string
          shop_id?: string | null
          user_id: string
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          id?: string
          role?: string
          shop_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "waiter_performance"
            referencedColumns: ["waiter_id"]
          },
        ]
      }
      waiter_pins: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          pin_hash: string
          shop_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          pin_hash: string
          shop_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          pin_hash?: string
          shop_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waiter_pins_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_pins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_pins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "waiter_performance"
            referencedColumns: ["waiter_id"]
          },
        ]
      }
      waiter_shifts: {
        Row: {
          created_at: string | null
          ended_at: string | null
          id: string
          notes: string | null
          shop_id: string
          started_at: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          shop_id: string
          started_at?: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          shop_id?: string
          started_at?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waiter_shifts_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_shifts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_shifts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "waiter_performance"
            referencedColumns: ["waiter_id"]
          },
        ]
      }
      waiter_table_assignments: {
        Row: {
          assigned_at: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          location_id: string | null
          shop_id: string
          table_id: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          shop_id: string
          table_id?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          shop_id?: string
          table_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waiter_table_assignments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "restaurant_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_table_assignments_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_table_assignments_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_table_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiter_table_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "waiter_performance"
            referencedColumns: ["waiter_id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          reference: string | null
          type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference?: string | null
          type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference?: string | null
          type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number | null
          created_at: string | null
          currency: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "waiter_performance"
            referencedColumns: ["waiter_id"]
          },
        ]
      }
      warehouse_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          business_id: string
          complaint: string | null
          complaint_at: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          expense_id: string | null
          id: string
          item_name: string
          quantity: number
          reason: string
          rejected_at: string | null
          rejected_by: string | null
          requested_at: string
          requested_by: string
          shop_id: string | null
          status: string
          unit: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          business_id: string
          complaint?: string | null
          complaint_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          expense_id?: string | null
          id?: string
          item_name: string
          quantity: number
          reason: string
          rejected_at?: string | null
          rejected_by?: string | null
          requested_at?: string
          requested_by: string
          shop_id?: string | null
          status?: string
          unit?: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          business_id?: string
          complaint?: string | null
          complaint_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          expense_id?: string | null
          id?: string
          item_name?: string
          quantity?: number
          reason?: string
          rejected_at?: string | null
          rejected_by?: string | null
          requested_at?: string
          requested_by?: string
          shop_id?: string | null
          status?: string
          unit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_requests_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_requests_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      kitchen_performance: {
        Row: {
          avg_prep_minutes: number | null
          completed_tickets: number | null
          service_date: string | null
          station: string | null
          total_tickets: number | null
        }
        Relationships: []
      }
      waiter_performance: {
        Row: {
          avg_session_minutes: number | null
          orders_taken: number | null
          service_date: string | null
          tables_served: number | null
          total_sales: number | null
          waiter_id: string | null
          waiter_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      adjust_expense_budget: {
        Args: {
          _business_id: string
          _category: string
          _currency: string
          _delta: number
          _period_start: string
          _shop_id: string
        }
        Returns: undefined
      }
      adjust_monthly_summary: {
        Args: {
          _approved_delta: number
          _business_id: string
          _currency: string
          _pending_delta: number
          _period_start: string
          _rejected_delta: number
        }
        Returns: undefined
      }
      approve_material_request: {
        Args: {
          p_request_id: string
          p_user_id: string
          p_warehouse_id: string
        }
        Returns: undefined
      }
      approve_stock_transfer: {
        Args: { p_transfer_id: string; p_user_id: string }
        Returns: undefined
      }
      calculate_credit_score: {
        Args: { p_customer_id: string; p_shop_id: string }
        Returns: number
      }
      can_access_shop: {
        Args: { _shop_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_role:
        | {
            Args: {
              _manager_id: string
              _target_role: Database["public"]["Enums"]["app_role"]
            }
            Returns: boolean
          }
        | {
            Args: { _manager_id: string; _target_role: string }
            Returns: boolean
          }
      can_use_credit: {
        Args: { p_amount: number; p_customer_id: string; p_shop_id: string }
        Returns: Json
      }
      check_user_role_for_business: {
        Args: { _business_id: string; _role_name: string; _user_id: string }
        Returns: boolean
      }
      complete_password_change: { Args: never; Returns: undefined }
      complete_production_run: {
        Args: { p_run_id: string; p_user_id: string }
        Returns: undefined
      }
      create_product_with_inventory: {
        Args: {
          p_barcode: string
          p_business_id: string
          p_category: string
          p_description: string
          p_initial_stock?: number
          p_name: string
          p_price: number
        }
        Returns: {
          barcode: string | null
          business_id: string | null
          category: string
          created_at: string | null
          description: string | null
          discount_price: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          price: number
          promotion_description: string | null
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_shop: {
        Args: {
          p_address: string
          p_business_id: string
          p_is_active?: boolean
          p_name: string
          p_open_hours?: string
          p_owner_id?: string
          p_phone?: string
          p_status?: string
        }
        Returns: string
      }
      create_waiter_pin: {
        Args: { p_pin: string; p_shop_id: string; p_user_id: string }
        Returns: string
      }
      generate_invoice_number: { Args: never; Returns: string }
      generate_order_code: { Args: never; Returns: string }
      generate_restaurant_order_number: {
        Args: { p_shop_id: string }
        Returns: string
      }
      generate_shop_invoice_number: {
        Args: { p_shop_id: string }
        Returns: string
      }
      generate_shop_quotation_number: {
        Args: { p_shop_id: string }
        Returns: string
      }
      generate_ticket_number: {
        Args: { p_shop_id: string; p_station: string }
        Returns: string
      }
      get_low_stock_items: {
        Args: never
        Returns: {
          current_stock: number
          id: string
          name: string
          shop_id: string
          sku: string
          threshold: number
        }[]
      }
      get_sales_analytics: { Args: { p_business_id: string }; Returns: Json }
      get_user_business_ids: {
        Args: never
        Returns: {
          business_id: string
        }[]
      }
      get_user_businesses: { Args: { _user_id: string }; Returns: string[] }
      get_user_menus: {
        Args: { _user_id: string }
        Returns: {
          children: Json
          icon: string
          id: string
          label: string
          parent_id: string
          path: string
          sort_order: number
        }[]
      }
      get_user_roles: { Args: { _user_id: string }; Returns: string[] }
      get_user_shops: { Args: { _user_id: string }; Returns: string[] }
      has_business_access: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      has_permission: {
        Args: { _permission_code: string; _user_id: string }
        Returns: boolean
      }
      has_role:
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
        | { Args: { _role: string; _user_id: string }; Returns: boolean }
      is_authenticated: { Args: never; Returns: boolean }
      is_business_manager: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      is_business_owner: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      process_pos_sale: {
        Args: {
          p_customer_phone?: string
          p_extras?: Json
          p_items: Json
          p_payment_method: string
          p_session_id: string
          p_shop_id: string
          p_tax_amount?: number
          p_total_amount: number
          p_user_id: string
        }
        Returns: Json
      }
      request_password_reset: { Args: { p_email: string }; Returns: Json }
      soft_delete_business: {
        Args: { target_business_id: string }
        Returns: undefined
      }
      verify_reset_token: {
        Args: { p_email: string; p_token: string }
        Returns: Json
      }
      verify_waiter_pin: {
        Args: { p_pin: string; p_shop_id: string }
        Returns: {
          is_valid: boolean
          user_id: string
          waiter_name: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "seller"
        | "manager"
        | "delivery"
        | "customer"
        | "super_admin"
        | "branch_manager"
        | "store_keeper"
        | "manpower"
        | "accountant"
        | "store_owner"
        | "waiter"
        | "Owner"
        | "finance"
        | "distributor"
        | "production"
        | "logistics"
      attendance_method: "qr_code" | "sms_otp" | "image_snap"
      credit_status: "active" | "blocked" | "suspended" | "pending_review"
      delivery_status:
        | "assigned"
        | "picked_up"
        | "in_transit"
        | "delivered"
        | "failed"
      order_status:
        | "pending"
        | "confirmed"
        | "preparing"
        | "ready"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
      payment_method: "cash" | "mobile_money" | "card" | "wallet"
      payment_method_type:
        | "visa"
        | "mastercard"
        | "mobile_money"
        | "bank_transfer"
        | "paypal"
      request_status: "pending" | "approved" | "rejected" | "fulfilled"
      trust_level: "new" | "standard" | "trusted" | "premium" | "vip"
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
      app_role: [
        "admin",
        "seller",
        "manager",
        "delivery",
        "customer",
        "super_admin",
        "branch_manager",
        "store_keeper",
        "manpower",
        "accountant",
        "store_owner",
        "waiter",
        "Owner",
        "finance",
      ],
      attendance_method: ["qr_code", "sms_otp", "image_snap"],
      credit_status: ["active", "blocked", "suspended", "pending_review"],
      delivery_status: [
        "assigned",
        "picked_up",
        "in_transit",
        "delivered",
        "failed",
      ],
      order_status: [
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      payment_method: ["cash", "mobile_money", "card", "wallet"],
      payment_method_type: [
        "visa",
        "mastercard",
        "mobile_money",
        "bank_transfer",
        "paypal",
      ],
      request_status: ["pending", "approved", "rejected", "fulfilled"],
      trust_level: ["new", "standard", "trusted", "premium", "vip"],
    },
  },
} as const
