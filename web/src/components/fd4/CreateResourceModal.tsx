'use client';

/* ============================================================================
   Organizer · <CreateResourceModal>  ·  añadir a Recursos

   Una hoja de iOS (ios/Sheet) con un formulario agrupado, como Ajustes:
   título y enlace arriba, el tipo en chips, notas y etiquetas debajo, y el
   botón de guardar dentro de la hoja. Solo el título hace falta (regla 3:
   capturar cuesta 0 fricción). La hoja vive en <body>, así que la barra de
   pestañas ya no la tapa.
   ========================================================================= */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { KIND_SINGULAR, type ResourceKind } from '@/lib/fd4-resources';
import { createResourceAction } from '@/lib/resources-actions';
import { Sheet } from '@/components/ios/Sheet';

const KINDS: ResourceKind[] = ['tool', 'skill', 'article', 'repo', 'video', 'other'];

export function CreateResourceModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [kind, setKind] = useState<ResourceKind>('tool');
  const [notes, setNotes] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Ponle un título para poder guardarlo.');
      return;
    }

    const tags = tagsStr
      .split(/[,\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    startTransition(async () => {
      try {
        await createResourceAction({
          title: title.trim(),
          url: url.trim() || undefined,
          kind,
          notes: notes.trim() || undefined,
          tags,
        });
        setTitle('');
        setUrl('');
        setNotes('');
        setTagsStr('');
        setErrorMsg('');
        router.refresh();
        onClose();
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'No se pudo guardar. Inténtalo otra vez.');
      }
    });
  };

  return (
    <Sheet open={isOpen} onClose={onClose} title="Añadir a Recursos">
      <form onSubmit={handleSubmit} className="io-form">
        <div className="io-group">
          <label className="io-field">
            <span className="io-sr">Título</span>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="Título"
              autoComplete="off"
            />
          </label>
          <label className="io-field">
            <span className="io-sr">Enlace</span>
            <input
              type="url"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enlace (opcional)"
              autoComplete="off"
              autoCapitalize="off"
            />
          </label>
        </div>

        <p className="io-form__label" id="res-kind">Tipo</p>
        <div className="io-kinds" role="radiogroup" aria-labelledby="res-kind">
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              className="io-chip io-press"
              onClick={() => setKind(k)}
            >
              {KIND_SINGULAR[k]}
            </button>
          ))}
        </div>

        <div className="io-group">
          <label className="io-field io-field--area">
            <span className="io-sr">Notas</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Por qué lo guardaste"
              rows={3}
            />
          </label>
          <label className="io-field">
            <span className="io-sr">Etiquetas</span>
            <input
              type="text"
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              placeholder="Etiquetas: ia, devtools…"
              autoComplete="off"
              autoCapitalize="off"
            />
          </label>
        </div>

        {errorMsg ? (
          <p className="io-form__err" role="alert">
            {errorMsg}
          </p>
        ) : null}

        <button type="submit" className="in-btn in-btn--pri io-press io-form__save" disabled={isPending}>
          {isPending ? 'Guardando…' : 'Guardar'}
        </button>
      </form>
    </Sheet>
  );
}
