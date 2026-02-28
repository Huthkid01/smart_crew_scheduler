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
      organizations: {
        Row: {
          id: string
          name: string
          subscription_tier: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          subscription_tier?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          subscription_tier?: string
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          org_id: string
          full_name: string | null
          role: 'admin' | 'manager' | 'employee'
          email: string
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          org_id: string
          full_name?: string | null
          role?: 'admin' | 'manager' | 'employee'
          email: string
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          full_name?: string | null
          role?: 'admin' | 'manager' | 'employee'
          email?: string
          avatar_url?: string | null
          created_at?: string
        }
      }
      employees: {
        Row: {
          id: string
          org_id: string
          name: string
          email: string
          position: string
          skills: string[]
          hourly_rate: number
          is_active: boolean
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          email: string
          position: string
          skills?: string[]
          hourly_rate?: number
          is_active?: boolean
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          email?: string
          position?: string
          skills?: string[]
          hourly_rate?: number
          is_active?: boolean
        }
      }
      shifts: {
        Row: {
          id: string
          org_id: string
          employee_id: string | null
          date: string
          start_time: string
          end_time: string
          break_minutes: number
          status: 'draft' | 'published' | 'completed'
        }
        Insert: {
          id?: string
          org_id: string
          employee_id?: string | null
          date: string
          start_time: string
          end_time: string
          break_minutes?: number
          status?: 'draft' | 'published' | 'completed'
        }
        Update: {
          id?: string
          org_id?: string
          employee_id?: string | null
          date?: string
          start_time?: string
          end_time?: string
          break_minutes?: number
          status?: 'draft' | 'published' | 'completed'
        }
      }
      availability: {
        Row: {
          id: string
          employee_id: string
          day_of_week: number
          is_available: boolean
          start_time: string | null
          end_time: string | null
        }
        Insert: {
          id?: string
          employee_id: string
          day_of_week: number
          is_available?: boolean
          start_time?: string | null
          end_time?: string | null
        }
        Update: {
          id?: string
          employee_id?: string
          day_of_week?: number
          is_available?: boolean
          start_time?: string | null
          end_time?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
