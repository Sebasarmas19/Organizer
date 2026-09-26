'use client';

/* ============================================================================
   Organizer · FD4 · <CreateResourceModal>
   Modal para añadir un recurso a la biblioteca.
   ========================================================================= */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ResourceKind } from '@/lib/fd4-resources';
import { createResourceAction } from '@/lib/resources-actions';

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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('El título es obligatorio');
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
        setErrorMsg(err instanceof Error ? err.message : 'Error al guardar el recurso');
      }
    });
  };

  return (
    <div className="fd-modal-backdrop" onClick={onClose}>
      <div className="fd-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="fd-modal-head">
          <h2 className="fd-modal-title">Añadir a Recursos</h2>
          <button type="button" onClick={onClose} className="fd-modal-close">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="fd-modal-form">
          {errorMsg ? <p className="fd-modal-error">{errorMsg}</p> : null}

          <div className="fd-formgroup">
            <label className="fd-formlabel">Título o Nombre *</label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ej. Cursor Rules Directory, Comandos de Git..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="field w-full px-3"
              style={{ height: '40px' }}
            />
          </div>

          <div className="fd-formgroup">
            <label className="fd-formlabel">URL del enlace (opcional)</label>
            <input
              type="url"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="field w-full px-3"
              style={{ height: '40px' }}
            />
          </div>

          <div className="fd-formgroup">
            <label className="fd-formlabel">Tipo de recurso</label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as ResourceKind)}
              className="field w-full px-3"
              style={{ height: '40px' }}
            >
              <option value="tool">🛠️ Herramienta</option>
              <option value="skill">🧠 Skill / Conocimiento</option>
              <option value="article">📄 Artículo / Lectura</option>
              <option value="repo">💻 Repositorio / Código</option>
              <option value="video">🎬 Video / Curso</option>
              <option value="other">📌 Otro</option>
            </select>
          </div>

          <div className="fd-formgroup">
            <label className="fd-formlabel">Notas / Por qué lo guardaste</label>
            <textarea
              placeholder="Detalles clave, comandos a recordar, resumen..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="field w-full p-3"
              rows={3}
              style={{ minHeight: '75px', resize: 'vertical' }}
            />
          </div>

          <div className="fd-formgroup">
            <label className="fd-formlabel">Etiquetas (separadas por espacio o coma)</label>
            <input
              type="text"
              placeholder="ia, devtools, prompt..."
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              className="field w-full px-3"
              style={{ height: '40px' }}
            />
          </div>

          <div className="fd-modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn btn--quiet"
              style={{ minHeight: '40px' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="btn btn--primary"
              style={{ minHeight: '40px' }}
            >
              {isPending ? 'Guardando...' : 'Guardar recurso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
