/* ============================================================================
   Organizer · Inicio  ·  el suelo de F0

   ESTA NO ES LA PANTALLA DE INICIO DEL PRODUCTO. La de verdad llega en F1 y
   esta dibujada en `app/comps/inicio.html`: Hoy, Esta semana, De ayer, y cabe
   sin scroll. Aqui no se adelanta ninguna de esas decisiones.

   Lo que si hace, que es lo que el brief pide comprobar desde el iPhone:

     - la sesion existe y la ruta esta protegida
     - la fila de `profiles` esta creada, con su zona horaria
     - la tipografia, el color y los tres temas son los correctos
     - los cinco componentes portados se ven como en los comps

   Cuando F1 escriba Inicio de verdad, este archivo se reemplaza entero.
   ========================================================================= */

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { DEFAULT_TIMEZONE } from '@/lib/profile';
import { ThemeSwitch } from '@/components/ThemeSwitch';
import { TabBar } from '@/components/TabBar';
import { Row } from '@/components/Row';
import { Check } from '@/components/Check';
import { ReminderFlag } from '@/components/ReminderFlag';
import { CalBlock } from '@/components/CalBlock';
import { SignOutButton } from '@/components/SignOutButton';
import { Setup } from './Setup';

/* Nunca estatica: depende de la cookie de sesion. Se dice explicitamente
   porque si se compila sin variables de entorno esta pagina se resuelve en el
   `<Setup/>` de abajo, que no lee cookies — y Next la congelaria como
   estatica, dejando la pantalla de "falta configurar" cacheada para siempre. */
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  /* Antes de que existan las claves no hay nada que consultar, y una pantalla
     de error de Next no explica que hay que copiar el .env.local. */
  if (!isSupabaseConfigured()) return <Setup />;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('timezone, created_at')
    .eq('id', user?.id ?? '')
    .maybeSingle();

  return (
    <div className="applayout">
      <main className="screen">
        <header className="pagehead">
          <h1 className="t-title">Organizer</h1>
          <SignOutButton />
        </header>

        <p className="gutter t-meta c-muted">
          Fundaciones listas. Tareas y Atajo de Siri disponibles:
        </p>

        <div className="gutter mt-3 flex gap-2">
          <Link href="/tareas" className="btn btn--primary flex-1">
            Modulo Tareas
          </Link>
          <Link href="/atajo" className="btn btn--quiet flex-1">
            Atajo de Siri
          </Link>
        </div>

        {/* ---------------------------------------------------- la cuenta -- */}
        <h2 className="sectionhead" style={{ marginTop: 'var(--space-8)' }}>
          Tu cuenta
        </h2>
        <Row title={user?.email ?? 'Sin sesion'} meta={['Enlace magico']} />
        <Row
          title={profile ? 'Perfil creado' : 'Falta tu fila en profiles'}
          meta={[
            profile ? profile.timezone : DEFAULT_TIMEZONE,
            profile ? 'listo' : 'revisa el esquema en Supabase',
          ]}
        />

        {/* ------------------------------------------------------- el tema -- */}
        <h2 className="sectionhead" style={{ marginTop: 'var(--space-8)' }}>
          Tema
        </h2>
        <div className="gutter">
          <ThemeSwitch />
          <p className="t-meta c-muted" style={{ marginTop: 'var(--space-3)' }}>
            Los tres estados tienen que verse bien: claro, oscuro, y lo que diga
            el sistema. Miralo de dia y de noche.
          </p>
        </div>

        {/* --------------------------------------------- las tres entidades --
            Aqui se comprueba de un vistazo la regla de FD3: el color esta en la
            casilla, en el banderin y en la barra del bloque. Nunca en la letra. */}
        <h2 className="sectionhead" style={{ marginTop: 'var(--space-8)' }}>
          Las tres entidades
        </h2>

        <Row
          title="Migrar el schema a Supabase"
          meta={['15:00 – 17:00', 'Proyecto IA']}
          lead={<Check checked={false} label="Migrar el schema a Supabase" />}
          now
        />
        <Row
          title="Leer el paper de Anthropic"
          meta={['9:00', 'Cursos']}
          lead={<Check checked label="Leer el paper de Anthropic" />}
          done
        />

        <div style={{ marginTop: 'var(--space-4)' }}>
          <ReminderFlag title="Parcial de Calculo" when="viernes 18 · 10:00" />
          <ReminderFlag title="Quiz de Algebra" when="lunes 28" past />
        </div>

        {/* Los bloques del calendario van POSICIONADOS dentro del riel de
            horas: `.calblock` es `position: absolute`. Asi que aqui se dibuja
            un riel de mentira, con su contenedor relativo y sus alturas, en
            vez de apilarlos en una columna — que es como se descubre tarde que
            el componente no encaja donde lo pusiste. */}
        <div
          style={{
            position: 'relative',
            height: 232,
            marginTop: 'var(--space-4)',
            marginInline: 'var(--space-3)',
          }}
        >
          <CalBlock
            kind="class"
            title="Calculo III"
            time="8:00 – 9:30 · Aula 204"
            style={{ top: 0, height: 72 }}
          />
          <CalBlock
            kind="task"
            title="Migrar el schema a Supabase"
            time="15:00 – 17:00"
            now
            style={{ top: 80, height: 72 }}
          />
          <CalBlock
            kind="task"
            title="Terminar el modelo de datos"
            time="19:00"
            style={{ top: 160, height: 72 }}
          />
        </div>

        {/* -------------------------------------------------- los 5 tamanos -- */}
        <h2 className="sectionhead" style={{ marginTop: 'var(--space-8)' }}>
          Cinco tamanos, y no hay un sexto
        </h2>
        <div className="gutter" style={{ display: 'grid', gap: 'var(--space-2)' }}>
          <p className="t-title">Jueves 17</p>
          <p className="t-section">Esto quedo de la semana</p>
          <p className="t-body">Migrar el schema a Supabase</p>
          <p className="t-meta c-muted">15:00 – 17:00 · Proyecto IA</p>
          <p className="t-label c-faint">EL RESTO ESTA EN TAREAS</p>
        </div>

        <div style={{ height: 'var(--space-16)' }} />
      </main>

      <TabBar />
    </div>
  );
}
