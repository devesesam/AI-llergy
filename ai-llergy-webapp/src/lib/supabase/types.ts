export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      venues: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          created_at?: string
        }
      }
      venue_members: {
        Row: {
          id: string
          user_id: string
          venue_id: string
          role: 'owner' | 'admin' | 'editor'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          venue_id: string
          role?: 'owner' | 'admin' | 'editor'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          venue_id?: string
          role?: 'owner' | 'admin' | 'editor'
          created_at?: string
        }
      }
      menu_items: {
        Row: {
          id: string
          venue_id: string
          name: string
          description: string | null
          price: number | null
          ingredients: string | null
          allergen_profile: Json
          allergen_confidence: Json  // Pre-computed confidence scores per allergen
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          venue_id: string
          name: string
          description?: string | null
          price?: number | null
          ingredients?: string | null
          allergen_profile?: Json
          allergen_confidence?: Json
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          venue_id?: string
          name?: string
          description?: string | null
          price?: number | null
          ingredients?: string | null
          allergen_profile?: Json
          allergen_confidence?: Json
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      venue_cross_contamination: {
        Row: {
          id: string
          venue_id: string
          allergen_id: string
          risk_level: 'none' | 'low' | 'medium' | 'high'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          venue_id: string
          allergen_id: string
          risk_level?: 'none' | 'low' | 'medium' | 'high'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          venue_id?: string
          allergen_id?: string
          risk_level?: 'none' | 'low' | 'medium' | 'high'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      join_venue_by_code: {
        Args: { code: string }
        Returns: {
          success?: boolean
          error?: string
          venue_id?: string
          venue_name?: string
        }
      }
      create_venue: {
        Args: { venue_name: string; venue_slug: string }
        Returns: {
          success?: boolean
          error?: string
          venue_id?: string
          invite_code?: string
        }
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types for easier use
export type Venue = Database['public']['Tables']['venues']['Row']
export type VenueInsert = Database['public']['Tables']['venues']['Insert']
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type VenueMember = Database['public']['Tables']['venue_members']['Row']
export type MenuItem = Database['public']['Tables']['menu_items']['Row']
export type MenuItemInsert = Database['public']['Tables']['menu_items']['Insert']
export type MenuItemUpdate = Database['public']['Tables']['menu_items']['Update']

// Cross-contamination types
export type VenueCrossContamination = Database['public']['Tables']['venue_cross_contamination']['Row']
export type VenueCrossContaminationInsert = Database['public']['Tables']['venue_cross_contamination']['Insert']
export type CrossContaminationRiskLevel = 'none' | 'low' | 'medium' | 'high'

// Allergen profile type
export interface AllergenProfile {
  dairy_free?: boolean
  gluten_free?: boolean
  nut_free?: boolean
  vegan?: boolean
  vegetarian?: boolean
  soy_free?: boolean
  sesame_free?: boolean
  shellfish_free?: boolean
  fish_free?: boolean
  egg_free?: boolean
  [key: string]: boolean | undefined
}

// Allergen confidence map (pre-computed scores per allergen)
export interface AllergenConfidenceMap {
  [allergenId: string]: number  // 0-1 confidence score
}
