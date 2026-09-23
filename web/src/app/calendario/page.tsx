/* ============================================================================
   Organizer · FD4 · Calendario

   UN MODULO, TRES VISTAS. Mes, Semana y Dia dejaron de ser tres pestanas y
   pasaron a ser tres vistas conmutadas arriba. El motivo es de sitio y es
   duro: la barra de abajo aguanta cinco ranuras, una de ellas es capturar, y
   gastar tres de las cuatro restantes en el mismo calendario dejaria fuera a
   Pendientes o a Recursos.

   EL ESTADO VIVE EN LA URL: `?v=mes|semana|dia&d=YYYY-MM-DD`.

   No es una preferencia de estilo. Es lo que hace que:
     · el boton de atras del iPhone deshaga la navegacion del calendario
     · una notificacion pueda abrir un dia concreto con un enlace
     · la pagina se renderice entera en el servidor, sin estado de carga

   Si faltan los parametros, la vista arranca en SEMANA y en HOY. Semana
   porque es la altura desde la que se planifica, que es para lo que se abre
   el calendario a proposito; Dia es donde caes desde Inicio o desde una
   notificacion, y ahi el enlace ya trae la fecha.
   ========================================================================= */

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { DEFAULT_TIMEZONE } from '@/lib/profile';
import { getTodayString, parseDateString } from '@/lib/date-utils';
import {
  getDayView,
  getMonthView,
  getWeekView,
  type CalView,
} from '@/lib/fd4-calendar';
import { TabBar } from '@/components/fd4/TabBar';
import { DeskSidebar } from '@/components/fd4/DeskSidebar';
import { CalHeader } from '@/components/fd4/CalHeader';
import { MonthView } from '@/components/fd4/MonthView';
import { WeekView } from '@/components/fd4/WeekView';
import { DayView } from '@/components/fd4/DayView';
import { Setup } from '../Setup';

export const dynamic = 'force-dynamic';

/** Una fecha de la URL solo se acepta si es una fecha. */
function safeDate(raw: string | undefined, fallback: string): string {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return fallback;
  const { year, month, day } = parseDateString(raw);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 2000 || year > 2100) {
    return fallback;
  }
  return raw;
}

function safeView(raw: string | undefined): CalView {
  return raw === 'mes' || raw === 'dia' ? raw : 'semana';
}

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string; d?: string }>;
}) {
  if (!isSupabaseConfigured()) return <Setup />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return <Setup />;

  const [params, profileRes] = await Promise.all([
    searchParams,
    supabase
      .from('profiles')
      .select('timezone')
      .eq('id', user.id)
      .maybeSingle(),
  ]);

  const timezone = profileRes.data?.timezone ?? DEFAULT_TIMEZONE;
  const todayStr = getTodayString(timezone);

  const view = safeView(params.v);
  const dateStr = safeDate(params.d, todayStr);

  /* Solo se consulta la vista que se va a pintar. Las tres comparten
     cabecera, pero pedir mes + semana + dia en cada navegacion serian tres
     viajes a Supabase para tirar dos. */
  const { year, month } = parseDateString(dateStr);

  const [title, subtitle, body] = await (async (): Promise<
    [string, string, React.ReactNode]
  > => {
    if (view === 'mes') {
      const data = await getMonthView(supabase, user.id, year, month, dateStr, timezone);
      return [data.title, 'Toca un día para abrirlo', <MonthView key="m" data={data} />];
    }
    if (view === 'semana') {
      const data = await getWeekView(supabase, user.id, dateStr, timezone);
      return [data.title, 'Toca un día para abrirlo', <WeekView key="s" data={data} />];
    }
    const data = await getDayView(supabase, user.id, dateStr, timezone);
    return [data.title, data.sub, <DayView key="d" data={data} />];
  })();

  return (
    <div className="fd-app">
      <DeskSidebar
        active="calendario"
        todayStr={todayStr}
        selectedStr={dateStr}
        calView={view}
      />

      <main className="fd-screen fd-screen--split">
        <CalHeader
          view={view}
          dateStr={dateStr}
          todayStr={todayStr}
          title={title}
          subtitle={subtitle}
        />
        {body}
      </main>

      <TabBar />
    </div>
  );
}
