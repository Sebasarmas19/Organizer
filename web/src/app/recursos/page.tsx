/* ============================================================================
   Organizer · FD4 · Recursos

   El modulo Recursos (docs/06-recursos.md) todavia no esta construido: FD4
   lo dibuja como marcador de posicion y aqui se queda igual.

   PERO ESTA PANTALLA HACE UN TRABAJO DE VERDAD MIENTRAS TANTO.

   FD4 cambio la barra de pestanas entera, y al hacerlo dejo sin puerta a dos
   pantallas que SI existen y que importan:

     · `/ajustes/notificaciones` — sin pasar por ahi una vez, la app no le
       habla al usuario. Y "push, no pull" es la primera regla del proyecto:
       una app que depende de que el se acuerde de entrar esta muerta al
       nacer. Dejar ese enlace huerfano seria el peor bug posible de este
       rediseno, y no daria ningun error.

     · `/horario` — las materias del semestre. Se configura una vez y se usa
       todo el semestre, asi que no merece pestana propia, pero tiene que
       poder alcanzarse.

   Estan aqui a proposito, y estan primero. La nota sobre Recursos va debajo.
   Cuando Recursos se construya, estos dos accesos se mudan a Ajustes.
   ========================================================================= */

import Link from 'next/link';
import { TabBar } from '@/components/fd4/TabBar';
import { DeskSidebar } from '@/components/fd4/DeskSidebar';
import { getTodayString } from '@/lib/date-utils';
import { DEFAULT_TIMEZONE } from '@/lib/profile';

export const dynamic = 'force-dynamic';

export default function RecursosPage() {
  return (
    <div className="fd-app">
      <DeskSidebar active="recursos" todayStr={getTodayString(DEFAULT_TIMEZONE)} />

      <main className="fd-screen">
        <header className="fd-home__head">
          <div className="fd-home__date">
            <h1 className="fd-h1 fd-h1--screen">Recursos</h1>
            <span className="fd-sub">Y los ajustes que no tienen pestaña</span>
          </div>
        </header>

        <div className="fd-sections">
          <section>
            <div className="fd-seclabel">
              <h2>Ajustes</h2>
            </div>

            <div className="fd-card">
              <div className="fd-card__body">
                <Link href="/ajustes/notificaciones" className="fd-more">
                  <span style={{ color: 'var(--text)' }}>Notificaciones</span>
                  <span className="fd-more__chev" aria-hidden>
                    ›
                  </span>
                </Link>
                <Link href="/horario" className="fd-more">
                  <span style={{ color: 'var(--text)' }}>Horario del semestre</span>
                  <span className="fd-more__chev" aria-hidden>
                    ›
                  </span>
                </Link>
                <Link href="/atajo" className="fd-more">
                  <span style={{ color: 'var(--text)' }}>Atajo de Siri</span>
                  <span className="fd-more__chev" aria-hidden>
                    ›
                  </span>
                </Link>
              </div>
            </div>
          </section>

          <section>
            <div className="fd-seclabel fd-seclabel--quiet">
              <h2>Recursos</h2>
            </div>

            <div className="fd-card fd-card--sunken">
              <div className="fd-ayer__item">
                <span className="fd-placeholder__text">
                  Skills, herramientas y artículos. Queda para el siguiente paso, junto con el
                  detalle de reminder.
                </span>
              </div>
            </div>
          </section>
        </div>
      </main>

      <TabBar />
    </div>
  );
}
