/* ============================================================================
   Organizer · FD4 · Añadir

   CAPTURAR CUESTA 0 FRICCION (regla 3 del proyecto).

   Un campo. Sin etiqueta, sin fecha, sin categoria, sin prioridad, sin nada
   obligatorio. Se escribe y se guarda. Se clasifica despues, o nunca.

   Esta pantalla ya no redirige a `/dia?anadir=1` como en F2: en FD4 capturar
   dejo de ser una hoja encima del calendario y paso a ser el boton del medio
   de la barra, que lleva aqui. El motivo es que la hoja obligaba a que
   hubiera un calendario debajo, y capturar pasa de pie, en el pasillo, sin
   contexto ninguno.

   Lo que el prototipo dibuja aqui y esta pantalla NO dibuja: un teclado.
   Alli era un teclado de mentira, pintado, para ensenar cuanto sitio deja.
   Aqui el teclado es el del iPhone y sale solo, porque el campo se enfoca al
   entrar. Pintar uno falso debajo del real seria absurdo.
   ========================================================================= */

import { DeskSidebar } from '@/components/fd4/DeskSidebar';
import { getTodayString } from '@/lib/date-utils';
import { DEFAULT_TIMEZONE } from '@/lib/profile';
import { CaptureForm } from './CaptureForm';

export const dynamic = 'force-dynamic';

export default function AnadirPage() {
  return (
    <div className="fd-app">
      <DeskSidebar active="inicio" todayStr={getTodayString(DEFAULT_TIMEZONE)} />

      <CaptureForm />
    </div>
  );
}
