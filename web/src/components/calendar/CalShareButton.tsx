'use client';

/* ============================================================================
   Organizer · <CalShareButton>
   
   Botón en la cabecera del calendario para abrir la hoja de exportación y
   compartición de la agenda.
   ========================================================================= */

import { useState } from 'react';
import { Glyph } from '@/components/ios/Glyph';
import { ShareScheduleSheet } from './ShareScheduleSheet';
import type { ExportSchedulePayload } from '@/lib/schedule-export';

export function CalShareButton({ payload }: { payload: ExportSchedulePayload }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fd-btn fd-btn--icon"
        aria-label="Compartir agenda"
        title="Compartir o exportar agenda"
      >
        <Glyph name="share" style={{ width: 18, height: 18 }} />
      </button>

      {open && (
        <ShareScheduleSheet
          open={open}
          onClose={() => setOpen(false)}
          payload={payload}
        />
      )}
    </>
  );
}
