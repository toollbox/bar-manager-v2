export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "ingredients": {
                  Row: {
                    "base_unit": Database["public"]['Enums']["base_unit"],"category": string,"created_at": string,"id": string,"is_active": boolean,"name": string,"organization_id": string,"updated_at": string
                  }
                  Insert: {
                    "base_unit": Database["public"]['Enums']["base_unit"],"category": string,"created_at"?: string,"id"?: string,"is_active"?: boolean,"name": string,"organization_id": string,"updated_at"?: string
                  }
                  Update: {
                    "base_unit"?: Database["public"]['Enums']["base_unit"],"category"?: string,"created_at"?: string,"id"?: string,"is_active"?: boolean,"name"?: string,"organization_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ingredients_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"inventory_balances": {
                  Row: {
                    "inventory_product_id": string,"location_id": string,"quantity": number,"updated_at": string
                  }
                  Insert: {
                    "inventory_product_id": string,"location_id": string,"quantity"?: number,"updated_at"?: string
                  }
                  Update: {
                    "inventory_product_id"?: string,"location_id"?: string,"quantity"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "inventory_balances_inventory_product_id_fkey"
      columns: ["inventory_product_id"]
isOneToOne: false
      referencedRelation: "inventory_products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_balances_location_id_fkey"
      columns: ["location_id"]
isOneToOne: false
      referencedRelation: "locations"
      referencedColumns: ["id"]
    }
                  ]
                },"inventory_movements": {
                  Row: {
                    "created_at": string,"id": string,"inventory_product_id": string,"location_id": string,"movement_type": Database["public"]['Enums']["inventory_movement_type"],"notes": string | null,"organization_id": string,"performed_by": string,"quantity_delta": number,"reference_id": string | null,"reference_type": string | null,"unit_cost": number | null
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"inventory_product_id": string,"location_id": string,"movement_type": Database["public"]['Enums']["inventory_movement_type"],"notes"?: string | null,"organization_id": string,"performed_by"?: string,"quantity_delta": number,"reference_id"?: string | null,"reference_type"?: string | null,"unit_cost"?: number | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"inventory_product_id"?: string,"location_id"?: string,"movement_type"?: Database["public"]['Enums']["inventory_movement_type"],"notes"?: string | null,"organization_id"?: string,"performed_by"?: string,"quantity_delta"?: number,"reference_id"?: string | null,"reference_type"?: string | null,"unit_cost"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "inventory_movements_inventory_product_id_fkey"
      columns: ["inventory_product_id"]
isOneToOne: false
      referencedRelation: "inventory_products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_movements_location_id_fkey"
      columns: ["location_id"]
isOneToOne: false
      referencedRelation: "locations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_movements_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"inventory_products": {
                  Row: {
                    "barcode": string | null,"bottle_size": number | null,"brand": string,"created_at": string,"default_cost": number | null,"id": string,"ingredient_id": string,"is_active": boolean,"name": string,"organization_id": string,"sku": string | null,"updated_at": string,"variant": string | null
                  }
                  Insert: {
                    "barcode"?: string | null,"bottle_size"?: number | null,"brand": string,"created_at"?: string,"default_cost"?: number | null,"id"?: string,"ingredient_id": string,"is_active"?: boolean,"name": string,"organization_id": string,"sku"?: string | null,"updated_at"?: string,"variant"?: string | null
                  }
                  Update: {
                    "barcode"?: string | null,"bottle_size"?: number | null,"brand"?: string,"created_at"?: string,"default_cost"?: number | null,"id"?: string,"ingredient_id"?: string,"is_active"?: boolean,"name"?: string,"organization_id"?: string,"sku"?: string | null,"updated_at"?: string,"variant"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "inventory_products_ingredient_id_fkey"
      columns: ["ingredient_id"]
isOneToOne: false
      referencedRelation: "ingredients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_products_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"location_ingredient_defaults": {
                  Row: {
                    "ingredient_id": string,"inventory_product_id": string,"location_id": string,"updated_at": string
                  }
                  Insert: {
                    "ingredient_id": string,"inventory_product_id": string,"location_id": string,"updated_at"?: string
                  }
                  Update: {
                    "ingredient_id"?: string,"inventory_product_id"?: string,"location_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "location_ingredient_defaults_ingredient_id_fkey"
      columns: ["ingredient_id"]
isOneToOne: false
      referencedRelation: "ingredients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "location_ingredient_defaults_inventory_product_id_fkey"
      columns: ["inventory_product_id"]
isOneToOne: false
      referencedRelation: "inventory_products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "location_ingredient_defaults_location_id_fkey"
      columns: ["location_id"]
isOneToOne: false
      referencedRelation: "locations"
      referencedColumns: ["id"]
    }
                  ]
                },"location_products": {
                  Row: {
                    "inventory_product_id": string,"is_available": boolean,"location_id": string,"reorder_point": number,"target_stock": number,"updated_at": string
                  }
                  Insert: {
                    "inventory_product_id": string,"is_available"?: boolean,"location_id": string,"reorder_point"?: number,"target_stock"?: number,"updated_at"?: string
                  }
                  Update: {
                    "inventory_product_id"?: string,"is_available"?: boolean,"location_id"?: string,"reorder_point"?: number,"target_stock"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "location_products_inventory_product_id_fkey"
      columns: ["inventory_product_id"]
isOneToOne: false
      referencedRelation: "inventory_products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "location_products_location_id_fkey"
      columns: ["location_id"]
isOneToOne: false
      referencedRelation: "locations"
      referencedColumns: ["id"]
    }
                  ]
                },"locations": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"organization_id": string,"timezone": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"organization_id": string,"timezone"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"organization_id"?: string,"timezone"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "locations_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"organization_members": {
                  Row: {
                    "created_at": string,"organization_id": string,"role": Database["public"]['Enums']["app_role"],"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"organization_id": string,"role": Database["public"]['Enums']["app_role"],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"organization_id"?: string,"role"?: Database["public"]['Enums']["app_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "organization_members_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"organizations": {
                  Row: {
                    "created_at": string,"id": string,"name": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "create_organization":
{ Args: { "first_location_name": string,"location_timezone"?: string,"organization_name": string }; Returns: string
                           },
"has_organization_role":
{ Args: { "allowed_roles": (Database["public"]['Enums']["app_role"])[],"target_organization_id": string }; Returns: boolean
                           },
"is_organization_member":
{ Args: { "target_organization_id": string }; Returns: boolean
                           }
          }
          Enums: {
            "app_role": "owner"|"manager"|"bartender","base_unit": "ml"|"g"|"each","inventory_movement_type": "opening_balance"|"purchase"|"drink_production"|"waste"|"spill"|"correction"|"transfer_in"|"transfer_out"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "app_role": ["owner", "manager", "bartender"],"base_unit": ["ml", "g", "each"],"inventory_movement_type": ["opening_balance", "purchase", "drink_production", "waste", "spill", "correction", "transfer_in", "transfer_out"]
          }
        }
} as const

