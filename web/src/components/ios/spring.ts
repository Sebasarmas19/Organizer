/* ============================================================================
   Organizer · Muelles

   Lo que se mueve por un gesto se mueve con un muelle, no con una curva de
   duracion fija: un muelle se puede interrumpir, hereda la velocidad del
   dedo y siempre arranca de donde esta la cosa, no de donde "deberia".

   Los dos parametros son los de Apple (WWDC 2018, Designing Fluid
   Interfaces): `response` (segundos, cuanto tarda en llegar) y `damping`
   (1 = sin rebote; menos de 1, rebota). De ahi salen la rigidez y la
   friccion: k = (2π/response)², c = 4π·damping/response.
   ========================================================================= */

export type SpringOptions = {
  /** Segundos. Menos es mas rapido. */
  response?: number;
  /** 1 = critico, sin rebote. 0.8 = un rebote leve. */
  damping?: number;
  /** Velocidad inicial, en unidades por segundo (px/s si animas px). */
  velocity?: number;
};

export type Motion = { stop: () => void };

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Anima un numero de `from` a `to`. Con movimiento reducido, salta al final. */
export function spring(
  from: number,
  to: number,
  options: SpringOptions,
  onUpdate: (value: number) => void,
  onDone?: () => void
): Motion {
  if (prefersReducedMotion() || from === to) {
    onUpdate(to);
    onDone?.();
    return { stop() {} };
  }

  const response = options.response ?? 0.4;
  const damping = options.damping ?? 1;
  const stiffness = (2 * Math.PI / response) ** 2;
  const friction = (4 * Math.PI * damping) / response;
  const range = Math.abs(to - from);

  let x = from - to;
  let v = options.velocity ?? 0;
  let last = performance.now();
  let frame = 0;
  let stopped = false;

  const step = (now: number) => {
    if (stopped) return;
    /* Pasos de 4ms: con un dt grande (pestana en segundo plano) el muelle
       explicito explotaria. */
    const dt = Math.min(0.064, (now - last) / 1000);
    last = now;
    const n = Math.max(1, Math.ceil(dt / 0.004));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      const a = -stiffness * x - friction * v;
      v += a * h;
      x += v * h;
    }
    if (Math.abs(x) < range * 0.001 && Math.abs(v) < range * 0.01) {
      onUpdate(to);
      onDone?.();
      return;
    }
    onUpdate(to + x);
    frame = requestAnimationFrame(step);
  };

  frame = requestAnimationFrame(step);
  return {
    stop() {
      stopped = true;
      cancelAnimationFrame(frame);
    },
  };
}

/** Donde acabaria un gesto si se le deja frenar solo (la funcion de Apple). */
export function project(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/** Resistencia en un borde: cuanto mas te pasas, menos sigue al dedo. */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/**
 * La firma del hilo: lo que respondes vuela desde donde lo tocaste (el
 * campo, la capsula, el circulo) hasta su burbuja. FLIP con un solo muelle
 * de progreso; translate y scale salen de el, asi que llegan juntos.
 *
 * La escala es UNIFORME y sale de las alturas: un campo de 300px que vuela
 * a una burbuja de 150px no puede estirar el texto al doble de ancho. Lo
 * que viaja es la linea escrita, y una linea mide lo mismo de alto.
 */
export function flyFrom(el: HTMLElement, from: DOMRect): Motion {
  /* Movimiento reducido: nada viaja; la burbuja aparece con un fundido. */
  if (prefersReducedMotion()) {
    el.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease' });
    return { stop() {} };
  }

  const to = el.getBoundingClientRect();
  if (!to.width || !to.height) return { stop() {} };

  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);
  const s = Math.min(1.25, Math.max(0.6, from.height / to.height));

  const apply = (p: number) => {
    const k = 1 - p;
    el.style.transform = `translate(${dx * k}px, ${dy * k}px) scale(${1 + (s - 1) * k})`;
  };

  apply(0);
  const motion = spring(0, 1, { response: 0.46, damping: 0.84 }, apply, () => {
    el.style.transform = '';
  });
  return {
    stop() {
      motion.stop();
      el.style.transform = '';
    },
  };
}
