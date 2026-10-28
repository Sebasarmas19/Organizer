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
  const [testText, setTestText] = useState('Entregar informe el viernes a las 3');
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
        setTestMessage(`${data.message ?? `Guardada: ${data.title}`} (${elapsed} ms)`);
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
    <div style={{ maxWidth: 560, margin: '0 auto', width: '100%', padding: '16px 16px 40px' }}>
      {/* Navegación superior */}
      <div style={{ marginBottom: 12 }}>
        <Link href="/ajustes" className="pl-back">
          <Icon name="chevron-left" size="sm" />
          Ajustes
        </Link>
      </div>

      <header style={{ marginBottom: 20 }}>
        <h1 className="fd-h1" style={{ fontSize: 26, fontWeight: 700, margin: '0 0 6px' }}>Atajo de Siri</h1>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--io-label-2)', lineHeight: 1.4 }}>
          Configura el comando <strong>&ldquo;Oye Siri, anota…&rdquo;</strong> en tu iPhone para capturar con 0 fricción.
        </p>
      </header>

      {/* Qué entiende */}
      <section className="io-card" style={{ padding: '16px 18px', marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 10px', color: 'var(--io-label)' }}>
          Qué puedes decir
        </h2>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--io-label-2)', lineHeight: 1.6 }}>
          <li>
            <strong style={{ color: 'var(--io-label)' }}>&ldquo;Comprar pan&rdquo;</strong> → tarea sin fecha, a la bandeja.
          </li>
          <li>
            <strong style={{ color: 'var(--io-label)' }}>&ldquo;Llamar al banco mañana&rdquo;</strong> → tarea para mañana.
          </li>
          <li>
            <strong style={{ color: 'var(--io-label)' }}>&ldquo;Entregar informe el viernes a las 3&rdquo;</strong> → tarea el viernes 15:00, en el calendario y con aviso 15 min antes.
          </li>
          <li>
            <strong style={{ color: 'var(--io-label)' }}>&ldquo;Recordatorio parcial de cálculo el 15 de octubre&rdquo;</strong> → reminder (empieza con &ldquo;recordatorio&rdquo;).
          </li>
        </ul>
        <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--io-label-3)', lineHeight: 1.4 }}>
          Entiende hoy, mañana, pasado mañana, días de la semana, &ldquo;el 15&rdquo;, &ldquo;15 de octubre&rdquo;,
          &ldquo;15/10&rdquo;, &ldquo;en 3 días&rdquo;, &ldquo;a las 3&rdquo;, &ldquo;a las 8 de la mañana&rdquo;,
          &ldquo;y media&rdquo;.
        </p>
      </section>

      {/* Credenciales y URL */}
      <section className="io-card" style={{ padding: '16px 18px', marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 14px', color: 'var(--io-label)' }}>
          Datos de conexión
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--io-label-2)', marginBottom: 6 }}>
              URL del endpoint
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                readOnly
                value={endpointUrl}
                style={{
                  flex: 1,
                  fontFamily: 'monospace',
                  fontSize: 12,
                  padding: '8px 12px',
                  borderRadius: 10,
                  background: 'var(--io-cell-up)',
                  color: 'var(--io-label)',
                  border: '1px solid var(--io-sep)',
                }}
              />
              <button
                type="button"
                onClick={handleCopyUrl}
                className="io-chip io-press"
                style={{
                  height: 36,
                  padding: '0 12px',
                  fontSize: 13,
                  fontWeight: 600,
                  background: 'var(--io-cell-up)',
                  color: 'var(--io-label)',
                  border: '1px solid var(--io-sep)',
                  flexShrink: 0,
                }}
              >
                {copiedUrl ? '✓ Copiada' : 'Copiar URL'}
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--io-label-2)', marginBottom: 6 }}>
              Token de captura (Bearer)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                readOnly
                type="password"
                value={token}
                style={{
                  flex: 1,
                  fontFamily: 'monospace',
                  fontSize: 12,
                  padding: '8px 12px',
                  borderRadius: 10,
                  background: 'var(--io-cell-up)',
                  color: 'var(--io-label)',
                  border: '1px solid var(--io-sep)',
                }}
              />
              <button
                type="button"
                onClick={handleCopyToken}
                className="io-chip io-press"
                style={{
                  height: 36,
                  padding: '0 12px',
                  fontSize: 13,
                  fontWeight: 600,
                  background: 'var(--io-tint-fill)',
                  color: 'var(--io-on-tint)',
                  border: '1px solid var(--io-tint)',
                  flexShrink: 0,
                }}
              >
                {copiedToken ? '✓ Copiado' : 'Copiar token'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pasos numerados */}
      <section className="io-card" style={{ padding: '16px 18px', marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px', color: 'var(--io-label)' }}>
          Pasos para crearlo en iOS
        </h2>

        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            {
              step: 1,
              title: 'Abre la app Atajos',
              desc: 'En tu iPhone, abre la app Atajos y toca el botón + en la esquina superior derecha.',
            },
            {
              step: 2,
              title: 'Acción: "Pedir entrada"',
              desc: 'Toca Añadir acción, busca "Pedir entrada" (Ask for Input) y pon como mensaje: "¿Qué anotas?".',
            },
            {
              step: 3,
              title: 'Acción: "Obtener contenido de URL"',
              desc: 'Añade "Obtener contenido de URL", método POST, cabecera Authorization: Bearer <tu token>, cuerpo JSON con clave "text" y valor "Entrada proporcionada".',
            },
            {
              step: 4,
              title: 'Que Siri te confirme',
              desc: 'Añade "Obtener valor del diccionario" con clave "message" y luego "Mostrar resultado". Siri te leerá lo que guardó.',
            },
            {
              step: 5,
              title: 'Nombra el atajo "Anota"',
              desc: 'Toca el título del atajo arriba y escribe "Anota". Esto activa de inmediato el comando de voz: "Oye Siri, anota".',
            },
            {
              step: 6,
              title: 'Acceso rápido (opcional)',
              desc: 'Puedes añadir el atajo como botón en la pantalla de bloqueo de iOS o en el Centro de Control para capturar en un segundo.',
            },
          ].map((item) => (
            <li key={item.step} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: 'var(--io-tint)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                {item.step}
              </span>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--io-label)' }}>
                  {item.title}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--io-label-2)', lineHeight: 1.4 }}>
                  {item.desc}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Probar el endpoint directamente */}
      <section className="io-card" style={{ padding: '16px 18px', marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 6px', color: 'var(--io-label)' }}>
          Probar captura aquí mismo
        </h2>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--io-label-2)' }}>
          Envía una tarea de prueba con el token actual para verificar la conexión:
        </p>

        <form onSubmit={handleTestSend} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            type="text"
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            placeholder="Escribe una tarea de prueba…"
            style={{
              width: '100%',
              minHeight: 44,
              padding: '0 12px',
              borderRadius: 12,
              background: 'var(--io-cell-up)',
              border: '1px solid var(--io-sep)',
              color: 'var(--io-label)',
              fontSize: 15,
            }}
          />

          <button
            type="submit"
            disabled={testStatus === 'loading' || !testText.trim()}
            className="in-btn in-btn--pri io-press"
            style={{ width: '100%', minHeight: 44, borderRadius: 12, fontWeight: 600, fontSize: 15 }}
          >
            {testStatus === 'loading' ? 'Enviando…' : 'Enviar prueba'}
          </button>
        </form>

        {testMessage ? (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 10,
              fontSize: 13,
              background: testStatus === 'success' ? 'var(--io-tint-soft)' : 'var(--io-cell-up)',
              color: testStatus === 'success' ? 'var(--io-tint)' : 'var(--io-label)',
              border: testStatus === 'success' ? '1px solid var(--io-tint)' : '1px solid var(--io-sep)',
            }}
          >
            <p style={{ margin: 0 }}>{testMessage}</p>
            {testStatus === 'success' ? (
              <Link
                href="/pendientes"
                style={{ display: 'inline-block', marginTop: 6, fontWeight: 600, color: 'var(--io-tint)', textDecoration: 'none' }}
              >
                Ver en Pendientes →
              </Link>
            ) : null}
          </div>
        ) : null}
      </section>

      <div style={{ textAlign: 'center' }}>
        <Link
          href="/pendientes"
          className="io-btn io-press"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            minHeight: 44,
            borderRadius: 12,
            background: 'var(--io-cell)',
            border: '1px solid var(--io-sep)',
            color: 'var(--io-label-2)',
            fontSize: 15,
            fontWeight: 500,
          }}
        >
          Volver a Pendientes
        </Link>
      </div>
    </div>
  );
}
