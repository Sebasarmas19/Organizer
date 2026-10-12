'use client';

/* ============================================================================
   Organizer · Landing Page (Dark Titanium Studio · Polish & Full Craft)
   
   Directivas Impeccable, GSAP & Craft Floor:
     - Teléfono iPhone 16 Pro perfectamente centrado (grid simétrico [1fr_auto_1fr])
     - Textos cuidados y empáticos para TDAH (diagnóstico real de docs/00-problema.md)
     - Flancos perfectamente equilibrados: Siri <1.2s a la izquierda, Push 8:00 AM a la derecha
     - Pantalla OLED limpia (#phone-video-slot) lista para incrustar el video real
     - Coreografía fluida GSAP con ScrollTrigger en cada sección
     - Animación interactiva en el medidor circular (strokeDashoffset) y waveform viva
     - Micro-demos interactivas funcionales (lockscreen toggle, decisión de "Lo de ayer")
     - Respeto a prefers-reduced-motion
   ========================================================================= */

import { useState, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

// Alturas armónicas del espectro de onda de audio
const WAVEFORM_HEIGHTS = [
  8, 14, 18, 24, 34, 42, 28, 16, 24, 38, 48, 32, 20, 16, 28, 44, 34, 22, 14, 26, 36, 24, 16, 12, 18, 12, 6,
];

export function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Estados interactivos para las micro-demos de la página
  const [notificationView, setNotificationView] = useState<'expanded' | 'compact'>('expanded');
  const [yesterdayAction, setYesterdayAction] = useState<'none' | 'today' | 'another' | 'removed'>('none');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // GSAP Choreography
  useGSAP(
    () => {
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (prefersReducedMotion) return;

      // 1. Entrada inicial escalonada del Hero (titular, subtítulo, navbar)
      gsap.from('.gsap-hero-item', {
        y: 28,
        opacity: 0,
        duration: 0.9,
        stagger: 0.12,
        ease: 'power3.out',
      });

      // 2. Chasis del teléfono y escalado inicial
      gsap.from('.gsap-device-chassis', {
        scale: 0.93,
        y: 40,
        opacity: 0,
        duration: 1.1,
        ease: 'power3.out',
        delay: 0.2,
      });

      // 3. Tarjetas flotantes laterales (entrada desde los extremos hacia el centro)
      gsap.from('.gsap-flank-card-left', {
        x: -40,
        opacity: 0,
        duration: 0.9,
        ease: 'power2.out',
        delay: 0.35,
      });

      gsap.from('.gsap-flank-card-right', {
        x: 40,
        opacity: 0,
        duration: 0.9,
        ease: 'power2.out',
        delay: 0.35,
      });

      // 4. Física senoidal de flotación perpetua suave en el iPhone
      gsap.to('.gsap-phone-float', {
        y: -10,
        duration: 3.8,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      // 5. Pulsación volumétrica del resplandor esmeralda ambiental
      gsap.to('.gsap-glow-pulse', {
        scale: 1.12,
        opacity: 0.28,
        duration: 4.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      // 6. Animación continua de la onda de audio (Waveform)
      gsap.to('.gsap-waveform-bar', {
        scaleY: (index) => 0.5 + ((index * 9) % 6) * 0.11,
        duration: 1.1,
        repeat: -1,
        yoyo: true,
        stagger: {
          each: 0.04,
          from: 'center',
        },
        ease: 'sine.inOut',
      });

      // 7. ScrollTrigger: Revelado del Bento Grid
      gsap.fromTo(
        '.gsap-bento-card',
        { opacity: 0, y: 35, scale: 0.98 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          stagger: 0.12,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '#bento-grid',
            start: 'top 88%',
            once: true,
          },
        }
      );

      // 8. ScrollTrigger: Animación de llenado del medidor circular en Bento Card 3
      gsap.fromTo(
        '.gsap-gauge-arc',
        { strokeDashoffset: 160 },
        {
          strokeDashoffset: 45,
          duration: 1.4,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '#bento-grid',
            start: 'top 85%',
            once: true,
          },
        }
      );

      // 9. ScrollTrigger: Secciones profundas
      const deepSections = gsap.utils.toArray<HTMLElement>('.gsap-deep-section');
      deepSections.forEach((section) => {
        gsap.fromTo(
          section,
          { opacity: 0, y: 36 },
          {
            opacity: 1,
            y: 0,
            duration: 0.85,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: section,
              start: 'top 86%',
              once: true,
            },
          }
        );
      });

      // 10. ScrollTrigger: Pasos del pipeline de Siri
      gsap.fromTo(
        '.gsap-pipeline-step',
        { opacity: 0, y: 28 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.12,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '#pipeline-steps',
            start: 'top 86%',
            once: true,
          },
        }
      );

      // 11. ScrollTrigger: Tarjetas de los 4 módulos
      gsap.fromTo(
        '.gsap-module-card',
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '#modulos-grid',
            start: 'top 86%',
            once: true,
          },
        }
      );
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
      <header className="max-w-4xl mx-auto pt-6 px-4 sticky top-4 z-50">
        <nav className="w-full rounded-full bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/80 px-5 py-2.5 flex items-center justify-between shadow-2xl">
          {/* Logo y Marca */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-7 h-7 rounded-lg bg-zinc-800/90 border border-zinc-700/60 flex items-center justify-center text-zinc-300 group-hover:text-emerald-400 group-hover:border-emerald-500/40 transition-colors">
              <OrganizerIcon className="w-4 h-4" />
            </div>
            <span className="text-white font-semibold text-sm tracking-tight">Organizer</span>
          </Link>

          {/* Enlaces de Navegación Rápida (Desktop) */}
          <div className="hidden md:flex items-center gap-6 text-xs text-zinc-400 font-medium">
            <a href="#notificacion" className="hover:text-white transition-colors">
              Push diario
            </a>
            <a href="#captura" className="hover:text-white transition-colors">
              Captura Siri
            </a>
            <a href="#anti-culpa" className="hover:text-white transition-colors">
              Anti-culpa
            </a>
            <a href="#modulos" className="hover:text-white transition-colors">
              Módulos
            </a>
            <a href="#faq" className="hover:text-white transition-colors">
              Preguntas
            </a>
          </div>

          {/* Botón de Acción Principal (Pill blanco como en la comp) */}
          <div className="flex items-center gap-3">
            <Link
              href="/entrar"
              className="px-4 py-1.5 rounded-full bg-white text-zinc-950 font-medium text-xs hover:bg-zinc-200 transition-colors shadow-sm active:scale-95 shrink-0"
            >
              Early Access
            </Link>
          </div>
        </nav>
      </header>

      {/* ====================================================================
          2. HERO SECTION: TITULAR Y SUBTÍTULO
          ==================================================================== */}
      <section className="pt-12 sm:pt-16 pb-4 text-center px-4 max-w-4xl mx-auto">
        <h1 className="gsap-hero-item text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-[1.12]">
          Tu día resuelto antes de que abras la app
        </h1>
        <p className="gsap-hero-item text-zinc-400 text-base sm:text-lg md:text-xl font-normal mt-4 max-w-xl mx-auto leading-relaxed">
          El asistente silencioso para estudiantes con TDAH.
        </p>
      </section>

      {/* ====================================================================
          3. SHOWCASE CENTRAL: IPHONE 16 PRO (CENTRADISIMO), RESPLANDOR Y FLANCOS
          ==================================================================== */}
      <section className="relative max-w-6xl mx-auto mt-6 sm:mt-10 px-4">
        {/* Atmósfera: Fondo con micro-textura de puntos */}
        <div
          className="absolute inset-0 pointer-events-none -z-20 opacity-30"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255, 255, 255, 0.12) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Resplandor esmeralda volumétrico detrás del teléfono */}
        <div className="gsap-glow-pulse absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[540px] h-[340px] sm:h-[540px] rounded-full bg-emerald-500/20 blur-[110px] pointer-events-none -z-10" />

        {/* ==================================================================
            DISEÑO EN DESKTOP: Grid [1fr_auto_1fr] SIMÉTRICO PARA CENTRADO PERFECTO
            Garantiza que la columna 1 y la columna 3 tengan exactamente el mismo ancho,
            dejando el teléfono en la columna 2 en el centro exacto del viewport.
            ================================================================== */}
        <div className="hidden md:grid md:grid-cols-[1fr_auto_1fr] items-center gap-6 pt-4 pb-6 w-full">
          {/* Flanco Izquierdo: Siri <1.2s empujado hacia la derecha para besar el teléfono */}
          <div className="gsap-flank-card-left flex justify-end pr-3 z-10">
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

          {/* Centro Absoluto: iPhone 16 Pro en Titanio Oscuro */}
          <div className="gsap-device-chassis z-20 flex justify-center">
            <div className="gsap-phone-float w-[280px] aspect-[9/19] rounded-[48px] p-2.5 bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-900 shadow-2xl border border-zinc-700/60 relative">
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

          {/* Flanco Derecho: Notificación Push iOS 8:00 AM empujada hacia la izquierda */}
          <div className="gsap-flank-card-right flex justify-start pl-3 z-10">
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

        {/* DISEÑO EN MÓVIL (< md): Apilado centrado natural */}
        <div className="md:hidden flex flex-col items-center gap-5 pt-4 pb-6">
          <div className="gsap-device-chassis z-20">
            <div className="gsap-phone-float w-[260px] aspect-[9/19] rounded-[48px] p-2.5 bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-900 shadow-2xl border border-zinc-700/60 relative">
              <div className="w-full h-full rounded-[40px] bg-black p-1 relative overflow-hidden flex flex-col border border-zinc-900">
                <div className="w-24 h-5 bg-black rounded-full mx-auto mt-2 flex items-center justify-end px-2 z-20 shrink-0">
                  <div className="w-2 h-2 rounded-full bg-zinc-900 mr-1" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                </div>
                <div
                  id="phone-video-slot-mobile"
                  className="w-full flex-1 bg-[#000000] relative flex flex-col items-center justify-center p-6 text-center select-none rounded-b-[36px]"
                >
                  <div className="w-11 h-11 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-2.5 shadow-inner">
                    <VideoPlaceholderIcon className="w-5 h-5 text-zinc-400" />
                  </div>
                  <p className="text-xs font-medium text-zinc-400">Video Demo</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5 max-w-[130px] leading-tight">
                    Espacio reservado para grabación real
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Widgets debajo del teléfono en móvil */}
          <div className="w-full max-w-[280px] space-y-3">
            {/* Widget Siri en móvil */}
            <div className="bg-zinc-900/85 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-3.5 flex items-center justify-between shadow-xl shadow-emerald-950/20">
              <div className="flex items-center gap-3">
                <div className="relative w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                  <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,#ffffff,#f43f5e_30%,#a855f7_55%,#06b6d4_80%,#10b981)] blur-[1px]" />
                  <div className="absolute inset-0.5 rounded-full bg-black/20" />
                  <div className="relative w-2.5 h-2.5 rounded-full bg-white/95" />
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-zinc-400 font-medium block">Captura por voz</span>
                  <span className="text-xs text-white font-medium">AirPods / Atajos</span>
                </div>
              </div>
              <span className="text-emerald-400 font-mono text-lg font-bold tracking-tight">&lt;1.2s</span>
            </div>

            {/* Widget Push Notification en móvil */}
            <div className="bg-zinc-900/85 backdrop-blur-xl border border-zinc-700/60 rounded-2xl p-3.5 shadow-xl text-left">
              <div className="flex items-center gap-2 text-xs mb-1.5">
                <div className="w-4 h-4 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-emerald-400">
                  <OrganizerIcon className="w-2.5 h-2.5" />
                </div>
                <span className="text-zinc-400 text-[11px] font-medium">iOS push notification</span>
                <span className="text-zinc-500 text-[10px] ml-auto">8:00 AM</span>
              </div>
              <p className="text-white font-semibold text-xs">Resumen diario</p>
              <p className="text-zinc-300 text-[11px] mt-0.5 leading-snug">
                Hoy: Cálculo 8:00 · Lab 11:00 · Gym 18:00
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          4. BENTO GRID DE 3 TARJETAS (GRÁFICOS VIVOS Y TEXTO NO GENÉRICO)
          ==================================================================== */}
      <section id="bento-grid" className="max-w-5xl mx-auto mt-10 sm:mt-16 px-4">
        <div className="rounded-3xl bg-zinc-950/70 backdrop-blur-xl border border-zinc-800/80 p-3 sm:p-4 grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 shadow-2xl">
          {/* Tarjeta 1: Captura en 1s + Audio Waveform */}
          <div className="gsap-bento-card p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60 flex flex-col justify-between h-full group hover:border-zinc-700/80 transition-all">
            <div>
              <span className="text-xs font-mono text-zinc-500">1</span>
              <h3 className="text-lg font-bold text-white tracking-tight mt-1">Captura en 1s</h3>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 mb-8 leading-relaxed">
                De tu voz en AirPods a tu base de datos en Postgres. Cero formularios y cero pérdida del hilo mental.
              </p>
            </div>
            {/* Espectro Waveform vivo */}
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
                El tiempo no se estira: visualiza tus huecos libres exactos entre clases para no sobrecargarte.
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

          {/* Tarjeta 3: Bajo Estrés + Medidor Circular Animado */}
          <div className="gsap-bento-card p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/60 flex flex-col justify-between h-full group hover:border-zinc-700/80 transition-all">
            <div>
              <span className="text-xs font-mono text-zinc-500">3</span>
              <h3 className="text-lg font-bold text-white tracking-tight mt-1">Bajo Estrés</h3>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 mb-6 leading-relaxed">
                La vida pasa. Dos comodines de perdón al mes sostienen tu racha aunque un día se complique.
              </p>
            </div>
            {/* Medidor circular con animación ScrollTrigger */}
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
                    className="gsap-gauge-arc"
                    cx="40"
                    cy="40"
                    r="32"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="5"
                    strokeDasharray="160 160"
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
          5. DEEP DIVE 1: PUSH, NO PULL (EL DIAGNÓSTICO REAL DE TDAH)
          ==================================================================== */}
      <section id="notificacion" className="gsap-deep-section max-w-5xl mx-auto mt-24 sm:mt-32 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Columna Izquierda: Filosofía */}
          <div className="lg:col-span-6 space-y-4">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
              Tu problema nunca fue anotar. Fue volver a leer.
            </h2>
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
              El patrón de fracaso del estudiante con TDAH no está en la captura: anotas en Notion, en WhatsApp contigo mismo o en notas rápidas. Lo que nunca ocurre es el regreso voluntario a revisar lo guardado.
            </p>
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
              Por eso en Organizer no dependemos de que te acuerdes de entrar. A las 8:00 AM recibes un único aviso en tu pantalla de bloqueo con tu itinerario completo. Lo lees en dos segundos y sigues con tu mañana.
            </p>

            {/* Segmented Control iOS */}
            <div className="pt-2">
              <div className="inline-flex items-center gap-1.5 p-1 rounded-full bg-zinc-900 border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setNotificationView('expanded')}
                  style={{
                    padding: '0.45rem 1.15rem',
                    backgroundColor: notificationView === 'expanded' ? '#27272a' : 'transparent',
                    color: notificationView === 'expanded' ? '#ffffff' : '#a1a1aa',
                  }}
                  className="rounded-full text-xs font-semibold transition-all shadow-sm cursor-pointer"
                >
                  Vista Detallada
                </button>
                <button
                  type="button"
                  onClick={() => setNotificationView('compact')}
                  style={{
                    padding: '0.45rem 1.15rem',
                    backgroundColor: notificationView === 'compact' ? '#27272a' : 'transparent',
                    color: notificationView === 'compact' ? '#ffffff' : '#a1a1aa',
                  }}
                  className="rounded-full text-xs font-semibold transition-all shadow-sm cursor-pointer"
                >
                  Vista Bloqueo
                </button>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Mockup de Pantalla de Bloqueo de iOS */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-sm rounded-[36px] bg-zinc-950 p-5 border border-zinc-800 shadow-2xl relative overflow-hidden">
              {/* Reloj Apple Lockscreen */}
              <div className="text-center pt-2 pb-6">
                <span className="text-[11px] font-medium text-zinc-400 block tracking-wide">
                  Lunes, 12 de octubre
                </span>
                <span className="text-5xl font-light tracking-tight text-white block mt-0.5 font-sans">
                  08:00
                </span>
              </div>

              {/* Notificación interactiva */}
              <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-700/60 rounded-2xl p-4 shadow-xl transition-all">
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-zinc-800 flex items-center justify-center text-emerald-400">
                      <OrganizerIcon className="w-2.5 h-2.5" />
                    </div>
                    <span className="font-semibold text-white text-[11px]">Organizer</span>
                  </div>
                  <span className="text-[10px] text-zinc-500">ahora</span>
                </div>

                <p className="text-xs font-bold text-white mb-1.5">
                  Hoy: 2 clases · 2 entregas prioritarias
                </p>

                {notificationView === 'expanded' ? (
                  <div className="space-y-1.5 text-[11px] text-zinc-300 pt-1.5 border-t border-zinc-800/80">
                    <div className="flex items-center justify-between">
                      <span className="text-sky-400 font-medium">08:00 Cálculo Diferencial</span>
                      <span className="text-zinc-500">Aula 302</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-400 font-medium">11:00 Entrega Informe Física</span>
                      <span className="text-zinc-500">Lab Central</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-amber-400 font-medium">15:00 Sesión de Estudio Álgebra</span>
                      <span className="text-zinc-500">Biblioteca</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 font-medium">18:00 Entrenamiento Gym</span>
                      <span className="text-zinc-500">45m</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-zinc-300 leading-tight">
                    Cálculo 8:00 · Informe Física 11:00 · Álgebra 15:00 · Gym 18:00
                  </p>
                )}
              </div>

              <div className="mt-6 flex justify-center pb-1">
                <div className="w-28 h-1 bg-zinc-800 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          6. DEEP DIVE 2: CAPTURA EN 0 FRICCIÓN (<1.2S CON SIRI)
          ==================================================================== */}
      <section id="captura" className="gsap-deep-section max-w-5xl mx-auto mt-24 sm:mt-32 px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
            Pensar rápido no debería exigir abrir menús
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base mt-3 leading-relaxed">
            Un profesor cambia la fecha de entrega en el último minuto. Si tienes que abrir una app, elegir carpeta y buscar una fecha en un calendario, la tarea muere en el olvido.
          </p>
        </div>

        {/* Pipeline Visual en 3 Fases */}
        <div id="pipeline-steps" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Fase 1 */}
          <div className="gsap-pipeline-step p-6 rounded-2xl bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 mb-4">
                <MicIcon className="w-4 h-4" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">1. Dictado natural</h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                Desde tus AirPods o la pantalla de bloqueo:
              </p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs sm:text-[13px] font-mono text-emerald-300 leading-relaxed">
              «Oye Siri, anota parcial de cálculo el próximo martes a las 8»
            </div>
          </div>

          {/* Fase 2 */}
          <div className="gsap-pipeline-step p-5 sm:p-6 rounded-2xl bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 mb-4">
                <OrganizerIcon className="w-4 h-4" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">2. Parser semántico</h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                El servidor extrae intención, fecha y hora sin clasificar a mano:
              </p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs sm:text-[13px] font-mono text-zinc-300 space-y-1.5 leading-relaxed">
              <div><span className="text-zinc-500">Tipo:</span> Parcial / Examen</div>
              <div><span className="text-zinc-500">Fecha:</span> Próximo martes</div>
              <div><span className="text-zinc-500">Hora:</span> 08:00 AM</div>
            </div>
          </div>

          {/* Fase 3 */}
          <div className="gsap-pipeline-step p-5 sm:p-6 rounded-2xl bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 mb-4">
                <CheckIcon className="w-4 h-4" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">3. Sincronización silenciosa</h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                Guardado en Postgres con RLS bajo tu usuario:
              </p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs sm:text-[13px] text-zinc-300 leading-relaxed">
              Aparecerá en el briefing matutino de ese día sin que hayas abierto la app.
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          7. DEEP DIVE 3: CERO CULPA & PROTECCIÓN DE RACHA
          ==================================================================== */}
      <section id="anti-culpa" className="gsap-deep-section max-w-5xl mx-auto mt-24 sm:mt-32 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Mockup Interactivo: Widget "Lo de ayer" */}
          <div className="lg:col-span-6 flex justify-center order-2 lg:order-1">
            <div className="w-full max-w-md p-6 rounded-3xl bg-zinc-950 border border-zinc-800/80 shadow-2xl">
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-4 pb-3 border-b border-zinc-850">
                <span className="font-semibold text-white">Lo de ayer</span>
                <span className="font-mono text-emerald-400">2 comodines activos este mes</span>
              </div>

              {yesterdayAction === 'none' ? (
                <div>
                  <p className="text-xs text-zinc-400 mb-3">
                    Quedó pendiente del día anterior sin reproches:
                  </p>
                  <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 mb-4">
                    <span className="text-sm font-semibold text-white block">
                      Revisar ejercicios de termodinámica
                    </span>
                    <span className="text-xs text-zinc-400 mt-1 block">
                      Programada originalmente para ayer 16:00
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 mb-2.5">Decide en un tap qué hacer hoy:</p>
                  <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                    <button
                      type="button"
                      onClick={() => setYesterdayAction('today')}
                      style={{
                        padding: '0.625rem 0.75rem',
                        minHeight: '44px',
                        backgroundColor: '#18181b',
                        border: '1px solid rgba(16, 185, 129, 0.45)',
                        color: '#34d399',
                      }}
                      className="rounded-xl text-xs font-semibold transition-all flex items-center justify-center hover:bg-zinc-800 active:scale-95 cursor-pointer"
                    >
                      Hoy
                    </button>
                    <button
                      type="button"
                      onClick={() => setYesterdayAction('another')}
                      style={{
                        padding: '0.625rem 0.75rem',
                        minHeight: '44px',
                        backgroundColor: '#18181b',
                        border: '1px solid rgba(245, 158, 11, 0.45)',
                        color: '#fbbf24',
                      }}
                      className="rounded-xl text-xs font-semibold transition-all flex items-center justify-center hover:bg-zinc-800 active:scale-95 cursor-pointer"
                    >
                      Otro día
                    </button>
                    <button
                      type="button"
                      onClick={() => setYesterdayAction('removed')}
                      style={{
                        padding: '0.625rem 0.75rem',
                        minHeight: '44px',
                        backgroundColor: '#18181b',
                        border: '1px solid rgba(63, 63, 70, 0.7)',
                        color: '#a1a1aa',
                      }}
                      className="rounded-xl text-xs font-semibold transition-all flex items-center justify-center hover:bg-zinc-800 active:scale-95 cursor-pointer"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-3">
                    <CheckIcon className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-semibold text-white mb-1">
                    {yesterdayAction === 'today' && 'Movido a los huecos libres de hoy.'}
                    {yesterdayAction === 'another' && 'Pospuesto para el fin de semana sin culpa.'}
                    {yesterdayAction === 'removed' && 'Descartado limpiamente. Cero deuda.'}
                  </p>
                  <p className="text-xs text-zinc-400 mb-4">
                    Tu racha sigue protegida por el comodín mensual.
                  </p>
                  <button
                    type="button"
                    onClick={() => setYesterdayAction('none')}
                    style={{ padding: '0.5rem 1rem' }}
                    className="text-xs text-zinc-400 hover:text-zinc-200 underline underline-offset-4 inline-block"
                  >
                    Probar otra decisión
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Filosofía Anti-Culpa */}
          <div className="lg:col-span-6 space-y-4 order-1 lg:order-2">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
              Una app que nunca te regaña ni acumula culpa
            </h2>
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
              Las aplicaciones comunes acumulan números rojos, alertas vencidas y contadores crecientes. Para un cerebro con TDAH, esa deuda visual produce evasión inmediata y abandono.
            </p>
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
              En Organizer, si ayer no pudiste sentarte a estudiar, la app no te castiga. Cada mañana te pregunta calmadamente con tres botones de decisión rápida: <strong className="text-white">Hoy</strong>, <strong className="text-white">Otro día</strong> o <strong className="text-white">Quitar</strong>.
            </p>
          </div>
        </div>
      </section>

      {/* ====================================================================
          8. LOS 4 MÓDULOS DE ORGANIZER (ARQUITECTURA CLARA)
          ==================================================================== */}
      <section id="modulos" className="gsap-deep-section max-w-5xl mx-auto mt-24 sm:mt-32 px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
            Cuatro módulos. Ni una sola pantalla de más.
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base mt-3 leading-relaxed">
            Arquitectura limpia diseñada para que la mente no se disperse entre menús infinitos.
          </p>
        </div>

        <div id="modulos-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Módulo 1: Inicio */}
          <div className="gsap-module-card p-5 rounded-2xl bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 mb-3">
                <SunIcon className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">Inicio</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Una sola pantalla, cero scroll. Tareas del día sin las clases mezcladas, lo de ayer y tu racha protegida.
              </p>
            </div>
            <span className="text-[10px] font-mono text-zinc-600 mt-6 block">Foco absoluto</span>
          </div>

          {/* Módulo 2: Semana */}
          <div className="gsap-module-card p-5 rounded-2xl bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-sky-400 mb-3">
                <CalendarIcon className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">Semana</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                El mapa del tiempo. Bloques horarios continuos para ver exactamente cuántas horas reales tienes entre clases.
              </p>
            </div>
            <span className="text-[10px] font-mono text-zinc-600 mt-6 block">Perspectiva temporal</span>
          </div>

          {/* Módulo 3: Tareas */}
          <div className="gsap-module-card p-5 rounded-2xl bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-400 mb-3">
                <InboxIcon className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">Tareas</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Bandeja de descarga mental. Anota sin fecha forzada y rescata tareas solo cuando decidas sentarte a planificar.
              </p>
            </div>
            <span className="text-[10px] font-mono text-zinc-600 mt-6 block">Captura sin presión</span>
          </div>

          {/* Módulo 4: Recursos */}
          <div className="gsap-module-card p-5 rounded-2xl bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-purple-400 mb-3">
                <BookOpenIcon className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">Recursos</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Tu biblioteca silenciosa. Enlaces, apuntes y herramientas de ingeniería. Nunca te envía push ni te persigue.
              </p>
            </div>
            <span className="text-[10px] font-mono text-zinc-600 mt-6 block">Consulta silenciosa</span>
          </div>
        </div>
      </section>

      {/* ====================================================================
          9. PREGUNTAS FRECUENTES (FAQ ACORDEÓN DARK TITANIUM)
          ==================================================================== */}
      <section id="faq" className="gsap-deep-section max-w-3xl mx-auto mt-24 sm:mt-32 px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
            Preguntas frecuentes
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base mt-2">
            Todo lo que necesitas saber antes de empezar.
          </p>
        </div>

        <div className="space-y-3">
          {[
            {
              q: '¿Por qué una PWA en iPhone y no una app en la App Store?',
              a: 'Porque se instala directamente sin intermediarios, pesa menos de 5MB, actualiza al instante y soporta notificaciones Web Push nativas en iOS 16.4+ agregándola a tu pantalla de inicio.',
            },
            {
              q: '¿Por qué no recibo una notificación por cada tarea individual?',
              a: 'Las notificaciones continuas saturan la atención y generan ceguera de alertas en cerebros con TDAH. Organizer envía un único briefing condensado a las 8:00 AM para que tengas el día resuelto sin interrupciones.',
            },
            {
              q: '¿Cómo funciona la captura por voz con Siri y Atajos?',
              a: 'Instalas el Atajo oficial de Organizer con un solo tap. El atajo se conecta de forma segura a tu cuenta mediante un token personal único, permitiéndote dictar tareas desde tus AirPods o la pantalla de bloqueo en menos de 1.2 segundos.',
            },
            {
              q: '¿Las clases del horario envían notificaciones push?',
              a: 'No. Tus clases se muestran visualmente en el cronograma diario y en el calendario semanal, pero nunca mandan alertas individuales para no generar ruido innecesario.',
            },
            {
              q: '¿Mis datos están seguros?',
              a: 'Toda tu información vive en Postgres en Supabase con Row Level Security (RLS) estricto. Solo tu usuario autenticado puede leer y escribir tus datos personales.',
            },
          ].map((item, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className={`rounded-2xl transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? 'bg-zinc-900/60 border border-emerald-500/30 shadow-lg shadow-black/40'
                    : 'bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700/80'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  style={{
                    padding: '1.25rem 1.5rem',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textAlign: 'left',
                  }}
                  className="gap-4 hover:bg-zinc-900/40 active:bg-zinc-900/60 transition-colors group cursor-pointer"
                >
                  <span className="text-sm sm:text-base font-semibold text-zinc-100 group-hover:text-white transition-colors leading-snug">
                    {item.q}
                  </span>
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border transition-all duration-200 ${
                      isOpen
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 rotate-180'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 group-hover:border-zinc-700 group-hover:text-zinc-200'
                    }`}
                  >
                    <ChevronDownIcon className="w-3.5 h-3.5" />
                  </div>
                </button>
                {isOpen && (
                  <div
                    style={{
                      padding: '0 1.5rem 1.35rem 1.5rem',
                    }}
                    className="text-xs sm:text-sm text-zinc-400 leading-relaxed border-t border-zinc-850/80 pt-3.5"
                  >
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ====================================================================
          10. ACCESO Y LLAMADA A LA ACCIÓN FINAL
          ==================================================================== */}
      <section className="gsap-deep-section max-w-3xl mx-auto mt-24 sm:mt-32 text-center px-4">
        <div className="p-6 sm:p-12 rounded-3xl bg-zinc-950 border border-zinc-800 relative overflow-hidden shadow-2xl">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-emerald-500/15 blur-[90px] pointer-events-none -z-10" />

          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
            Tu semestre en calma, sin deuda invisible.
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base mt-3 max-w-md mx-auto leading-relaxed">
            Push, no pull. Una notificación matutina con lo esencial. Cero configuraciones complejas.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4">
            <Link
              href="/entrar"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-6 py-3.5 rounded-full bg-white text-zinc-950 font-semibold text-sm hover:bg-zinc-200 transition-all shadow-lg hover:shadow-white/10 active:scale-95"
            >
              <GoogleIcon className="w-4 h-4" />
              <span>Empezar con Google</span>
            </Link>
            <Link
              href="/atajo"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 text-sm font-medium transition-colors active:scale-95"
            >
              <span>Instalar Atajo de Siri</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ====================================================================
          11. FOOTER COMPLETO
          ==================================================================== */}
      <footer className="max-w-4xl mx-auto mt-24 pb-12 px-4 border-t border-zinc-800/80 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <OrganizerIcon className="w-4 h-4 text-zinc-400" />
          <span className="text-zinc-400 font-medium">Organizer</span>
          <span>· Hecho para iPhone (PWA). Push, no pull.</span>
        </div>
        <div className="flex items-center gap-4 text-zinc-500">
          <span>Zona: America/Caracas</span>
          <span>·</span>
          <span>Next.js · Supabase · GSAP</span>
        </div>
      </footer>
    </div>
  );
}

/* ============================================================================
   ICONOS SVG DE PRECISIÓN (REICON OUTLINE, STROKE 1.75)
   ========================================================================= */

function OrganizerIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M15 1.25H10.9436C9.10583 1.24998 7.65019 1.24997 6.51098 1.40314C5.33856 1.56076 4.38961 1.89288 3.64124 2.64124C2.89288 3.38961 2.56076 4.33856 2.40314 5.51098C2.24997 6.65019 2.24998 8.10582 2.25 9.94357V16C2.25 17.8722 3.62205 19.424 5.41551 19.7047C5.55348 20.4687 5.81753 21.1208 6.34835 21.6517C6.95027 22.2536 7.70814 22.5125 8.60825 22.6335C9.47522 22.75 10.5775 22.75 11.9451 22.75H15.0549C16.4225 22.75 17.5248 22.75 18.3918 22.6335C19.2919 22.5125 20.0497 22.2536 20.6517 21.6517C21.2536 21.0497 21.5125 20.2919 21.6335 19.3918C21.75 18.5248 21.75 17.4225 21.75 16.0549V10.9451C21.75 9.57754 21.75 8.47522 21.6335 7.60825C21.5125 6.70814 21.2536 5.95027 20.6517 5.34835C20.1208 4.81753 19.4687 4.55348 18.7047 4.41551C18.424 2.62205 16.8722 1.25 15 1.25ZM17.1293 4.27117C16.8265 3.38623 15.9876 2.75 15 2.75H11C9.09318 2.75 7.73851 2.75159 6.71085 2.88976C5.70476 3.02502 5.12511 3.27869 4.7019 3.7019C4.27869 4.12511 4.02502 4.70476 3.88976 5.71085C3.75159 6.73851 3.75 8.09318 3.75 10V16C3.75 16.9876 4.38624 17.8265 5.27117 18.1293C5.24998 17.5194 5.24999 16.8297 5.25 16.0549V10.9451C5.24998 9.57754 5.24996 8.47522 5.36652 7.60825C5.48754 6.70814 5.74643 5.95027 6.34835 5.34835C6.95027 4.74643 7.70814 4.48754 8.60825 4.36652C9.47522 4.24996 10.5775 4.24998 11.9451 4.25H15.0549C15.8297 4.24999 16.5194 4.24998 17.1293 4.27117ZM7.40901 6.40901C7.68577 6.13225 8.07435 5.9518 8.80812 5.85315C9.56347 5.75159 10.5646 5.75 12 5.75H15C16.4354 5.75 17.4365 5.75159 18.1919 5.85315C18.9257 5.9518 19.3142 6.13225 19.591 6.40901C19.8678 6.68577 20.0482 7.07435 20.1469 7.80812C20.2484 8.56347 20.25 9.56458 20.25 11V16C20.25 17.4354 20.2484 18.4365 20.1469 19.1919C20.0482 19.9257 19.8678 20.3142 19.591 20.591C19.3142 20.8678 18.9257 21.0482 18.1919 21.1469C17.4365 21.2484 16.4354 21.25 15 21.25H12C10.5646 21.25 9.56347 21.2484 8.80812 21.1469C8.07435 21.0482 7.68577 20.8678 7.40901 20.591C7.13225 20.3142 6.9518 19.9257 6.85315 19.1919C6.75159 18.4365 6.75 17.4354 6.75 16V11C6.75 9.56458 6.75159 8.56347 6.85315 7.80812C6.9518 7.07435 7.13225 6.68577 7.40901 6.40901Z\"
        fill="currentColor"
      />
    </svg>
  );
}

function MicIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.25 8C6.25 4.82436 8.82436 2.25 12 2.25C15.1756 2.25 17.75 4.82436 17.75 8V11C17.75 14.1756 15.1756 16.75 12 16.75C8.82436 16.75 6.25 14.1756 6.25 11V8ZM12 3.75C9.65279 3.75 7.75 5.65279 7.75 8V11C7.75 13.3472 9.65279 15.25 12 15.25C14.0913 15.25 15.8298 13.7395 16.184 11.75L13 11.75C12.5858 11.75 12.25 11.4142 12.25 11C12.25 10.5858 12.5858 10.25 13 10.25L16.25 10.25V8.75H13C12.5858 8.75 12.25 8.41421 12.25 8C12.25 7.58579 12.5858 7.25 13 7.25H16.184C15.8298 5.26049 14.0913 3.75 12 3.75ZM4 9.25C4.41421 9.25 4.75 9.58579 4.75 10V11C4.75 15.0041 7.99594 18.25 12 18.25C16.0041 18.25 19.25 15.0041 19.25 11V10C19.25 9.58579 19.5858 9.25 20 9.25C20.4142 9.25 20.75 9.58579 20.75 10V11C20.75 15.5798 17.2314 19.3379 12.75 19.7183V22C12.75 22.4142 12.4142 22.75 12 22.75C11.5858 22.75 11.25 22.4142 11.25 22V19.7183C6.7686 19.3379 3.25 15.5798 3.25 11V10C3.25 9.58579 3.58579 9.25 4 9.25Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CalendarIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M17 14C17.5523 14 18 13.5523 18 13C18 12.4477 17.5523 12 17 12C16.4477 12 16 12.4477 16 13C16 13.5523 16.4477 14 17 14Z" fill="currentColor" />
      <path d="M17 18C17.5523 18 18 17.5523 18 17C18 16.4477 17.5523 16 17 16C16.4477 16 16 16.4477 16 17C16 17.5523 16.4477 18 17 18Z" fill="currentColor" />
      <path d="M13 13C13 13.5523 12.5523 14 12 14C11.4477 14 11 13.5523 11 13C11 12.4477 11 12 12 12C12.5523 12 13 12.4477 13 13Z" fill="currentColor" />
      <path d="M13 17C13 17.5523 12.5523 18 12 18C11.4477 18 11 17.5523 11 17C11 16.4477 11 16 12 16C12.5523 16 13 16.4477 13 17Z" fill="currentColor" />
      <path d="M7 14C7.55229 14 8 13.5523 8 13C8 12.4477 7.55229 12 7 12C6.44772 12 6 12.4477 6 13C6 13.5523 6.44772 14 7 14Z" fill="currentColor" />
      <path d="M7 18C7.55229 18 8 17.5523 8 17C8 16.4477 7.55229 16 7 16C6.44772 16 6 16.4477 6 17C6 17.5523 6.44772 18 7 18Z" fill="currentColor" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7 1.75C7.41421 1.75 7.75 2.08579 7.75 2.5V3.26272C8.412 3.24999 9.14133 3.24999 9.94346 3.25H14.0564C14.8586 3.24999 15.588 3.24999 16.25 3.26272V2.5C16.25 2.08579 16.5858 1.75 17 1.75C17.4142 1.75 17.75 2.08579 17.75 2.5V3.32709C18.0099 3.34691 18.2561 3.37182 18.489 3.40313C19.6614 3.56076 20.6104 3.89288 21.3588 4.64124C22.1071 5.38961 22.4392 6.33855 22.5969 7.51098C22.75 8.65018 22.75 10.1058 22.75 11.9435V14.0564C22.75 15.8941 22.75 17.3498 22.5969 18.489C22.4392 19.6614 22.1071 20.6104 21.3588 21.3588C20.6104 22.1071 19.6614 22.4392 18.489 22.5969C17.3498 22.75 15.8942 22.75 14.0565 22.75H9.94359C8.10585 22.75 6.65018 22.75 5.51098 22.5969C4.33856 22.4392 3.38961 22.1071 2.64124 21.3588C1.89288 20.6104 1.56076 19.6614 1.40314 18.489C1.24997 17.3498 1.24998 15.8942 1.25 14.0564V11.9436C1.24998 10.1058 1.24997 8.65019 1.40314 7.51098C1.56076 6.33855 1.89288 5.38961 2.64124 4.64124C3.38961 3.89288 4.33856 3.56076 5.51098 3.40313C5.7439 3.37182 5.99006 3.34691 6.25 3.32709V2.5C6.25 2.08579 6.58579 1.75 7 1.75ZM5.71085 4.88976C4.70476 5.02502 4.12511 5.27869 3.7019 5.7019C3.27869 6.12511 3.02502 6.70476 2.88976 5.71085C2.86685 7.88123 2.8477 8.06061 2.83168 8.25H21.1683C21.1523 8.06061 21.1331 7.88124 21.1102 7.71085C20.975 6.70476 20.7213 6.12511 20.2981 5.7019C19.8749 5.27869 19.2952 5.02502 18.2892 4.88976C17.2615 4.75159 15.9068 4.75 14 4.75H10C8.09318 4.75 6.73851 4.75159 5.71085 4.88976ZM2.75 12C2.75 11.146 2.75032 10.4027 2.76309 9.75H21.2369C21.2497 10.4027 21.25 11.146 21.25 12V14C21.25 15.9068 21.2484 17.2615 21.1102 18.2892C20.975 19.2952 20.7213 19.8749 20.2981 20.2981C19.8749 20.7213 19.2952 20.975 18.2892 21.1102C17.2615 21.2484 15.9068 21.25 14 21.25H10C8.09318 21.25 6.73851 21.2484 5.71085 21.1102C4.70476 20.975 4.12511 20.7213 3.7019 20.2981C3.27869 19.8749 3.02502 19.2952 2.88976 18.2892C2.75159 17.2615 2.75 15.9068 2.75 14V12Z"
        fill="currentColor"
      />
    </svg>
  );
}

function InboxIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.9426 1.25H12.0574C14.3658 1.24999 16.1748 1.24998 17.5863 1.43975C19.031 1.63399 20.1711 2.03933 21.0659 2.93414C21.9607 3.82895 22.366 4.96897 22.5603 6.41371C22.75 7.82519 22.75 9.63423 22.75 11.9426V12.0574C22.75 12.3718 22.75 12.6769 22.7495 12.9731C22.7498 12.982 22.75 12.991 22.75 13C22.75 13.0099 22.7498 13.0197 22.746 14.8816C22.7225 16.3793 22.5603 17.5863C22.366 19.031 21.9607 20.1711 21.0659 21.0659C20.1711 21.9607 19.031 22.366 17.5863 22.5603C16.1748 22.75 14.3658 22.75 12.0574 22.75H11.9426C9.63423 22.75 7.82519 22.75 6.41371 22.5603C4.96897 22.366 3.82895 21.9607 2.93414 21.0659C2.03933 20.1711 1.63399 19.031 1.43975 17.5863C1.27747 16.3793 1.25397 14.8816 1.25057 13.0295C1.25 13 1.25047 12.9731 1.25 12.6769V11.9426C1.24999 9.63423 1.24998 7.82519 1.43975 6.41371C1.63399 4.96897 2.03933 3.82895 2.93414 2.93414C3.82895 2.03933 4.96897 1.63399 6.41371 1.43975C7.82519 1.24998 9.63423 1.24999 11.9426 1.25ZM2.7535 13.75C2.76294 15.2526 2.79778 16.43 2.92637 17.3864C3.09825 18.6648 3.42514 19.4355 3.9948 20.0052C4.56445 20.5749 5.33517 20.9018 6.61358 21.0736C7.91356 21.2484 9.62177 21.25 12 21.25C14.3782 21.25 16.0864 21.2484 17.3864 21.0736C18.6648 20.9018 19.4355 20.5749 20.0052 20.0052C20.5749 19.4355 20.9018 18.6648 21.0736 17.3864C21.2022 16.43 21.2371 15.2526 21.2465 13.75H18.8397C17.8659 13.75 17.6113 13.766 17.3975 13.8644C17.1838 13.9627 17.0059 14.1456 16.3722 14.8849L15.7667 15.5913C15.7372 15.6257 15.7082 15.6597 15.6794 15.6933C15.1773 16.2803 14.7796 16.7453 14.2292 16.9984C13.6789 17.2515 13.067 17.2509 12.2945 17.2501C12.2503 17.25 12.2056 17.25 12.1603 17.25H11.8397C11.7944 17.25 11.7497 17.25 11.7055 17.2501C10.933 17.2509 10.3211 17.2515 9.77076 16.9984C9.22039 16.7453 8.82271 16.2803 8.32059 15.6933C8.23327 15.5913 8.26275 15.5627 8.23327 15.5913L7.62784 14.8849C6.9941 14.1456 6.81622 13.9627 6.60245 13.8644C6.38869 13.766 6.13407 13.75 5.16026 13.75H2.7535ZM21.25 12.25H18.8397C18.7944 12.25 18.7497 12.25 18.7055 12.2499C17.933 12.2491 17.3211 12.2485 16.7708 12.5016C16.2204 12.7547 15.8227 13.2197 15.3206 13.8067C15.2918 13.8403 15.2628 13.8743 15.2333 13.9087L14.6278 14.6151C13.9941 15.3544 13.8162 15.5373 13.6025 15.6356C13.3887 15.734 13.1341 15.75 12.1603 15.75H11.8397C10.8659 15.75 10.6113 15.734 10.3975 15.6356C10.1838 15.5373 10.0059 15.3544 9.37216 14.6151L8.76673 13.9087C8.73725 13.8743 8.70816 13.8403 8.67941 13.8067C8.17729 13.2197 7.77961 12.7547 7.22924 12.5016C6.67886 12.2485 6.06705 12.2491 5.29454 12.2499C5.25031 12.25 5.20556 12.25 5.16026 12.25H2.75001C2.75 12.1675 2.75 12.0842 2.75 12C2.75 9.62177 2.75159 7.91356 2.92637 6.61358C3.09825 5.33517 3.42514 4.56445 3.9948 3.9948C4.56445 3.42514 5.33517 3.09825 6.61358 2.92637C7.91356 2.75159 9.62177 2.75 12 2.75C14.3782 2.75 16.0864 2.75159 17.3864 2.92637C18.6648 3.09825 19.4355 3.42514 20.0052 3.9948C20.5749 4.56445 20.9018 5.33517 21.0736 6.61358C21.2484 7.91356 21.25 9.62177 21.25 12C21.25 12.0842 21.25 12.1675 21.25 12.25Z"
        fill="currentColor"
      />
    </svg>
  );
}

function BookOpenIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.5265 21.0816L10.3204 20.1168C9.61902 19.5557 8.74758 19.25 7.84941 19.25H7.38104C5.97655 19.25 4.60349 19.6657 3.43488 20.4448C2.50095 21.0674 1.25 20.3979 1.25 19.2755V6.15248C1.25 5.49408 1.57905 4.87925 2.12687 4.51403L2.42391 4.31601C3.95558 3.29489 5.75524 2.75 7.59608 2.75C9.29734 2.75 10.9088 3.50297 12 4.80205C13.0912 3.50297 14.7027 2.75 16.4039 2.75C18.2448 2.75 20.0444 3.29489 21.5761 4.31601L21.8731 4.51403C22.4209 4.87925 22.75 5.49408 22.75 6.15248V19.2755C22.75 20.3979 21.499 21.0674 20.5651 20.4448C19.3965 19.6657 18.0234 19.25 16.619 19.25H16.1506C15.2524 19.25 14.381 19.5557 13.6796 20.1168L12.4735 21.0816C12.458 21.0943 12.442 21.1063 12.4254 21.1177C12.4083 21.1295 12.3907 21.1406 12.3725 21.151C12.1605 21.2723 11.8997 21.2839 11.6751 21.176C11.6597 21.1686 11.6446 21.1607 11.6298 21.1523C11.8414 21.2724 12.1012 21.2835 12.3249 21.176M3.25596 5.56408C4.54123 4.70723 6.05137 4.25 7.59608 4.25C8.88766 4.25 10.1092 4.83711 10.9161 5.84567L11.25 6.26309V18.9395C10.2839 18.1695 9.08503 17.75 7.84941 17.75H7.38104C5.73902 17.75 4.13248 18.2193 2.75 19.1008V6.15248C2.75 5.99561 2.8284 5.84912 2.95892 5.76211L3.25596 5.56408ZM12.75 18.9395C13.7161 18.1695 14.915 17.75 16.1506 17.75H16.619C18.261 17.75 19.8675 18.2193 21.25 19.1008V6.15248C21.25 5.99561 21.1716 5.84912 21.0411 5.76211L20.744 5.56408C19.4588 4.70723 17.9486 4.25 16.4039 4.25C15.1123 4.25 13.8908 4.83711 13.0839 5.84567L12.75 6.26309V18.9395Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SunIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 1.25C12.4142 1.25 12.75 1.58579 12.75 2V3C12.75 3.41421 12.4142 3.75 12 3.75C11.5858 3.75 11.25 3.41421 11.25 3V2C11.25 1.58579 11.5858 1.25 12 1.25ZM4.39861 4.39861C4.6915 4.10572 5.16638 4.10572 5.45927 4.39861L5.85211 4.79145C6.145 5.08434 6.145 5.55921 5.85211 5.85211C5.55921 6.145 5.08434 6.145 4.79145 5.85211L4.39861 5.45927C4.10572 5.16638 4.10572 4.6915 4.39861 4.39861ZM19.6011 4.39887C19.894 4.69176 19.894 5.16664 19.6011 5.45953L19.2083 5.85237C18.9154 6.14526 18.4405 6.14526 18.1476 5.85237C17.8547 5.55947 17.8547 5.0846 18.1476 4.79171L18.5405 4.39887C18.8334 4.10598 19.3082 4.10598 19.6011 4.39887ZM12 6.75C9.1005 6.75 6.75 9.1005 6.75 12C6.75 14.8995 9.1005 17.25 12 17.25C14.8995 17.25 17.25 14.8995 17.25 12C17.25 9.1005 14.8995 6.75 12 6.75ZM5.25 12C5.25 8.27208 8.27208 5.25 12 5.25C15.7279 5.25 18.75 8.27208 18.75 12C18.75 15.7279 15.7279 18.75 12 18.75C8.27208 18.75 5.25 15.7279 5.25 12ZM1.25 12C1.25 11.5858 1.58579 11.25 2 11.25H3C3.41421 11.25 3.75 11.5858 3.75 12C3.75 12.4142 3.41421 12.75 3 12.75H2C1.58579 12.75 1.25 12.4142 1.25 12ZM20.25 12C20.25 11.5858 20.5858 11.25 21 11.25H22C22.4142 11.25 22.75 11.5858 22.75 12C22.75 12.4142 22.4142 12.75 22 12.75H21C20.5858 12.75 20.25 12.4142 20.25 12ZM18.1476 18.1476C18.4405 17.8547 18.9154 17.8547 19.2083 18.1476L19.6011 18.5405C19.894 18.8334 19.894 19.3082 19.6011 19.6011C19.3082 19.894 18.8334 19.894 18.5405 19.6011L18.1476 19.2083C17.8547 18.9154 17.8547 18.4405 18.1476 18.1476ZM5.85211 18.1479C6.145 18.4408 6.145 18.9157 5.85211 19.2086L5.45927 19.6014C5.16638 19.8943 4.6915 19.8943 4.39861 19.6014C4.10572 19.3085 4.10572 18.8336 4.39861 18.5407L4.79145 18.1479C5.08434 17.855 5.55921 17.855 5.85211 18.1479ZM12 20.25C12.4142 20.25 12.75 20.5858 12.75 21V22C12.75 22.4142 12.4142 22.75 12 22.75C11.5858 22.75 11.25 22.4142 11.25 22V21C11.25 20.5858 11.5858 20.25 12 20.25Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CheckIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21.5303 5.46967C21.8232 5.76256 21.8232 6.23744 21.5303 6.53033L9.53033 18.5303C9.23744 18.8232 8.76256 18.8232 8.46967 18.5303L2.46967 12.5303C2.17678 12.2374 2.17678 11.7626 2.46967 11.4697C2.76256 11.1768 3.23744 11.1768 3.53033 11.4697L9 16.9393L20.4697 5.46967C20.7626 5.17678 21.2374 5.17678 21.5303 5.46967Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ChevronDownIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polyline points="20.3333 8.6666 12 17 3.6667 8.6666" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
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
