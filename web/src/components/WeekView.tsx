'use client';

/* ============================================================================
   Organizer · <WeekView> (F2 · decisiones 59, 67, 69 · semana.html & semana-escritorio.html)

   Pregunta que contesta: ¿CÓMO REPARTO EL TRABAJO?
   - Móvil: 7 filas, una por día, con las tres entidades juntas. Sin rejilla de horas.
   - Escritorio: barra "Sin planificar" a la izquierda (arrastrar o 1 toque),
     rejilla 7 días x horas, y fila de reminders arriba.
   - Interruptor "Mostrar materias": encendido por defecto, se apaga para ver el hueco libre.
   - WCAG 2.2 Dragging Movements: arrastre soportado + camino equivalente de 1 toque.
   ========================================================================= */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarHeader } from './CalendarHeader';
import { Icon } from './Icon';
import { CalBlock } from './CalBlock';
import { AddSheet } from './AddSheet';
import type { WeekCalendarData } from '@/lib/calendar';
import type { Task } from '@/lib/supabase/database.types';
import {
  addDays,
  formatWeekTitle,
  formatTimeRange,
  parseDateString,
  MONTH_NAMES_CAP_ES,
  calculateBlockPosition,
  getCurrentTimeMinutes,
} from '@/lib/date-utils';
import { planTasksAction, toggleBlockStatusAction } from '@/lib/calendar-actions';

export function WeekView({ data }: { data: WeekCalendarData }) {
  const router = useRouter();

  const { mondayStr, todayStr, days, unplannedTasks, contexts } = data;
  const contextMap = new Map(contexts.map((c) => [c.id, c.name]));

  // Interruptor de materias (encendido por defecto, decisión 69)
  const [showClasses, setShowClasses] = useState(true);

  // Hoja de añadir
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [targetAddDate, setTargetAddDate] = useState(mondayStr);

  // Accesibilidad de 1 toque en escritorio para "Sin planificar":
  const [oneTapTask, setOneTapTask] = useState<Task | null>(null);

  // Arrastre en escritorio
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  const goToWeek = (monday: string) => {
    router.push(`/semana?date=${monday}`);
  };

  const openAddForDate = (dateStr: string) => {
    setTargetAddDate(dateStr);
    setIsAddOpen(true);
  };

  const handleToggleBlock = async (blockId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'done' ? 'pending' : 'done';
    await toggleBlockStatusAction(blockId, nextStatus);
    router.refresh();
  };

  // Up-level link: mes al que pertenece el lunes
  const { month } = parseDateString(mondayStr);
  const monthName = MONTH_NAMES_CAP_ES[month - 1];

  // Agrupar tareas sin planificar por contexto
  const tasksByContext: Record<string, Task[]> = {};
  for (const t of unplannedTasks) {
    const ctx = t.context_id ? contextMap.get(t.context_id) || 'General' : 'General';
    if (!tasksByContext[ctx]) tasksByContext[ctx] = [];
    tasksByContext[ctx].push(t);
  }

  // Horas para la rejilla de escritorio (7:00 a 22:00)
  const hours = Array.from({ length: 16 }, (_, i) => i + 7);
  const curMin = getCurrentTimeMinutes('America/Caracas');

  // Arrastre de tareas al escritorio
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    setDraggingTaskId(taskId);
  };

  const handleDropOnDay = async (e: React.DragEvent, targetDayStr: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggingTaskId;
    if (!taskId) return;

    // Calcular hora a partir de la posición Y del drop
    const colRect = e.currentTarget.getBoundingClientRect();
    const yOffset = e.clientY - colRect.top;
    const hourCalculated = Math.min(21, Math.max(7, Math.floor(yOffset / 56) + 7));
    const startStr = `${String(hourCalculated).padStart(2, '0')}:00`;

    setDraggingTaskId(null);
    await planTasksAction({
      dateStr: targetDayStr,
      itemIds: [taskId],
      startTimeStr: startStr,
      durationMin: 60,
    });
    router.refresh();
  };

  return (
    <>
      {/* ===================================================================
          1. VISTA MÓVIL (<= 1024px) · app/comps/semana.html
          =================================================================== */}
      <div className="block lg:hidden">
        <div className="topfixed">
          {/* Cabecera idéntica: subir nivel va al Mes */}
          <CalendarHeader
            level="semana"
            upLevelText={monthName}
            upLevelHref={`/mes?date=${mondayStr}`}
            onToday={() => goToWeek(todayStr)}
            onPrev={() => goToWeek(addDays(mondayStr, -7))}
            onNext={() => goToWeek(addDays(mondayStr, 7))}
            onAdd={() => openAddForDate(todayStr)}
            prevAriaLabel="Semana anterior"
            nextAriaLabel="Semana siguiente"
          />

          {/* Rango de la semana */}
          <p className="callabel">{formatWeekTitle(mondayStr)}</p>
        </div>

        <main className="screen">
          {/* Interruptor de materias */}
          <button
            type="button"
            className="toggle"
            aria-pressed={showClasses}
            onClick={() => setShowClasses(!showClasses)}
            style={{ paddingBlock: 'var(--space-2)' }}
          >
            <span className="layerdot layerdot--class" />
            <span className="toggle__label">Mostrar materias</span>
            <span className="toggle__switch" aria-hidden="true" />
          </button>

          {/* Lista de 7 días */}
          <div className="wk">
            {days.map((day) => {
              const visibleBlocks = showClasses
                ? day.blocks
                : day.blocks.filter((b) => b.source !== 'template');

              const hasEvents = day.reminders.length > 0 || visibleBlocks.length > 0;

              return (
                <div
                  key={day.dateStr}
                  className={`wkday ${day.isToday ? 'wkday--today' : ''}`}
                >
                  <Link
                    href={`/dia?date=${day.dateStr}`}
                    className="wkday__rail no-underline"
                    title={`Ver día ${day.dayNum}`}
                  >
                    <span className="wkday__w">{day.weekdayNameShort}</span>
                    <span className="wkday__n num">{day.dayNum}</span>
                  </Link>

                  <div className="wkday__body">
                    {/* Reminders primero */}
                    {day.reminders.map((rem) => (
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
                    ))}

                    {/* Bloques de materias y tareas */}
                    {visibleBlocks.map((b) => {
                      const isClass = b.source === 'template';
                      const isDone = b.status === 'done';

                      const startObj = new Date(b.starts_at);
                      const endObj = new Date(b.ends_at);
                      const startH = startObj.getUTCHours() - 4;
                      const startM = startObj.getUTCMinutes();
                      const endH = endObj.getUTCHours() - 4;
                      const endM = endObj.getUTCMinutes();

                      const startStr = `${startH < 0 ? startH + 24 : startH}:${String(startM).padStart(2, '0')}`;
                      const endStr = `${endH < 0 ? endH + 24 : endH}:${String(endM).padStart(2, '0')}`;
                      const timeStr = formatTimeRange(startStr, endStr);

                      if (isClass) {
                        return (
                          <div key={b.id} className="ev ev--class">
                            <span className="ev__bar" />
                            <span className="ev__body">
                              <span className="ev__title">{b.title}</span>
                              <span className="ev__meta num">{timeStr}</span>
                            </span>
                          </div>
                        );
                      }

                      // Tarea
                      return (
                        <div
                          key={b.id}
                          className={`ev ev--task ${isDone ? 'ev--done' : ''}`}
                          onClick={() => handleToggleBlock(b.id, b.status)}
                          style={{ cursor: 'pointer' }}
                        >
                          <span className="ev__bar" />
                          <span className="ev__body">
                            <span className="ev__title">{b.title}</span>
                            <span className="ev__meta num">
                              {timeStr}
                              {isDone ? <span className="sep">·</span> : null}
                              {isDone ? 'hecho' : null}
                            </span>
                          </span>
                        </div>
                      );
                    })}

                    {/* Día libre */}
                    {!hasEvents ? <p className="wkday__none">Libre</p> : null}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ height: 'calc(56px + var(--space-10))' }} />
        </main>

        {/* FAB (+) */}
        <button
          type="button"
          className="fab no-underline"
          aria-label="Añadir a esta semana"
          onClick={() => openAddForDate(todayStr)}
        >
          <Icon name="plus" size="lg" />
        </button>
      </div>

      {/* ===================================================================
          2. VISTA ESCRITORIO (>= 1024px) · app/comps/semana-escritorio.html
          =================================================================== */}
      <div className="hidden lg:grid desk" style={{ height: '100dvh', width: '100%' }}>
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
          <Link className="navitem" href="/semana" aria-current="page">
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

        {/* Barra de tareas sin planificar (WCAG 2.2 Drag + 1-Tap) */}
        <aside className="plan" aria-labelledby="h-plan">
          <div className="plan__head">
            <h2 id="h-plan" className="t-section">
              Sin planificar
            </h2>
            <p className="t-meta c-muted mt-1">
              Arrastra a un hueco o toca para asignar.
            </p>
          </div>

          <div className="plan__body">
            {Object.keys(tasksByContext).length === 0 ? (
              <p className="t-meta c-muted p-4">No hay tareas sin planificar.</p>
            ) : null}

            {Object.entries(tasksByContext).map(([ctxName, tasks]) => (
              <div key={ctxName} className="mb-4">
                <p className="t-label c-muted font-semibold px-2 mb-2 uppercase tracking-wide">
                  {ctxName}
                </p>
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    className="p-3 mb-2 rounded bg-surface border border-line cursor-grab active:cursor-grabbing hover:shadow-sm transition-all"
                    style={{
                      opacity: draggingTaskId === task.id ? 0.4 : 1,
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="t-body font-medium flex-1 truncate">{task.title}</p>
                      {/* Botón de 1 toque (WCAG 2.2) */}
                      <button
                        type="button"
                        className="taptext t-label text-accent shrink-0"
                        title="Asignar a un día"
                        onClick={() => setOneTapTask(task)}
                      >
                        Poner
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </aside>

        {/* Rejilla de 7 días x horas */}
        <main className="main">
          <div className="mainhead">
            <h1 className="t-title">{formatWeekTitle(mondayStr)}</h1>

            {/* Selector de nivel Mes | Semana | Día */}
            <div
              className="seg"
              style={{ width: 260, marginLeft: 'var(--space-4)' }}
              role="tablist"
              aria-label="Vista del calendario"
            >
              <button
                type="button"
                role="tab"
                aria-selected={false}
                onClick={() => router.push(`/mes?date=${mondayStr}`)}
              >
                Mes
              </button>
              <button type="button" role="tab" aria-selected={true}>
                Semana
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={false}
                onClick={() => router.push(`/dia?date=${mondayStr}`)}
              >
                Día
              </button>
            </div>

            <div style={{ flex: 1 }} />

            <div className="flex items-center gap-1">
              <button
                type="button"
                className="btn btn--quiet"
                onClick={() => goToWeek(todayStr)}
              >
                Hoy
              </button>
              <button
                type="button"
                className="tapicon"
                aria-label="Semana anterior"
                onClick={() => goToWeek(addDays(mondayStr, -7))}
              >
                <Icon name="chevron-left" size="lg" />
              </button>
              <button
                type="button"
                className="tapicon"
                aria-label="Semana siguiente"
                onClick={() => goToWeek(addDays(mondayStr, 7))}
              >
                <Icon name="chevron-right" size="lg" />
              </button>
              <button
                type="button"
                className="btn btn--primary ml-2"
                onClick={() => openAddForDate(todayStr)}
              >
                <Icon name="plus" size="sm" className="mr-1" />
                Añadir
              </button>
            </div>
          </div>

          {/* Cabecera de días (lunes a domingo) */}
          <div className="week__head">
            <div className="colhead" /> {/* Espacio del eje de horas */}
            {days.map((day) => (
              <div
                key={day.dateStr}
                className={`colhead ${day.isToday ? 'colhead--today' : ''}`}
              >
                <span className="colhead__dow">{day.weekdayNameShort}</span>
                <span className="colhead__num">{day.dayNum}</span>
              </div>
            ))}
          </div>

          {/* Fila de reminders de día completo */}
          <div className="remrow">
            <div className="remrow__label">reminders</div>
            {days.map((day) => (
              <div key={day.dateStr} className="remrow__cell">
                {day.reminders.map((rem) => (
                  <div key={rem.id} className="remchip" title={rem.title}>
                    <Icon name="flag" size="sm" className="rem__flag" />
                    <span>{rem.title}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Rejilla de horas */}
          <div className="weekbody">
            <div className="week" style={{ height: 16 * 56, position: 'relative' }}>
              {/* Eje de horas (7:00 a 22:00) */}
              <div style={{ position: 'relative', borderRight: '1px solid var(--line)' }}>
                {hours.map((h, i) => (
                  <div
                    key={h}
                    className="cal__hour num text-right pr-2 text-xs"
                    style={{ position: 'absolute', top: i * 56, height: 56, width: '100%' }}
                  >
                    {h}:00
                  </div>
                ))}
              </div>

              {/* 7 Columnas */}
              {days.map((day) => {
                const isWeekend = day.weekdayNameShort === 'sáb' || day.weekdayNameShort === 'dom';
                return (
                  <div
                    key={day.dateStr}
                    className={`col ${isWeekend ? 'col--weekend' : ''}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDropOnDay(e, day.dateStr)}
                  >
                    {/* Líneas horizontales */}
                    {hours.map((h, i) => (
                      <div
                        key={h}
                        className="cal__line"
                        style={{ top: i * 56, position: 'absolute', width: '100%' }}
                      />
                    ))}

                    {/* Bloques del día */}
                    {day.blocks.map((b) => {
                      const isClass = b.source === 'template';
                      if (isClass && !showClasses) return null;

                      const startObj = new Date(b.starts_at);
                      const endObj = new Date(b.ends_at);
                      const startH = startObj.getUTCHours() - 4;
                      const startM = startObj.getUTCMinutes();
                      const endH = endObj.getUTCHours() - 4;
                      const endM = endObj.getUTCMinutes();

                      const startStr = `${startH < 0 ? startH + 24 : startH}:${String(startM).padStart(2, '0')}`;
                      const endStr = `${endH < 0 ? endH + 24 : endH}:${String(endM).padStart(2, '0')}`;
                      const { top, height } = calculateBlockPosition(startStr, endStr, 56, 7);

                      const isDone = b.status === 'done';
                      const isNow =
                        day.isToday &&
                        curMin >= startH * 60 + startM &&
                        curMin < endH * 60 + endM;

                      return (
                        <CalBlock
                          key={b.id}
                          kind={isClass ? 'class' : 'task'}
                          title={b.title}
                          time={formatTimeRange(startStr, endStr)}
                          done={isDone}
                          now={isNow}
                          style={{ top, height }}
                          onClick={
                            !isClass
                              ? () => handleToggleBlock(b.id, b.status)
                              : undefined
                          }
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>

      {/* Modal accesible de 1 toque para escritorio (WCAG 2.2) */}
      {oneTapTask ? (
        <div
          className="overlay"
          onClick={(e) => e.target === e.currentTarget && setOneTapTask(null)}
        >
          <div className="sheet" style={{ maxWidth: 420, margin: 'auto' }}>
            <div className="sheethead">
              <h3 className="t-section">Asignar &quot;{oneTapTask.title}&quot;</h3>
              <button
                type="button"
                className="tapicon"
                onClick={() => setOneTapTask(null)}
              >
                <Icon name="xmark" size="lg" />
              </button>
            </div>
            <p className="gutter t-meta c-muted mb-4">
              Elige a qué día de la semana quieres mover esta tarea:
            </p>
            <div className="gutter flex flex-col gap-2 pb-6">
              {days.map((d) => (
                <button
                  key={d.dateStr}
                  type="button"
                  className="btn btn--secondary justify-start text-left"
                  onClick={async () => {
                    await planTasksAction({
                      dateStr: d.dateStr,
                      itemIds: [oneTapTask.id],
                      startTimeStr: '09:00',
                      durationMin: 60,
                    });
                    setOneTapTask(null);
                    router.refresh();
                  }}
                >
                  <span className="font-semibold uppercase mr-2 w-8">
                    {d.weekdayNameShort}
                  </span>
                  <span>{d.dateStr}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Hoja de Añadir */}
      <AddSheet
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        initialDateStr={targetAddDate}
        initialTab="tarea"
        unplannedTasks={unplannedTasks}
        contexts={contexts}
      />
    </>
  );
}
