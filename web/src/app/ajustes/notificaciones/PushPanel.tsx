'use client';

/* ============================================================================
   Organizer · Activar las notificaciones

   ESTA PANTALLA ES LA PUERTA DEL PRODUCTO. Si el usuario no llega a tener una
   suscripcion viva, no llega nada — y "una notificacion que no llega y nadie
   nota es el peor fallo posible de este proyecto" (`docs/02-arquitectura.md`).
   De ahi las tres cosas que hace y que parecen de mas:

   1. SI NO ESTA INSTALADA, NO OFRECE EL BOTON. En Safari normal no hay push en
      iOS. Un boton que no puede funcionar hace que el usuario concluya que la
      app esta rota; en su lugar se explican los pasos de "Añadir a pantalla de
      inicio", que es lo unico que desbloquea la situacion.
   2. MANDA UNA DE PRUEBA AL INSTANTE. Es la unica forma de que el sepa que
      funciono, y la unica de que nosotros sepamos que el camino completo esta
      vivo: permiso, service worker, VAPID, cifrado y entrega.
   3. DICE EN VOZ ALTA CUANDO NO HAY SUSCRIPCION. iOS la invalida al
      reinstalar la PWA y no avisa a nadie.
   ========================================================================= */

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Icon } from '@/components/Icon';
import {
  PermissionDeniedError,
  currentSubscription,
  describeSubscription,
  isIOS,
  readEnvironment,
  subscribeToPush,
  type PushEnvironment,
} from '@/lib/push/client';

type Status =
  | { kind: 'checking' }
  | { kind: 'idle' }
  | { kind: 'working'; label: string }
  | { kind: 'done'; message: string }
  | { kind: 'error'; message: string };

export function PushPanel({
  vapidPublicKey,
  storedCount,
}: {
  /** `NEXT_PUBLIC_VAPID_PUBLIC_KEY`. Vacia si el usuario no la ha pegado aún. */
  vapidPublicKey: string;
  /** Cuántas suscripciones vivas hay en la base para este usuario. */
  storedCount: number;
}) {
  const [environment, setEnvironment] = useState<PushEnvironment | null>(null);
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'checking' });

  /* Nada de esto se puede saber en el servidor: depende del navegador, del
     permiso concedido y de si hay un service worker registrado. Por eso la
     primera pintura dice "comprobando" y no adivina. */
  useEffect(() => {
    let alive = true;

    void (async () => {
      const env = readEnvironment();
      /* Se consulta siempre, tambien cuando el entorno no sirve: asi el estado
         se fija SIEMPRE despues de un `await`, que es lo que evita la cascada
         de renders que React desaconseja dentro de un efecto. */
      const subscription = await currentSubscription();
      if (!alive) return;

      setEnvironment(env);
      setPermission(
        typeof Notification === 'undefined' ? null : Notification.permission
      );
      setSubscribed(subscription !== null);
      setStatus({ kind: 'idle' });
    })();

    return () => {
      alive = false;
    };
  }, []);

  /* ── activar ─────────────────────────────────────────────────────────── */

  async function activate() {
    if (!vapidPublicKey) {
      setStatus({
        kind: 'error',
        message:
          'Falta NEXT_PUBLIC_VAPID_PUBLIC_KEY. Está en el informe de F3, paso 1.',
      });
      return;
    }

    setStatus({ kind: 'working', label: 'Pidiendo permiso…' });
    try {
      /* El permiso primero, y sin ningún `await` antes: si se pierde la
         activación del gesto, Safari rechaza la llamada sola. */
      const subscription = await subscribeToPush(vapidPublicKey);

      setStatus({ kind: 'working', label: 'Guardando este teléfono…' });
      const saved = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });
      if (!saved.ok) {
        const detail = (await saved.json().catch(() => ({}))) as { error?: string };
        throw new Error(detail.error ?? 'No se pudo guardar la suscripción.');
      }

      setSubscribed(true);
      setPermission('granted');
      await sendTest('Mandando la primera…');
    } catch (error) {
      setStatus({
        kind: 'error',
        message:
          error instanceof PermissionDeniedError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'No se pudo activar.',
      });
    }
  }

  /* ── prueba ──────────────────────────────────────────────────────────── */

  async function sendTest(label = 'Mandando una de prueba…') {
    setStatus({ kind: 'working', label });
    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke('dispatch-notifications', {
        body: { mode: 'test' },
      });

      if (error) {
        throw new Error(
          'La función `dispatch-notifications` no contestó. Si todavía no está ' +
            'desplegada, es el paso 3 del informe de F3. (' + error.message + ')'
        );
      }

      const report = data as { sent?: unknown[]; failed?: { error: string }[] };
      if (report?.failed?.length) {
        throw new Error(report.failed[0].error);
      }

      setStatus({
        kind: 'done',
        message:
          'Mandada. Si no la ves en unos segundos, mira que Organizer tenga ' +
          'permiso en Ajustes → Notificaciones.',
      });
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'No se pudo mandar.',
      });
    }
  }

  /* ── desactivar ──────────────────────────────────────────────────────── */

  async function deactivate() {
    setStatus({ kind: 'working', label: 'Desactivando…' });
    try {
      const subscription = await currentSubscription();
      if (subscription) {
        const stored = describeSubscription(subscription);
        await subscription.unsubscribe();
        await fetch('/api/push/subscribe?endpoint=' + encodeURIComponent(stored.endpoint), {
          method: 'DELETE',
        });
      }
      setSubscribed(false);
      setStatus({ kind: 'done', message: 'Desactivadas en este teléfono.' });
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'No se pudo desactivar.',
      });
    }
  }

  /* ── lo que se ve ────────────────────────────────────────────────────── */

  if (!environment || status.kind === 'checking') {
    return (
      <p className="gutter t-meta c-muted" aria-live="polite">
        Comprobando este teléfono…
      </p>
    );
  }

  if (environment.kind === 'not-installed') return <InstallInstructions />;

  if (environment.kind === 'unsupported') {
    return (
      <div className="gutter">
        <p className="t-body">{environment.reason}</p>
        {isIOS() ? null : (
          <p className="t-meta c-muted" style={{ marginTop: 'var(--space-2)' }}>
            Las notificaciones de esta app están pensadas para el iPhone con la
            PWA instalada en la pantalla de inicio.
          </p>
        )}
      </div>
    );
  }

  const blockedByOS = permission === 'denied';
  const active = subscribed === true;

  return (
    <div className="gutter">
      <StateLine active={active} storedCount={storedCount} blocked={blockedByOS} />

      {blockedByOS ? (
        <p className="t-meta c-muted" style={{ marginTop: 'var(--space-3)' }}>
          iOS no deja volver a preguntar desde la app. Entra en Ajustes →
          Notificaciones → Organizer y permítelas; luego vuelve aquí.
        </p>
      ) : active ? (
        <div style={{ display: 'grid', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
          <button
            type="button"
            className="btn btn--primary btn--full"
            onClick={() => void sendTest()}
            disabled={status.kind === 'working'}
          >
            Mandarme una de prueba
          </button>
          <button
            type="button"
            className="btn btn--quiet btn--full"
            onClick={() => void deactivate()}
            disabled={status.kind === 'working'}
          >
            Desactivar en este teléfono
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn--primary btn--full"
          style={{ marginTop: 'var(--space-4)' }}
          onClick={() => void activate()}
          disabled={status.kind === 'working'}
        >
          {status.kind === 'working' ? status.label : 'Activar notificaciones'}
        </button>
      )}

      <p
        aria-live="polite"
        className="t-meta"
        style={{ marginTop: 'var(--space-3)', minHeight: 20 }}
      >
        {status.kind === 'done' ? <span className="c-muted">{status.message}</span> : null}
        {status.kind === 'error' ? <span className="c-muted">{status.message}</span> : null}
      </p>
    </div>
  );
}

/* ── el estado, dicho en voz alta ──────────────────────────────────────── */

function StateLine({
  active,
  storedCount,
  blocked,
}: {
  active: boolean;
  storedCount: number;
  blocked: boolean;
}) {
  if (blocked) {
    return (
      <p className="t-body">
        <Icon name="bell" size="sm" /> iOS tiene las notificaciones bloqueadas para
        Organizer.
      </p>
    );
  }

  if (active) {
    return (
      <div>
        <p className="t-body">
          <Icon name="check" size="sm" /> Activadas en este teléfono.
        </p>
        <p className="t-meta c-muted" style={{ marginTop: 'var(--space-1)' }}>
          {storedCount === 1
            ? 'Hay 1 dispositivo registrado.'
            : 'Hay ' + storedCount + ' dispositivos registrados.'}
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="t-body">Todavía no llegan notificaciones a este teléfono.</p>
      <p className="t-meta c-muted" style={{ marginTop: 'var(--space-1)' }}>
        {storedCount > 0
          ? 'Hay ' + storedCount + ' registrado en otro sitio, pero no aquí.'
          : 'Sin esto la app no te habla, y toca acordarse de abrirla.'}
      </p>
    </div>
  );
}

/* ── la pantalla de "todavía no está instalada" ────────────────────────── */

/**
 * Sin esta pantalla, el usuario toca "activar notificaciones", no pasa nada, y
 * concluye que la app no funciona. En iOS no existe `beforeinstallprompt`: no
 * hay forma de ofrecer la instalacion desde codigo, solo de explicarla.
 */
function InstallInstructions() {
  return (
    <div className="gutter">
      <p className="t-body">
        Para que lleguen notificaciones, Organizer tiene que estar en tu pantalla
        de inicio. En Safari normal iOS no entrega ninguna.
      </p>

      <ol
        style={{
          marginTop: 'var(--space-4)',
          display: 'grid',
          gap: 'var(--space-3)',
          counterReset: 'step',
        }}
      >
        <Step n={1}>
          Abre esta página en <strong>Safari</strong> (no en Chrome ni dentro de
          otra app).
        </Step>
        <Step n={2}>
          Toca el botón <strong>Compartir</strong>, el cuadrado con la flecha
          hacia arriba, abajo en el centro.
        </Step>
        <Step n={3}>
          Baja en la lista y toca <strong>Añadir a pantalla de inicio</strong>.
        </Step>
        <Step n={4}>
          Abre Organizer <strong>desde el icono nuevo</strong> y vuelve a esta
          pantalla. El botón de activar aparecerá aquí.
        </Step>
      </ol>

      <p className="t-meta c-muted" style={{ marginTop: 'var(--space-4)' }}>
        Necesitas iOS 16.4 o superior. Si no ves «Añadir a pantalla de inicio»,
        comprueba que estás en Safari.
      </p>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
      <span
        aria-hidden="true"
        className="t-label num"
        style={{
          flex: '0 0 auto',
          width: 24,
          height: 24,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 999,
          background: 'var(--accent-soft)',
          color: 'var(--accent)',
          fontWeight: 600,
        }}
      >
        {n}
      </span>
      <span className="t-meta">{children}</span>
    </li>
  );
}
