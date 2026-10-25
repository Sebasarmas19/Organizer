/* ============================================================================
   Organizer · Exportación y Compartición de Agenda
   
   Genera salidas de alta fidelidad (imagen PNG de alta resolución y texto
   formateado para WhatsApp) para compartir con amigos o familiares y mostrar
   con claridad el estado de la agenda (clases, evaluaciones/reminders y tareas),
   o los días que están despejados/libres para hacer planes.
   ========================================================================= */

import type { Fd4WeekData, Fd4DayData, Fd4MonthData } from './fd4-calendar';
import {
  parseDateString,
  formatDateString,
  getDaysInMonth,
  getDayOfWeek,
  WEEKDAY_SHORT_ES,
  MONTH_NAMES_ES,
} from './date-utils';

export type ExportScheduleDay = {
  dateStr: string;
  label: string;
  hint?: string;
  isToday: boolean;
  free: boolean;
  classes: { title: string; hora: string }[];
  reminders: { id?: string; title: string; hora: string }[];
  tasks: { title: string; hora: string }[];
};

export type ExportSchedulePayload = {
  view: 'semana' | 'dia' | 'mes';
  title: string;
  subtitle: string;
  period: string;
  days: ExportScheduleDay[];
  summary: {
    totalClasses: number;
    totalReminders: number;
    totalTasks: number;
  };
};

/* -------------------------------------------------- Constructores de datos */

export function buildWeekExportPayload(data: Fd4WeekData): ExportSchedulePayload {
  let totalClasses = 0;
  let totalReminders = 0;
  let totalTasks = 0;

  const days: ExportScheduleDay[] = data.days.map((d) => {
    const classes = d.classes ?? [];
    const reminders = d.allReminders ?? (d.reminder ? [d.reminder] : []);
    const tasks = d.tasks ?? [];

    totalClasses += classes.length;
    totalReminders += reminders.length;
    totalTasks += tasks.length;

    const isFree = classes.length === 0 && reminders.length === 0 && tasks.length === 0;

    return {
      dateStr: d.dateStr,
      label: d.label,
      hint: d.hint,
      isToday: d.isToday,
      free: isFree,
      classes,
      reminders,
      tasks,
    };
  });

  return {
    view: 'semana',
    title: `Semana: ${data.title}`,
    subtitle: `${totalReminders} evaluaciones · ${totalClasses} clases · ${totalTasks} tareas`,
    period: data.title,
    days,
    summary: { totalClasses, totalReminders, totalTasks },
  };
}

export function buildDayExportPayload(data: Fd4DayData): ExportSchedulePayload {
  const classes = data.classes ?? [];
  const reminders = data.allReminders ?? (data.bands ? data.bands.map((b) => ({ title: b.title, hora: b.meta })) : []);
  const taskBlocks = data.blocks
    .filter((b) => b.kind === 'task')
    .map((b) => ({ title: b.title, hora: b.meta }));
  const looseTasks = data.noHour.map((t) => ({ title: t.title, hora: '' }));
  const tasks = [...taskBlocks, ...looseTasks];

  const totalClasses = classes.length;
  const totalReminders = reminders.length;
  const totalTasks = tasks.length;
  const isFree = totalClasses === 0 && totalReminders === 0 && totalTasks === 0;

  return {
    view: 'dia',
    title: `Agenda: ${data.title}`,
    subtitle: data.sub || 'Día completo',
    period: data.title,
    days: [
      {
        dateStr: data.dateStr,
        label: data.title,
        isToday: data.isToday,
        free: isFree,
        classes,
        reminders,
        tasks,
      },
    ],
    summary: { totalClasses, totalReminders, totalTasks },
  };
}

function formatShortDateBadge(dateStr: string): string {
  try {
    const { month, day } = parseDateString(dateStr);
    const dow = getDayOfWeek(dateStr);
    const dowName = WEEKDAY_SHORT_ES[dow]?.toUpperCase() || '';
    const monthName = MONTH_NAMES_ES[month - 1]?.slice(0, 3).toUpperCase() || '';
    return `${dowName} ${day} ${monthName}`;
  } catch {
    return dateStr;
  }
}

export function buildMonthExportPayload(data: Fd4MonthData): ExportSchedulePayload {
  const monthFirst = formatDateString(data.year, data.month, 1);
  const monthLast = formatDateString(data.year, data.month, getDaysInMonth(data.year, data.month));

  const daysWithEvents: ExportScheduleDay[] = [];
  const sortedDates = Object.keys(data.previews)
    .filter((d) => d >= monthFirst && d <= monthLast)
    .sort();

  let totalReminders = 0;
  let totalTasks = 0;

  for (const dateStr of sortedDates) {
    const preview = data.previews[dateStr];
    if (!preview || preview.events.length === 0) continue;

    const dayReminders = preview.events
      .filter((e) => e.kind === 'reminder')
      .map((e) => ({ id: e.id, title: e.title, hora: e.hora ?? '' }));

    const seenTaskTitles = new Set<string>();
    const dayTasks: { title: string; hora: string }[] = [];
    for (const e of preview.events) {
      if (e.kind === 'task' && !seenTaskTitles.has(e.title)) {
        seenTaskTitles.add(e.title);
        dayTasks.push({ title: e.title, hora: e.hora ?? '' });
      }
    }

    if (dayReminders.length > 0 || dayTasks.length > 0) {
      totalReminders += dayReminders.length;
      totalTasks += dayTasks.length;

      daysWithEvents.push({
        dateStr,
        label: preview.label,
        hint: preview.hint,
        isToday: preview.hint === 'Hoy',
        free: false,
        classes: [], // Sin materias (#53 y petición explícita del usuario)
        reminders: dayReminders,
        tasks: dayTasks,
      });
    }
  }

  return {
    view: 'mes',
    title: `Mes: ${data.title}`,
    subtitle: `${totalReminders} evaluaciones · ${totalTasks} tareas programadas`,
    period: data.title,
    days: daysWithEvents,
    summary: {
      totalClasses: 0,
      totalReminders,
      totalTasks,
    },
  };
}

/* ------------------------------------------------ Formato Texto (WhatsApp) */

export function formatScheduleAsText(payload: ExportSchedulePayload): string {
  const lines: string[] = [];
  lines.push(`📅 *${payload.title}*`);
  if (payload.subtitle) lines.push(`_${payload.subtitle}_\n`);

  if (payload.view === 'mes') {
    if (payload.days.length === 0) {
      lines.push('✨ No hay evaluaciones ni tareas programadas para este mes.\n');
    } else {
      for (const day of payload.days) {
        const marker = day.isToday ? ' (Hoy)' : '';
        const shortBadge = formatShortDateBadge(day.dateStr);
        lines.push(`*${shortBadge} — ${day.label}${marker}:*`);

        if (day.reminders.length > 0) {
          for (const r of day.reminders) {
            const time = r.hora ? `[${r.hora}] ` : '';
            lines.push(`  🚩 *${time}${r.title}*`);
          }
        }

        if (day.tasks.length > 0) {
          for (const t of day.tasks) {
            const time = t.hora ? `${t.hora} · ` : '';
            lines.push(`  • ${time}${t.title}`);
          }
        }

        lines.push('');
      }
    }
    lines.push('—');
    lines.push('Compartido desde mi agenda personal');
    return lines.join('\n');
  }

  for (const day of payload.days) {
    const marker = day.isToday ? ' (Hoy)' : '';
    lines.push(`*${day.label}${marker}*`);

    if (day.free) {
      lines.push('  ✨ Despejado / Libre\n');
      continue;
    }

    if (day.reminders.length > 0) {
      for (const r of day.reminders) {
        const time = r.hora ? `[${r.hora}] ` : '';
        lines.push(`  🚩 *${time}${r.title}*`);
      }
    }

    if (day.classes.length > 0) {
      for (const c of day.classes) {
        const time = c.hora ? `${c.hora} · ` : '';
        lines.push(`  📚 ${time}${c.title}`);
      }
    }

    if (day.tasks.length > 0) {
      for (const t of day.tasks) {
        const time = t.hora ? `${t.hora} · ` : '';
        lines.push(`  • ${time}${t.title}`);
      }
    }

    lines.push('');
  }

  lines.push('—');
  lines.push('Compartido desde mi agenda personal');
  return lines.join('\n');
}

/* ------------------------------------------------ Renderizado de Canvas PNG */

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}

function truncateText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let tr = text;
  while (tr.length > 0 && ctx.measureText(tr + '…').width > maxWidth) {
    tr = tr.slice(0, -1);
  }
  return tr + '…';
}

export function renderScheduleCard(
  canvas: HTMLCanvasElement,
  payload: ExportSchedulePayload
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = 1080;
  const paddingX = 48;
  const contentWidth = width - paddingX * 2;

  if (payload.view === 'dia') {
    renderDayView(canvas, ctx, payload, width, paddingX, contentWidth);
  } else if (payload.view === 'mes') {
    renderMonthView(canvas, ctx, payload, width, paddingX, contentWidth);
  } else {
    renderWeekView(canvas, ctx, payload, width, paddingX, contentWidth);
  }
}

/* ------------------------------------------------ 1. VISTA DE DÍA */

function renderDayView(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  payload: ExportSchedulePayload,
  width: number,
  paddingX: number,
  contentWidth: number
): void {
  const day = payload.days[0] || {
    dateStr: '',
    label: payload.title,
    isToday: false,
    free: true,
    classes: [],
    reminders: [],
    tasks: [],
  };

  let totalHeight = 220;

  const hasReminders = day.reminders.length > 0;
  const hasClasses = day.classes.length > 0;
  const hasTasks = day.tasks.length > 0;

  let remCardH = 0;
  if (hasReminders) {
    remCardH = 54 + day.reminders.length * 48;
    totalHeight += remCardH + 18;
  }

  let classCardH = 0;
  if (hasClasses) {
    classCardH = 54 + day.classes.length * 44;
    totalHeight += classCardH + 18;
  }

  let taskCardH = 0;
  if (hasTasks) {
    taskCardH = 54 + day.tasks.length * 42;
    totalHeight += taskCardH + 18;
  }

  let freeCardH = 0;
  if (day.free) {
    freeCardH = 110;
    totalHeight += freeCardH + 18;
  }

  totalHeight += 90;

  canvas.width = width;
  canvas.height = totalHeight;

  const bgGrad = ctx.createLinearGradient(0, 0, 0, totalHeight);
  bgGrad.addColorStop(0, '#0c0f17');
  bgGrad.addColorStop(1, '#151922');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, totalHeight);

  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  drawRoundRect(ctx, 16, 16, width - 32, totalHeight - 32, 28);
  ctx.stroke();

  let curY = 64;
  ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.letterSpacing = '1.5px';
  ctx.fillText('ORGANIZER · AGENDA DEL DÍA', paddingX, curY);
  ctx.letterSpacing = '0px';

  curY += 44;
  ctx.font = '700 38px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(payload.title, paddingX, curY);

  curY += 38;
  renderSummaryChips(ctx, payload, paddingX, curY);

  curY += 36;
  drawDivider(ctx, paddingX, width - paddingX, curY);

  curY += 28;

  if (hasReminders) {
    ctx.fillStyle = 'rgba(245, 158, 11, 0.07)';
    drawRoundRect(ctx, paddingX, curY, contentWidth, remCardH, 20);
    ctx.fill();

    ctx.strokeStyle = 'rgba(245, 158, 11, 0.28)';
    ctx.lineWidth = 1.5;
    drawRoundRect(ctx, paddingX, curY, contentWidth, remCardH, 20);
    ctx.stroke();

    ctx.font = '700 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.letterSpacing = '1px';
    ctx.fillText('🚩 EVALUACIONES Y PARCIALES', paddingX + 24, curY + 32);
    ctx.letterSpacing = '0px';

    let itemY = curY + 70;
    for (const r of day.reminders) {
      if (r.hora) {
        ctx.font = '700 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#f59e0b';
        ctx.fillText(r.hora, paddingX + 24, itemY);

        const timeW = ctx.measureText(r.hora).width;
        ctx.fillStyle = '#fef3c7';
        const maxTitleW = contentWidth - 48 - timeW - 20;
        const safeTitle = truncateText(ctx, ` · ${r.title}`, maxTitleW);
        ctx.fillText(safeTitle, paddingX + 24 + timeW, itemY);
      } else {
        ctx.font = '700 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#fef3c7';
        const safeTitle = truncateText(ctx, r.title, contentWidth - 48);
        ctx.fillText(safeTitle, paddingX + 24, itemY);
      }
      itemY += 46;
    }

    curY += remCardH + 18;
  }

  if (hasClasses) {
    ctx.fillStyle = 'rgba(56, 189, 248, 0.06)';
    drawRoundRect(ctx, paddingX, curY, contentWidth, classCardH, 20);
    ctx.fill();

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 1.5;
    drawRoundRect(ctx, paddingX, curY, contentWidth, classCardH, 20);
    ctx.stroke();

    ctx.font = '700 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.letterSpacing = '1px';
    ctx.fillText('📚 HORARIO DE CLASES', paddingX + 24, curY + 32);
    ctx.letterSpacing = '0px';

    let itemY = curY + 68;
    for (const c of day.classes) {
      ctx.font = '600 19px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      if (c.hora) {
        ctx.fillStyle = '#7dd3fc';
        ctx.fillText(c.hora, paddingX + 24, itemY);

        const timeW = ctx.measureText(c.hora).width;
        ctx.fillStyle = '#e0f2fe';
        const maxTitleW = contentWidth - 48 - timeW - 20;
        const safeTitle = truncateText(ctx, ` · ${c.title}`, maxTitleW);
        ctx.fillText(safeTitle, paddingX + 24 + timeW, itemY);
      } else {
        ctx.fillStyle = '#e0f2fe';
        const safeTitle = truncateText(ctx, c.title, contentWidth - 48);
        ctx.fillText(safeTitle, paddingX + 24, itemY);
      }
      itemY += 44;
    }

    curY += classCardH + 18;
  }

  if (hasTasks) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
    drawRoundRect(ctx, paddingX, curY, contentWidth, taskCardH, 20);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    drawRoundRect(ctx, paddingX, curY, contentWidth, taskCardH, 20);
    ctx.stroke();

    ctx.font = '700 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.letterSpacing = '1px';
    ctx.fillText('✓ TAREAS DEL DÍA', paddingX + 24, curY + 32);
    ctx.letterSpacing = '0px';

    let itemY = curY + 68;
    for (const t of day.tasks) {
      ctx.font = '500 19px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('•', paddingX + 24, itemY);

      if (t.hora) {
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(`${t.hora} · `, paddingX + 44, itemY);
        const timeW = ctx.measureText(`${t.hora} · `).width;

        ctx.fillStyle = '#e2e8f0';
        const maxTitleW = contentWidth - 48 - timeW - 24;
        const safeTitle = truncateText(ctx, t.title, maxTitleW);
        ctx.fillText(safeTitle, paddingX + 44 + timeW, itemY);
      } else {
        ctx.fillStyle = '#e2e8f0';
        const safeTitle = truncateText(ctx, t.title, contentWidth - 68);
        ctx.fillText(safeTitle, paddingX + 44, itemY);
      }
      itemY += 42;
    }

    curY += taskCardH + 18;
  }

  if (day.free) {
    ctx.fillStyle = 'rgba(16, 185, 129, 0.06)';
    drawRoundRect(ctx, paddingX, curY, contentWidth, freeCardH, 20);
    ctx.fill();

    ctx.strokeStyle = 'rgba(16, 185, 129, 0.22)';
    ctx.lineWidth = 1.5;
    drawRoundRect(ctx, paddingX, curY, contentWidth, freeCardH, 20);
    ctx.stroke();

    ctx.font = '600 21px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#34d399';
    ctx.fillText('✨ Día completamente despejado · Disponible para planes', paddingX + 28, curY + 62);

    curY += freeCardH + 18;
  }

  renderFooter(ctx, width, paddingX, curY);
}

/* ------------------------------------------------ 2. VISTA DE SEMANA */

function renderWeekView(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  payload: ExportSchedulePayload,
  width: number,
  paddingX: number,
  contentWidth: number
): void {
  ctx.font = '700 23px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  let maxLabelW = 0;
  for (const day of payload.days) {
    const w = ctx.measureText(day.label).width;
    if (w > maxLabelW) maxLabelW = w;
  }
  const leftColWidth = Math.max(180, Math.ceil(maxLabelW) + 24);
  const leftColX = paddingX + 24;
  const rightColX = leftColX + leftColWidth + 20;
  const rightColMaxW = contentWidth - (leftColWidth + 24 + 20 + 20);

  let totalHeight = 220;
  const dayHeights: number[] = [];

  for (const day of payload.days) {
    if (day.free) {
      const h = 80;
      dayHeights.push(h);
      totalHeight += h + 14;
    } else {
      let itemsCount = day.reminders.length + day.classes.length + day.tasks.length;
      if (itemsCount === 0) itemsCount = 1;
      const h = Math.max(92, 42 + itemsCount * 40);
      dayHeights.push(h);
      totalHeight += h + 14;
    }
  }

  totalHeight += 90;

  canvas.width = width;
  canvas.height = totalHeight;

  const bgGrad = ctx.createLinearGradient(0, 0, 0, totalHeight);
  bgGrad.addColorStop(0, '#0c0f17');
  bgGrad.addColorStop(1, '#151922');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, totalHeight);

  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  drawRoundRect(ctx, 16, 16, width - 32, totalHeight - 32, 28);
  ctx.stroke();

  let curY = 64;
  ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.letterSpacing = '1.5px';
  ctx.fillText('ORGANIZER · AGENDA PERSONAL', paddingX, curY);
  ctx.letterSpacing = '0px';

  curY += 44;
  ctx.font = '700 38px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(payload.title, paddingX, curY);

  curY += 38;
  renderSummaryChips(ctx, payload, paddingX, curY);

  curY += 36;
  drawDivider(ctx, paddingX, width - paddingX, curY);

  curY += 24;

  for (let i = 0; i < payload.days.length; i++) {
    const day = payload.days[i];
    const cardH = dayHeights[i];
    const cardY = curY;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
    drawRoundRect(ctx, paddingX, cardY, contentWidth, cardH, 18);
    ctx.fill();

    ctx.strokeStyle = day.isToday ? 'rgba(59, 130, 246, 0.45)' : 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = day.isToday ? 2 : 1;
    drawRoundRect(ctx, paddingX, cardY, contentWidth, cardH, 18);
    ctx.stroke();

    const titleY = cardY + 36;
    ctx.font = '700 23px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = day.isToday ? '#60a5fa' : '#ffffff';
    ctx.fillText(day.label, leftColX, titleY);

    if (day.isToday) {
      ctx.fillStyle = '#2563eb';
      drawRoundRect(ctx, leftColX, titleY + 12, 48, 20, 6);
      ctx.fill();

      ctx.font = '700 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('HOY', leftColX + 11, titleY + 26);
    }

    let itemY = cardY + 36;

    if (day.free) {
      ctx.font = '600 19px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#34d399';
      ctx.fillText('✨ Despejado · Disponible para planes', rightColX, cardY + cardH / 2 + 7);
    } else {
      for (const r of day.reminders) {
        ctx.font = '700 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#f59e0b';
        ctx.fillText('🚩', rightColX, itemY);

        if (r.hora) {
          ctx.fillStyle = '#fbbf24';
          ctx.fillText(r.hora, rightColX + 30, itemY);
          const timeW = ctx.measureText(r.hora).width;

          ctx.fillStyle = '#fef3c7';
          const safeTitle = truncateText(ctx, ` · ${r.title}`, rightColMaxW - 30 - timeW);
          ctx.fillText(safeTitle, rightColX + 30 + timeW, itemY);
        } else {
          ctx.fillStyle = '#fef3c7';
          const safeTitle = truncateText(ctx, r.title, rightColMaxW - 30);
          ctx.fillText(safeTitle, rightColX + 30, itemY);
        }
        itemY += 40;
      }

      for (const c of day.classes) {
        ctx.font = '600 19px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('📚', rightColX, itemY);

        if (c.hora) {
          ctx.fillStyle = '#7dd3fc';
          ctx.fillText(c.hora, rightColX + 30, itemY);
          const timeW = ctx.measureText(c.hora).width;

          ctx.fillStyle = '#e0f2fe';
          const safeTitle = truncateText(ctx, ` · ${c.title}`, rightColMaxW - 30 - timeW);
          ctx.fillText(safeTitle, rightColX + 30 + timeW, itemY);
        } else {
          ctx.fillStyle = '#e0f2fe';
          const safeTitle = truncateText(ctx, c.title, rightColMaxW - 30);
          ctx.fillText(safeTitle, rightColX + 30, itemY);
        }
        itemY += 40;
      }

      for (const t of day.tasks) {
        ctx.font = '500 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('•', rightColX + 6, itemY);

        if (t.hora) {
          ctx.fillStyle = '#cbd5e1';
          ctx.fillText(`${t.hora} · `, rightColX + 30, itemY);
          const timeW = ctx.measureText(`${t.hora} · `).width;

          ctx.fillStyle = '#e2e8f0';
          const safeTitle = truncateText(ctx, t.title, rightColMaxW - 30 - timeW);
          ctx.fillText(safeTitle, rightColX + 30 + timeW, itemY);
        } else {
          ctx.fillStyle = '#cbd5e1';
          const safeTitle = truncateText(ctx, t.title, rightColMaxW - 30);
          ctx.fillText(safeTitle, rightColX + 30, itemY);
        }
        itemY += 40;
      }
    }

    curY += cardH + 14;
  }

  renderFooter(ctx, width, paddingX, curY);
}

/* ------------------------------------------------ 3. VISTA DE MES (Evaluaciones y Tareas, sin Clases) */

function renderMonthView(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  payload: ExportSchedulePayload,
  width: number,
  paddingX: number,
  contentWidth: number
): void {
  const rowGap = 14;
  const dayHeights: number[] = [];
  let totalHeight = 220; // Header

  if (payload.days.length === 0) {
    totalHeight += 110;
  } else {
    for (const day of payload.days) {
      const itemsCount = day.reminders.length + day.tasks.length;
      const h = Math.max(76, 28 + itemsCount * 38 + 10);
      dayHeights.push(h);
      totalHeight += h + rowGap;
    }
  }

  totalHeight += 90; // Footer

  canvas.width = width;
  canvas.height = totalHeight;

  // Fondo
  const bgGrad = ctx.createLinearGradient(0, 0, 0, totalHeight);
  bgGrad.addColorStop(0, '#0c0f17');
  bgGrad.addColorStop(1, '#151922');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, totalHeight);

  // Borde exterior
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  drawRoundRect(ctx, 16, 16, width - 32, totalHeight - 32, 28);
  ctx.stroke();

  // Header
  let curY = 64;
  ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.letterSpacing = '1.5px';
  ctx.fillText('ORGANIZER · AGENDA MENSUAL', paddingX, curY);
  ctx.letterSpacing = '0px';

  curY += 44;
  ctx.font = '700 38px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(payload.title, paddingX, curY);

  curY += 38;
  renderSummaryChips(ctx, payload, paddingX, curY);

  curY += 36;
  drawDivider(ctx, paddingX, width - paddingX, curY);

  curY += 24;

  if (payload.days.length === 0) {
    ctx.fillStyle = 'rgba(16, 185, 129, 0.06)';
    drawRoundRect(ctx, paddingX, curY, contentWidth, 90, 18);
    ctx.fill();

    ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)';
    ctx.lineWidth = 1;
    drawRoundRect(ctx, paddingX, curY, contentWidth, 90, 18);
    ctx.stroke();

    ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#34d399';
    ctx.fillText('✨ No hay evaluaciones ni tareas programadas en este mes', paddingX + 28, curY + 52);

    curY += 108;
  } else {
    for (let i = 0; i < payload.days.length; i++) {
      const day = payload.days[i];
      const cardH = dayHeights[i];
      const hasReminders = day.reminders.length > 0;
      const itemsCount = day.reminders.length + day.tasks.length;

      // Tarjeta del día
      ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
      drawRoundRect(ctx, paddingX, curY, contentWidth, cardH, 16);
      ctx.fill();

      ctx.strokeStyle = day.isToday
        ? 'rgba(59, 130, 246, 0.45)'
        : hasReminders
          ? 'rgba(245, 158, 11, 0.22)'
          : 'rgba(255, 255, 255, 0.07)';
      ctx.lineWidth = day.isToday ? 2 : 1;
      drawRoundRect(ctx, paddingX, curY, contentWidth, cardH, 16);
      ctx.stroke();

      // Pastilla de fecha a la izquierda
      const badgeW = 160;
      const badgeH = 46;
      const badgeX = paddingX + 16;
      const badgeY = itemsCount === 1 ? curY + (cardH - badgeH) / 2 : curY + 16;

      ctx.fillStyle = hasReminders
        ? 'rgba(245, 158, 11, 0.14)'
        : 'rgba(148, 163, 184, 0.12)';
      drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, 12);
      ctx.fill();

      ctx.strokeStyle = hasReminders
        ? 'rgba(245, 158, 11, 0.35)'
        : 'rgba(148, 163, 184, 0.25)';
      ctx.lineWidth = 1;
      drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, 12);
      ctx.stroke();

      const shortBadge = formatShortDateBadge(day.dateStr);
      ctx.font = '700 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = hasReminders ? '#fbbf24' : '#cbd5e1';
      ctx.textAlign = 'center';
      ctx.fillText(shortBadge, badgeX + badgeW / 2, badgeY + 28);
      ctx.textAlign = 'left';

      if (day.isToday && itemsCount > 1) {
        ctx.fillStyle = '#2563eb';
        drawRoundRect(ctx, badgeX + 54, badgeY + badgeH + 8, 52, 20, 6);
        ctx.fill();

        ctx.font = '700 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('HOY', badgeX + 66, badgeY + badgeH + 22);
      }

      // Contenido a la derecha de la pastilla
      const textX = badgeX + badgeW + 20;
      let itemY = curY + 34;
      const maxTextW = contentWidth - (badgeW + 56);

      // 1. Evaluaciones
      for (const r of day.reminders) {
        ctx.font = '700 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#f59e0b';
        ctx.fillText('🚩', textX, itemY);

        if (r.hora) {
          ctx.fillStyle = '#fbbf24';
          ctx.fillText(r.hora, textX + 30, itemY);
          const timeW = ctx.measureText(r.hora).width;

          ctx.fillStyle = '#fef3c7';
          const safeTitle = truncateText(ctx, ` · ${r.title}`, maxTextW - 30 - timeW);
          ctx.fillText(safeTitle, textX + 30 + timeW, itemY);
        } else {
          ctx.fillStyle = '#fef3c7';
          const safeTitle = truncateText(ctx, r.title, maxTextW - 30);
          ctx.fillText(safeTitle, textX + 30, itemY);
        }
        itemY += 38;
      }

      // 2. Tareas
      for (const t of day.tasks) {
        ctx.font = '500 19px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('•', textX + 6, itemY);

        if (t.hora) {
          ctx.fillStyle = '#cbd5e1';
          ctx.fillText(`${t.hora} · `, textX + 30, itemY);
          const timeW = ctx.measureText(`${t.hora} · `).width;

          ctx.fillStyle = '#e2e8f0';
          const safeTitle = truncateText(ctx, t.title, maxTextW - 30 - timeW);
          ctx.fillText(safeTitle, textX + 30 + timeW, itemY);
        } else {
          ctx.fillStyle = '#e2e8f0';
          const safeTitle = truncateText(ctx, t.title, maxTextW - 30);
          ctx.fillText(safeTitle, textX + 30, itemY);
        }
        itemY += 38;
      }

      curY += cardH + rowGap;
    }
  }

  renderFooter(ctx, width, paddingX, curY);
}

/* ------------------------------------------------ Helpers Comunes de Canvas */

function renderSummaryChips(
  ctx: CanvasRenderingContext2D,
  payload: ExportSchedulePayload,
  startX: number,
  y: number
) {
  const chips: { label: string; bg: string; text: string }[] = [];
  if (payload.summary.totalReminders > 0) {
    chips.push({
      label: `🚩 ${payload.summary.totalReminders} ${payload.summary.totalReminders === 1 ? 'Evaluación' : 'Evaluaciones'}`,
      bg: 'rgba(245, 158, 11, 0.16)',
      text: '#fbbf24',
    });
  }
  if (payload.summary.totalClasses > 0) {
    chips.push({
      label: `📚 ${payload.summary.totalClasses} Clases`,
      bg: 'rgba(56, 189, 248, 0.16)',
      text: '#38bdf8',
    });
  }
  if (payload.summary.totalTasks > 0) {
    chips.push({
      label: `✓ ${payload.summary.totalTasks} ${payload.summary.totalTasks === 1 ? 'Tarea' : 'Tareas'}`,
      bg: 'rgba(148, 163, 184, 0.16)',
      text: '#cbd5e1',
    });
  }

  let chipX = startX;
  ctx.font = '600 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  for (const c of chips) {
    const textWidth = ctx.measureText(c.label).width;
    const chipW = textWidth + 24;
    const chipH = 30;

    ctx.fillStyle = c.bg;
    drawRoundRect(ctx, chipX, y - 20, chipW, chipH, 15);
    ctx.fill();

    ctx.fillStyle = c.text;
    ctx.fillText(c.label, chipX + 12, y);
    chipX += chipW + 10;
  }
}

function drawDivider(
  ctx: CanvasRenderingContext2D,
  x1: number,
  x2: number,
  y: number
) {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
}

function renderFooter(
  ctx: CanvasRenderingContext2D,
  width: number,
  paddingX: number,
  curY: number
) {
  curY += 12;
  drawDivider(ctx, paddingX, width - paddingX, curY);

  curY += 26;
  ctx.font = '500 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.fillText('Generado desde Organizer · PWA Personal', paddingX, curY);

  const nowStr = new Date().toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  const dateW = ctx.measureText(`Actualizado: ${nowStr}`).width;
  ctx.fillText(`Actualizado: ${nowStr}`, width - paddingX - dateW, curY);
}

/* ------------------------------------------------ Acciones de Compartición */

export async function exportCanvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('No se pudo generar la imagen del calendario'));
    }, 'image/png');
  });
}

export async function copyCanvasImageToClipboard(canvas: HTMLCanvasElement): Promise<boolean> {
  try {
    const blob = await exportCanvasToBlob(canvas);
    if (!navigator.clipboard || !window.ClipboardItem) return false;
    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': blob,
      }),
    ]);
    return true;
  } catch (err) {
    console.warn('Fallo al copiar imagen al portapapeles:', err);
    return false;
  }
}

export async function shareCanvasImage(
  canvas: HTMLCanvasElement,
  filename = 'agenda-semanal.png',
  title = 'Mi Agenda'
): Promise<boolean> {
  try {
    const blob = await exportCanvasToBlob(canvas);
    const file = new File([blob], filename, { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title,
      });
      return true;
    }
    return false;
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      console.warn('Fallo en navigator.share:', err);
    }
    return false;
  }
}

export function downloadCanvasImage(canvas: HTMLCanvasElement, filename = 'agenda-semanal.png') {
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
