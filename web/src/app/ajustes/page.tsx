/* ============================================================================
   Organizer · FD4 · Ajustes
   Centro de control de configuración y preferencias del usuario.
   ========================================================================= */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { DEFAULT_TIMEZONE } from '@/lib/profile';
import { getTodayString } from '@/lib/date-utils';
import { TabBar } from '@/components/fd4/TabBar';
import { DeskSidebar } from '@/components/fd4/DeskSidebar';
import { Icon } from '@/components/Icon';
import { Setup } from '../Setup';
import { signOutAction } from './actions';

export const metadata: Metadata = { title: 'Ajustes · Organizer' };

export const dynamic = 'force-dynamic';

export default async function AjustesPage() {
  if (!isSupabaseConfigured()) return <Setup />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/entrar');

  const { data: profile } = await supabase
    .from('profiles')
    .select('timezone, notify_morning, notify_evening')
    .eq('id', user.id)
    .maybeSingle();

  const timezone = profile?.timezone ?? DEFAULT_TIMEZONE;
  const todayStr = getTodayString(timezone);

  return (
    <div className="fd-app">
      <DeskSidebar active="ajustes" todayStr={todayStr} />

      <main className="fd-screen fd-ajustes">
        <div className="calhead">
          <Link href="/" prefetch={true} className="uplevel">
            <Icon name="chevron-left" size="sm" />
            Inicio
          </Link>
        </div>

        <header className="fd-home__head" style={{ paddingBottom: '16px' }}>
          <div className="fd-home__date">
            <h1 className="fd-h1 fd-h1--screen">Ajustes</h1>
            <span className="fd-sub">Preferencias, automatizaciones y horario</span>
          </div>
        </header>

        <div className="fd-sections">
          {/* 1. Flujos y automatizaciones */}
          <section>
            <div className="fd-seclabel">
              <h2>Automatizaciones y avisos</h2>
            </div>

            <div className="fd-card">
              <div className="fd-card__body">
                <Link href="/ajustes/notificaciones" className="fd-more">
                  <div>
                    <span style={{ color: 'var(--text)', fontWeight: 600, display: 'block' }}>
                      Notificaciones Web Push
                    </span>
                    <span className="fd-sub" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      Mañana ({profile?.notify_morning?.slice(0, 5) ?? '08:00'}), noche y estado del teléfono
                    </span>
                  </div>
                  <span className="fd-more__chev" aria-hidden>›</span>
                </Link>

                <Link href="/atajo" className="fd-more">
                  <div>
                    <span style={{ color: 'var(--text)', fontWeight: 600, display: 'block' }}>
                      Atajo de Siri y captura rápida
                    </span>
                    <span className="fd-sub" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      Comando &ldquo;Oye Siri, anota&rdquo; y botón de pantalla de bloqueo
                    </span>
                  </div>
                  <span className="fd-more__chev" aria-hidden>›</span>
                </Link>
              </div>
            </div>
          </section>

          {/* 2. Universidad y Horario */}
          <section>
            <div className="fd-seclabel">
              <h2>Universidad</h2>
            </div>

            <div className="fd-card">
              <div className="fd-card__body">
                <Link href="/horario" className="fd-more">
                  <div>
                    <span style={{ color: 'var(--text)', fontWeight: 600, display: 'block' }}>
                      Horario del semestre
                    </span>
                    <span className="fd-sub" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      Materias, aulas y bloques semanales fijos
                    </span>
                  </div>
                  <span className="fd-more__chev" aria-hidden>›</span>
                </Link>
              </div>
            </div>
          </section>

          {/* 3. Cuenta y zona horaria */}
          <section>
            <div className="fd-seclabel fd-seclabel--quiet">
              <h2>Cuenta y sistema</h2>
            </div>

            <div className="fd-card fd-card--sunken">
              <div className="fd-card__body" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Usuario</span>
                  <span style={{ color: 'var(--text)', fontWeight: 500 }}>{user.email}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Zona horaria</span>
                  <span style={{ color: 'var(--text)', fontWeight: 500 }}>{timezone}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Modo</span>
                  <span style={{ color: 'var(--text)', fontWeight: 500 }}>PWA Standalone (iOS)</span>
                </div>
              </div>
            </div>

            <form action={signOutAction} style={{ marginTop: 12 }}>
              <button type="submit" className="fd-btn fd-btn--ghost pl-signout">
                Cerrar sesión
              </button>
            </form>
          </section>
        </div>
      </main>

      <TabBar />
    </div>
  );
}
