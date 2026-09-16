/* ============================================================================
   Organizer · Ajustes · Notificaciones

   La unica pantalla que F3 anade al producto, y la mas importante que hay
   hasta que exista el resto: hasta que el usuario pase por aqui una vez, la
   app no le habla — y "push, no pull" es la primera regla del proyecto.

   NOTA PARA F1 Y F2: esta ruta vive fuera de los cuatro modulos
   (`Inicio · Semana · Tareas · Recursos`, decision 30) porque no es un modulo:
   es un ajuste, y meter un quinto icono en la barra rompe un diseno aprobado.
   La barra de pestanas NO se toca. Lo que hace falta es que alguna pantalla
   enlace a `/ajustes/notificaciones`; ahora lo hace la pagina provisional de
   F0, que F1 va a reemplazar entera. Esta escrito en `docs/estado-F3.md`.
   ========================================================================= */

import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { Icon } from '@/components/Icon';
import { PushPanel } from './PushPanel';
import { TimesForm } from './TimesForm';

export const metadata: Metadata = { title: 'Notificaciones · Organizer' };

/* Lee cookies y consulta la base: nunca estatica. */
export const dynamic = 'force-dynamic';

/** `08:00:00` de Postgres → `08:00`, que es lo que quiere `<input type="time">`. */
function toInputTime(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  return value.slice(0, 5);
}

export default async function NotificationsSettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('notify_morning, notify_evening, notify_weekly_dow, notify_weekly_time, timezone')
    .eq('id', user?.id ?? '')
    .maybeSingle();

  /* Solo las vivas: una marcada con `failed_at` es un telefono que ya no
     existe y contarla diria que todo va bien cuando no llega nada. */
  const { count } = await supabase
    .from('push_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user?.id ?? '')
    .is('failed_at', null);

  return (
    <main className="screen">
      <div className="calhead">
        <Link href="/" className="uplevel">
          <Icon name="chevron-left" size="sm" />
          Organizer
        </Link>
      </div>

      <header className="pagehead">
        <h1 className="t-title">Notificaciones</h1>
      </header>

      <p className="gutter t-meta c-muted">
        Una al día, con tu día dentro. Para leerla desde la pantalla de bloqueo
        sin abrir nada.
      </p>

      <h2 className="sectionhead" style={{ marginTop: 'var(--space-6)' }}>
        Este teléfono
      </h2>
      <PushPanel
        vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''}
        storedCount={count ?? 0}
      />

      <h2 className="sectionhead" style={{ marginTop: 'var(--space-8)' }}>
        Cuándo te hablo
      </h2>
      {profile ? (
        <TimesForm
          morning={toInputTime(profile.notify_morning, '08:00')}
          evening={toInputTime(profile.notify_evening, '21:00')}
          weeklyTime={toInputTime(profile.notify_weekly_time, '19:00')}
          weeklyDow={profile.notify_weekly_dow ?? 0}
        />
      ) : (
        <p className="gutter t-meta c-muted">
          Falta tu fila en <code>profiles</code>. Vuelve a entrar desde /entrar.
        </p>
      )}

      <p className="gutter t-meta c-faint" style={{ marginTop: 'var(--space-3)' }}>
        Las horas son las tuyas: {profile?.timezone ?? 'America/Caracas'}.
      </p>

      {/* ------------------------------------------------ así se va a ver --
          Un recordatorio de para qué es todo esto. El texto de ejemplo es el
          del comp aprobado (`app/comps/notificacion.html`), con su largo real. */}
      <h2 className="sectionhead" style={{ marginTop: 'var(--space-8)' }}>
        Así se va a ver
      </h2>
      <div className="gutter">
        <div
          style={{
            background: 'var(--lock-bg)',
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius)',
          }}
        >
          <div className="notif" style={{ border: 0, background: 'rgb(255 255 255 / .11)' }}>
            <div className="notif__head">
              <span className="notif__icon">
                <span />
              </span>
              <span className="notif__app">Organizer</span>
              <span className="notif__when">ahora</span>
            </div>
            <p className="notif__title">Hoy, jueves 17</p>
            <p className="notif__body clamp2">
              8:00 Cálculo · 11:00 Álgebra · 15:00 Migrar el schema · 20:00 Resumen
            </p>
          </div>
        </div>
        <p className="t-meta c-muted" style={{ marginTop: 'var(--space-3)' }}>
          Si hay un parcial o una entrega cerca, se lleva el título y las tareas
          se recortan para que quepa.
        </p>
      </div>

      <div style={{ height: 'var(--space-16)' }} />
    </main>
  );
}
