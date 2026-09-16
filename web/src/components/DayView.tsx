'use client';

/* ============================================================================
   Organizer · <DayView> (F2 · decisiones 67, 68 · app/comps/dia.html)

   Pregunta que contesta: ¿QUÉ HAGO AHORA?
   - Riel de horas con tareas y materias.
   - Banda de reminders encima (ámbar de fondo, título en --text).
   - Tira de 7 días arriba (número grande, abreviatura debajo, día activo en pastilla).
   - Tres capas con interruptor: Tareas, Reminders, Materias.
   ========================================================================= */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarHeader } from './CalendarHeader';
import { CalBlock } from './CalBlock';
import { Icon } from './Icon';
import { AddSheet } from './AddSheet';
import type { DayCalendarData } from '@/lib/calendar';
import {
  addDays,
  formatDayTitle,
  formatTimeRange,
  calculateBlockPosition,
  getCurrentTimeMinutes,
} from '@/lib/date-utils';
import { toggleBlockStatusAction } from '@/lib/calendar-actions';

export function DayView({
  data,
  initialAddOpen = false,
  initialTab = 'tarea',
}: {
  data: DayCalendarData;
  initialAddOpen?: boolean;
  initialTab?: 'tarea' | 'reminder';
}) {
  const router = useRouter();

  // Filtros de capas (las tres encendidas por defecto)
  const [showTasks, setShowTasks] = useState(true);
  const [showReminders, setShowReminders] = useState(true);
  const [showClasses, setShowClasses] = useState(true);

  // Hoja de añadir
  const [isAddOpen, setIsAddOpen] = useState(initialAddOpen);

  const { dateStr, todayStr, isToday, stripDays, reminders, blocks, unplannedTasks, contexts } = data;

  const goToDate = (d: string) => {
    router.push(`/dia?date=${d}`);
  };

  const handleToggleBlock = async (blockId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'done' ? 'pending' : 'done';
    await toggleBlockStatusAction(blockId, nextStatus);
    router.refresh();
  };

  // Posición de la línea de ahora (solo si estamos viendo el día de hoy)
  const curMin = getCurrentTimeMinutes('America/Caracas');
  const nowTop = ((curMin - 7 * 60) / 60) * 56;
  const isNowVisible = isToday && nowTop >= 0 && nowTop <= 15 * 56;

  const hours = Array.from({ length: 16 }, (_, i) => i + 7); // 7:00 a 22:00

  return (
    <>
      <div className="topfixed">
        {/* Cabecera idéntica en los 3 niveles */}
        <CalendarHeader
          level="dia"
          upLevelText="Semana"
          upLevelHref={`/semana?date=${dateStr}`}
          onToday={() => goToDate(todayStr)}
          onPrev={() => goToDate(addDays(dateStr, -1))}
          onNext={() => goToDate(addDays(dateStr, 1))}
          onAdd={() => setIsAddOpen(true)}
          prevAriaLabel="Día anterior"
          nextAriaLabel="Día siguiente"
        />

        {/* Qué día estás mirando */}
        <p className="callabel">{formatDayTitle(dateStr)}</p>

        {/* Tira de 7 días */}
        <div className="stripbar">
          <div className="daystrip" role="tablist" aria-label="Días de la semana">
            {stripDays.map((d) => {
              const cls = [
                'daystrip__d',
                d.isToday && 'daystrip__d--today',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <button
                  key={d.dateStr}
                  type="button"
                  className={cls}
                  role="tab"
                  aria-selected={d.isSelected}
                  aria-current={d.isToday ? 'date' : undefined}
                  onClick={() => goToDate(d.dateStr)}
                >
                  <span className="daystrip__n num">{d.dayNum}</span>
                  <span className="daystrip__w">{d.weekdayNameShort}</span>
                  {d.hasReminder ? (
                    <span className="daystrip__dot" aria-hidden="true" title="Tiene un reminder" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <main className="screen">
        {/* BANDA DE REMINDERS (fuera de la rejilla, porque no duran) */}
        {showReminders && reminders.length > 0 ? (
          <div style={{ paddingBlock: 'var(--space-3)' }}>
            {reminders.map((rem) => (
              <div
                key={rem.id}
                className="remband"
                style={{ color: 'var(--text)', marginBottom: 'var(--space-2)' }}
              >
                <Icon name="flag" size="sm" className="rem__flag" style={{ margin: 0 }} />
                <span className="flex-1 min-w-0">
                  <span className="block t-meta font-medium">{rem.title}</span>
                  <span className="block t-label c-muted num">
                    {rem.occurs_at ? rem.occurs_at.slice(0, 5) : 'todo el día'}
                    {rem.notes ? (
                      <>
                        <span className="sep"> · </span>
                        {rem.notes}
                      </>
                    ) : null}
                  </span>
                </span>
              </div>
            ))}
          </div>
        ) : null}

        {/* CAPAS · Tres interruptores independientes */}
        <div
          className="chips gutter"
          style={{ paddingBottom: 'var(--space-3)' }}
          role="group"
          aria-label="Capas visibles"
        >
          <button
            type="button"
            className="chip"
            aria-pressed={showTasks}
            onClick={() => setShowTasks(!showTasks)}
          >
            <span className="layerdot layerdot--task" />
            Tareas
          </button>
          <button
            type="button"
            className="chip"
            aria-pressed={showReminders}
            onClick={() => setShowReminders(!showReminders)}
          >
            <span className="layerdot layerdot--rem" />
            Reminders
          </button>
          <button
            type="button"
            className="chip"
            aria-pressed={showClasses}
            onClick={() => setShowClasses(!showClasses)}
          >
            <span className="layerdot layerdot--class" />
            Materias
          </button>
        </div>

        {/* REJILLA DE HORAS (7:00 a 22:00 a 56px la hora) */}
        <div
          className="cal"
          style={
            {
              '--hour': '56px',
              paddingBottom: 'calc(56px + var(--space-16))',
            } as React.CSSProperties
          }
        >
          <div className="cal__hours" aria-hidden="true">
            {hours.map((h) => (
              <div key={h} className="cal__hour num">
                {h}
              </div>
            ))}
          </div>

          <div className="cal__grid">
            {hours.map((h, i) => (
              <div key={h} className="cal__line" style={{ top: i * 56 }} />
            ))}

            {/* BLOQUES */}
            {blocks.map((b) => {
              const isClass = b.source === 'template';
              const isTask = !isClass;

              if (isClass && !showClasses) return null;
              if (isTask && !showTasks) return null;

              // Obtener hora local de inicio y fin en Caracas (UTC-4)
              const startObj = new Date(b.starts_at);
              const endObj = new Date(b.ends_at);

              const startH = startObj.getUTCHours() - 4;
              const startM = startObj.getUTCMinutes();
              const endH = endObj.getUTCHours() - 4;
              const endM = endObj.getUTCMinutes();

              const startStr = `${startH < 0 ? startH + 24 : startH}:${String(startM).padStart(2, '0')}`;
              const endStr = `${endH < 0 ? endH + 24 : endH}:${String(endM).padStart(2, '0')}`;

              const { top, height } = calculateBlockPosition(startStr, endStr, 56, 7);
              const timeFormatted = formatTimeRange(startStr, endStr);

              const isDone = b.status === 'done';
              const isNow =
                isToday &&
                curMin >= startH * 60 + startM &&
                curMin < endH * 60 + endM;

              return (
                <CalBlock
                  key={b.id}
                  kind={isClass ? 'class' : 'task'}
                  title={b.title}
                  time={timeFormatted}
                  done={isDone}
                  now={isNow}
                  style={{ top, height }}
                  onClick={isTask ? () => handleToggleBlock(b.id, b.status) : undefined}
                />
              );
            })}

            {/* LÍNEA DE AHORA */}
            {isNowVisible ? (
              <div className="cal__now" style={{ top: nowTop }} aria-hidden="true" />
            ) : null}
          </div>
        </div>
      </main>

      {/* Botón flotante (+) */}
      <button
        type="button"
        className="fab no-underline"
        aria-label={`Añadir al ${formatDayTitle(dateStr)}`}
        onClick={() => setIsAddOpen(true)}
      >
        <Icon name="plus" size="lg" />
      </button>

      {/* Hoja de Añadir */}
      <AddSheet
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        initialDateStr={dateStr}
        initialTab={initialTab}
        unplannedTasks={unplannedTasks}
        contexts={contexts}
      />
    </>
  );
}
