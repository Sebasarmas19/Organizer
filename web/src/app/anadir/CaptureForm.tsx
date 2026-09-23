'use client';

/* ============================================================================
   Organizer · FD4 · <CaptureForm>  ·  el campo de capturar

   CUATRO DECISIONES, TODAS CONTRA LA FRICCION:

   1. EL CAMPO SE ENFOCA SOLO al entrar. Es lo que hace que el teclado del
      iPhone ya este abierto cuando miras la pantalla. Un `autoFocus` en una
      pantalla cualquiera es agresivo; aqui la pantalla ES el campo.

   2. NO SE NAVEGA AL GUARDAR. El campo se vacia, aparece "Guardado: ..." y
      el foco se queda donde estaba. Capturar viene en rafagas — se te
      ocurren tres cosas seguidas — y mandar al usuario a otra pantalla
      despues de la primera mata las otras dos.

   3. ENTER GUARDA. Es un `<form>` de verdad, asi que la tecla "ir" del
      teclado de iOS envia. Sin eso hay que cerrar el teclado para alcanzar
      el boton, que es exactamente el gesto que sobra.

   4. NADA SE PIERDE SI FALLA. Si la accion revienta, el texto vuelve al
      campo y se dice. Lo unico peor que no capturar es creer que capturaste.
   ========================================================================= */

import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { captureTask } from '@/lib/fd4-actions';

export function CaptureForm() {
  const [draft, setDraft] = useState('');
  const [lastSaved, setLastSaved] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = draft.trim();
    if (!value || pending) return;

    /* Se vacia ANTES de que conteste el servidor: la siguiente idea ya se
       puede escribir encima. Si falla, se devuelve tal cual estaba. */
    setDraft('');
    setError('');

    startTransition(async () => {
      try {
        await captureTask(value);
        setLastSaved(value);
      } catch {
        setDraft(value);
        setError('No se pudo guardar. Está escrito todavía, prueba otra vez.');
      }
      inputRef.current?.focus();
    });
  };

  return (
    <main className="fd-add">
      <div className="fd-add__head">
        <span className="fd-add__name">Añadir</span>
        <Link href="/" className="fd-btn fd-btn--quiet">
          Cerrar
        </Link>
      </div>

      <form className="fd-add__body" onSubmit={submit}>
        <input
          ref={inputRef}
          id="title"
          name="title"
          className="fd-add__input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escribe y ya"
          aria-label="Qué quieres capturar"
          /* `sentences` y no `none`: esto es prosa, no un identificador.
             `enterKeyHint="done"` pone "listo" en la tecla de iOS. */
          autoCapitalize="sentences"
          autoComplete="off"
          autoCorrect="on"
          enterKeyHint="done"
          /* La pantalla ES el campo: el teclado tiene que estar abierto al
             llegar. Ver la decision 1 de la cabecera. */
          autoFocus
        />

        <span className="fd-add__hint">
          Se guarda en Pendientes · Tareas. Puedes ponerle fecha después, o nunca.
        </span>

        <button type="submit" className="fd-btn fd-btn--primary" disabled={!draft.trim()}>
          Guardar
        </button>

        {error ? (
          <span className="fd-add__saved" role="alert">
            {error}
          </span>
        ) : lastSaved ? (
          <span className="fd-add__saved">Guardado: {lastSaved}</span>
        ) : null}
      </form>
    </main>
  );
}
