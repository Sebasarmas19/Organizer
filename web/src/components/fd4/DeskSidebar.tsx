/* ============================================================================
   Organizer · FD4 · <DeskSidebar>  ·  la barra lateral de escritorio

   NO EXISTE EN EL TELEFONO. Se pinta siempre en el HTML, pero `fd4-desk.css`
   la mantiene en `display:none` por debajo de 900px. Es un puñado de enlaces
   de texto: pesa menos que la rama de JavaScript que haria falta para
   decidir si dibujarla, y el servidor no sabe el ancho de la ventana.

   POR QUE UNA BARRA LATERAL Y NO LA MISMA BARRA DE ABAJO MAS GRANDE

   En el telefono el pulgar llega abajo y no llega arriba, asi que la
   navegacion vive abajo. En escritorio no hay pulgar: hay un cursor que
   llega a todo y una pantalla apaisada donde el alto es el recurso escaso y
   el ancho sobra. Una barra inferior en un monitor gasta el recurso escaso
   para ahorrar el que sobra. Por eso la navegacion se pone de canto.

   Y al ponerse de canto cabe algo que abajo no cabia:

     · las tres vistas del calendario como sub-enlaces, sin entrar primero
     · un mini-mes para saltar a cualquier dia de un clic
     · la leyenda de colores, permanente en vez de escondida en Calendario

   Eso es exactamente para lo que el usuario dijo que usaria el escritorio:
   "solo para planificar sentado". Planificar es mirar varias semanas, no
   marcar una tarea.

   EL MINI-MES NO CONSULTA NADA. Es `getMonthGrid`, aritmetica de fechas pura.
   Los puntos de actividad viven en el Mes de verdad; ponerlos aqui costaria
   una consulta por pantalla para un adorno de 11px.
   ========================================================================= */

import Link from 'next/link';
import { getMonthGrid, MONTH_NAMES_CAP_ES, parseDateString } from '@/lib/date-utils';
import { DOW_INITIALS } from '@/lib/fd4-calendar';
import { Dot } from './Marks';
import { TabIcon } from './TabIcon';

/** Que enlace de la barra se enciende, segun la pantalla que te trajo. */
export type DeskNav = 'inicio' | 'calendario' | 'pendientes' | 'recursos';

export function DeskSidebar({
  active,
  todayStr,
  /** La fecha que mira el calendario, para que el mini-mes la resalte. */
  selectedStr,
  /** Que vista del calendario esta abierta, si es que hay alguna. */
  calView,
}: {
  active: DeskNav;
  todayStr: string;
  selectedStr?: string;
  calView?: 'mes' | 'semana' | 'dia';
}) {
  const anchor = selectedStr ?? todayStr;
  const { year, month } = parseDateString(anchor);
  const cells = getMonthGrid(year, month, todayStr);

  return (
    <aside className="fd-side" aria-label="Navegación">
      <div className="fd-side__brand">
        <span className="fd-side__mark" aria-hidden />
        <span className="fd-side__name">Organizer</span>
      </div>

      <Link href="/anadir" className="fd-side__add">
        <span className="fd-side__addmark" aria-hidden>
          ＋
        </span>
        Añadir
      </Link>

      <nav className="fd-side__nav">
        <Link
          href="/"
          className="fd-sidelink"
          aria-current={active === 'inicio' ? 'page' : undefined}
        >
          <TabIcon name="inicio" />
          Inicio
        </Link>

        <Link
          href="/calendario"
          className="fd-sidelink"
          aria-current={active === 'calendario' ? 'page' : undefined}
        >
          <TabIcon name="calendario" />
          Calendario
        </Link>

        {/* Las tres vistas, alcanzables sin entrar primero a Calendario. Es
            la ventaja concreta de tener el alto de una pantalla apaisada. */}
        <div className="fd-side__subs">
          {(['mes', 'semana', 'dia'] as const).map((v) => (
            <Link
              key={v}
              href={`/calendario?v=${v}&d=${anchor}`}
              className="fd-sidesub"
              aria-current={active === 'calendario' && calView === v ? 'page' : undefined}
              scroll={false}
            >
              {v === 'dia' ? 'Día' : v === 'mes' ? 'Mes' : 'Semana'}
            </Link>
          ))}
        </div>

        <Link
          href="/pendientes"
          className="fd-sidelink"
          aria-current={active === 'pendientes' ? 'page' : undefined}
        >
          <TabIcon name="pendientes" />
          Pendientes
        </Link>

        <Link
          href="/recursos"
          className="fd-sidelink"
          aria-current={active === 'recursos' ? 'page' : undefined}
        >
          <TabIcon name="recursos" />
          Recursos
        </Link>
      </nav>

      <div className="fd-side__mini">
        <div className="fd-mini__head">
          <span className="fd-mini__title">
            {MONTH_NAMES_CAP_ES[month - 1]} {year}
          </span>
        </div>

        <div className="fd-mini__dow" aria-hidden>
          {DOW_INITIALS.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>

        <div className="fd-mini__grid">
          {cells.map((c) => (
            <Link
              key={c.dateStr}
              href={`/calendario?v=dia&d=${c.dateStr}`}
              className="fd-mini__cell"
              data-out={c.isCurrentMonth ? 'false' : 'true'}
              data-today={c.isToday ? 'true' : 'false'}
              data-selected={c.dateStr === selectedStr ? 'true' : 'false'}
              scroll={false}
            >
              {c.dayNum}
            </Link>
          ))}
        </div>
      </div>

      {/* La leyenda deja de ser algo que se consulta y pasa a estar puesta.
          Tres colores no se aprenden de memoria en una app que se abre
          cuando llega una notificacion. */}
      <div className="fd-side__legend">
        <span className="fd-seclabel fd-seclabel--quiet">
          <h2>Qué es qué</h2>
        </span>
        <span className="fd-legend__item">
          <Dot entity="task" size="sm" />
          Tareas
        </span>
        <span className="fd-legend__item">
          <Dot entity="subject" size="sm" />
          Materias
        </span>
        <span className="fd-legend__item">
          <Dot entity="reminder" size="sm" />
          Recordatorios
        </span>
      </div>
    </aside>
  );
}
