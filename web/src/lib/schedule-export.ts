/* ============================================================================
   Organizer · Exportación y Compartición de Agenda
   
   Genera salidas de alta fidelidad (imagen PNG de alta resolución y texto
   formateado para WhatsApp) para compartir con amigos o familiares y mostrar
   con claridad el estado de la agenda (clases, evaluaciones/reminders y tareas),
   o los días que están despejados/libres para hacer planes.
   ========================================================================= */

import type { Fd4WeekData, Fd4DayData, Fd4MonthData } from './fd4-calendar';

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

export function buildMonthExportPayload(data: Fd4MonthData): ExportSchedulePayload {
  const reminders = data.reminders.map((r) => ({
    id: r.id,
    title: r.title,
    hora: r.when,
    dateStr: r.dateStr,
  }));

  // Agrupar previews de los días con actividades
  const daysWithEvents: ExportScheduleDay[] = [];
  const sortedDates = Object.keys(data.previews).sort();

  for (const dateStr of sortedDates) {
    const preview = data.previews[dateStr];
    if (!preview || preview.events.length === 0) continue;

    const dayReminders = preview.events
      .filter((e) => e.kind === 'reminder')
      .map((e) => ({ title: e.title, hora: e.hora ?? '' }));
    const dayTasks = preview.events
      .filter((e) => e.kind === 'task')
      .map((e) => ({ title: e.title, hora: e.hora ?? '' }));

    if (dayReminders.length > 0 || dayTasks.length > 0) {
      daysWithEvents.push({
        dateStr,
        label: preview.label,
        hint: preview.hint,
        isToday: preview.hint === 'Hoy',
        free: false,
        classes: [],
        reminders: dayReminders,
        tasks: dayTasks,
      });
    }
  }

  return {
    view: 'mes',
    title: `Mes: ${data.title}`,
    subtitle: `${reminders.length} evaluaciones programadas`,
    period: data.title,
    days: daysWithEvents,
    summary: {
      totalClasses: 0,
      totalReminders: reminders.length,
      totalTasks: daysWithEvents.reduce((acc, d) => acc + d.tasks.length, 0),
    },
  };
}

/* ------------------------------------------------ Formato Texto (WhatsApp) */

export function formatScheduleAsText(payload: ExportSchedulePayload): string {
  const lines: string[] = [];
  lines.push(`📅 *${payload.title}*`);
  if (payload.subtitle) lines.push(`_${payload.subtitle}_\n`);

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

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
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

  // 1. Pre-cálculo de altura según contenido
  let calculatedHeight = 220; // Header y padding superior
  const dayHeights: number[] = [];

  for (const day of payload.days) {
    if (day.free) {
      const h = 76;
      dayHeights.push(h);
      calculatedHeight += h + 14;
    } else {
      let itemsCount = day.reminders.length + day.classes.length + day.tasks.length;
      if (itemsCount === 0) itemsCount = 1;
      const h = Math.max(90, 48 + itemsCount * 36);
      dayHeights.push(h);
      calculatedHeight += h + 14;
    }
  }

  calculatedHeight += 100; // Footer y padding inferior

  canvas.width = width;
  canvas.height = calculatedHeight;

  // Fondo Titanium Dark elegante
  const bgGrad = ctx.createLinearGradient(0, 0, 0, calculatedHeight);
  bgGrad.addColorStop(0, '#0c0f17');
  bgGrad.addColorStop(1, '#151922');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, calculatedHeight);

  // Borde sutil del marco
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  roundRect(ctx, 16, 16, width - 32, calculatedHeight - 32, 28);
  ctx.stroke();

  // --- HEADER ---
  let curY = 64;

  // Badge superior
  ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.letterSpacing = '1.5px';
  ctx.fillText('ORGANIZER · AGENDA PERSONAL', paddingX, curY);
  ctx.letterSpacing = '0px';

  curY += 42;

  // Título principal
  ctx.font = '700 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(payload.title, paddingX, curY);

  curY += 38;

  // Chips resumen en fila
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

  let chipX = paddingX;
  ctx.font = '600 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  for (const c of chips) {
    const textWidth = ctx.measureText(c.label).width;
    const chipW = textWidth + 24;
    const chipH = 30;

    ctx.fillStyle = c.bg;
    roundRect(ctx, chipX, curY - 20, chipW, chipH, 15);
    ctx.fill();

    ctx.fillStyle = c.text;
    ctx.fillText(c.label, chipX + 12, curY);
    chipX += chipW + 10;
  }

  curY += 36;

  // Separador sutil
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(paddingX, curY);
  ctx.lineTo(width - paddingX, curY);
  ctx.stroke();

  curY += 24;

  // --- TARJETAS DE DÍAS ---
  for (let i = 0; i < payload.days.length; i++) {
    const day = payload.days[i];
    const cardH = dayHeights[i];
    const cardY = curY;

    // Fondo de tarjeta del día
    ctx.fillStyle = day.isToday ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255, 255, 255, 0.035)';
    roundRect(ctx, paddingX, cardY, contentWidth, cardH, 18);
    ctx.fill();

    ctx.strokeStyle = day.isToday ? 'rgba(59, 130, 246, 0.35)' : 'rgba(255, 255, 255, 0.06)';
    roundRect(ctx, paddingX, cardY, contentWidth, cardH, 18);
    ctx.stroke();

    // Columna izquierda: Nombre del día (Lunes 14, etc.)
    const leftColX = paddingX + 22;
    const titleY = cardY + 34;

    ctx.font = '700 21px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = day.isToday ? '#60a5fa' : '#ffffff';
    ctx.fillText(day.label, leftColX, titleY);

    if (day.isToday) {
      // Badge Hoy
      ctx.font = '700 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#2563eb';
      roundRect(ctx, leftColX, titleY + 10, 48, 20, 6);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText('HOY', leftColX + 11, titleY + 24);
    }

    // Columna derecha: Actividades o Día Libre
    const rightColX = paddingX + 240;
    let itemY = cardY + 32;

    if (day.free) {
      ctx.font = '600 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#34d399';
      ctx.fillText('✨ Despejado · Disponible para planes', rightColX, cardY + cardH / 2 + 6);
    } else {
      // 1. Evaluaciones / Reminders
      for (const r of day.reminders) {
        ctx.font = '700 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#f59e0b';
        ctx.fillText('🚩', rightColX, itemY);

        if (r.hora) {
          ctx.fillStyle = '#fbbf24';
          ctx.fillText(r.hora, rightColX + 26, itemY);
          const timeWidth = ctx.measureText(r.hora).width;
          ctx.fillStyle = '#fef3c7';
          ctx.fillText(` · ${r.title}`, rightColX + 26 + timeWidth, itemY);
        } else {
          ctx.fillStyle = '#fef3c7';
          ctx.fillText(r.title, rightColX + 26, itemY);
        }
        itemY += 34;
      }

      // 2. Clases
      for (const c of day.classes) {
        ctx.font = '600 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('📚', rightColX, itemY);

        if (c.hora) {
          ctx.fillStyle = '#7dd3fc';
          ctx.fillText(c.hora, rightColX + 26, itemY);
          const timeWidth = ctx.measureText(c.hora).width;
          ctx.fillStyle = '#e0f2fe';
          ctx.fillText(` · ${c.title}`, rightColX + 26 + timeWidth, itemY);
        } else {
          ctx.fillStyle = '#e0f2fe';
          ctx.fillText(c.title, rightColX + 26, itemY);
        }
        itemY += 34;
      }

      // 3. Tareas
      for (const t of day.tasks) {
        ctx.font = '500 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('•', rightColX + 4, itemY);

        if (t.hora) {
          ctx.fillStyle = '#cbd5e1';
          ctx.fillText(`${t.hora} · `, rightColX + 26, itemY);
          const timeWidth = ctx.measureText(`${t.hora} · `).width;
          ctx.fillStyle = '#e2e8f0';
          ctx.fillText(t.title, rightColX + 26 + timeWidth, itemY);
        } else {
          ctx.fillStyle = '#cbd5e1';
          ctx.fillText(t.title, rightColX + 26, itemY);
        }
        itemY += 34;
      }
    }

    curY += cardH + 14;
  }

  // --- FOOTER ---
  curY += 12;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.beginPath();
  ctx.moveTo(paddingX, curY);
  ctx.lineTo(width - paddingX, curY);
  ctx.stroke();

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
