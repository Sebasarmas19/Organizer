'use client';

/* ============================================================================
   Organizer · Que la pantalla no se quede vieja

   Lo que entra por fuera de la app (Siri, el cron, otro dispositivo) no
   pasaba por React, así que la pantalla abierta no se enteraba hasta cerrar
   y volver a abrir. Dos vías:

   1. Al volver a primer plano (sales a Siri o a otra app y vuelves), se
      recargan los datos del servidor.
   2. Supabase Realtime: un cambio en tareas, reminders o bloques avisa al
      instante y se recarga. RLS aplica también aquí: solo llegan tus filas.

   `router.refresh()` vuelve a pedir los Server Components sin perder el
   estado del cliente ni el scroll. Se agrupan los avisos que llegan juntos.
   ========================================================================= */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const TABLES = ['items', 'reminders', 'blocks'] as const;
const DEBOUNCE_MS = 600;

export function LiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), DEBOUNCE_MS);
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refresh);
    window.addEventListener('pageshow', refresh);

    let supabase: ReturnType<typeof createClient> | null = null;
    let channel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null;
    try {
      supabase = createClient();
      channel = supabase.channel('organizer-live');
      for (const table of TABLES) {
        channel.on('postgres_changes', { event: '*', schema: 'public', table }, refresh);
      }
      channel.subscribe();
    } catch {
      /* Sin Realtime sigue valiendo la recarga al volver a primer plano. */
    }

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('pageshow', refresh);
      if (supabase && channel) void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
