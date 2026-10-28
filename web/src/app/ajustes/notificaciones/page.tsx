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
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Icon } from '@/components/Icon';
import { TabBar } from '@/components/fd4/TabBar';
import { DeskSidebar } from '@/components/fd4/DeskSidebar';
import { getTodayString } from '@/lib/date-utils';
import { DEFAULT_TIMEZONE } from '@/lib/profile';
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

  if (!user) {
    redirect('/entrar');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('notify_morning, notify_evening, notify_weekly_dow, notify_weekly_time, notify_resources, timezone')
    .eq('id', user.id)
    .maybeSingle();

  const timezone = profile?.timezone ?? DEFAULT_TIMEZONE;

  /* Solo las vivas: una marcada con `failed_at` es un telefono que ya no
     existe y contarla diria que todo va bien cuando no llega nada. */
  const { count } = await supabase
    .from('push_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('failed_at', null);

  return (
    <div className="fd-app">
      <DeskSidebar active="ajustes" todayStr={getTodayString(timezone)} />

      <main className="fd-screen" style={{ paddingBottom: 'calc(var(--tab-bar-h) + var(--space-6))' }}>
        <div style={{ maxWidth: 540, margin: '0 auto', width: '100%', padding: '12px 16px 40px' }}>
          <div style={{ marginBottom: 12 }}>
            <Link href="/ajustes" className="pl-back" data-back="true">
              <Icon name="chevron-left" size="sm" />
              Ajustes
            </Link>
          </div>

          <header style={{ marginBottom: 16 }}>
            <h1 className="fd-h1" style={{ fontSize: 26, fontWeight: 700, margin: '0 0 6px' }}>Notificaciones</h1>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--io-label-2)', lineHeight: 1.4 }}>
              Una al día, con tu día dentro. Para leerla desde la pantalla de bloqueo sin abrir nada.
            </p>
          </header>

          <span className="io-form__label" style={{ margin: '20px 0 8px 4px', display: 'block' }}>
            Este teléfono
          </span>
          <PushPanel
            vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''}
            storedCount={count ?? 0}
          />

          <span className="io-form__label" style={{ margin: '24px 0 8px 4px', display: 'block' }}>
            Cuándo te hablo
          </span>
          {profile ? (
            <TimesForm
              morning={toInputTime(profile.notify_morning, '08:00')}
              evening={toInputTime(profile.notify_evening, '21:00')}
              weeklyTime={toInputTime(profile.notify_weekly_time, '19:00')}
              weeklyDow={profile.notify_weekly_dow ?? 0}
              resources={profile.notify_resources ?? true}
            />
          ) : (
            <p style={{ fontSize: 13, color: 'var(--io-label-2)' }}>
              Falta tu fila en <code>profiles</code>. Vuelve a entrar desde /entrar.
            </p>
          )}

          <p style={{ fontSize: 12, color: 'var(--io-label-3)', margin: '10px 4px 0' }}>
            Las horas corresponden a tu zona: {profile?.timezone ?? 'America/Caracas'}.
          </p>

          <span className="io-form__label" style={{ margin: '28px 0 8px 4px', display: 'block' }}>
            Así se va a ver
          </span>
          <div>
            <div
              style={{
                background: 'var(--lock-bg)',
                padding: '14px 16px',
                borderRadius: 16,
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
            <p style={{ fontSize: 12, color: 'var(--io-label-2)', marginTop: 8, padding: '0 4px' }}>
              Si hay un parcial o una entrega cerca, se lleva el título y las tareas se recortan para que quepa.
            </p>
          </div>
        </div>
      </main>

      <TabBar />
    </div>
  );
}
