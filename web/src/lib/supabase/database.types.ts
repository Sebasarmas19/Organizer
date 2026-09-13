/* ============================================================================
   Organizer · Tipos de la base de datos

   DERIVADO A MANO DE `docs/schema.sql`, no generado por la CLI de Supabase.
   La razon es simple: `supabase gen types` necesita el proyecto ya creado y
   credenciales, y esta fase se construyo sin ninguna de las dos cosas. El
   esquema lo ejecuta el usuario (ver `docs/estado-F0.md`).

   EN CUANTO EL ESQUEMA ESTE EN LINEA, ESTE ARCHIVO SE REGENERA:

     npx supabase login
     npx supabase gen types typescript --project-id <ref> --schema public \
       > src/lib/supabase/database.types.ts

   Hasta entonces, esto es una transcripcion fiel de `docs/schema.sql`, y si
   los dos se separan **manda el SQL**. Cada tabla lleva escrito de donde sale
   y, donde importa, por que esta asi.

   Convenciones de los tipos generados por Supabase, respetadas aqui:
     Row            lo que devuelve un select
     Insert         lo que acepta un insert (con defaults opcionales)
     Update         todo opcional
     Relationships  las claves foraneas, para los `select` anidados

   `Relationships: []` no es relleno: sin esa clave el tipo no encaja en
   `GenericTable` y postgrest-js degrada TODA la tabla a `never`, con errores
   como "Property 'timezone' does not exist on type 'never'". Se deja vacio
   porque en F0 no hay ningun select anidado; la CLI lo rellenara al
   regenerar.
   ========================================================================= */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/* ─────────────────────────────────────────────────────────────── enums ── */

/** `item_status` — el estado distingue bandeja, algun dia y tarea planificada. */
export type ItemStatus = 'inbox' | 'someday' | 'planned' | 'done' | 'dropped';

/** `block_status` */
export type BlockStatus = 'pending' | 'done' | 'missed' | 'rescheduled';

/** `block_source` — `template` son las materias materializadas. */
export type BlockSource = 'manual' | 'template';

/** `context_kind` — el contexto es texto, no color (decision 66). */
export type ContextKind = 'course' | 'project' | 'personal' | 'reading';

/** `resource_kind` */
export type ResourceKind = 'tool' | 'skill' | 'article' | 'video' | 'repo' | 'other';

export interface Database {
  public: {
    Tables: {
      /* ------------------------------------------------------- profiles --
         Una sola fila, la del usuario. `timezone` es 'America/Caracas'
         (decision 14): UTC-4 sin horario de verano. No usar
         'America/New_York', que hoy coincide y en noviembre no.            */
      profiles: {
        Row: {
          id: string;
          timezone: string;
          notify_morning: string;
          notify_evening: string;
          notify_weekly_dow: number;
          notify_weekly_time: string;
          streak_current: number;
          streak_best: number;
          grace_remaining: number;
          grace_reset_at: string;
          capture_token_hash: string | null;
          last_review_at: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          timezone?: string;
          notify_morning?: string;
          notify_evening?: string;
          notify_weekly_dow?: number;
          notify_weekly_time?: string;
          streak_current?: number;
          streak_best?: number;
          grace_remaining?: number;
          grace_reset_at?: string;
          capture_token_hash?: string | null;
          last_review_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };

      /* ------------------------------------------------------- contexts -- */
      contexts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          kind: ContextKind;
          color: string | null;
          archived_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          kind?: ContextKind;
          color?: string | null;
          archived_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['contexts']['Insert']>;
        Relationships: [];
      };

      /* ---------------------------------------------------------- items --
         Las TAREAS. Todo lo capturado vive aqui; el estado los diferencia.
         `reminder_id` es siempre opcional (decision 50): la mayoria de lo
         que entra por Siri no tendra reminder nunca, y esas tareas no son
         de segunda clase (decision 51).                                    */
      items: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          notes: string | null;
          status: ItemStatus;
          context_id: string | null;
          estimate_min: number | null;
          due_on: string | null;
          advance_notice_days: number | null;
          created_at: string;
          completed_at: string | null;
          dropped_at: string | null;
          reminder_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          notes?: string | null;
          status?: ItemStatus;
          context_id?: string | null;
          estimate_min?: number | null;
          due_on?: string | null;
          advance_notice_days?: number | null;
          created_at?: string;
          completed_at?: string | null;
          dropped_at?: string | null;
          reminder_id?: string | null;
        };
        Update: Partial<Database['public']['Tables']['items']['Insert']>;
        Relationships: [];
      };

      /* --------------------------------------------------------- blocks --
         El calendario. `item_id` es nulo en las materias, que llegan de
         plantilla. `title` esta denormalizado a proposito.                 */
      blocks: {
        Row: {
          id: string;
          user_id: string;
          item_id: string | null;
          template_id: string | null;
          title: string;
          context_id: string | null;
          starts_at: string;
          ends_at: string;
          status: BlockStatus;
          source: BlockSource;
          reminder_min: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          item_id?: string | null;
          template_id?: string | null;
          title: string;
          context_id?: string | null;
          starts_at: string;
          ends_at: string;
          status?: BlockStatus;
          source?: BlockSource;
          reminder_min?: number | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['blocks']['Insert']>;
        Relationships: [];
      };

      /* ---------------------------------------------- schedule_templates --
         Las MATERIAS. Hora local (`time`), no timestamp: una clase de los
         lunes a las 8:00 es a las 8:00 pase lo que pase con el UTC.        */
      schedule_templates: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          context_id: string | null;
          weekday: number;
          start_time: string;
          end_time: string;
          reminder_min: number | null;
          active_from: string;
          active_until: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          context_id?: string | null;
          weekday: number;
          start_time: string;
          end_time: string;
          reminder_min?: number | null;
          active_from?: string;
          active_until?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['schedule_templates']['Insert']>;
        Relationships: [];
      };

      /* ------------------------------------------------- weekly_reviews -- */
      weekly_reviews: {
        Row: {
          id: string;
          user_id: string;
          week_start: string;
          completed_at: string | null;
          items_planned: number;
          items_carried: number;
          items_dropped: number;
          ideas_promoted: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          week_start: string;
          completed_at?: string | null;
          items_planned?: number;
          items_carried?: number;
          items_dropped?: number;
          ideas_promoted?: number;
        };
        Update: Partial<Database['public']['Tables']['weekly_reviews']['Insert']>;
        Relationships: [];
      };

      /* ---------------------------------------------- push_subscriptions --
         `failed_at` se marca con un 404 o un 410: iOS invalida la
         suscripcion al reinstalar la PWA. Una notificacion que no llega y
         nadie nota es el peor fallo posible de este proyecto.              */
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent: string | null;
          created_at: string;
          last_seen_at: string;
          failed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent?: string | null;
          created_at?: string;
          last_seen_at?: string;
          failed_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['push_subscriptions']['Insert']>;
        Relationships: [];
      };

      /* ------------------------------------------------ notification_log --
         `dedupe_key` es unico. El cron corre cada 5 minutos; sin esa clave
         mandaria la misma notificacion doce veces por hora.                */
      notification_log: {
        Row: {
          id: string;
          user_id: string;
          kind: string;
          dedupe_key: string;
          payload: Json | null;
          sent_at: string;
          status: string;
          error: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          kind: string;
          dedupe_key: string;
          payload?: Json | null;
          sent_at?: string;
          status?: string;
          error?: string | null;
        };
        Update: Partial<Database['public']['Tables']['notification_log']['Insert']>;
        Relationships: [];
      };

      /* ------------------------------------------------------ resources --
         Modulo independiente (decision 20). `search` es una columna
         generada (tsvector): se lee, nunca se escribe.                     */
      resources: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          url: string | null;
          kind: ResourceKind;
          notes: string | null;
          tags: string[];
          archived_at: string | null;
          created_at: string;
          opened_at: string | null;
          open_count: number;
          /* columna generada (tsvector). Solo lectura: no va en Insert ni
             en Update. Verificado contra la base en linea. */
          search: unknown;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          url?: string | null;
          kind?: ResourceKind;
          notes?: string | null;
          tags?: string[];
          archived_at?: string | null;
          created_at?: string;
          opened_at?: string | null;
          open_count?: number;
        };
        Update: Partial<Database['public']['Tables']['resources']['Insert']>;
        Relationships: [];
      };

      /* ------------------------------------------------------ reminders --
         Parciales, entregas, defensas. NO tienen estado de completado
         (decision 49): el estado se deriva de `occurs_on`. `occurs_on` es
         obligatoria — sin fecha no es un reminder.                         */
      reminders: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          notes: string | null;
          context_id: string | null;
          occurs_on: string;
          occurs_at: string | null;
          notice_days: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          notes?: string | null;
          context_id?: string | null;
          occurs_on: string;
          occurs_at?: string | null;
          notice_days?: number | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['reminders']['Insert']>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      item_status: ItemStatus;
      block_status: BlockStatus;
      block_source: BlockSource;
      context_kind: ContextKind;
      resource_kind: ResourceKind;
    };
    CompositeTypes: { [_ in never]: never };
  };
}

/* Atajos para el resto de la app: `Row<'items'>` en vez del camino largo. */
type PublicTables = Database['public']['Tables'];
export type Row<T extends keyof PublicTables> = PublicTables[T]['Row'];
export type Insert<T extends keyof PublicTables> = PublicTables[T]['Insert'];
export type Update<T extends keyof PublicTables> = PublicTables[T]['Update'];

/* Las tres entidades del producto, con el nombre con el que se hablan en
   el equipo. `docs/08-modelo-tareas-reminders.md` las define. */
export type Task = Row<'items'>;
export type Reminder = Row<'reminders'>;
export type ClassTemplate = Row<'schedule_templates'>;
export type Profile = Row<'profiles'>;
