// 손으로 작성한 초기 버전 — Supabase 프로젝트 연결 후
// `npm run db:types`로 재생성해서 덮어쓸 것. 수동 편집 금지.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          notes: string | null;
          due_date: string | null;
          planned_for: string | null;
          priority: number;
          completed_at: string | null;
          created_at: string;
          goal_id: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string;
          title: string;
          notes?: string | null;
          due_date?: string | null;
          planned_for?: string | null;
          priority?: number;
          completed_at?: string | null;
          created_at?: string;
          goal_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          notes?: string | null;
          due_date?: string | null;
          planned_for?: string | null;
          priority?: number;
          completed_at?: string | null;
          created_at?: string;
          goal_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_goal_id_fkey";
            columns: ["goal_id"];
            isOneToOne: false;
            referencedRelation: "goals";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_logs: {
        Row: {
          id: string;
          user_id: string;
          log_date: string;
          focus: string | null;
          planned_at: string | null;
          reflection: string | null;
          reviewed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string;
          log_date: string;
          focus?: string | null;
          planned_at?: string | null;
          reflection?: string | null;
          reviewed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          log_date?: string;
          focus?: string | null;
          planned_at?: string | null;
          reflection?: string | null;
          reviewed_at?: string | null;
        };
        Relationships: [];
      };
      ai_sessions: {
        Row: {
          id: string;
          user_id: string;
          tool: string;
          intent: string;
          expected_outcome: string | null;
          started_at: string;
          ended_at: string | null;
          result: string | null;
          outcome: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string;
          tool: string;
          intent: string;
          expected_outcome?: string | null;
          started_at?: string;
          ended_at?: string | null;
          result?: string | null;
          outcome?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          tool?: string;
          intent?: string;
          expected_outcome?: string | null;
          started_at?: string;
          ended_at?: string | null;
          result?: string | null;
          outcome?: string | null;
        };
        Relationships: [];
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          category: string | null;
          target_date: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          title: string;
          description?: string | null;
          category?: string | null;
          target_date?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          category?: string | null;
          target_date?: string | null;
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      reminder_prefs: {
        Row: {
          user_id: string;
          morning_time: string | null;
          evening_time: string | null;
          last_morning: string | null;
          last_evening: string | null;
          updated_at: string;
        };
        Insert: {
          user_id?: string;
          morning_time?: string | null;
          evening_time?: string | null;
          last_morning?: string | null;
          last_evening?: string | null;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          morning_time?: string | null;
          evening_time?: string | null;
          last_morning?: string | null;
          last_evening?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      milestones: {
        Row: {
          id: string;
          user_id: string;
          goal_id: string;
          title: string;
          due_date: string | null;
          completed_at: string | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          user_id?: string;
          goal_id: string;
          title: string;
          due_date?: string | null;
          completed_at?: string | null;
          sort_order?: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          goal_id?: string;
          title?: string;
          due_date?: string | null;
          completed_at?: string | null;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "milestones_goal_id_fkey";
            columns: ["goal_id"];
            isOneToOne: false;
            referencedRelation: "goals";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
