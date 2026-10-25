'use client';

/* ============================================================================
   Organizer · <ShareScheduleSheet>
   
   Hoja modal para compartir o exportar la agenda (Semana, Día, Mes) como
   imagen PNG de alta resolución (Titanium Dark) o como texto formateado con
   emojis y viñetas para WhatsApp.
   ========================================================================= */

import { useEffect, useRef, useState } from 'react';
import { Sheet } from '@/components/ios/Sheet';
import { Glyph } from '@/components/ios/Glyph';
import { Icon } from '@/components/Icon';
import {
  type ExportSchedulePayload,
  renderScheduleCard,
  copyCanvasImageToClipboard,
  shareCanvasImage,
  downloadCanvasImage,
  formatScheduleAsText,
} from '@/lib/schedule-export';

export function ShareScheduleSheet({
  open,
  onClose,
  payload,
}: {
  open: boolean;
  onClose: () => void;
  payload: ExportSchedulePayload;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [tab, setTab] = useState<'imagen' | 'texto'>('imagen');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  // Renderizar la imagen al abrir la hoja o cambiar los datos
  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      renderScheduleCard(canvas, payload);
      try {
        const url = canvas.toDataURL('image/png');
        setPreviewUrl(url);
      } catch (err) {
        console.warn('Error al generar preview:', err);
      }
    }, 60);

    return () => clearTimeout(timer);
  }, [open, payload]);

  // Limpiar toast tras unos segundos
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  const filename =
    payload.view === 'semana'
      ? `agenda-semana-${payload.days[0]?.dateStr || 'export'}.png`
      : payload.view === 'dia'
        ? `agenda-dia-${payload.days[0]?.dateStr || 'export'}.png`
        : `agenda-mes.png`;

  const handleShareImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsSharing(true);
    const shared = await shareCanvasImage(canvas, filename, payload.title);
    setIsSharing(false);

    if (!shared) {
      // Fallback a copiar imagen si el dispositivo no soporta share o canceló
      const copied = await copyCanvasImageToClipboard(canvas);
      if (copied) {
        setToastMessage('¡Imagen copiada al portapapeles! Puedes pegarla en WhatsApp');
      } else {
        downloadCanvasImage(canvas, filename);
        setToastMessage('Imagen descargada');
      }
    }
  };

  const handleCopyImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const copied = await copyCanvasImageToClipboard(canvas);
    if (copied) {
      setToastMessage('¡Imagen copiada! Pégala directamente en WhatsApp');
    } else {
      downloadCanvasImage(canvas, filename);
      setToastMessage('Navegador no permite copiar PNG. Se descargó el archivo.');
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    downloadCanvasImage(canvas, filename);
    setToastMessage('Descargando imagen…');
  };

  const handleCopyText = async () => {
    const text = formatScheduleAsText(payload);
    try {
      await navigator.clipboard.writeText(text);
      setToastMessage('¡Texto para WhatsApp copiado!');
    } catch {
      setToastMessage('No se pudo copiar el texto automáticamente');
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Compartir agenda"
      subtitle={payload.subtitle || payload.period}
    >
      <div className="flex flex-col gap-4 p-4 pb-8 max-w-lg mx-auto w-full">
        {/* Selector de formato: Segmented control nativo de iOS */}
        <div className="fd-seg w-full flex" role="tablist" aria-label="Formato de exportación">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'imagen'}
            onClick={() => setTab('imagen')}
            className="flex-1 py-2 text-xs font-semibold text-center transition-all"
          >
            Tarjeta PNG
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'texto'}
            onClick={() => setTab('texto')}
            className="flex-1 py-2 text-xs font-semibold text-center transition-all"
          >
            Texto WhatsApp
          </button>
        </div>

        {/* Feedback Toast */}
        {toastMessage && (
          <div
            className="p-3 text-xs font-medium rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-2 animate-in fade-in"
            role="status"
          >
            <Glyph name="check" className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Canvas oculto donde se dibuja el gráfico de alta resolución */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {tab === 'imagen' ? (
          <>
            {/* Vista previa de la tarjeta */}
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-slate-950/80 shadow-2xl max-h-[460px] overflow-y-auto">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Vista previa de agenda"
                  className="w-full h-auto block select-none"
                />
              ) : (
                <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-500">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs">Generando tarjeta en alta resolución…</span>
                </div>
              )}
            </div>

            {/* Acciones principales */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={handleShareImage}
                disabled={isSharing || !previewUrl}
                className="in-btn in-btn--pri io-press w-full py-3 flex items-center justify-center gap-2 font-semibold text-sm shadow-lg shadow-blue-500/20"
              >
                <Glyph name="share" className="w-4 h-4" />
                <span>{isSharing ? 'Abriendo opciones…' : 'Compartir imagen'}</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCopyImage}
                  disabled={!previewUrl}
                  className="in-btn in-btn--soft io-press py-2.5 text-xs font-semibold flex items-center justify-center gap-2"
                >
                  <Icon name="copy" size="sm" />
                  <span>Copiar imagen</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={!previewUrl}
                  className="in-btn in-btn--soft io-press py-2.5 text-xs font-semibold flex items-center justify-center gap-2"
                >
                  <Icon name="arrow-down" size="sm" />
                  <span>Guardar PNG</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Vista previa del texto WhatsApp */}
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 max-h-[380px] overflow-y-auto font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap select-all">
              {formatScheduleAsText(payload)}
            </div>

            <button
              type="button"
              onClick={handleCopyText}
              className="in-btn in-btn--pri io-press w-full py-3 flex items-center justify-center gap-2 font-semibold text-sm shadow-lg shadow-blue-500/20"
            >
              <Icon name="copy" size="sm" />
              <span>Copiar texto para WhatsApp</span>
            </button>
          </>
        )}
      </div>
    </Sheet>
  );
}
