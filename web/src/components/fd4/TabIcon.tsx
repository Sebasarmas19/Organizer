/* ============================================================================
   Organizer · FD4 · los iconos de la barra de pestanas

   NO SON SVG, Y ES A PROPOSITO.

   El prototipo los dibuja con cajas: un cuadrado redondeado es Inicio, el
   mismo cuadrado con una franja arriba es Calendario, con una palomita
   dentro es Pendientes, y un banderin es Recursos. Cuatro formas que se
   distinguen a 18px en una pantalla mirada de reojo, hechas con borde y
   `clip-path`.

   Traerlos como SVG seria mas "correcto" y peor: cambiaria el grosor optico
   del trazo, obligaria a un paquete de iconos para cuatro glifos, y sobre
   todo dejaria de ser lo que se aprobo. Se copian tal cual.

   Heredan el color del boton (`currentColor`), asi que el estado encendido
   y apagado lo decide `.fd-tab` en CSS y aqui no hay logica.
   ========================================================================= */

export type TabIconName = 'inicio' | 'calendario' | 'pendientes' | 'recursos';

const BOX: React.CSSProperties = {
  width: 18,
  height: 18,
  border: '2px solid currentColor',
  display: 'flex',
  overflow: 'hidden',
};

export function TabIcon({ name }: { name: TabIconName }) {
  switch (name) {
    /* Una casa no cabe en 18px sin volverse ruido. Un cuadrado si. */
    case 'inicio':
      return <span className="fd-ico" style={{ ...BOX, borderRadius: 4 }} aria-hidden />;

    /* La franja de arriba es el encabezado del calendario de pared. */
    case 'calendario':
      return (
        <span
          className="fd-ico"
          style={{ ...BOX, borderRadius: 5, flexDirection: 'column' }}
          aria-hidden
        >
          <span style={{ height: 4, background: 'currentColor' }} />
        </span>
      );

    /* Dos bordes girados 45 grados: la misma palomita que la casilla. */
    case 'pendientes':
      return (
        <span
          className="fd-ico"
          style={{ ...BOX, borderRadius: 5, alignItems: 'center', justifyContent: 'center' }}
          aria-hidden
        >
          <span
            style={{
              width: 7,
              height: 4,
              borderLeft: '2px solid currentColor',
              borderBottom: '2px solid currentColor',
              transform: 'rotate(-45deg) translate(1px, -1px)',
            }}
          />
        </span>
      );

    /* El mismo banderin que marca un reminder, en gris. Recursos guarda
       cosas que se marcan para despues, que es lo que hace un banderin. */
    case 'recursos':
      return (
        <span
          className="fd-ico"
          style={{
            width: 14,
            height: 18,
            background: 'currentColor',
            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 74%, 0 100%)',
          }}
          aria-hidden
        />
      );
  }
}

/** El mas del boton de capturar. Dos barras cruzadas, no una fuente. */
export function PlusMark() {
  const bar: React.CSSProperties = {
    position: 'absolute',
    borderRadius: 1,
    background: 'currentColor',
  };
  return (
    <>
      <span style={{ ...bar, width: 15, height: 2 }} />
      <span style={{ ...bar, width: 2, height: 15 }} />
    </>
  );
}
