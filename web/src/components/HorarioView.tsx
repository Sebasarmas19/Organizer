'use client';

/* ============================================================================
   Organizer · <HorarioView> (F2 · decisiones 26, 54 · app/comps/horario.html)

   Carga UNA semana y se replica CINCO meses.
   El mayor trabajo manual del proyecto y la única barrera real de entrada:
   - Permite repetir una materia en varios días con un solo toque (L M X J V S D).
   - Permite duplicar materias.
   - Permite añadir "Otro horario para esta materia" (ej. teoría vs lab).
   - Rango del semestre configurado una sola vez.
   - Idempotente al materializarse a blocks.
   ========================================================================= */

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from './Icon';
import type { ClassTemplate } from '@/lib/supabase/database.types';
import { saveScheduleTemplatesAction } from '@/lib/calendar-actions';

type SubjectSlot = {
  id: string;
  days: number[]; // 0=D, 1=L, 2=M, 3=X, 4=J, 5=V, 6=S
  startTime: string; // "08:00"
  endTime: string; // "10:00"
  room: string;
};

type SubjectForm = {
  id: string;
  title: string;
  notify: boolean;
  slots: SubjectSlot[];
};

// Días en orden L M X J V S D
const DAYS_ORDER = [
  { dow: 1, label: 'L' },
  { dow: 2, label: 'M' },
  { dow: 3, label: 'X' },
  { dow: 4, label: 'J' },
  { dow: 5, label: 'V' },
  { dow: 6, label: 'S' },
  { dow: 0, label: 'D' },
];

export function HorarioView({
  initialTemplates,
  initialActiveFrom = '2026-09-15',
  initialActiveUntil = '2027-02-20',
}: {
  initialTemplates: ClassTemplate[];
  initialActiveFrom?: string;
  initialActiveUntil?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [activeFrom, setActiveFrom] = useState(initialActiveFrom);
  const [activeUntil, setActiveUntil] = useState(initialActiveUntil);

  // Agrupar initialTemplates por título
  const buildInitialSubjects = (): SubjectForm[] => {
    if (initialTemplates.length === 0) {
      return [
        {
          id: 's-1',
          title: 'Cálculo III',
          notify: false,
          slots: [
            {
              id: 'sl-1',
              days: [1, 3, 5], // L, X, V
              startTime: '08:00',
              endTime: '09:30',
              room: 'Aula 204',
            },
          ],
        },
        {
          id: 's-2',
          title: 'Álgebra Lineal',
          notify: false,
          slots: [
            {
              id: 'sl-2',
              days: [2, 4], // M, J
              startTime: '11:00',
              endTime: '12:30',
              room: 'Aula 112',
            },
            {
              id: 'sl-3',
              days: [3], // X
              startTime: '14:00',
              endTime: '16:00',
              room: 'Lab 3',
            },
          ],
        },
      ];
    }

    const byTitle = new Map<string, ClassTemplate[]>();
    for (const t of initialTemplates) {
      const list = byTitle.get(t.title) || [];
      list.push(t);
      byTitle.set(t.title, list);
    }

    const res: SubjectForm[] = [];
    let idx = 1;
    for (const [title, tmpls] of byTitle.entries()) {
      // Agrupar por horario (start_time + end_time)
      const slotsMap = new Map<string, { days: number[]; startTime: string; endTime: string }>();
      let hasNotify = false;

      for (const t of tmpls) {
        const timeKey = `${t.start_time}-${t.end_time}`;
        if (t.reminder_min && t.reminder_min > 0) hasNotify = true;

        const s = slotsMap.get(timeKey) || {
          days: [],
          startTime: t.start_time.slice(0, 5),
          endTime: t.end_time.slice(0, 5),
        };
        s.days.push(t.weekday);
        slotsMap.set(timeKey, s);
      }

      res.push({
        id: `s-${idx++}`,
        title,
        notify: hasNotify,
        slots: Array.from(slotsMap.values()).map((s, slIdx) => ({
          id: `sl-${idx}-${slIdx}`,
          days: s.days,
          startTime: s.startTime,
          endTime: s.endTime,
          room: '',
        })),
      });
    }

    return res;
  };

  const [subjects, setSubjects] = useState<SubjectForm[]>(buildInitialSubjects);

  const updateSubjectTitle = (sId: string, title: string) => {
    setSubjects((prev) =>
      prev.map((s) => (s.id === sId ? { ...s, title } : s))
    );
  };

  const toggleSubjectNotify = (sId: string) => {
    setSubjects((prev) =>
      prev.map((s) => (s.id === sId ? { ...s, notify: !s.notify } : s))
    );
  };

  const duplicateSubject = (sId: string) => {
    const s = subjects.find((item) => item.id === sId);
    if (!s) return;
    const newSubject: SubjectForm = {
      ...s,
      id: `s-${Date.now()}`,
      title: `${s.title} (copia)`,
      slots: s.slots.map((sl) => ({
        ...sl,
        id: `sl-${Date.now()}-${Math.random()}`,
      })),
    };
    setSubjects((prev) => [...prev, newSubject]);
  };

  const deleteSubject = (sId: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== sId));
  };

  const toggleSlotDay = (sId: string, slId: string, dow: number) => {
    setSubjects((prev) =>
      prev.map((s) => {
        if (s.id !== sId) return s;
        return {
          ...s,
          slots: s.slots.map((sl) => {
            if (sl.id !== slId) return sl;
            const has = sl.days.includes(dow);
            return {
              ...sl,
              days: has ? sl.days.filter((d) => d !== dow) : [...sl.days, dow],
            };
          }),
        };
      })
    );
  };

  const updateSlotTime = (
    sId: string,
    slId: string,
    field: 'startTime' | 'endTime' | 'room',
    val: string
  ) => {
    setSubjects((prev) =>
      prev.map((s) => {
        if (s.id !== sId) return s;
        return {
          ...s,
          slots: s.slots.map((sl) => {
            if (sl.id !== slId) return sl;
            return { ...sl, [field]: val };
          }),
        };
      })
    );
  };

  const addSlotToSubject = (sId: string) => {
    setSubjects((prev) =>
      prev.map((s) => {
        if (s.id !== sId) return s;
        return {
          ...s,
          slots: [
            ...s.slots,
            {
              id: `sl-${Date.now()}`,
              days: [1],
              startTime: '14:00',
              endTime: '16:00',
              room: '',
            },
          ],
        };
      })
    );
  };

  const removeSlotFromSubject = (sId: string, slId: string) => {
    setSubjects((prev) =>
      prev.map((s) => {
        if (s.id !== sId) return s;
        return {
          ...s,
          slots: s.slots.filter((sl) => sl.id !== slId),
        };
      })
    );
  };

  const addSubject = () => {
    setSubjects((prev) => [
      ...prev,
      {
        id: `s-${Date.now()}`,
        title: '',
        notify: false,
        slots: [
          {
            id: `sl-${Date.now()}`,
            days: [1],
            startTime: '08:00',
            endTime: '10:00',
            room: '',
          },
        ],
      },
    ]);
  };

  const handleSave = () => {
    setErrorMsg(null);
    setSavedSuccess(false);

    // Expandir materias a filas de schedule_templates:
    // Cada día seleccionado en cada slot es una plantilla (title, weekday, startTime, endTime)
    const templatesToSave: {
      title: string;
      weekday: number;
      startTime: string;
      endTime: string;
      reminderMin?: number | null;
    }[] = [];

    for (const s of subjects) {
      if (!s.title.trim()) continue;
      for (const sl of s.slots) {
        if (!sl.startTime || !sl.endTime) continue;
        for (const dow of sl.days) {
          templatesToSave.push({
            title: s.title.trim(),
            weekday: dow,
            startTime: sl.startTime,
            endTime: sl.endTime,
            reminderMin: s.notify ? 15 : null,
          });
        }
      }
    }

    startTransition(async () => {
      const res = await saveScheduleTemplatesAction({
        activeFrom,
        activeUntil,
        templates: templatesToSave,
      });

      if (res.ok) {
        setSavedSuccess(true);
        router.refresh();
      } else {
        setErrorMsg(res.error || 'Error al guardar el horario');
      }
    });
  };

  return (
    <main className="screen flex flex-col">
      {/* Botones de acción arriba */}
      <div
        className="flex items-center justify-between gutter"
        style={{ paddingBlock: 'var(--space-2)' }}
      >
        <Link href="/semana" className="taptext taptext--quiet t-meta no-underline" aria-label="Volver">
          <Icon name="chevron-left" size="sm" />
          Volver
        </Link>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="taptext t-meta font-semibold"
          style={{ color: 'var(--task)' }}
        >
          {isPending ? 'Guardando...' : 'Listo'}
        </button>
      </div>

      <header className="pagehead" style={{ paddingBottom: 'var(--space-2)' }}>
        <div>
          <h1 className="t-title">Tu horario</h1>
          <p className="t-meta c-muted">Se carga una vez y dura todo el semestre.</p>
        </div>
      </header>

      {errorMsg ? (
        <div className="gutter mb-2">
          <p className="t-label text-red-600">{errorMsg}</p>
        </div>
      ) : null}

      {savedSuccess ? (
        <div className="gutter mb-2">
          <p className="t-label text-green-700 font-medium">
            ✓ Horario guardado y materializado para todo el semestre.
          </p>
        </div>
      ) : null}

      {/* Rango del semestre, una sola vez (decisión 54) */}
      <div className="gutter pb-4">
        <p className="sublabel">El semestre va de</p>
        <div className="timepair">
          <input
            type="date"
            className="field"
            value={activeFrom}
            onChange={(e) => setActiveFrom(e.target.value)}
          />
          <span className="c-faint">a</span>
          <input
            type="date"
            className="field"
            value={activeUntil}
            onChange={(e) => setActiveUntil(e.target.value)}
          />
        </div>
      </div>

      {/* Lista de materias */}
      <div className="gutter flex flex-col gap-4 pb-12">
        {subjects.map((sub) => (
          <div key={sub.id} className="matcard">
            <div className="matcard__head">
              <input
                className="field t-body text-ink"
                style={{ flex: '1 1 auto' }}
                value={sub.title}
                onChange={(e) => updateSubjectTitle(sub.id, e.target.value)}
                placeholder="Nombre de la materia (ej. Cálculo III)"
              />
              <button
                type="button"
                className="tapicon"
                aria-label={`Duplicar ${sub.title || 'materia'}`}
                onClick={() => duplicateSubject(sub.id)}
              >
                <Icon name="copy" size="sm" />
              </button>
              <button
                type="button"
                className="tapicon text-muted"
                aria-label={`Eliminar ${sub.title || 'materia'}`}
                onClick={() => deleteSubject(sub.id)}
              >
                <Icon name="trash" size="sm" />
              </button>
            </div>

            {/* Slots de horario de esta materia */}
            {sub.slots.map((slot, slIdx) => (
              <div key={slot.id} className="slot mt-4">
                <div className="flex items-center justify-between">
                  <p className="sublabel" style={{ margin: 0 }}>
                    {slIdx === 0 ? 'Se repite' : 'Y también'}
                  </p>
                  {sub.slots.length > 1 ? (
                    <button
                      type="button"
                      className="tapicon"
                      aria-label="Quitar este horario"
                      onClick={() => removeSlotFromSubject(sub.id, slot.id)}
                      style={{ marginRight: 'calc(var(--space-2) * -1)' }}
                    >
                      <Icon name="trash" size="sm" />
                    </button>
                  ) : null}
                </div>

                {/* Días L M X J V S D */}
                <div
                  className="dayset mt-2"
                  role="group"
                  aria-label={`Días de ${sub.title}`}
                >
                  {DAYS_ORDER.map(({ dow, label }) => {
                    const isPressed = slot.days.includes(dow);
                    return (
                      <button
                        key={dow}
                        type="button"
                        aria-pressed={isPressed}
                        onClick={() => toggleSlotDay(sub.id, slot.id, dow)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Horas e información de aula */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-3">
                  <div className="timepair flex-1">
                    <input
                      type="time"
                      className="field t-body text-ink num"
                      value={slot.startTime}
                      onChange={(e) => updateSlotTime(sub.id, slot.id, 'startTime', e.target.value)}
                      aria-label="Hora de inicio"
                    />
                    <span className="c-faint">–</span>
                    <input
                      type="time"
                      className="field t-body text-ink num"
                      value={slot.endTime}
                      onChange={(e) => updateSlotTime(sub.id, slot.id, 'endTime', e.target.value)}
                      aria-label="Hora de fin"
                    />
                  </div>
                  <input
                    type="text"
                    className="field t-meta c-muted sm:w-36"
                    value={slot.room}
                    onChange={(e) => updateSlotTime(sub.id, slot.id, 'room', e.target.value)}
                    placeholder="Aula / Lab"
                    aria-label="Aula o laboratorio"
                  />
                </div>
              </div>
            ))}

            {/* Añadir otro horario (ej. lab a otra hora) */}
            <button
              type="button"
              className="taptext t-label mt-3"
              onClick={() => addSlotToSubject(sub.id)}
            >
              <Icon name="plus" size="sm" />
              Otro horario para esta materia
            </button>

            {/* Interruptor de aviso antes de clase (decisión 26) */}
            <button
              type="button"
              className="toggle mt-1"
              aria-pressed={sub.notify}
              onClick={() => toggleSubjectNotify(sub.id)}
              style={{ paddingInline: 0 }}
            >
              <span className="toggle__label">Avisarme antes de clase</span>
              <span className="toggle__switch" aria-hidden="true" />
            </button>
          </div>
        ))}

        {/* Añadir otra materia */}
        <button
          type="button"
          className="btn btn--full mt-4"
          onClick={addSubject}
        >
          <Icon name="plus" size="sm" />
          Otra materia
        </button>

        <p className="t-label c-faint mt-4" style={{ paddingBottom: 'var(--space-6)' }}>
          Con esto basta: la semana se repite sola hasta el final del semestre.
          Si cambia algo a mitad de semestre, se edita aquí y se vuelve a repartir.
        </p>
      </div>
    </main>
  );
}
