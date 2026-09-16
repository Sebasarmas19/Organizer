'use client';

/* ============================================================================
   Organizer · <MonthView> (F2 · decisiones 53, 67 · mes.html & mes-escritorio.html)

   Pregunta que contesta: ¿QUÉ SE ME VIENE ENCIMA?
   - SOLO REMINDERS, puntos ámbar (decisión 53). Ni tareas ni materias.
   - Un día limpio es un día libre.
   - Dos reminders el mismo día = dos puntos.
   - En Mes, el título ocupa el sitio exacto del botón de subir para que la cabecera
     no se mueva un solo píxel al navegar entre niveles.
   - Escritorio: las celdas muestran chips de texto y al tocar un día se abre un panel.
   ========================================================================= */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarHeader } from './CalendarHeader';
import { Icon } from './Icon';
import { AddSheet } from './AddSheet';
import type { MonthCalendarData } from '@/lib/calendar';
import type { Reminder } from '@/lib/supabase/database.types';
import {
  formatMonthTitle,
  getMonthGrid,
  parseDateString,
  MONTH_NAMES_CAP_ES,
  WEEKDAY_FULL_ES,
} from '@/lib/date-utils';

export function MonthView({ data }: { data: MonthCalendarData }) {
  const router = useRouter();
  const { year, month, todayStr, remindersByDate, unplannedTasks, contexts } = data;

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [targetAddDate, setTargetAddDate] = useState(todayStr);

  // Panel de día para escritorio (mes-escritorio.html)
  const [selectedDeskDate, setSelectedDeskDate] = useState<string | null>(null);

  const monthTitle = formatMonthTitle(year, month);
  const cells = getMonthGrid(year, month, todayStr);

  // Contar reminders de este mes
  let thisMonthRemindersCount = 0;
  for (const c of cells) {
    if (c.isCurrentMonth && remindersByDate[c.dateStr]) {
      thisMonthRemindersCount += remindersByDate[c.dateStr].length;
    }
  }

  const goToMonth = (y: number, m: number) => {
    const mm = String(m).padStart(2, '0');
    router.push(`/mes?date=${y}-${mm}-01`);
  };

  const prevMonth = () => {
    if (month === 1) goToMonth(year - 1, 12);
    else goToMonth(year, month - 1);
  };

  const nextMonth = () => {
    if (month === 12) goToMonth(year + 1, 1);
    else goToMonth(year, month + 1);
  };

  const openAdd = (dStr: string) => {
    setTargetAddDate(dStr);
    setIsAddOpen(true);
  };

  // Reminders del día seleccionado en escritorio
  const deskReminders: Reminder[] = selectedDeskDate
    ? remindersByDate[selectedDeskDate] || []
    : [];

  const selectedDeskDayParsed = selectedDeskDate
    ? parseDateString(selectedDeskDate)
    : null;

  const selectedDeskDow = selectedDeskDate
    ? cells.find((c) => c.dateStr === selectedDeskDate)?.weekday ?? 1
    : 1;

  return (
    <>
      {/* ===================================================================
          1. VISTA MÓVIL (<= 1024px) · app/comps/mes.html
          =================================================================== */}
      <div className="block lg:hidden">
        <div className="topfixed">
          {/* Cabecera idéntica en los 3 niveles: Mes es el techo */}
          <CalendarHeader
            level="mes"
            monthTitle={monthTitle}
            onToday={() => {
              const { year: ty, month: tm } = parseDateString(todayStr);
              goToMonth(ty, tm);
            }}
            onPrev={prevMonth}
            onNext={nextMonth}
            onAdd={() => openAdd(todayStr)}
            prevAriaLabel="Mes anterior"
            nextAriaLabel="Mes siguiente"
          />

          <p className="callabel">
            {year}
            <span className="sep"> · </span>
            {thisMonthRemindersCount} {thisMonthRemindersCount === 1 ? 'reminder' : 'reminders'} este mes
          </p>
        </div>

        <main className="screen screen--fixed">
          <div className="monthwrap">
            {/* Iniciales de los días de la semana */}
            <div className="month" style={{ gridAutoRows: 'auto' }}>
              <div className="month__dow">L</div>
              <div className="month__dow">M</div>
              <div className="month__dow">X</div>
              <div className="month__dow">J</div>
              <div className="month__dow">V</div>
              <div className="month__dow">S</div>
              <div className="month__dow">D</div>
            </div>

            {/* Rejilla de días */}
            <div className="month" id="grid">
              {cells.map((c) => {
                const dayReminders = remindersByDate[c.dateStr] || [];
                const count = dayReminders.length;

                const cls = [
                  'mday',
                  !c.isCurrentMonth && 'mday--out',
                  c.isPast && 'mday--past',
                  c.isToday && 'mday--today',
                  'no-underline',
                ]
                  .filter(Boolean)
                  .join(' ');

                const ariaLabel = `${c.dayNum} de ${MONTH_NAMES_CAP_ES[month - 1]}, ${
                  count ? `${count} reminder${count > 1 ? 's' : ''}` : 'sin reminders'
                }`;

                return (
                  <Link
                    key={c.dateStr}
                    href={`/dia?date=${c.dateStr}`}
                    className={cls}
                    aria-label={ariaLabel}
                    aria-current={c.isToday ? 'date' : undefined}
                  >
                    <span className="mday__n num">{c.dayNum}</span>
                    {/* Banda de puntos ámbar */}
                    <span className="mday__dots" aria-hidden="true">
                      {Array.from({ length: count }, (_, i) => (
                        <i key={i} />
                      ))}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </main>

        {/* FAB (+) */}
        <button
          type="button"
          className="fab no-underline"
          aria-label="Añadir un reminder"
          onClick={() => openAdd(todayStr)}
        >
          <Icon name="plus" size="lg" />
        </button>
      </div>

      {/* ===================================================================
          2. VISTA ESCRITORIO (>= 1024px) · app/comps/mes-escritorio.html
          =================================================================== */}
      <div className="hidden lg:grid desk desk--two-col" style={{ height: '100dvh', width: '100%' }}>
        {/* Navegación lateral */}
        <nav className="side" aria-label="Secciones">
          <div className="side__brand">
            <span className="side__mark">
              <span />
            </span>
            <span className="t-body font-semibold">Organizer</span>
          </div>
          <Link className="navitem" href="/">
            <Icon name="house" size="lg" />
            Inicio
          </Link>
          <Link className="navitem" href="/mes" aria-current="page">
            <Icon name="calendar" size="lg" />
            Semana
          </Link>
          <Link className="navitem" href="/tareas">
            <Icon name="check-circle" size="lg" />
            Tareas
          </Link>
          <Link className="navitem" href="/recursos">
            <Icon name="bookmark" size="lg" />
            Recursos
          </Link>

          <div style={{ flex: 1 }} />
          <Link className="navitem" href="/horario">
            <Icon name="grid" size="lg" />
            Horario
          </Link>
        </nav>

        {/* Área principal del mes */}
        <main className="main">
          <div className="mainhead">
            <h1 className="t-title">
              {monthTitle} {year}
            </h1>

            {/* Selector de nivel Mes | Semana | Día */}
            <div
              className="seg"
              style={{ width: 260, marginLeft: 'var(--space-4)' }}
              role="tablist"
              aria-label="Vista del calendario"
            >
              <button type="button" role="tab" aria-selected={true}>
                Mes
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={false}
                onClick={() => router.push(`/semana?date=${cells[0].dateStr}`)}
              >
                Semana
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={false}
                onClick={() => router.push(`/dia?date=${todayStr}`)}
              >
                Día
              </button>
            </div>

            <div style={{ flex: 1 }} />

            <div className="flex items-center gap-1">
              <button
                type="button"
                className="btn btn--quiet"
                onClick={() => {
                  const { year: ty, month: tm } = parseDateString(todayStr);
                  goToMonth(ty, tm);
                }}
              >
                Hoy
              </button>
              <button
                type="button"
                className="tapicon"
                aria-label="Mes anterior"
                onClick={prevMonth}
              >
                <Icon name="chevron-left" size="lg" />
              </button>
              <button
                type="button"
                className="tapicon"
                aria-label="Mes siguiente"
                onClick={nextMonth}
              >
                <Icon name="chevron-right" size="lg" />
              </button>
              <button
                type="button"
                className="btn btn--primary ml-2"
                onClick={() => openAdd(todayStr)}
              >
                <Icon name="plus" size="sm" className="mr-1" />
                Añadir
              </button>
            </div>
          </div>

          {/* Días de la semana en texto */}
          <div className="dowrow" aria-hidden="true">
            <span>lunes</span>
            <span>martes</span>
            <span>miércoles</span>
            <span>jueves</span>
            <span>viernes</span>
            <span>sábado</span>
            <span>domingo</span>
          </div>

          {/* Rejilla de celdas */}
          <div className="monthgrid">
            <div className="dmonth">
              {cells.map((c) => {
                const dayReminders = remindersByDate[c.dateStr] || [];
                const isSelected = selectedDeskDate === c.dateStr;

                return (
                  <div
                    key={c.dateStr}
                    className={`border border-line p-2 min-h-[100px] flex flex-col cursor-pointer transition-colors ${
                      !c.isCurrentMonth ? 'bg-surface-sunken opacity-50' : 'bg-surface'
                    } ${c.isToday ? 'ring-2 ring-task' : ''} ${
                      isSelected ? 'bg-accent-soft' : ''
                    }`}
                    onClick={() => setSelectedDeskDate(c.dateStr)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="t-label font-semibold num">{c.dayNum}</span>
                      {dayReminders.length > 0 ? (
                        <span className="text-xs text-muted num">
                          {dayReminders.length}
                        </span>
                      ) : null}
                    </div>

                    {/* Chips de reminders (se escriben completos en escritorio) */}
                    <div className="flex flex-col gap-1 overflow-y-auto max-h-[80px]">
                      {dayReminders.map((rem) => (
                        <div
                          key={rem.id}
                          className="remchip text-xs truncate"
                          title={rem.title}
                        >
                          <Icon name="flag" size="sm" className="rem__flag" />
                          <span className="truncate">{rem.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Panel flotante del día en escritorio (referencia 13 · mes-escritorio.html) */}
          {selectedDeskDate ? (
            <div
              className="daypanel"
              style={{
                position: 'absolute',
                right: 'var(--gutter-wide)',
                top: 140,
                width: 320,
                boxShadow: 'var(--shadow-float)',
                zIndex: 40,
              }}
            >
              <div className="daypanel__head">
                <div>
                  <p className="t-label c-muted">
                    {WEEKDAY_FULL_ES[selectedDeskDow]}
                  </p>
                  <h2 className="t-title" style={{ lineHeight: 1.1 }}>
                    {selectedDeskDayParsed?.day}
                  </h2>
                </div>
                <button
                  type="button"
                  className="tapicon"
                  aria-label="Cerrar panel"
                  onClick={() => setSelectedDeskDate(null)}
                >
                  <Icon name="xmark" size="lg" />
                </button>
              </div>

              {/* Lista de reminders del día */}
              <div className="flex flex-col gap-2 my-4 max-h-[300px] overflow-y-auto">
                {deskReminders.length === 0 ? (
                  <p className="t-meta c-muted">Sin reminders para este día.</p>
                ) : (
                  deskReminders.map((rem) => (
                    <div key={rem.id} className="ev ev--rem">
                      <span className="ev__bar" />
                      <span className="ev__body">
                        <span className="ev__title flex items-center gap-2">
                          <Icon
                            name="flag"
                            size="sm"
                            className="rem__flag"
                            style={{ margin: 0 }}
                          />
                          {rem.title}
                        </span>
                        {rem.occurs_at ? (
                          <span className="ev__meta num">{rem.occurs_at.slice(0, 5)}</span>
                        ) : null}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <button
                type="button"
                className="btn btn--primary btn--full mt-2"
                onClick={() => openAdd(selectedDeskDate)}
              >
                <Icon name="plus" size="sm" className="mr-1" />
                Añadir al día
              </button>
            </div>
          ) : null}
        </main>
      </div>

      {/* Hoja de Añadir (por defecto pestaña Reminder en Mes, decisión 53/70) */}
      <AddSheet
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        initialDateStr={targetAddDate}
        initialTab="reminder"
        unplannedTasks={unplannedTasks}
        contexts={contexts}
      />
    </>
  );
}
