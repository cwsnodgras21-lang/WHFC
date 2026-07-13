export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      activity_events: {
        Row: {
          actor_id: string | null
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          metadata: Json | null
          module: Database["public"]["Enums"]["activity_module"]
          occurred_at: string
          severity: Database["public"]["Enums"]["activity_severity"]
          title: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          module: Database["public"]["Enums"]["activity_module"]
          occurred_at?: string
          severity?: Database["public"]["Enums"]["activity_severity"]
          title: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          module?: Database["public"]["Enums"]["activity_module"]
          occurred_at?: string
          severity?: Database["public"]["Enums"]["activity_severity"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          after_state: Json | null
          before_state: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      dispense_event_lines: {
        Row: {
          created_at: string
          dispense_event_id: string
          id: string
          inventory_lot_id: string | null
          item_id: string
          quantity_consumed: number
          transaction_id: string | null
          unit: string
        }
        Insert: {
          created_at?: string
          dispense_event_id: string
          id?: string
          inventory_lot_id?: string | null
          item_id: string
          quantity_consumed: number
          transaction_id?: string | null
          unit: string
        }
        Update: {
          created_at?: string
          dispense_event_id?: string
          id?: string
          inventory_lot_id?: string | null
          item_id?: string
          quantity_consumed?: number
          transaction_id?: string | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispense_event_lines_dispense_event_id_fkey"
            columns: ["dispense_event_id"]
            isOneToOne: false
            referencedRelation: "dispense_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispense_event_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispense_event_lines_inventory_lot_id_fkey"
            columns: ["inventory_lot_id"]
            isOneToOne: false
            referencedRelation: "inventory_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispense_event_lines_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "inventory_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      dispense_events: {
        Row: {
          administered_amounts: Json
          allow_expired_consumption: boolean
          created_at: string
          created_by: string
          external_event_id: string | null
          external_source: string | null
          id: string
          idempotency_key: string | null
          location_id: string
          notes: string | null
          performed_at: string
          procedure_kit_id: string
          source: Database["public"]["Enums"]["dispense_event_source"]
          transaction_group_id: string
        }
        Insert: {
          administered_amounts?: Json
          allow_expired_consumption?: boolean
          created_at?: string
          created_by: string
          external_event_id?: string | null
          external_source?: string | null
          id?: string
          idempotency_key?: string | null
          location_id: string
          notes?: string | null
          performed_at?: string
          procedure_kit_id: string
          source?: Database["public"]["Enums"]["dispense_event_source"]
          transaction_group_id?: string
        }
        Update: {
          administered_amounts?: Json
          allow_expired_consumption?: boolean
          created_at?: string
          created_by?: string
          external_event_id?: string | null
          external_source?: string | null
          id?: string
          idempotency_key?: string | null
          location_id?: string
          notes?: string | null
          performed_at?: string
          procedure_kit_id?: string
          source?: Database["public"]["Enums"]["dispense_event_source"]
          transaction_group_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispense_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispense_events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispense_events_procedure_kit_id_fkey"
            columns: ["procedure_kit_id"]
            isOneToOne: false
            referencedRelation: "procedure_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      imaging_orders: {
        Row: {
          appointment_date: string | null
          appointment_time: string | null
          authorization_number: string | null
          authorization_status: Database["public"]["Enums"]["imaging_authorization_status"]
          created_at: string
          created_by: string
          date_ordered: string
          id: string
          imaging_location: string | null
          imaging_type: string
          notes: string | null
          ordering_provider: string
          patient_reference: string
          status: Database["public"]["Enums"]["imaging_status"]
          updated_at: string
        }
        Insert: {
          appointment_date?: string | null
          appointment_time?: string | null
          authorization_number?: string | null
          authorization_status?: Database["public"]["Enums"]["imaging_authorization_status"]
          created_at?: string
          created_by: string
          date_ordered?: string
          id?: string
          imaging_location?: string | null
          imaging_type: string
          notes?: string | null
          ordering_provider: string
          patient_reference: string
          status?: Database["public"]["Enums"]["imaging_status"]
          updated_at?: string
        }
        Update: {
          appointment_date?: string | null
          appointment_time?: string | null
          authorization_number?: string | null
          authorization_status?: Database["public"]["Enums"]["imaging_authorization_status"]
          created_at?: string
          created_by?: string
          date_ordered?: string
          id?: string
          imaging_location?: string | null
          imaging_type?: string
          notes?: string | null
          ordering_provider?: string
          patient_reference?: string
          status?: Database["public"]["Enums"]["imaging_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "imaging_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_lots: {
        Row: {
          created_at: string
          expiration_date: string | null
          id: string
          item_id: string
          location_id: string
          lot_number: string | null
          received_date: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          expiration_date?: string | null
          id?: string
          item_id: string
          location_id: string
          lot_number?: string | null
          received_date?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          expiration_date?: string | null
          id?: string
          item_id?: string
          location_id?: string
          lot_number?: string | null
          received_date?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_lots_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_lots_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_lots_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          created_at: string
          id: string
          inventory_lot_id: string | null
          item_id: string
          location_id: string
          performed_by: string
          quantity: number
          reason_code: Database["public"]["Enums"]["reason_code"]
          transaction_date: string
          transaction_group_id: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_lot_id?: string | null
          item_id: string
          location_id: string
          performed_by: string
          quantity: number
          reason_code: Database["public"]["Enums"]["reason_code"]
          transaction_date?: string
          transaction_group_id: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          created_at?: string
          id?: string
          inventory_lot_id?: string | null
          item_id?: string
          location_id?: string
          performed_by?: string
          quantity?: number
          reason_code?: Database["public"]["Enums"]["reason_code"]
          transaction_date?: string
          transaction_group_id?: string
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items_below_reorder_point"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_transactions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      item_vendors: {
        Row: {
          created_at: string
          id: string
          is_preferred: boolean
          item_id: string
          last_order_date: string | null
          lead_time_days: number | null
          manufacturer: string | null
          manufacturer_part_number: string | null
          ordering_notes: string | null
          ordering_url: string | null
          pack_size: string | null
          typical_cost: number | null
          typical_order_quantity: number | null
          updated_at: string
          vendor_id: string
          vendor_sku: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_preferred?: boolean
          item_id: string
          last_order_date?: string | null
          lead_time_days?: number | null
          manufacturer?: string | null
          manufacturer_part_number?: string | null
          ordering_notes?: string | null
          ordering_url?: string | null
          pack_size?: string | null
          typical_cost?: number | null
          typical_order_quantity?: number | null
          updated_at?: string
          vendor_id: string
          vendor_sku?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_preferred?: boolean
          item_id?: string
          last_order_date?: string | null
          lead_time_days?: number | null
          manufacturer?: string | null
          manufacturer_part_number?: string | null
          ordering_notes?: string | null
          ordering_url?: string | null
          pack_size?: string | null
          typical_cost?: number | null
          typical_order_quantity?: number | null
          updated_at?: string
          vendor_id?: string
          vendor_sku?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_vendors_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_vendors_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          active: boolean
          category_id: string
          created_at: string
          expiration_warning_days: number
          id: string
          internal_sku: string
          item_name: string
          par_level: number
          preferred_vendor_id: string | null
          reorder_point: number
          track_expiration: boolean
          track_lot_number: boolean
          unit_of_measure_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_id: string
          created_at?: string
          expiration_warning_days?: number
          id?: string
          internal_sku: string
          item_name: string
          par_level?: number
          preferred_vendor_id?: string | null
          reorder_point?: number
          track_expiration?: boolean
          track_lot_number?: boolean
          unit_of_measure_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_id?: string
          created_at?: string
          expiration_warning_days?: number
          id?: string
          internal_sku?: string
          item_name?: string
          par_level?: number
          preferred_vendor_id?: string | null
          reorder_point?: number
          track_expiration?: boolean
          track_lot_number?: boolean
          unit_of_measure_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_preferred_vendor_id_fkey"
            columns: ["preferred_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_unit_of_measure_id_fkey"
            columns: ["unit_of_measure_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          active: boolean
          bin: string | null
          cabinet: string | null
          created_at: string
          id: string
          location_name: string
          room: string | null
          shelf: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          bin?: string | null
          cabinet?: string | null
          created_at?: string
          id?: string
          location_name: string
          room?: string | null
          shelf?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          bin?: string | null
          cabinet?: string | null
          created_at?: string
          id?: string
          location_name?: string
          room?: string | null
          shelf?: string | null
          updated_at?: string
        }
        Relationships: [        ]
      }
      organization_module_settings: {
        Row: {
          enabled: boolean
          module_key: string
          organization_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          enabled?: boolean
          module_key: string
          organization_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean
          module_key?: string
          organization_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_module_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_module_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      physical_count_lines: {
        Row: {
          counted_quantity: number
          created_at: string
          id: string
          inventory_lot_id: string | null
          item_id: string
          physical_count_id: string
          system_quantity: number
          updated_at: string
          variance: number | null
        }
        Insert: {
          counted_quantity?: number
          created_at?: string
          id?: string
          inventory_lot_id?: string | null
          item_id: string
          physical_count_id: string
          system_quantity?: number
          updated_at?: string
          variance?: number | null
        }
        Update: {
          counted_quantity?: number
          created_at?: string
          id?: string
          inventory_lot_id?: string | null
          item_id?: string
          physical_count_id?: string
          system_quantity?: number
          updated_at?: string
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "physical_count_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "physical_count_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items_below_reorder_point"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "physical_count_lines_physical_count_id_fkey"
            columns: ["physical_count_id"]
            isOneToOne: false
            referencedRelation: "physical_counts"
            referencedColumns: ["id"]
          },
        ]
      }
      physical_counts: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_by: string
          id: string
          location_id: string
          started_at: string
          status: Database["public"]["Enums"]["physical_count_status"]
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_by: string
          id?: string
          location_id: string
          started_at?: string
          status?: Database["public"]["Enums"]["physical_count_status"]
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_by?: string
          id?: string
          location_id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["physical_count_status"]
        }
        Relationships: [
          {
            foreignKeyName: "physical_counts_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "physical_counts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "physical_counts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_draft_lines: {
        Row: {
          created_at: string
          id: string
          item_id: string
          location_id: string | null
          notes: string | null
          purchase_order_draft_id: string
          quantity: number
          reorder_reason: string | null
          suggested_quantity: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          location_id?: string | null
          notes?: string | null
          purchase_order_draft_id: string
          quantity: number
          reorder_reason?: string | null
          suggested_quantity?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          location_id?: string | null
          notes?: string | null
          purchase_order_draft_id?: string
          quantity?: number
          reorder_reason?: string | null
          suggested_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_draft_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_draft_lines_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_draft_lines_purchase_order_draft_id_fkey"
            columns: ["purchase_order_draft_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_drafts: {
        Row: {
          created_at: string
          created_by: string
          id: string
          status: Database["public"]["Enums"]["purchase_order_draft_status"]
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          status?: Database["public"]["Enums"]["purchase_order_draft_status"]
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          status?: Database["public"]["Enums"]["purchase_order_draft_status"]
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_drafts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_drafts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      procedure_kit_components: {
        Row: {
          calculation_type: string | null
          concentration_amount: number | null
          concentration_unit: string | null
          concentration_volume: number | null
          concentration_volume_unit: string | null
          created_at: string
          id: string
          is_variable_quantity: boolean
          item_id: string
          multiplier: number | null
          procedure_kit_id: string
          quantity: number
          required: boolean
          unit: string
          updated_at: string
          variable_quantity_label: string | null
          variable_quantity_unit: string | null
        }
        Insert: {
          calculation_type?: string | null
          concentration_amount?: number | null
          concentration_unit?: string | null
          concentration_volume?: number | null
          concentration_volume_unit?: string | null
          created_at?: string
          id?: string
          is_variable_quantity?: boolean
          item_id: string
          multiplier?: number | null
          procedure_kit_id: string
          quantity?: number
          required?: boolean
          unit?: string
          updated_at?: string
          variable_quantity_label?: string | null
          variable_quantity_unit?: string | null
        }
        Update: {
          calculation_type?: string | null
          concentration_amount?: number | null
          concentration_unit?: string | null
          concentration_volume?: number | null
          concentration_volume_unit?: string | null
          created_at?: string
          id?: string
          is_variable_quantity?: boolean
          item_id?: string
          multiplier?: number | null
          procedure_kit_id?: string
          quantity?: number
          required?: boolean
          unit?: string
          updated_at?: string
          variable_quantity_label?: string | null
          variable_quantity_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procedure_kit_components_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedure_kit_components_procedure_kit_id_fkey"
            columns: ["procedure_kit_id"]
            isOneToOne: false
            referencedRelation: "procedure_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      procedure_kits: {
        Row: {
          active: boolean
          category_id: string | null
          created_at: string
          default_location_id: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          default_location_id?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          default_location_id?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "procedure_kits_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedure_kits_default_location_id_fkey"
            columns: ["default_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      procedure_mappings: {
        Row: {
          active: boolean
          created_at: string
          external_code: string
          external_description: string | null
          id: string
          procedure_kit_id: string
          source_system: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          external_code: string
          external_description?: string | null
          id?: string
          procedure_kit_id: string
          source_system: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          external_code?: string
          external_description?: string | null
          id?: string
          procedure_kit_id?: string
          source_system?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "procedure_mappings_procedure_kit_id_fkey"
            columns: ["procedure_kit_id"]
            isOneToOne: false
            referencedRelation: "procedure_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      reorder_suggestion_actions: {
        Row: {
          action: Database["public"]["Enums"]["reorder_suggestion_action"]
          created_at: string
          created_by: string
          dismissed_until: string | null
          id: string
          item_id: string
          location_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["reorder_suggestion_action"]
          created_at?: string
          created_by: string
          dismissed_until?: string | null
          id?: string
          item_id: string
          location_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["reorder_suggestion_action"]
          created_at?: string
          created_by?: string
          dismissed_until?: string | null
          id?: string
          item_id?: string
          location_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reorder_suggestion_actions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reorder_suggestion_actions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reorder_suggestion_actions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      units_of_measure: {
        Row: {
          abbreviation: string
          active: boolean
          id: string
          name: string
        }
        Insert: {
          abbreviation: string
          active?: boolean
          id?: string
          name: string
        }
        Update: {
          abbreviation?: string
          active?: boolean
          id?: string
          name?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          active: boolean
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      activity_feed: {
        Row: {
          actor_id: string | null
          actor_name: string | null
          description: string | null
          entity_id: string | null
          entity_type: string | null
          event_type: string | null
          id: string | null
          metadata: Json | null
          module: Database["public"]["Enums"]["activity_module"] | null
          occurred_at: string | null
          severity: Database["public"]["Enums"]["activity_severity"] | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_lot_stock: {
        Row: {
          category_id: string | null
          category_name: string | null
          days_until_expiration: number | null
          expiration_date: string | null
          expiration_warning_days: number | null
          internal_sku: string | null
          item_id: string | null
          item_name: string | null
          location_id: string | null
          location_name: string | null
          lot_id: string | null
          lot_number: string | null
          quantity_on_hand: number | null
          received_date: string | null
          room: string | null
          status: Database["public"]["Enums"]["lot_status"] | null
          unit_abbreviation: string | null
          vendor_id: string | null
          vendor_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_lots_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_lots_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_on_hand: {
        Row: {
          item_id: string | null
          location_id: string | null
          quantity_on_hand: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items_below_reorder_point"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_transactions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transaction_history: {
        Row: {
          cabinet: string | null
          created_at: string | null
          id: string | null
          internal_sku: string | null
          item_id: string | null
          item_name: string | null
          location_id: string | null
          location_name: string | null
          occurred_at: string | null
          performed_by: string | null
          performed_by_name: string | null
          quantity: number | null
          reason_code: Database["public"]["Enums"]["reason_code"] | null
          room: string | null
          transaction_date: string | null
          transaction_group_id: string | null
          transaction_type:
            | Database["public"]["Enums"]["transaction_type"]
            | null
          unit_abbreviation: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items_below_reorder_point"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_transactions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      items_stock_status: {
        Row: {
          item_id: string | null
          item_name: string | null
          internal_sku: string | null
          unit_abbreviation: string | null
          reorder_point: number | null
          par_level: number | null
          total_on_hand: number | null
          suggested_order_quantity: number | null
        }
        Relationships: [
          {
            foreignKeyName: "items_unit_of_measure_id_fkey"
            columns: ["unit_of_measure_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
        ]
      }
      items_below_reorder_point: {
        Row: {
          category_id: string | null
          category_name: string | null
          internal_sku: string | null
          item_id: string | null
          item_name: string | null
          par_level: number | null
          preferred_vendor_id: string | null
          quantity_needed: number | null
          reorder_point: number | null
          suggested_order_quantity: number | null
          total_on_hand: number | null
          unit_abbreviation: string | null
          unit_name: string | null
          unit_of_measure_id: string | null
          vendor_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_preferred_vendor_id_fkey"
            columns: ["preferred_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_unit_of_measure_id_fkey"
            columns: ["unit_of_measure_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
        ]
      }
      recent_inventory_transactions: {
        Row: {
          cabinet: string | null
          created_at: string | null
          id: string | null
          internal_sku: string | null
          item_id: string | null
          item_name: string | null
          location_id: string | null
          location_name: string | null
          occurred_at: string | null
          performed_by: string | null
          quantity: number | null
          reason_code: Database["public"]["Enums"]["reason_code"] | null
          room: string | null
          transaction_date: string | null
          transaction_group_id: string | null
          transaction_type:
            | Database["public"]["Enums"]["transaction_type"]
            | null
          unit_abbreviation: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items_below_reorder_point"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "inventory_transactions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      adjust_inventory: {
        Args: {
          p_increase: boolean
          p_item_id: string
          p_location_id: string
          p_quantity: number
          p_reason_code: Database["public"]["Enums"]["reason_code"]
          p_transaction_date?: string
        }
        Returns: string
      }
      assert_active_item: { Args: { p_item_id: string }; Returns: undefined }
      create_imaging_order: {
        Args: {
          p_patient_reference: string
          p_ordering_provider: string
          p_imaging_type: string
          p_imaging_location?: string | null
          p_date_ordered?: string | null
          p_appointment_date?: string | null
          p_appointment_time?: string | null
          p_status?: Database["public"]["Enums"]["imaging_status"]
          p_authorization_status?: Database["public"]["Enums"]["imaging_authorization_status"]
          p_authorization_number?: string | null
          p_notes?: string | null
        }
        Returns: string
      }
      update_imaging_order: {
        Args: {
          p_id: string
          p_patient_reference: string
          p_ordering_provider: string
          p_imaging_type: string
          p_imaging_location?: string | null
          p_date_ordered?: string | null
          p_appointment_date?: string | null
          p_appointment_time?: string | null
          p_status?: Database["public"]["Enums"]["imaging_status"]
          p_authorization_status?: Database["public"]["Enums"]["imaging_authorization_status"]
          p_authorization_number?: string | null
          p_notes?: string | null
        }
        Returns: string
      }
      set_imaging_order_status: {
        Args: {
          p_id: string
          p_status: Database["public"]["Enums"]["imaging_status"]
        }
        Returns: string
      }
      set_imaging_authorization: {
        Args: {
          p_id: string
          p_authorization_status: Database["public"]["Enums"]["imaging_authorization_status"]
          p_authorization_number?: string | null
        }
        Returns: string
      }
      record_activity: {
        Args: {
          p_module: Database["public"]["Enums"]["activity_module"]
          p_event_type: string
          p_title: string
          p_entity_type?: string | null
          p_entity_id?: string | null
          p_description?: string | null
          p_severity?: Database["public"]["Enums"]["activity_severity"]
          p_metadata?: Json | null
        }
        Returns: string
      }
      assert_active_location: {
        Args: { p_location_id: string }
        Returns: undefined
      }
      cancel_physical_count: {
        Args: { p_physical_count_id: string }
        Returns: undefined
      }
      complete_physical_count: {
        Args: { p_physical_count_id: string }
        Returns: Json
      }
      adjust_lot: {
        Args: {
          p_increase: boolean
          p_lot_id: string
          p_quantity: number
          p_reason_code: Database["public"]["Enums"]["reason_code"]
          p_transaction_date?: string
        }
        Returns: string
      }
      consume_inventory: {
        Args: {
          p_allow_expired?: boolean
          p_item_id: string
          p_location_id: string
          p_lot_id?: string
          p_quantity: number
          p_reason_code: Database["public"]["Enums"]["reason_code"]
          p_transaction_date?: string
        }
        Returns: Json
      }
      dispense_kit: {
        Args: {
          p_administered_amounts?: Json
          p_allow_expired?: boolean
          p_external_event_id?: string
          p_external_source?: string
          p_idempotency_key?: string
          p_location_id: string
          p_notes?: string
          p_performed_at?: string
          p_procedure_kit_id: string
          p_source?: Database["public"]["Enums"]["dispense_event_source"]
        }
        Returns: Json
      }
      dispose_lot: {
        Args: {
          p_lot_id: string
          p_quantity?: number
          p_reason_code?: Database["public"]["Enums"]["reason_code"]
        }
        Returns: Json
      }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_active_user: { Args: never; Returns: boolean }
      receive_inventory: {
        Args: {
          p_expiration_date?: string
          p_item_id: string
          p_location_id: string
          p_lot_number?: string
          p_quantity: number
          p_reason_code: Database["public"]["Enums"]["reason_code"]
          p_transaction_date?: string
          p_vendor_id?: string
        }
        Returns: string
      }
      require_roles: {
        Args: { p_roles: Database["public"]["Enums"]["user_role"][] }
        Returns: undefined
      }
      start_physical_count: { Args: { p_location_id: string }; Returns: string }
      transfer_inventory: {
        Args: {
          p_from_location_id: string
          p_item_id: string
          p_quantity: number
          p_to_location_id: string
          p_transaction_date?: string
        }
        Returns: Json
      }
      upsert_physical_count_line: {
        Args: {
          p_counted_quantity: number
          p_item_id: string
          p_physical_count_id: string
        }
        Returns: string
      }
      upsert_physical_count_line_lot: {
        Args: {
          p_counted_quantity: number
          p_inventory_lot_id: string
          p_item_id: string
          p_physical_count_id: string
        }
        Returns: string
      }
    }
    Enums: {
      activity_module:
        | "inventory"
        | "expiration"
        | "vendors"
        | "purchasing"
        | "imaging"
        | "counts"
        | "system"
      activity_severity: "info" | "success" | "warning" | "critical"
      dispense_event_source: "manual" | "emr" | "import" | "api"
      imaging_authorization_status:
        | "not_required"
        | "required"
        | "pending"
        | "approved"
        | "denied"
      imaging_status:
        | "ordered"
        | "scheduled"
        | "completed"
        | "results_received"
        | "cancelled"
      lot_status: "active" | "expiring_soon" | "expired" | "depleted"
      physical_count_status: "in_progress" | "completed" | "cancelled"
      purchase_order_draft_status: "draft" | "submitted" | "approved" | "ordered" | "cancelled"
      reorder_suggestion_action: "dismissed" | "reviewed"
      reason_code:
        | "vendor_delivery"
        | "internal_restock"
        | "initial_stock"
        | "clinic_use"
        | "expired_disposal"
        | "damaged_disposal"
        | "location_transfer"
        | "found_stock"
        | "data_correction_increase"
        | "damaged_stock"
        | "data_correction_decrease"
        | "shrinkage"
        | "count_surplus"
        | "count_shortage"
      transaction_type:
        | "RECEIVE"
        | "CONSUME"
        | "TRANSFER_IN"
        | "TRANSFER_OUT"
        | "ADJUSTMENT_INCREASE"
        | "ADJUSTMENT_DECREASE"
        | "PHYSICAL_COUNT_CORRECTION"
      user_role: "administrator" | "inventory_manager" | "staff" | "read_only"
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
      dispense_event_source: ["manual", "emr", "import", "api"],
      lot_status: ["active", "expiring_soon", "expired", "depleted"],
      physical_count_status: ["in_progress", "completed", "cancelled"],
      purchase_order_draft_status: ["draft", "submitted", "approved", "ordered", "cancelled"],
      reorder_suggestion_action: ["dismissed", "reviewed"],
      reason_code: [
        "vendor_delivery",
        "internal_restock",
        "initial_stock",
        "clinic_use",
        "expired_disposal",
        "damaged_disposal",
        "location_transfer",
        "found_stock",
        "data_correction_increase",
        "damaged_stock",
        "data_correction_decrease",
        "shrinkage",
        "count_surplus",
        "count_shortage",
      ],
      transaction_type: [
        "RECEIVE",
        "CONSUME",
        "TRANSFER_IN",
        "TRANSFER_OUT",
        "ADJUSTMENT_INCREASE",
        "ADJUSTMENT_DECREASE",
        "PHYSICAL_COUNT_CORRECTION",
      ],
      user_role: ["administrator", "inventory_manager", "staff", "read_only"],
    },
  },
} as const

