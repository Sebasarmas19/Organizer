'use client';

/* ============================================================================
   Organizer · Pantalla de instrucciones del Atajo de iOS (Siri)
   Cumple el requisito de briefs/F1-captura-tareas.md § A:
   "Una pantalla con las instrucciones del Atajo de iOS en pasos numerados,
   con el token y un boton de copiar. Sin esa pantalla el endpoint no existe
   para el usuario."
   ========================================================================= */

import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/Icon';

function subscribeToOrigin() {
  return () => {};
}

function getClientOrigin() {
  return window.location.origin;
}

function getServerOrigin() {
  return '';
}

export function AtajoClient({ token }: { token: string }) {
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const origin = useSyncExternalStore(subscribeToOrigin, getClientOrigin, getServerOrigin);
  const [testText, setTestText] = useState('Comprar cuadernos de prueba');
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  const endpointUrl = `${origin || 'https://tu-app.vercel.app'}/api/capture`;

  async function handleCopyToken() {
    try {
      await navigator.clipboard.writeText(token);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2500);
    } catch {
      // Fallback si clipboard falla
    }
  }

  async function handleCopyUrl() {
    try {
      await navigator.clipboard.writeText(endpointUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      // Fallback
    }
  }

  async function handleTestSend(e: React.FormEvent) {
    e.preventDefault();
    if (!testText.trim()) return;

    setTestStatus('loading');
    setTestMessage('');
    const t0 = performance.now();

    try {
      const res = await fetch('/api/capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: testText.trim() }),
      });

      const data = await res.json();
      const elapsed = Math.round(performance.now() - t0);

      if (res.ok) {
        setTestStatus('success');
        setTestMessage(`Guardada en ${elapsed} ms: "${data.title}" ya esta en Tareas.`);
        setTestText('');
      } else {
        setTestStatus('error');
        setTestMessage(data.error || 'Error al conectar con el endpoint');
      }
    } catch {
      setTestStatus('error');
      setTestMessage('Error de red al intentar capturar');
    }
  }

  return (
    <div className="gutter pb-12 pt-2">
      {/* Navegacion superior */}
      <div className="flex items-center justify-between pb-2">
        <Link href="/tareas" className="taptext taptext--quiet t-meta">
          <Icon name="chevron-left" size="sm" />
          <span>Tareas</span>
        </Link>
      </div>

      <header className="pagehead" style={{ paddingInline: 0, paddingBottom: 'var(--space-3)' }}>
        <div>
          <h1 className="t-title">Atajo de Siri</h1>
          <p className="t-meta c-muted mt-1">
            Configura el comando <strong>&ldquo;Oye Siri, anota…&rdquo;</strong> en tu iPhone para capturar con 0 friccion.
          </p>
        </div>
      </header>

      {/* Credenciales y URL */}
      <section className="rounded bg-sunken p-4 mb-6">
        <h2 className="t-section mb-3" style={{ fontSize: 'var(--text-body)' }}>
          Datos de conexion
        </h2>

        <div className="space-y-3">
          <div>
            <label className="t-label c-muted block mb-1">URL del endpoint</label>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={endpointUrl}
                className="field flex-1 text-ink font-mono text-xs px-3"
                style={{ height: 'var(--tap-min)' }}
              />
              <button
                type="button"
                onClick={handleCopyUrl}
                className="btn btn--quiet"
                aria-label="Copiar URL del endpoint"
              >
                {copiedUrl ? 'Copiada' : 'Copiar URL'}
              </button>
            </div>
          </div>

          <div>
            <label className="t-label c-muted block mb-1">Token de captura (Bearer)</label>
            <div className="flex items-center gap-2">
              <input
                readOnly
                type="password"
                value={token}
                className="field flex-1 text-ink font-mono text-xs px-3"
                style={{ height: 'var(--tap-min)' }}
              />
              <button
                type="button"
                onClick={handleCopyToken}
                className="btn btn--primary"
                aria-label="Copiar token de captura"
              >
                {copiedToken ? 'Copiado' : 'Copiar token'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pasos numerados */}
      <section className="mb-6">
        <h2 className="sectionhead" style={{ paddingInline: 0, marginBottom: 'var(--space-3)' }}>
          Pasos para crearlo en iOS
        </h2>

        <ol className="space-y-4 list-none m-0 p-0">
          <li className="flex gap-3 items-start">
            <span
              className="grid place-items-center rounded-full bg-accent text-white font-semibold text-sm flex-shrink-0"
              style={{ width: 28, height: 28 }}
            >
              1
            </span>
            <div>
              <p className="t-body font-medium">Abre la app Atajos</p>
              <p className="t-meta c-muted mt-0.5">
                En tu iPhone, abre la app <strong>Atajos</strong> y toca el boton <strong>+</strong> en la esquina superior derecha.
              </p>
            </div>
          </li>

          <li className="flex gap-3 items-start">
            <span
              className="grid place-items-center rounded-full bg-accent text-white font-semibold text-sm flex-shrink-0"
              style={{ width: 28, height: 28 }}
            >
              2
            </span>
            <div>
              <p className="t-body font-medium">Accion: &ldquo;Pedir entrada&rdquo;</p>
              <p className="t-meta c-muted mt-0.5">
                Toca <em>Anadir accion</em>, busca <strong>&ldquo;Pedir entrada&rdquo;</strong> (Ask for Input) y pon como mensaje:{' '}
                <code>¿Que anotas?</code>.
              </p>
            </div>
          </li>

          <li className="flex gap-3 items-start">
            <span
              className="grid place-items-center rounded-full bg-accent text-white font-semibold text-sm flex-shrink-0"
              style={{ width: 28, height: 28 }}
            >
              3
            </span>
            <div>
              <p className="t-body font-medium">Accion: &ldquo;Obtener contenido de URL&rdquo;</p>
              <p className="t-meta c-muted mt-0.5">
                Anade la accion <strong>&ldquo;Obtener contenido de URL&rdquo;</strong> y configurala asi:
              </p>
              <ul className="t-meta c-muted mt-1 space-y-1 pl-4 list-disc">
                <li>
                  <strong>URL:</strong> Pega la URL del endpoint (boton Copiar arriba).
                </li>
                <li>
                  <strong>Metodo:</strong> Cambia <code>GET</code> por <code>POST</code>.
                </li>
                <li>
                  <strong>Cabeceras:</strong> Anade una cabecera con clave <code>Authorization</code> y valor{' '}
                  <code>Bearer &lt;pega tu token&gt;</code>.
                </li>
                <li>
                  <strong>Cuerpo de la peticion:</strong> Selecciona <code>JSON</code>. Anade un campo llamado{' '}
                  <code>text</code> con tipo Texto y selecciona como valor <strong>Entrada proporcionada</strong>.
                </li>
              </ul>
            </div>
          </li>

          <li className="flex gap-3 items-start">
            <span
              className="grid place-items-center rounded-full bg-accent text-white font-semibold text-sm flex-shrink-0"
              style={{ width: 28, height: 28 }}
            >
              4
            </span>
            <div>
              <p className="t-body font-medium">Nombra el atajo &ldquo;Anota&rdquo;</p>
              <p className="t-meta c-muted mt-0.5">
                Toca el titulo del atajo arriba y escribe <strong>Anota</strong>. Esto activa de inmediato el comando de voz:{' '}
                <em>&ldquo;Oye Siri, anota&rdquo;</em>.
              </p>
            </div>
          </li>

          <li className="flex gap-3 items-start">
            <span
              className="grid place-items-center rounded-full bg-accent text-white font-semibold text-sm flex-shrink-0"
              style={{ width: 28, height: 28 }}
            >
              5
            </span>
            <div>
              <p className="t-body font-medium">Acceso rapido (opcional)</p>
              <p className="t-meta c-muted mt-0.5">
                Puedes anadir el atajo como boton en la pantalla de bloqueo de iOS o en el Centro de Control para capturar en un segundo sin hablar.
              </p>
            </div>
          </li>
        </ol>
      </section>

      {/* Probar el endpoint directamente */}
      <section className="rounded bg-sunken p-4">
        <h2 className="t-section mb-2" style={{ fontSize: 'var(--text-body)' }}>
          Probar captura aqui mismo
        </h2>
        <p className="t-meta c-muted mb-3">
          Prueba enviar una tarea de prueba con el token actual para verificar que el endpoint responde:
        </p>

        <form onSubmit={handleTestSend} className="space-y-3">
          <input
            type="text"
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            placeholder="Escribe una tarea de prueba..."
            className="field w-full px-3"
            style={{ height: 'var(--tap-min)' }}
          />

          <button
            type="submit"
            disabled={testStatus === 'loading' || !testText.trim()}
            className="btn btn--primary w-full"
            style={{ minHeight: 'var(--tap-min)' }}
          >
            {testStatus === 'loading' ? 'Enviando...' : 'Enviar tarea de prueba'}
          </button>
        </form>

        {testMessage ? (
          <div
            className={`mt-3 p-3 rounded text-sm ${
              testStatus === 'success'
                ? 'bg-task-soft text-task'
                : 'bg-surface text-ink border border-line'
            }`}
          >
            <p>{testMessage}</p>
            {testStatus === 'success' ? (
              <Link href="/tareas" className="taptext text-sm font-semibold mt-1">
                Ver en Tareas &rarr;
              </Link>
            ) : null}
          </div>
        ) : null}
      </section>

      <div className="mt-8 text-center">
        <Link href="/tareas" className="btn btn--quiet w-full" style={{ minHeight: 'var(--tap-min)' }}>
          Volver a Tareas
        </Link>
      </div>
    </div>
  );
}
