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
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: 'profiles_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'employees_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'shifts_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'shifts_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'availability_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
      }
      time_entries: {
        Row: {
          id: string
          employee_id: string
          shift_id: string | null
          clock_in: string
          clock_out: string | null
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          shift_id?: string | null
          clock_in?: string
          clock_out?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          shift_id?: string | null
          clock_in?: string
          clock_out?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'time_entries_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'time_entries_shift_id_fkey'
            columns: ['shift_id']
            isOneToOne: false
            referencedRelation: 'shifts'
            referencedColumns: ['id']
          },
        ]
      }
      time_off_requests: {
        Row: {
          id: string
          employee_id: string
          start_date: string
          end_date: string
          reason: string
          status: 'pending' | 'approved' | 'rejected'
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          start_date: string
          end_date: string
          reason: string
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          start_date?: string
          end_date?: string
          reason?: string
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'time_off_requests_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
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
