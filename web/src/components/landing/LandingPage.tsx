'use client';

/* ============================================================================
   Organizer · Landing Page (Dark Titanium Studio)
   Dirección oficial seleccionada con Impeccable:
     - Réplica exacta de la propuesta visual (dark-titanium.png)
     - Navbar cápsula flotante con botón Early Access
     - Titular y subtítulo limpios, centrados y sin ruido
     - iPhone 16 Pro en Titanio Oscuro con display OLED limpio (#phone-video-slot)
     - Flancos: orbe de Siri con latencia <1.2s y tarjeta push iOS de las 8:00 AM
     - Bento Grid de 3 tarjetas:
         1. Captura en 1s con Audio Waveform
         2. Bloques de Foco con timeline y bloques de color
         3. Bajo Estrés con medidor circular y rostro de calma (·‿·)
     - Animaciones fluidas GSAP con respeto a prefers-reduced-motion
   ========================================================================= */

import { useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

// Alturas del espectro de onda de audio para la tarjeta de Captura en 1s
const WAVEFORM_HEIGHTS = [
  8, 14, 18, 24, 34, 42, 28, 16, 24, 38, 48, 32, 20, 16, 28, 44, 34, 22, 14, 26, 36, 24, 16, 12, 18, 12, 6,
];

export function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  // GSAP Choreography
  useGSAP(
    () => {
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (prefersReducedMotion) return;

      // 1. Entrada escalonada del Hero
      gsap.from('.gsap-hero-item', {
        y: 28,
        opacity: 0,
        duration: 0.9,
        stagger: 0.12,
        ease: 'power3.out',
      });

      // 2. Chasis del teléfono y escala inicial
      gsap.from('.gsap-device-chassis', {
        scale: 0.92,
        y: 40,
        opacity: 0,
        duration: 1.1,
        ease: 'power3.out',
        delay: 0.2,
      });

      // 3. Tarjetas flotantes laterales
      gsap.from('.gsap-flank-card-left', {
        x: -35,
        opacity: 0,
        duration: 0.9,
        ease: 'power2.out',
        delay: 0.4,
      });

      gsap.from('.gsap-flank-card-right', {
        x: 35,
        opacity: 0,
        duration: 0.9,
        ease: 'power2.out',
        delay: 0.4,
      });

      // 4. Física de flotación suave en el iPhone
      gsap.to('.gsap-phone-float', {
        y: -10,
        duration: 3.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      // 5. Animación de respiración de la onda de audio (Waveform)
      gsap.to('.gsap-waveform-bar', {
        scaleY: (index) => 0.55 + ((index * 7) % 5) * 0.12,
        duration: 1.2,
        repeat: -1,
        yoyo: true,
        stagger: {
          each: 0.04,
          from: 'center',
        },
        ease: 'sine.inOut',
      });

      // 6. Revelado suave de las tarjetas Bento al hacer scroll
      gsap.from('.gsap-bento-card', {
        scrollTrigger: {
          trigger: '#bento-grid',
          start: 'top 85%',
          once: true,
        },
        y: 30,
        opacity: 0,
        duration: 0.8,
        stagger: 0.12,
        ease: 'power2.out',
      });
    },
    { scope: containerRef }
  );

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[#080B09] text-zinc-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-200 antialiased overflow-x-hidden"
    >
      {/* ====================================================================
          1. HEADER / NAVBAR CÁPSULA FLOTANTE
          ==================================================================== */}
      <header className="max-w-4xl mx-auto pt-6 px-4">
        <nav className="w-full rounded-full bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 px-5 py-2.5 flex items-center justify-between shadow-2xl">
          {/* Logo y Marca */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-300 group-hover:text-emerald-400 group-hover:border-emerald-500/40 transition-colors">
              <OrganizerIcon className="w-4 h-4" />
            </div>
            <span className="text-white font-semibold text-sm tracking-tight">Organizer</span>
          </Link>

          {/* Botón de Acción Principal (Pill blanco como en la comp) */}
          <Link
            href="/entrar"
            className="px-4 py-1.5 rounded-full bg-white text-zinc-950 font-medium text-xs hover:bg-zinc-200 transition-colors shadow-sm active:scale-95"
          >
            Early Access
          </Link>
        </nav>
      </header>

      {/* ====================================================================
          2. HERO SECTION: TITULAR Y SUBTÍTULO
          ==================================================================== */}
      <section className="pt-12 sm:pt-16 pb-4 text-center px-4 max-w-4xl mx-auto">
        <h1 className="gsap-hero-item text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-[1.12]">
          Tu día resuelto antes de que abras la app
        </h1>
        <p className="gsap-hero-item text-zinc-400 text-base sm:text-lg md:text-xl font-normal mt-4 max-w-xl mx-auto">
          El asistente silencioso para estudiantes con TDAH.
        </p>
      </section>

      {/* ====================================================================
          3. SHOWCASE CENTRAL: IPHONE 16 PRO, RESPLANDOR ESMERALDA & TARJETAS
          ==================================================================== */}
      <section className="relative max-w-5xl mx-auto mt-6 sm:mt-10 px-4">
        {/* Atmósfera: Fondo con micro-textura de puntos */}
        <div
          className="absolute inset-0 pointer-events-none -z-20 opacity-30"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255, 255, 255, 0.12) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Resplandor esmeralda volumétrico detrás del teléfono */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[520px] h-[340px] sm:h-[520px] rounded-full bg-emerald-500/20 blur-[110px] pointer-events-none -z-10" />

        {/* Contenedor del dispositivo flanqueado por las dos tarjetas */}
        <div className="relative flex flex-col md:flex-row items-center justify-center gap-6 sm:gap-8 pt-4 pb-6">
          {/* Tarjeta Flotante Izquierda: Siri con latencia <1.2s */}
          <div className="gsap-flank-card-left order-2 md:order-1 md:-mr-6 z-10 w-full sm:w-auto flex justify-center">
            <div className="bg-zinc-900/80 backdrop-blur-xl border border-emerald-500/30 rounded-2xl px-5 py-3.5 flex items-center gap-3.5 shadow-xl shadow-emerald-950/20 hover:border-emerald-500/50 transition-colors">
              {/* Orbe de Siri con resplandor multicolor */}
              <div className="relative w-9 h-9 rounded-full flex items-center justify-center shrink-0">
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,#ffffff,#f43f5e_30%,#a855f7_55%,#06b6d4_80%,#10b981)] blur-[1px]" />
                <div className="absolute inset-0.5 rounded-full bg-black/20 backdrop-blur-[1px]" />
                <div className="relative w-3 h-3 rounded-full bg-white/95 blur-[0.5px]" />
              </div>
              <span className="text-emerald-400 font-mono text-2xl font-bold tracking-tight">&lt;1.2s</span>
            </div>
          </div>

          {/* Teléfono iPhone 16 Pro en Titanio Oscuro */}
          <div className="gsap-device-chassis order-1 md:order-2 z-20">
            <div className="gsap-phone-float w-[260px] sm:w-[280px] aspect-[9/19] rounded-[48px] p-2.5 bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-900 shadow-2xl border border-zinc-700/60 relative">
              <div className="w-full h-full rounded-[40px] bg-black p-1 relative overflow-hidden flex flex-col border border-zinc-900">
                {/* Dynamic Island */}
                <div className="w-24 h-5 bg-black rounded-full mx-auto mt-2 flex items-center justify-end px-2 z-20 shrink-0">
                  <div className="w-2 h-2 rounded-full bg-zinc-900 mr-1" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                </div>

                {/* OLED Glass Screen Placeholder (Reservado para video real del usuario) */}
                <div
                  id="phone-video-slot"
                  className="w-full flex-1 bg-[#000000] relative flex flex-col items-center justify-center p-6 text-center select-none rounded-b-[36px]"
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.04] via-transparent to-transparent pointer-events-none" />
                  <div className="w-11 h-11 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-2.5 shadow-inner">
                    <VideoPlaceholderIcon className="w-5 h-5 text-zinc-400" />
                  </div>
                  <p className="text-xs font-medium text-zinc-400">Video Demo</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5 max-w-[130px] leading-tight">
                    Espacio reservado para grabación real de iPhone
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tarjeta Flotante Derecha: Notificación Push iOS 8:00 AM */}
          <div className="gsap-flank-card-right order-3 md:-ml-6 z-10 w-full sm:w-auto flex justify-center">
            <div className="bg-zinc-900/85 backdrop-blur-xl border border-zinc-700/60 rounded-2xl p-4 shadow-2xl max-w-[270px] text-left hover:border-zinc-600 transition-colors">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-4 h-4 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-emerald-400">
                  <OrganizerIcon className="w-2.5 h-2.5" />
                </div>
                <span className="text-zinc-400 text-[11px] font-medium">iOS push notification</span>
                <span className="text-zinc-500 text-[11px] ml-auto">now</span>
              </div>
              <p className="text-white font-semibold text-xs mt-2">08:00 AM - Resumen del día</p>
              <p className="text-zinc-300 text-[11px] mt-0.5 leading-snug">
                Hoy: Cálculo 8:00 · Entrega Lab 11:00 · Gym 18:00
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          4. BENTO GRID DE 3 TARJETAS (EXACTO A LA PROPUESTA VISUAL)
          ==================================================================== */}
      <section id="bento-grid" className="max-w-5xl mx-auto mt-10 sm:mt-16 px-4">
        <div className="rounded-3xl bg-zinc-950/70 backdrop-blur-xl border border-zinc-800/80 p-3 sm:p-4 grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 shadow-2xl">
          {/* Tarjeta 1: Captura en 1s + Audio Waveform */}
          <div className="gsap-bento-card p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60 flex flex-col justify-between h-full group hover:border-zinc-700/80 transition-all">
            <div>
              <span className="text-xs font-mono text-zinc-500">1</span>
              <h3 className="text-lg font-bold text-white tracking-tight mt-1">Captura en 1s</h3>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 mb-8 leading-relaxed">
                Captura por voz sin abrir la app. Pensamientos directo a tu bandeja.
              </p>
            </div>
            {/* Espectro Waveform realista */}
            <div className="flex items-center justify-center gap-1.5 h-14 pt-2">
              {WAVEFORM_HEIGHTS.map((height, idx) => (
                <div
                  key={idx}
                  className="gsap-waveform-bar w-1 bg-zinc-300 rounded-full group-hover:bg-emerald-400 transition-colors origin-bottom"
                  style={{ height: `${height}px` }}
                />
              ))}
            </div>
          </div>

          {/* Tarjeta 2: Bloques de Foco + Timeline Schedule */}
          <div className="gsap-bento-card p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60 flex flex-col justify-between h-full group hover:border-zinc-700/80 transition-all">
            <div>
              <span className="text-xs font-mono text-zinc-500">2</span>
              <h3 className="text-lg font-bold text-white tracking-tight mt-1">Bloques de Foco</h3>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 mb-6 leading-relaxed">
                Línea de tiempo limpia con código de colores para cada bloque.
              </p>
            </div>
            {/* Mini Timeline con bloques coloreados */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-zinc-500 w-10 shrink-0">08:00</span>
                <div className="flex-1 flex gap-1.5">
                  <div className="h-5 bg-sky-500 rounded-md w-3/5" />
                  <div className="h-5 bg-zinc-700/80 rounded-md w-2/5" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-zinc-500 w-10 shrink-0">09:00</span>
                <div className="flex-1">
                  <div className="h-5 bg-amber-500 rounded-md w-4/5" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-zinc-500 w-10 shrink-0">13:00</span>
                <div className="flex-1">
                  <div className="h-5 bg-emerald-500 rounded-md w-3/4" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-zinc-500 w-10 shrink-0">16:00</span>
                <div className="flex-1">
                  <div className="h-5 bg-rose-500/90 rounded-md w-1/2" />
                </div>
              </div>
            </div>
          </div>

          {/* Tarjeta 3: Bajo Estrés + Medidor Circular con Carita de Calma */}
          <div className="gsap-bento-card p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60 flex flex-col justify-between h-full group hover:border-zinc-700/80 transition-all">
            <div>
              <span className="text-xs font-mono text-zinc-500">3</span>
              <h3 className="text-lg font-bold text-white tracking-tight mt-1">Bajo Estrés</h3>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 mb-6 leading-relaxed">
                Impeccable Swiss design craft, sin culpa y con progreso limpio.
              </p>
            </div>
            {/* Medidor circular con rostro sonriente y relajado */}
            <div className="flex items-center justify-center h-20 pt-1">
              <div className="relative w-20 h-20 flex items-center justify-center">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80" aria-hidden="true">
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    fill="none"
                    stroke="#27272a"
                    strokeWidth="5"
                    strokeDasharray="160 50"
                    strokeLinecap="round"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    fill="none"
                    stroke="#e4e4e7"
                    strokeWidth="5"
                    strokeDasharray="115 100"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-300">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-200" />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-200" />
                  </div>
                  <svg className="w-4 h-2 text-zinc-200" viewBox="0 0 16 8" fill="none" aria-hidden="true">
                    <path d="M2 1C4 5 12 5 14 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          5. ACCESO Y LLAMADA A LA ACCIÓN
          ==================================================================== */}
      <section className="max-w-2xl mx-auto mt-20 sm:mt-28 text-center px-4">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Tu semestre en calma, sin deuda invisible.
        </h2>
        <p className="text-zinc-400 text-sm sm:text-base mt-3 max-w-md mx-auto">
          Push, no pull. Una notificación matutina con lo esencial. Cero configuraciones complejas.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/entrar"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-6 py-3 rounded-full bg-white text-zinc-950 font-semibold text-sm hover:bg-zinc-200 transition-all shadow-lg hover:shadow-white/10 active:scale-95"
          >
            <GoogleIcon className="w-4 h-4" />
            <span>Empezar con Google</span>
          </Link>
          <Link
            href="/atajo"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 text-sm font-medium transition-colors"
          >
            <span>Instalar Atajo de Siri</span>
          </Link>
        </div>
      </section>

      {/* ====================================================================
          6. FOOTER DISCRETO
          ==================================================================== */}
      <footer className="max-w-4xl mx-auto mt-24 pb-12 px-4 border-t border-zinc-800/80 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <OrganizerIcon className="w-4 h-4 text-zinc-400" />
          <span className="text-zinc-400 font-medium">Organizer</span>
          <span>· Hecho para iPhone. Push, no pull.</span>
        </div>
        <p>© {new Date().getFullYear()} Organizer. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}

/* ============================================================================
   ICONOS SVG DE PRECISIÓN (REICON OUTLINE)
   ========================================================================= */

function OrganizerIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M15 1.25H10.9436C9.10583 1.24998 7.65019 1.24997 6.51098 1.40314C5.33856 1.56076 4.38961 1.89288 3.64124 2.64124C2.89288 3.38961 2.56076 4.33856 2.40314 5.51098C2.24997 6.65019 2.24998 8.10582 2.25 9.94357V16C2.25 17.8722 3.62205 19.424 5.41551 19.7047C5.55348 20.4687 5.81753 21.1208 6.34835 21.6517C6.95027 22.2536 7.70814 22.5125 8.60825 22.6335C9.47522 22.75 10.5775 22.75 11.9451 22.75H15.0549C16.4225 22.75 17.5248 22.75 18.3918 22.6335C19.2919 22.5125 20.0497 22.2536 20.6517 21.6517C21.2536 21.0497 21.5125 20.2919 21.6335 19.3918C21.75 18.5248 21.75 17.4225 21.75 16.0549V10.9451C21.75 9.57754 21.75 8.47522 21.6335 7.60825C21.5125 6.70814 21.2536 5.95027 20.6517 5.34835C20.1208 4.81753 19.4687 4.55348 18.7047 4.41551C18.424 2.62205 16.8722 1.25 15 1.25ZM17.1293 4.27117C16.8265 3.38623 15.9876 2.75 15 2.75H11C9.09318 2.75 7.73851 2.75159 6.71085 2.88976C5.70476 3.02502 5.12511 3.27869 4.7019 3.7019C4.27869 4.12511 4.02502 4.70476 3.88976 5.71085C3.75159 6.73851 3.75 8.09318 3.75 10V16C3.75 16.9876 4.38624 17.8265 5.27117 18.1293C5.24998 17.5194 5.24999 16.8297 5.25 16.0549V10.9451C5.24998 9.57754 5.24996 8.47522 5.36652 7.60825C5.48754 6.70814 5.74643 5.95027 6.34835 5.34835C6.95027 4.74643 7.70814 4.48754 8.60825 4.36652C9.47522 4.24996 10.5775 4.24998 11.9451 4.25H15.0549C15.8297 4.24999 16.5194 4.24998 17.1293 4.27117ZM7.40901 6.40901C7.68577 6.13225 8.07435 5.9518 8.80812 5.85315C9.56347 5.75159 10.5646 5.75 12 5.75H15C16.4354 5.75 17.4365 5.75159 18.1919 5.85315C18.9257 5.9518 19.3142 6.13225 19.591 6.40901C19.8678 6.68577 20.0482 7.07435 20.1469 7.80812C20.2484 8.56347 20.25 9.56458 20.25 11V16C20.25 17.4354 20.2484 18.4365 20.1469 19.1919C20.0482 19.9257 19.8678 20.3142 19.591 20.591C19.3142 20.8678 18.9257 21.0482 18.1919 21.1469C17.4365 21.2484 16.4354 21.25 15 21.25H12C10.5646 21.25 9.56347 21.2484 8.80812 21.1469C8.07435 21.0482 7.68577 20.8678 7.40901 20.591C7.13225 20.3142 6.9518 19.9257 6.85315 19.1919C6.75159 18.4365 6.75 17.4354 6.75 16V11C6.75 9.56458 6.75159 8.56347 6.85315 7.80812C6.9518 7.07435 7.13225 6.68577 7.40901 6.40901Z"
        fill="currentColor"
      />
    </svg>
  );
}

function VideoPlaceholderIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.3324 3.75H6.16762C5.285 3.74999 4.57692 3.74999 4.00433 3.79677C3.41601 3.84484 2.905 3.94601 2.43404 4.18597C1.68139 4.56947 1.06947 5.18139 0.685974 5.93404C0.44601 6.405 0.344838 6.91601 0.29677 7.50433C0.249988 8.07692 0.249993 8.78499 0.25 9.66762V14.3324C0.249993 15.215 0.249988 15.9231 0.29677 16.4957C0.344838 17.084 0.44601 17.595 0.685974 18.066C1.06947 18.8186 1.68139 19.4305 2.43404 19.814C2.905 20.054 3.41601 20.1552 4.00433 20.2032C4.57691 20.25 5.28499 20.25 6.16761 20.25H12.3324C13.215 20.25 13.9231 20.25 14.4957 20.2032C15.084 20.1552 15.595 20.054 16.066 19.814C16.8186 19.4305 17.4305 18.8186 17.814 18.066C18.054 17.595 18.1552 17.084 18.2032 16.4957C18.2337 16.1228 18.2443 15.6924 18.248 15.1937L20.9901 17.6865C22.05 18.6501 23.75 17.898 23.75 16.4656V7.53459C23.75 6.10216 22.05 5.35014 20.9901 6.31369L18.248 8.80648C18.2443 8.30775 18.2337 7.8773 18.2032 7.50433C18.1552 6.91601 18.054 6.405 17.814 5.93404C17.4305 5.18139 16.8186 4.56947 16.066 4.18597C15.595 3.94601 15.084 3.84484 14.4957 3.79677C13.9231 3.74999 13.215 3.74999 12.3324 3.75ZM18.25 10.8319V13.1683L21.9991 16.5766C22.0302 16.6049 22.056 16.6133 22.0764 16.6162C22.1005 16.6195 22.1303 16.6162 22.1607 16.6028C22.1911 16.5893 22.2136 16.5695 22.2273 16.5494C22.2389 16.5324 22.25 16.5077 22.25 16.4656V7.53459C22.25 7.49252 22.2389 7.46777 22.2273 7.45081C22.2136 7.43074 22.1911 7.41086 22.1607 7.39742C22.1303 7.38398 22.1005 7.38071 22.0764 7.38404C22.056 7.38686 22.0302 7.3953 21.9991 7.4236L18.25 10.8319ZM16.75 9.7C16.75 8.77754 16.7494 8.1308 16.7082 7.62648C16.6677 7.13092 16.5918 6.83928 16.4775 6.61502C16.2378 6.14462 15.8554 5.76217 15.385 5.52248C15.1607 5.40822 14.8691 5.33228 14.3735 5.29179C13.8692 5.25058 13.2225 5.25 12.3 5.25H6.2C5.27754 5.25 4.6308 5.25058 4.12648 5.29179C3.63092 5.33228 3.33928 5.40822 3.11502 5.52248C2.64462 5.76217 2.26217 6.14462 2.02248 6.61502C1.90822 6.83928 1.83228 7.13092 1.79179 7.62648C1.75058 8.1308 1.75 8.77754 1.75 9.7V14.3C1.75 15.2225 1.75058 15.8692 1.79179 16.3735C1.83228 16.8691 1.90822 17.1607 2.02248 17.385C2.26217 17.8554 2.64462 18.2378 3.11502 18.4775C3.33928 18.5918 3.63092 18.6677 4.12648 18.7082C4.6308 18.7494 5.27754 18.75 6.2 18.75H12.3C13.2225 18.75 13.8692 18.7494 14.3735 18.7082C14.8691 18.6677 15.1607 18.5918 15.385 18.4775C15.8554 18.2378 16.2378 17.8554 16.4775 17.385C16.5918 17.1607 16.6677 16.8691 16.7082 16.3735C16.7494 15.8692 16.75 15.2225 16.75 14.3V9.7Z"
        fill="currentColor"
      />
    </svg>
  );
}

function GoogleIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 6.02-1.07 8.04-2.91l-3.88-3.05c-1.08.73-2.47 1.16-4.16 1.16-3.19 0-5.9-2.16-6.87-5.06H1.07v3.14C3.12 21.32 7.27 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.13 14.14c-.25-.73-.39-1.51-.39-2.14s.14-1.41.39-2.14V6.72H1.07C.39 8.08 0 9.77 0 12s.39 3.92 1.07 5.28l4.06-3.14Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.27 0 3.12 2.68 1.07 6.72l4.06 3.14c.97-2.9 3.68-5.09 6.87-5.09Z"
      />
    </svg>
  );
}
