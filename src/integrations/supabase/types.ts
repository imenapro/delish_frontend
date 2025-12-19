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
      businesses: {
        Row: {
          business_type: string | null
          country: string | null
          created_at: string | null
          custom_domain: string | null
          id: string
          logo_url: string | null
          metadata: Json | null
          name: string
          owner_id: string | null
          plan_type: string | null
          primary_color: string | null
          secondary_color: string | null
          slogan: string | null
          slug: string | null
          status: string | null
          subscription_end_date: string | null
          subscription_start_date: string | null
          timezone: string | null
          trial_end_date: string | null
          trial_start_date: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          business_type?: string | null
          country?: string | null
          created_at?: string | null
          custom_domain?: string | null
          id?: string
          logo_url?: string | null
          metadata?: Json | null
          name: string
          owner_id?: string | null
          plan_type?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slogan?: string | null
          slug?: string | null
          status?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          timezone?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          business_type?: string | null
          country?: string | null
          created_at?: string | null
          custom_domain?: string | null
          id?: string
          logo_url?: string | null
          metadata?: Json | null
          name?: string
          owner_id?: string | null
          plan_type?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slogan?: string | null
          slug?: string | null
          status?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          timezone?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
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
      expenses: {
        Row: {
          amount: number
          approved_by: string | null
          category: string
          created_at: string | null
          currency: string | null
          description: string
          expense_date: string
          id: string
          receipt_url: string | null
          recorded_by: string
          shop_id: string | null
          status: string | null
        }
        Insert: {
          amount: number
          approved_by?: string | null
          category: string
          created_at?: string | null
          currency?: string | null
          description: string
          expense_date: string
          id?: string
          receipt_url?: string | null
          recorded_by: string
          shop_id?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          approved_by?: string | null
          category?: string
          created_at?: string | null
          currency?: string | null
          description?: string
          expense_date?: string
          id?: string
          receipt_url?: string | null
          recorded_by?: string
          shop_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          created_at: string | null
          created_by: string | null
          from_shop_id: string | null
          id: string
          notes: string | null
          product_id: string
          quantity: number
          reference_order_id: string | null
          shop_id: string
          to_shop_id: string | null
          transaction_type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          from_shop_id?: string | null
          id?: string
          notes?: string | null
          product_id: string
          quantity: number
          reference_order_id?: string | null
          shop_id: string
          to_shop_id?: string | null
          transaction_type: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          from_shop_id?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          reference_order_id?: string | null
          shop_id?: string
          to_shop_id?: string | null
          transaction_type?: string
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
      invoices: {
        Row: {
          created_at: string | null
          customer_info: Json | null
          id: string
          invoice_number: string
          items_snapshot: Json | null
          shop_id: string | null
          staff_id: string | null
          payment_method: string | null
          status: string
          subtotal: number
          tax_amount: number
          total_amount: number
        }
        Insert: {
          created_at?: string | null
          customer_info?: Json | null
          id?: string
          invoice_number: string
          items_snapshot?: Json | null
          shop_id?: string | null
          staff_id?: string | null
          payment_method?: string | null
          status?: string
          subtotal: number
          tax_amount: number
          total_amount: number
        }
        Update: {
          created_at?: string | null
          customer_info?: Json | null
          id?: string
          invoice_number?: string
          items_snapshot?: Json | null
          shop_id?: string | null
          staff_id?: string | null
          payment_method?: string | null
          status?: string
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
          prepared_at: string | null
          receipt_number: string | null
          receipt_url: string | null
          seller_id: string | null
          shop_id_fulfill: string
          shop_id_origin: string
          sms_sent: boolean | null
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
          prepared_at?: string | null
          receipt_number?: string | null
          receipt_url?: string | null
          seller_id?: string | null
          shop_id_fulfill: string
          shop_id_origin: string
          sms_sent?: boolean | null
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
          prepared_at?: string | null
          receipt_number?: string | null
          receipt_url?: string | null
          seller_id?: string | null
          shop_id_fulfill?: string
          shop_id_origin?: string
          sms_sent?: boolean | null
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
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
            foreignKeyName: "payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
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
      role_hierarchy: {
        Row: {
          child_role: Database["public"]["Enums"]["app_role"]
          created_at: string | null
          id: string
          parent_role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          child_role: Database["public"]["Enums"]["app_role"]
          created_at?: string | null
          id?: string
          parent_role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          child_role?: Database["public"]["Enums"]["app_role"]
          created_at?: string | null
          id?: string
          parent_role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
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
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
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
        ]
      }
      stock_transfers: {
        Row: {
          approved_by: string | null
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
      subscription_plans: {
        Row: {
          created_at: string | null
          currency: string | null
          duration_days: number
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          price: number
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          duration_days: number
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          price: number
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          duration_days?: number
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
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
      user_roles: {
        Row: {
          business_id: string | null
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          shop_id: string | null
          user_id: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          shop_id?: string | null
          user_id: string
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
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
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_shop: {
        Args: { _shop_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_role: {
        Args: {
          _manager_id: string
          _target_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
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
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          price: number
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      generate_order_code: { Args: never; Returns: string }
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
      get_user_business_ids: {
        Args: never
        Returns: {
          business_id: string
        }[]
      }
      get_user_businesses: { Args: { _user_id: string }; Returns: string[] }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      get_user_shops: { Args: { _user_id: string }; Returns: string[] }
      has_business_access: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_authenticated: { Args: never; Returns: boolean }
      is_business_owner: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
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
      attendance_method: "qr_code" | "sms_otp" | "image_snap"
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
      request_status: "pending" | "approved" | "rejected" | "fulfilled"
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
      ],
      attendance_method: ["qr_code", "sms_otp", "image_snap"],
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
      request_status: ["pending", "approved", "rejected", "fulfilled"],
    },
  },
} as const
