'use client';

/* ============================================================================
   Organizer · Landing Page de Clase Mundial
   Diseño impecable, Anti-AI Slop, animaciones GSAP & iconos Reicon.
   
   Principios fundamentales:
     1. Push, no pull: el producto es la notificación en la pantalla de bloqueo (8:00 AM).
     2. Captura en 0 fricción: < 2 segundos por Siri / voz sin clasificar forzosamente.
     3. Inicio en una pantalla: cero scroll, cero sobrecarga para ADHD / estudiantes.
     4. Sin reproches ni culpa: si algo no se hizo, se reajusta sin deuda acumulada.
     5. Recursos aislado: notas y herramientas independientes de la planificación.
   ========================================================================= */

import { useState, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

export function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'push' | 'captura' | 'escritorio'>('push');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // GSAP Animations with useGSAP & ScrollTrigger
  useGSAP(
    () => {
      // Respect prefers-reduced-motion
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (prefersReducedMotion) return;

      // 1. Hero Entrance Choreography
      gsap.from('.gsap-hero-item', {
        y: 28,
        opacity: 0,
        duration: 0.85,
        stagger: 0.12,
        ease: 'power3.out',
      });

      // 2. Phone Mockup Reveal
      gsap.from('.gsap-mockup-frame', {
        scale: 0.94,
        y: 40,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
        delay: 0.25,
      });

      // 3. Subtle Phone Float Physics
      gsap.to('.gsap-mockup-float', {
        y: -10,
        duration: 3.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      // 4. Bento Grid ScrollTrigger Reveal
      gsap.from('.gsap-bento-card', {
        scrollTrigger: {
          trigger: '#filosofia',
          start: 'top 82%',
          once: true,
        },
        y: 35,
        opacity: 0,
        duration: 0.75,
        stagger: 0.14,
        ease: 'power2.out',
      });

      // 5. Workflow Steps ScrollTrigger Reveal
      gsap.from('.gsap-workflow-step', {
        scrollTrigger: {
          trigger: '#como-funciona',
          start: 'top 82%',
          once: true,
        },
        y: 32,
        opacity: 0,
        duration: 0.7,
        stagger: 0.12,
        ease: 'power2.out',
      });

      // 6. Modules ScrollTrigger Reveal
      gsap.from('.gsap-module-card', {
        scrollTrigger: {
          trigger: '#modulos',
          start: 'top 82%',
          once: true,
        },
        y: 30,
        opacity: 0,
        duration: 0.75,
        stagger: 0.14,
        ease: 'power2.out',
      });
    },
    { scope: containerRef }
  );

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[#FAFAF9] text-zinc-900 selection:bg-emerald-100 selection:text-emerald-950 antialiased overflow-x-hidden font-sans"
    >
      {/* ====================================================================
          1. HEADER NAVEGACIÓN
          ==================================================================== */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-zinc-200/70 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-[1.03] transition-transform duration-200">
                O
              </div>
              <span className="font-semibold text-lg tracking-tight text-zinc-950 group-hover:text-emerald-900 transition-colors">
                Organizer
              </span>
            </Link>

            {/* Servicio Activo Badge */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/70 text-[11px] font-medium text-emerald-800">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Servicio activo
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-600">
            <a href="#filosofia" className="hover:text-zinc-950 transition-colors">
              Filosofía
            </a>
            <a href="#como-funciona" className="hover:text-zinc-950 transition-colors">
              Cómo funciona
            </a>
            <a href="#modulos" className="hover:text-zinc-950 transition-colors">
              Módulos
            </a>
            <a href="#faq" className="hover:text-zinc-950 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Right Action CTAs */}
          <div className="flex items-center gap-3">
            <Link
              href="/entrar"
              className="hidden sm:inline-flex text-sm font-semibold text-zinc-700 hover:text-zinc-950 px-3 py-2 rounded-lg hover:bg-zinc-100 transition-colors"
            >
              Iniciar sesión
            </Link>

            <Link
              href="/entrar"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold shadow-xs hover:shadow transition-all active:scale-[0.98]"
            >
              <GoogleIcon className="w-4 h-4" />
              <span>Empezar gratis</span>
              <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-zinc-600 hover:text-zinc-900 rounded-lg hover:bg-zinc-100"
              aria-label="Abrir menú de navegación"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-zinc-200 bg-white/95 backdrop-blur-lg px-4 pt-2 pb-4 space-y-2">
            <a
              href="#filosofia"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Filosofía
            </a>
            <a
              href="#como-funciona"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cómo funciona
            </a>
            <a
              href="#modulos"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Módulos
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-zinc-700 hover:bg-zinc-50"
            >
              FAQ
            </a>
            <div className="pt-2 border-t border-zinc-100 flex flex-col gap-2">
              <Link
                href="/entrar"
                className="w-full text-center px-4 py-2.5 rounded-xl border border-zinc-300 text-zinc-700 font-semibold"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/entrar"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 text-white font-semibold"
              >
                <GoogleIcon className="w-4 h-4" />
                <span>Empezar con Google</span>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ====================================================================
          2. HERO SECTION
          ==================================================================== */}
      <section className="relative pt-14 pb-20 sm:pt-24 sm:pb-28 overflow-hidden">
        {/* Subtle, restrained ambient backdrop (Anti-AI Slop: no neon purple/blue orbs) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-80 pointer-events-none -z-10">
          <div className="w-full h-full bg-radial from-emerald-100/40 via-zinc-100/30 to-transparent blur-2xl" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Eyebrow Badge */}
          <div className="gsap-hero-item inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-800 text-xs sm:text-sm font-medium mb-6 sm:mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            <span>Tu planificación devuelta a tiempo</span>
            <span className="text-zinc-300">·</span>
            <span className="font-semibold text-zinc-950">Push, no pull</span>
          </div>

          {/* Main Headline */}
          <h1 className="gsap-hero-item text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-zinc-950 leading-[1.08] mb-6">
            Tu día resuelto{' '}
            <span className="text-emerald-800 underline decoration-emerald-300/60 decoration-wavy decoration-1 underline-offset-8">
              antes de que abras la app.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="gsap-hero-item max-w-2xl mx-auto text-base sm:text-xl text-zinc-600 leading-relaxed font-normal mb-8 sm:mb-10">
            Diseñada para estudiantes universitarios y mentes con ADHD. Sin listas infinitas que paralizan: captura ideas en 2 segundos y recibe tu plan detallado en tu pantalla de bloqueo cada mañana a las 8:00 AM.
          </p>

          {/* Primary & Secondary Action CTAs */}
          <div className="gsap-hero-item flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-10">
            <Link
              href="/entrar"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-7 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-base font-semibold shadow-sm hover:shadow transition-all active:scale-[0.98]"
            >
              <GoogleIcon className="w-5 h-5 bg-white rounded-full p-0.5" />
              <span>Empezar con Google</span>
              <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>

            <a
              href="#como-funciona"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-800 text-base font-semibold shadow-2xs hover:border-zinc-400 transition-all active:scale-[0.98]"
            >
              <span>Ver cómo funciona</span>
              <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </a>
          </div>

          {/* High-craft Trust Metrics Pill */}
          <div className="gsap-hero-item inline-flex flex-wrap items-center justify-center gap-2 sm:gap-3 px-4 py-2 rounded-2xl bg-white border border-zinc-200/90 shadow-2xs text-xs sm:text-sm text-zinc-700">
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-800">
              <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
              Cero deuda acumulada
            </span>
            <span className="text-zinc-300">·</span>
            <span className="inline-flex items-center gap-1 font-medium text-zinc-700">
              <ShieldIcon className="w-3.5 h-3.5 text-zinc-500" />
              100% libre de culpa
            </span>
            <span className="text-zinc-300">·</span>
            <span className="text-zinc-500">PWA nativa en iOS & Web</span>
          </div>
        </div>
      </section>

      {/* ====================================================================
          3. SHOWCASE VISUAL: MOCKUP IPHONE (FRAME VACÍO PARA VIDEO) & TARJETAS
          ==================================================================== */}
      <section className="py-12 sm:py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header de la sección */}
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/70">
              EXPERIENCIA EN DISPOSITIVO
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-zinc-950 mt-3 tracking-tight">
              Sin fricción en el bolsillo, potente en el escritorio.
            </h2>
            <p className="text-zinc-600 text-base sm:text-lg mt-2.5">
              Tu teléfono recibe el resumen; tu computadora te ayuda a proyectar la semana sin esfuerzo.
            </p>

            {/* Selector de pestañas interactivas */}
            <div className="inline-flex p-1 mt-6 rounded-xl bg-zinc-200/70 border border-zinc-300/60">
              <button
                type="button"
                onClick={() => setActiveTab('push')}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'push'
                    ? 'bg-white text-zinc-950 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                Notificación Push (8:00 AM)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('captura')}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'captura'
                    ? 'bg-white text-zinc-950 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                Captura Siri (1.2s)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('escritorio')}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'escritorio'
                    ? 'bg-white text-zinc-950 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                Vista Semanal (Desktop)
              </button>
            </div>
          </div>

          {/* Grid: iPhone Mockup a la izquierda, tarjetas flotantes a la derecha */}
          <div className="relative max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Columna Izquierda: Chasis iPhone 16 Pro (Frame vacío preparado para el video del usuario) */}
              <div className="lg:col-span-5 flex justify-center order-2 lg:order-1">
                <div className="gsap-mockup-frame gsap-mockup-float relative w-[310px] sm:w-[340px] h-[670px] bg-zinc-900 rounded-[52px] p-3 shadow-2xl ring-1 ring-zinc-800 border-[4px] border-zinc-700/80">
                  {/* Dynamic Island */}
                  <div className="absolute top-5 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-30 flex items-center justify-end pr-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-800 ring-1 ring-zinc-700" />
                  </div>

                  {/* ==============================================================
                      PANTALLA DEL IPHONE: FRAME LIMPIO VACÍO RESERVADO PARA VIDEO
                      (Sin imágenes artificiales de IA según la instrucción del usuario)
                      ============================================================== */}
                  <div
                    id="phone-video-slot"
                    className="relative w-full h-full bg-zinc-950 rounded-[42px] overflow-hidden flex flex-col items-center justify-center text-center p-6 border border-zinc-800/80 select-none"
                  >
                    {/* Reflejo sutil de cristal OLED */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-white/[0.02] pointer-events-none" />

                    {/* Placeholder elegante y funcional */}
                    <div className="relative z-10 flex flex-col items-center justify-center space-y-4 max-w-[220px]">
                      <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center justify-center shadow-inner">
                        <VideoPlaceholderIcon className="w-7 h-7 text-zinc-300" />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-zinc-200 tracking-wide uppercase">
                          Demostración en video
                        </p>
                        <p className="text-[11px] text-zinc-500 leading-snug">
                          Espacio preparado para la grabación de pantalla real en iPhone.
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/90 border border-zinc-800 text-[10px] text-zinc-400 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        iOS PWA Standalone
                      </div>
                    </div>

                    {/* Home Indicator */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-1 bg-zinc-700 rounded-full" />
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Tarjetas interactivas de características clave */}
              <div className="lg:col-span-7 space-y-5 order-1 lg:order-2">
                {/* Tarjeta 1: Notificación Push en Pantalla de Bloqueo */}
                <div
                  className={`p-5 rounded-2xl bg-white border transition-all ${
                    activeTab === 'push'
                      ? 'border-emerald-300/80 shadow-md ring-1 ring-emerald-200/50'
                      : 'border-zinc-200 shadow-2xs hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
                        <BellIcon className="w-4 h-4 text-emerald-400" />
                      </div>
                      <span className="text-xs font-bold tracking-wider text-zinc-900 uppercase">
                        ORGANIZER · PUSH MATUTINO
                      </span>
                    </div>
                    <span className="text-xs font-medium text-zinc-400">Hoy · 8:00 AM</span>
                  </div>
                  <div className="mt-3.5 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-950">Tu plan del día en pantalla de bloqueo:</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100/70 text-emerald-800 text-[10px] font-semibold">
                        0 clics
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-zinc-900 bg-zinc-50 p-3 rounded-xl border border-zinc-200 font-mono tracking-tight">
                      &quot;Hoy: Cálculo 8:00 · Entrega Lab 11:00 · Gym 18:00&quot;
                    </p>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      La información va hacia ti antes de salir de la cama. Sin insignias que estresan ni obligación de abrir pestañas.
                    </p>
                  </div>
                </div>

                {/* Tarjeta 2: Captura en 0 fricción con Siri / Atajos */}
                <div
                  className={`p-5 rounded-2xl bg-white border transition-all ${
                    activeTab === 'captura'
                      ? 'border-emerald-300/80 shadow-md ring-1 ring-emerald-200/50'
                      : 'border-zinc-200 shadow-2xs hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
                        <MicIcon className="w-4 h-4 text-emerald-400" />
                      </div>
                      <span className="text-xs font-bold tracking-wider text-zinc-900 uppercase">
                        CAPTURA EN 0 FRICCIÓN
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                      1.2 segundos
                    </span>
                  </div>
                  <div className="mt-3.5 space-y-2">
                    <div className="p-3 rounded-xl bg-zinc-900 text-white font-mono text-xs flex items-center justify-between">
                      <span className="text-zinc-200">&quot;Oye Siri, anota comprar cuaderno de física&quot;</span>
                      <span className="text-emerald-400 text-[11px] font-sans font-semibold inline-flex items-center gap-1">
                        <CheckIcon className="w-3 h-3" /> Guardado
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      Sin seleccionar carpetas, sin fechas forzadas ni formularios obligatorios. Suelta la idea y sigue con lo tuyo.
                    </p>
                  </div>
                </div>

                {/* Tarjeta 3: Vista Semanal de Escritorio */}
                <div
                  className={`hidden sm:block rounded-2xl bg-zinc-950 text-white p-4.5 border transition-all ${
                    activeTab === 'escritorio'
                      ? 'border-emerald-500/60 shadow-lg'
                      : 'border-zinc-800 shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                        <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                        <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                      </div>
                      <span className="text-xs font-medium text-zinc-400 pl-2">
                        Organizer Desktop · Vista Semanal
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-500">Sincronización instantánea</span>
                  </div>

                  <div className="mt-3.5 grid grid-cols-5 gap-2 text-center text-xs">
                    {['Lun 5', 'Mar 6', 'Mié 7', 'Jue 8', 'Vie 9'].map((dia, idx) => (
                      <div
                        key={dia}
                        className={`p-2.5 rounded-lg border ${
                          idx === 1
                            ? 'bg-zinc-900 border-emerald-500/40 text-emerald-200'
                            : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
                        }`}
                      >
                        <div className="font-bold text-[11px] mb-1.5">{dia}</div>
                        <div className="h-1.5 w-full bg-emerald-500/70 rounded-full mb-1" title="Clase fijada" />
                        <div className="h-1.5 w-3/4 bg-zinc-500 rounded-full" title="Tarea planificada" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          4. SECCIÓN BENTO: "¿POR QUÉ ES DIFERENTE?" (FILOSOFÍA)
          ==================================================================== */}
      <section id="filosofia" className="py-16 sm:py-24 bg-white border-y border-zinc-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/70">
              FILOSOFÍA FUNDAMENTAL
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold text-zinc-950 mt-3 tracking-tight">
              ¿Por qué las demás apps de tareas te fallaron?
            </h2>
            <p className="text-zinc-600 text-base sm:text-lg mt-3">
              El problema no es que carezcas de disciplina. Las apps tradicionales están hechas para cerebros que aman gestionar listas. Organizer está hecha para la realidad.
            </p>
          </div>

          {/* Bento Grid con 4 tarjetas asimétricas y animaciones GSAP */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Card 1: Push, no pull (md:col-span-7) */}
            <div className="gsap-bento-card md:col-span-7 p-6 sm:p-8 rounded-3xl bg-zinc-50/80 border border-zinc-200 hover:border-zinc-300 transition-all flex flex-col justify-between group shadow-2xs">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-zinc-900 text-emerald-400 flex items-center justify-center mb-5 shadow-xs">
                  <BellIcon className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1">
                  Principio 01 · El producto es el aviso
                </div>
                <h3 className="text-2xl font-bold text-zinc-950 tracking-tight">
                  Push, no pull. La app va hacia ti.
                </h3>
                <p className="text-zinc-600 text-base mt-2.5 leading-relaxed">
                  Cualquier sistema que dependa de que te acuerdes de entrar a la app fracasa al tercer día. En Organizer, tu plan del día llega a tu pantalla de bloqueo a las <strong>8:00 AM exactas</strong>. Contiene tus horas, tus materias y tus tareas. Lo lees sin desbloquear.
                </p>
              </div>
              <div className="mt-6 p-4 rounded-2xl bg-white border border-zinc-200/90 shadow-2xs">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Notificación sin rodeos ni badges engañosos:
                </div>
                <p className="text-sm font-semibold text-zinc-900 mt-1 font-mono">
                  Hoy: Cálculo 8:00 · Informe 11:00 · Gym 18:00
                </p>
              </div>
            </div>

            {/* Card 2: Captura en 0 fricción (md:col-span-5) */}
            <div className="gsap-bento-card md:col-span-5 p-6 sm:p-8 rounded-3xl bg-zinc-50/80 border border-zinc-200 hover:border-zinc-300 transition-all flex flex-col justify-between group shadow-2xs">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-zinc-900 text-emerald-400 flex items-center justify-center mb-5 shadow-xs">
                  <BoltIcon className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1">
                  Principio 02 · Cero barreras
                </div>
                <h3 className="text-2xl font-bold text-zinc-950 tracking-tight">
                  Captura en 0 fricción.
                </h3>
                <p className="text-zinc-600 text-base mt-2.5 leading-relaxed">
                  Anotar toma menos de 2 segundos. Con Siri, un atajo de iOS o un toque en la pantalla de inicio. Sin categorías obligatorias ni fechas forzadas: anota la idea antes de que se esfume.
                </p>
              </div>
              <div className="mt-6 p-4 rounded-2xl bg-white border border-zinc-200/90 flex items-center justify-between">
                <div className="text-xs font-medium text-zinc-500">Tiempo de captura medido</div>
                <div className="text-sm font-bold text-emerald-800">&lt; 2 segundos</div>
              </div>
            </div>

            {/* Card 3: Inicio sin scroll (md:col-span-5) */}
            <div className="gsap-bento-card md:col-span-5 p-6 sm:p-8 rounded-3xl bg-zinc-50/80 border border-zinc-200 hover:border-zinc-300 transition-all flex flex-col justify-between group shadow-2xs">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-zinc-900 text-emerald-400 flex items-center justify-center mb-5 shadow-xs">
                  <TargetIcon className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1">
                  Principio 03 · Foco absoluto
                </div>
                <h3 className="text-2xl font-bold text-zinc-950 tracking-tight">
                  Inicio en una pantalla (sin scroll).
                </h3>
                <p className="text-zinc-600 text-base mt-2.5 leading-relaxed">
                  Para una mente con sobrecarga o ADHD, una lista de 15 cosas pendientes equivale a una lista vacía: te paraliza. Organizer solo muestra lo que toca hoy y una acción inmediata en foco.
                </p>
              </div>
              <div className="mt-6 p-4 rounded-2xl bg-white border border-zinc-200/90 flex items-center gap-3">
                <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-semibold text-zinc-800">
                  Cero listas infinitas. Cero sobrecarga cognitiva.
                </span>
              </div>
            </div>

            {/* Card 4: Sin reproches ni culpa (md:col-span-7) */}
            <div className="gsap-bento-card md:col-span-7 p-6 sm:p-8 rounded-3xl bg-zinc-50/80 border border-zinc-200 hover:border-zinc-300 transition-all flex flex-col justify-between group shadow-2xs">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-zinc-900 text-emerald-400 flex items-center justify-center mb-5 shadow-xs">
                  <ShieldIcon className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1">
                  Principio 04 · Cero culpa
                </div>
                <h3 className="text-2xl font-bold text-zinc-950 tracking-tight">
                  Sin reproches ni deuda acumulada.
                </h3>
                <p className="text-zinc-600 text-base mt-2.5 leading-relaxed">
                  Si ayer no pudiste completar algo, la app no te castiga ni deja tareas rojas pudriéndose en una lista de la vergüenza. Te pregunta con calma qué hacer hoy: ¿moverlo, reprogramarlo o descartarlo? Tu racha cuenta con comodines automáticos.
                </p>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
                <div className="p-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-800">
                  Hacer hoy
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-800">
                  Mover de día
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-800">
                  Descartar
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          5. SECCIÓN DE 4 PASOS: "TU FLUJO DIARIO CON ORGANIZER"
          ==================================================================== */}
      <section id="como-funciona" className="py-16 sm:py-24 bg-[#FAFAF9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/70">
              EL FLUJO COTIDIANO
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold text-zinc-950 mt-3 tracking-tight">
              Cómo transcurre tu día con Organizer.
            </h2>
            <p className="text-zinc-600 text-base sm:text-lg mt-3">
              Un ciclo diseñado para adaptarse al ritmo real de estudio universitario y proyectos personales.
            </p>
          </div>

          {/* Grid de 4 pasos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="gsap-workflow-step p-6 rounded-3xl bg-white border border-zinc-200 shadow-2xs hover:shadow-xs transition-all relative">
              <div className="text-4xl font-black text-zinc-200 mb-3 font-mono">01</div>
              <div className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-800 flex items-center justify-center font-bold text-lg mb-4">
                <BoltIcon className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-950 mb-2">
                Captura instantánea
              </h3>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Se te ocurre algo mientras caminas o estás en clase. Lo dictas a Siri o anotas en 2 segundos. Queda a salvo en Pendientes sin distraerte.
              </p>
            </div>

            {/* Step 2 */}
            <div className="gsap-workflow-step p-6 rounded-3xl bg-white border border-zinc-200 shadow-2xs hover:shadow-xs transition-all relative">
              <div className="text-4xl font-black text-zinc-200 mb-3 font-mono">02</div>
              <div className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-800 flex items-center justify-center font-bold text-lg mb-4">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-950 mb-2">
                Bloques con clases
              </h3>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Tus materias fijas se cargan una vez. Acomodas tus tareas en los huecos de tiempo reales de tu semana, sin sobrecargar ningún día.
              </p>
            </div>

            {/* Step 3 */}
            <div className="gsap-workflow-step p-6 rounded-3xl bg-white border border-zinc-200 shadow-2xs hover:shadow-xs transition-all relative">
              <div className="text-4xl font-black text-zinc-200 mb-3 font-mono">03</div>
              <div className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-800 flex items-center justify-center font-bold text-lg mb-4">
                <SunIcon className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-950 mb-2">
                Notificación 8:00 AM
              </h3>
              <p className="text-sm text-zinc-600 leading-relaxed">
                A las 8:00 AM tu teléfono vibra con el plan completo listo en la pantalla de bloqueo. Sabes qué toca sin necesidad de abrir la app.
              </p>
            </div>

            {/* Step 4 */}
            <div className="gsap-workflow-step p-6 rounded-3xl bg-white border border-zinc-200 shadow-2xs hover:shadow-xs transition-all relative">
              <div className="text-4xl font-black text-zinc-200 mb-3 font-mono">04</div>
              <div className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-800 flex items-center justify-center font-bold text-lg mb-4">
                <FireIcon className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-950 mb-2">
                Cierre y racha
              </h3>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Marcas lo cumplido en 30 segundos. Tu racha avanza y, si un día tuviste una emergencia, tu comodín protege tu progreso automáticamente.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          6. SECCIÓN DE MÓDULOS: "LOS 4 PILARES"
          ==================================================================== */}
      <section id="modulos" className="py-16 sm:py-24 bg-white border-t border-zinc-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/70">
              LOS CUATRO PILARES
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold text-zinc-950 mt-3 tracking-tight">
              Cada cosa en su lugar, sin mezclar tu foco.
            </h2>
            <p className="text-zinc-600 text-base sm:text-lg mt-3">
              Organizer separa estrictamente la ejecución de hoy de tus notas y referencias de largo plazo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Módulo 1: Hoy */}
            <div className="gsap-module-card p-8 rounded-3xl bg-[#FAFAF9] border border-zinc-200 hover:border-zinc-300 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center">
                  <SunIcon className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-zinc-950">Módulo Hoy</h3>
                  <p className="text-xs text-zinc-500">Ejecución inmediata</p>
                </div>
              </div>
              <p className="text-zinc-600 text-sm leading-relaxed mb-4">
                Tu pantalla de arranque matutina. Sin scroll. Muestra tu tarea activa bajo el pulgar (&quot;Ahora&quot;), el horario del día y tu racha de constancia.
              </p>
              <ul className="space-y-2 text-xs font-medium text-zinc-700">
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                  Acción rápida Hecho / Para después
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                  Lo de ayer con resolución amigable
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                  Racha con comodines automáticos
                </li>
              </ul>
            </div>

            {/* Módulo 2: Calendario y Clases */}
            <div className="gsap-module-card p-8 rounded-3xl bg-[#FAFAF9] border border-zinc-200 hover:border-zinc-300 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-zinc-950">Calendario & Clases</h3>
                  <p className="text-xs text-zinc-500">Horario y huecos reales</p>
                </div>
              </div>
              <p className="text-zinc-600 text-sm leading-relaxed mb-4">
                Tus materias fijas universitarias estructuran la semana. Visualiza tus bloques de tiempo libres para ubicar tareas de estudio sin fricción.
              </p>
              <ul className="space-y-2 text-xs font-medium text-zinc-700">
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                  Plantilla fija de horario universitario
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                  Vistas de Semana, Mes y Día
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                  Recordatorios con fecha y aviso anticipado
                </li>
              </ul>
            </div>

            {/* Módulo 3: Tareas y Pendientes */}
            <div className="gsap-module-card p-8 rounded-3xl bg-[#FAFAF9] border border-zinc-200 hover:border-zinc-300 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center">
                  <InboxIcon className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-zinc-950">Pendientes</h3>
                  <p className="text-xs text-zinc-500">Inbox & Carpetas</p>
                </div>
              </div>
              <p className="text-zinc-600 text-sm leading-relaxed mb-4">
                La bandeja de entrada para todo lo que capturaste al vuelo. Organízalo en carpetas solo cuando tengas tiempo, o déjalo esperando fecha sin estrés.
              </p>
              <ul className="space-y-2 text-xs font-medium text-zinc-700">
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                  Captura sin categorización forzada
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                  Carpetas limpias para proyectos
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                  Planificación en un solo toque hacia hoy
                </li>
              </ul>
            </div>

            {/* Módulo 4: Recursos */}
            <div className="gsap-module-card p-8 rounded-3xl bg-[#FAFAF9] border border-zinc-200 hover:border-zinc-300 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center">
                  <FolderIcon className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-zinc-950">Recursos</h3>
                  <p className="text-xs text-zinc-500">Módulo independiente</p>
                </div>
              </div>
              <p className="text-zinc-600 text-sm leading-relaxed mb-4">
                Tus notas, herramientas, artículos y referencias viven en un módulo totalmente separado. Nunca persiguen al usuario ni contaminan la planificación diaria.
              </p>
              <ul className="space-y-2 text-xs font-medium text-zinc-700">
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                  Totalmente aislado de tus tareas diarias
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                  Enlaces, notas y apuntes de consulta
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                  0 notificaciones, 0 presión de lectura
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          7. SECCIÓN DE FAQ (PREGUNTAS FRECUENTES)
          ==================================================================== */}
      <section id="faq" className="py-16 sm:py-24 bg-[#FAFAF9]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/70">
              RESOLVEMOS TUS DUDAS
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold text-zinc-950 mt-3 tracking-tight">
              Preguntas Frecuentes
            </h2>
            <p className="text-zinc-600 text-base sm:text-lg mt-3">
              Todo lo que necesitas saber sobre cómo funciona Organizer en tu día a día.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: '¿Cómo funcionan las notificaciones push en mi iPhone si es una PWA?',
                a: 'Apple incorporó soporte nativo para Web Push a partir de iOS 16.4. Solo debes abrir Organizer en Safari, tocar en Compartir y seleccionar "Añadir a pantalla de inicio". Desde ese momento, la PWA funciona como una app nativa y nuestro servidor te envía la notificación matutina cada mañana a las 8:00 AM con tu plan detallado.',
              },
              {
                q: '¿Por qué la pantalla de Inicio no tiene una lista larga con todas mis tareas?',
                a: 'Porque está comprobado que las listas largas generan parálisis de decisión y agobio en cerebros con ADHD o sobrecarga de estudio. Organizer limita la pantalla de Inicio a lo que realmente vas a hacer hoy, destacando una sola tarea bajo tu pulgar en la tarjeta "Ahora".',
              },
              {
                q: '¿Cómo funciona el acceso con Google?',
                a: 'Inicias sesión con un solo toque utilizando tu cuenta de Google mediante autenticación OAuth segura con Supabase. No necesitas inventar ni recordar contraseñas, ni esperar correos que caduquen.',
              },
              {
                q: '¿Mis datos están protegidos y completamente privados?',
                a: 'Sí. Todo se almacena en PostgreSQL con políticas estrictas de Row Level Security (RLS) en Supabase. Tus tareas, notas y horarios están totalmente aislados y nadie más que tú tiene acceso a ellos.',
              },
              {
                q: '¿Puedo usar Organizer en mi computadora además del teléfono?',
                a: 'Totalmente. Organizer es responsivo y se adapta tanto a iPhone como a Mac o PC. En escritorio ofrece una vista expandida con barra lateral y calendario semanal para planificar cómodamente con ratón y teclado.',
              },
            ].map((faq, index) => (
              <div
                key={index}
                className="rounded-2xl bg-white border border-zinc-200/90 shadow-2xs overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 font-bold text-zinc-950 hover:text-emerald-900 transition-colors"
                >
                  <span className="text-base sm:text-lg">{faq.q}</span>
                  <span
                    className={`w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 transition-transform duration-200 shrink-0 ${
                      openFaq === index ? 'rotate-180 bg-emerald-50 text-emerald-800' : ''
                    }`}
                  >
                    ↓
                  </span>
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-6 pt-1 text-zinc-600 text-sm sm:text-base leading-relaxed border-t border-zinc-100">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================================
          8. BANNER CTA FINAL: CONTENEDOR OSCURO ELEGANTE
          ==================================================================== */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto rounded-[36px] bg-zinc-950 text-white p-8 sm:p-16 lg:p-20 relative overflow-hidden border border-zinc-800 shadow-xl">
          <div className="relative z-10 max-w-3xl mx-auto text-center">
            <span className="inline-block px-3 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6">
              COMIENZA HOY MISMO
            </span>

            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight mb-6">
              Toma el control de tu tiempo hoy mismo.
            </h2>

            <p className="text-base sm:text-xl text-zinc-300 max-w-2xl mx-auto leading-relaxed mb-10">
              Sin listas infinitas que agobian. Sin reproches si un día no llegas. Tu plan completo servido en tu pantalla de bloqueo cada mañana.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Link
                href="/entrar"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-bold text-base shadow hover:shadow-md transition-all active:scale-[0.98]"
              >
                <GoogleIcon className="w-5 h-5" />
                <span>Empezar con Google</span>
                <svg className="w-4 h-4 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm text-zinc-400">
              <span className="flex items-center gap-1.5">
                <CheckIcon className="w-4 h-4 text-emerald-400" />
                100% privado y seguro
              </span>
              <span className="flex items-center gap-1.5">
                <CheckIcon className="w-4 h-4 text-emerald-400" />
                Diseñado para iPhone & Web
              </span>
              <span className="flex items-center gap-1.5">
                <CheckIcon className="w-4 h-4 text-emerald-400" />
                Configuración en 30 segundos
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          9. FOOTER PULIDO
          ==================================================================== */}
      <footer className="border-t border-zinc-200 bg-white py-12 text-sm text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-8 border-b border-zinc-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center text-sm font-bold">
                O
              </div>
              <div>
                <span className="font-bold text-zinc-950 text-base">Organizer</span>
                <p className="text-xs text-zinc-400">Tu planificación devuelta a tiempo.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-zinc-600">
              <a href="#filosofia" className="hover:text-zinc-950 transition-colors">
                Filosofía
              </a>
              <a href="#como-funciona" className="hover:text-zinc-950 transition-colors">
                Cómo funciona
              </a>
              <a href="#modulos" className="hover:text-zinc-950 transition-colors">
                Módulos
              </a>
              <a href="#faq" className="hover:text-zinc-950 transition-colors">
                FAQ
              </a>
              <Link href="/entrar" className="hover:text-zinc-950 transition-colors font-semibold text-emerald-800">
                Iniciar sesión
              </Link>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
            <p>© {new Date().getFullYear()} Organizer. Hecho para cumplir objetivos reales. Push, no pull.</p>
            <p>Construido con Next.js, Tailwind CSS y Supabase Postgres.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ============================================================================
   ICONOS SVG DE ALTA PRECISIÓN (REICON OUTLINE)
   ========================================================================= */

function BellIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 1.25C7.71983 1.25 4.25004 4.71979 4.25004 9V9.7041C4.25004 10.401 4.04375 11.0824 3.65717 11.6622L2.50856 13.3851C1.17547 15.3848 2.19318 18.1028 4.51177 18.7351C5.26738 18.9412 6.02937 19.1155 6.79578 19.2581L6.79768 19.2632C7.56667 21.3151 9.62198 22.75 12 22.75C14.378 22.75 16.4333 21.3151 17.2023 19.2632L17.2042 19.2581C17.9706 19.1155 18.7327 18.9412 19.4883 18.7351C21.8069 18.1028 22.8246 15.3848 21.4915 13.3851L20.3429 11.6622C19.9563 11.0824 19.75 10.401 19.75 9.7041V9C19.75 4.71979 16.2802 1.25 12 1.25ZM15.3764 19.537C13.1335 19.805 10.8664 19.8049 8.62349 19.5369C9.33444 20.5585 10.571 21.25 12 21.25C13.4289 21.25 14.6655 20.5585 15.3764 19.537ZM5.75004 9C5.75004 5.54822 8.54826 2.75 12 2.75C15.4518 2.75 18.25 5.54822 18.25 9V9.7041C18.25 10.6972 18.544 11.668 19.0948 12.4943L20.2434 14.2172C21.0086 15.3649 20.4245 16.925 19.0936 17.288C14.4494 18.5546 9.5507 18.5546 4.90644 17.288C3.57561 16.925 2.99147 15.3649 3.75664 14.2172L4.90524 12.4943C5.45609 11.668 5.75004 10.6972 5.75004 9.7041V9Z"
        fill="currentColor"
      />
    </svg>
  );
}

function BoltIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M20.5279 10.3736C20.1572 9.73163 19.4779 9.5206 18.8294 9.42992C18.1757 9.33852 17.3008 9.33855 16.2426 9.33858L16.1824 9.33858C15.5523 9.33858 15.1403 9.33237 14.8402 9.29064C14.5688 9.2529 14.4825 9.19704 14.4456 9.16446C14.4187 9.13635 14.3706 9.07063 14.3379 8.83366C14.2993 8.55425 14.2976 8.1711 14.2976 7.55704V7.18255C14.2977 5.59503 14.2977 4.32329 14.1755 3.4166C14.0608 2.56554 13.7882 1.60969 12.844 1.32035C11.9164 1.03608 11.1384 1.64564 10.5337 2.27405C9.88942 2.9435 9.12413 3.97895 8.16596 5.27538L5.02896 9.51969C4.41863 10.3454 3.90984 11.0337 3.60669 11.6029C3.3028 12.1735 3.08164 12.8509 3.41872 13.5268C3.82188 14.2296 4.49825 14.4524 5.1526 14.5523C5.82693 14.6553 6.72671 14.6619 7.81795 14.6619C8.45456 14.6619 8.86048 14.6633 9.1586 14.7013C9.42195 14.7349 9.50071 14.7867 9.53447 14.8165C9.56438 14.8478 9.61682 14.9207 9.6538 15.1663C9.69612 15.4473 9.70276 15.8364 9.70275 16.4435L9.70274 16.8178C9.7027 18.4053 9.70266 19.6771 9.82483 20.5838C9.9395 21.4349 10.2121 22.3907 11.1563 22.6801C12.0839 22.9644 12.8619 22.3548 13.4667 21.7264C14.1109 21.0569 14.8762 20.0215 15.8344 18.725L18.9338 14.5317C19.5646 13.6783 20.0834 12.9652 20.3893 12.3718C20.6887 11.7911 20.8976 11.1097 20.5636 10.44C20.5293 10.3759 20.5279 10.3736 20.5279 10.3736ZM11.6145 3.31416C11.0465 3.90435 10.3387 4.85927 9.335 6.21733L6.27286 10.3604C5.61517 11.2502 5.17513 11.849 4.93062 12.3081C4.81161 12.5315 4.76693 12.6725 4.75421 12.7578C4.74635 12.8105 4.75115 12.8343 4.75742 12.8496C4.78161 12.8852 4.88663 12.9943 5.379 13.0695C5.9169 13.1516 6.69032 13.1619 7.81795 13.1619L7.86392 13.1619C8.44106 13.1618 8.94393 13.1618 9.3483 13.2134C9.78148 13.2686 10.2118 13.3942 10.568 13.7293C10.9296 14.0839 11.0719 14.5099 11.1371 14.9429C11.1994 15.3568 11.2028 15.8658 11.2028 16.4435L11.2027 16.753C11.2027 18.42 11.2044 19.5894 11.3114 20.3835C11.3647 20.7789 11.4363 21.0108 11.505 21.1404C11.5564 21.2374 11.586 21.2438 11.5943 21.2456C11.6078 21.25 11.6446 21.2628 11.7583 21.2056C11.9003 21.1341 12.1032 20.98 12.3858 20.6863C12.9538 20.0961 13.6616 19.1412 14.6654 17.7831L17.7275 13.6401C18.3815 12.7553 18.8172 12.1478 19.0561 11.6845C19.2608 11.2873 19.2385 11.1528 19.2249 11.1171C19.2024 11.0843 19.1016 10.9826 18.6217 10.9155C18.0846 10.8404 17.3161 10.8386 16.1824 10.8386C15.5796 10.8386 15.0567 10.8352 14.6336 10.7763C14.1968 10.7156 13.7655 10.5841 13.4123 10.252C13.0476 9.89419 12.9114 9.46874 12.852 9.03887C12.7975 8.64454 12.7976 8.15622 12.7976 7.60538L12.7976 7.24733C12.7976 5.58044 12.7959 4.41099 12.6889 3.61692C12.6356 3.22153 12.564 2.98959 12.4954 2.86008C12.4439 2.76301 12.4143 2.75666 12.406 2.75487C12.3925 2.7504 12.3557 2.73767 12.242 2.79487C12.1 2.86633 11.8972 3.02042 11.6145 3.31416Z"
        fill="currentColor"
      />
    </svg>
  );
}

function TargetIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9.25 12C9.25 11.5858 9.58579 11.25 10 11.25H11.25V10C11.25 9.58579 11.5858 9.25 12 9.25C12.4142 9.25 12.75 9.58579 12.75 10V11.25H14C14.4142 11.25 14.75 11.5858 14.75 12C14.75 12.4142 14.4142 12.75 14 12.75H12.75V14C12.75 14.4142 12.4142 14.75 12 14.75C11.5858 14.75 11.25 14.4142 11.25 14V12.75H10C9.58579 12.75 9.25 12.4142 9.25 12Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 1.25C6.06294 1.25 1.25 6.06294 1.25 12C1.25 17.9371 6.06294 22.75 12 22.75C17.9371 22.75 22.75 17.9371 22.75 12C22.75 6.06294 17.9371 1.25 12 1.25ZM11.25 2.77997C6.7395 3.14188 3.14188 6.7395 2.77997 11.25H5C5.41421 11.25 5.75 11.5858 5.75 12C5.75 12.4142 5.41421 12.75 5 12.75H2.77997C3.14188 17.2605 6.7395 20.8581 11.25 21.22V19C11.25 18.5858 11.5858 18.25 12 18.25C12.4142 18.25 12.75 18.5858 12.75 19V21.22C17.2605 20.8581 20.8581 17.2605 21.22 12.75H19C18.5858 12.75 18.25 12.4142 18.25 12C18.25 11.5858 18.5858 11.25 19 11.25H21.22C20.8581 6.7395 17.2605 3.14188 12.75 2.77997V5C12.75 5.41421 12.4142 5.75 12 5.75C11.5858 5.75 11.25 5.41421 11.25 5V2.77997Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ShieldIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.72339 2.05112C10.1673 1.55658 11.0625 1.25 12 1.25C12.9375 1.25 13.8327 1.55658 15.2766 2.05112L16.004 2.30013C17.4854 2.8072 18.6286 3.19852 19.447 3.53099C19.8592 3.69846 20.2136 3.86067 20.499 4.02641C20.7737 4.1859 21.0492 4.38484 21.2364 4.65154C21.4214 4.91516 21.5171 5.23924 21.5772 5.55122C21.6397 5.87556 21.6774 6.26464 21.7017 6.71136C21.75 7.5984 21.75 8.81361 21.75 10.3898V11.9914C21.75 18.0924 17.142 21.0175 14.4017 22.2146L14.3746 22.2264C14.0348 22.3749 13.7154 22.5144 13.3484 22.6084C12.9609 22.7076 12.5493 22.75 12 22.75C11.4507 22.75 11.0391 22.7076 10.6516 22.6084C10.2846 22.5144 9.96523 22.3749 9.62543 22.2264L9.59833 22.2146C6.85803 21.0175 2.25 18.0924 2.25 11.9914V10.3899C2.25 8.81378 2.25 7.59836 2.2983 6.71136C2.32262 6.26464 2.36031 5.87556 2.42281 5.55122C2.48293 5.23924 2.5786 4.91516 2.76363 4.65154C2.95082 4.38484 3.22634 4.1859 3.50098 4.02641C3.78637 3.86067 4.14078 3.69846 4.55303 3.53099C5.3714 3.19852 6.51462 2.8072 7.99595 2.30014L8.72339 2.05112ZM11.25 2.83792C10.7525 2.94604 10.1152 3.16015 9.08062 3.5143L8.5078 3.71037C6.99521 4.22814 5.8921 4.60605 5.11759 4.92069C4.731 5.07774 4.4509 5.20935 4.25429 5.32353C4.15722 5.3799 4.09034 5.42642 4.04567 5.46273C4.0078 5.49351 3.99336 5.51095 3.99129 5.51349C3.98936 5.51663 3.97693 5.5374 3.95943 5.58654C3.93944 5.64265 3.91729 5.72309 3.89571 5.83506C3.85204 6.06169 3.81894 6.37301 3.79608 6.79292C3.75473 7.55226 3.75048 8.58298 3.75005 9.95941L11.25 7.45943V2.83792ZM12.75 2.83792V7.45943L20.25 9.95941C20.2495 8.58298 20.2453 7.55226 20.2039 6.79292C20.1811 6.37301 20.148 6.06169 20.1043 5.83506C20.0827 5.72309 20.0606 5.64265 20.0406 5.58654C20.0231 5.53737 20.0106 5.5166 20.0087 5.51348C20.0066 5.51092 19.9922 5.49349 19.9543 5.46273C19.9097 5.42642 19.8428 5.3799 19.7457 5.32353C19.5491 5.20935 19.269 5.07774 18.8824 4.92069C18.1079 4.60605 17.0048 4.22814 15.4922 3.71037L14.9194 3.5143C13.8848 3.16015 13.2475 2.94604 12.75 2.83792ZM11.25 9.04057L3.75 11.5406V11.9914C3.75 17.1665 7.6199 19.7135 10.1988 20.84C10.5703 21.0023 10.7848 21.0941 11.0236 21.1552C11.0931 21.173 11.1672 21.1888 11.25 21.2021V9.04057ZM12.75 21.2021V9.04057L20.25 11.5406V11.9914C20.25 17.1665 16.3801 19.7135 13.8012 20.84C13.4297 21.0023 13.2152 21.0941 12.9764 21.1552C12.9069 21.173 12.8328 21.1888 12.75 21.2021Z"
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
      <path d="M13 13C13 13.5523 12.5523 14 12 14C11.4477 14 11 13.5523 11 13C11 12.4477 11.4477 12 12 12C12.5523 12 13 12.4477 13 13Z" fill="currentColor" />
      <path d="M13 17C13 17.5523 12.5523 18 12 18C11.4477 18 11 17.5523 11 17C11 16.4477 11.4477 16 12 16C12.5523 16 13 16.4477 13 17Z" fill="currentColor" />
      <path d="M7 14C7.55229 14 8 13.5523 8 13C8 12.4477 7.55229 12 7 12C6.44772 12 6 12.4477 6 13C6 13.5523 6.44772 14 7 14Z" fill="currentColor" />
      <path d="M7 18C7.55229 18 8 17.5523 8 17C8 16.4477 7.55229 16 7 16C6.44772 16 6 16.4477 6 17C6 17.5523 6.44772 18 7 18Z" fill="currentColor" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7 1.75C7.41421 1.75 7.75 2.08579 7.75 2.5V3.26272C8.412 3.24999 9.14133 3.24999 9.94346 3.25H14.0564C14.8586 3.24999 15.588 3.24999 16.25 3.26272V2.5C16.25 2.08579 16.5858 1.75 17 1.75C17.4142 1.75 17.75 2.08579 17.75 2.5V3.32709C18.0099 3.34691 18.2561 3.37182 18.489 3.40313C19.6614 3.56076 20.6104 3.89288 21.3588 4.64124C22.1071 5.38961 22.4392 6.33855 22.5969 7.51098C22.75 8.65018 22.75 10.1058 22.75 11.9435V14.0564C22.75 15.8941 22.75 17.3498 22.5969 18.489C22.4392 19.6614 22.1071 20.6104 21.3588 21.3588C20.6104 22.1071 19.6614 22.4392 18.489 22.5969C17.3498 22.75 15.8942 22.75 14.0565 22.75H9.94359C8.10585 22.75 6.65018 22.75 5.51098 22.5969C4.33856 22.4392 3.38961 22.1071 2.64124 21.3588C1.89288 20.6104 1.56076 19.6614 1.40314 18.489C1.24997 17.3498 1.24998 15.8942 1.25 14.0564V11.9436C1.24998 10.1058 1.24997 8.65019 1.40314 7.51098C1.56076 6.33855 1.89288 5.38961 2.64124 4.64124C3.38961 3.89288 4.33856 3.56076 5.51098 3.40313C5.7439 3.37182 5.99006 3.34691 6.25 3.32709V2.5C6.25 2.08579 6.58579 1.75 7 1.75ZM5.71085 4.88976C4.70476 5.02502 4.12511 5.27869 3.7019 5.7019C3.27869 6.12511 3.02502 6.70476 2.88976 7.71085C2.86685 7.88123 2.8477 8.06061 2.83168 8.25H21.1683C21.1523 8.06061 21.1331 7.88124 21.1102 7.71085C20.975 6.70476 20.7213 6.12511 20.2981 5.7019C19.8749 5.27869 19.2952 5.02502 18.2892 4.88976C17.2615 4.75159 15.9068 4.75 14 4.75H10C8.09318 4.75 6.73851 4.75159 5.71085 4.88976ZM2.75 12C2.75 11.146 2.75032 10.4027 2.76309 9.75H21.2369C21.2497 10.4027 21.25 11.146 21.25 12V14C21.25 15.9068 21.2484 17.2615 21.1102 18.2892C20.975 19.2952 20.7213 19.8749 20.2981 20.2981C19.8749 20.7213 19.2952 20.975 18.2892 21.1102C17.2615 21.2484 15.9068 21.25 14 21.25H10C8.09318 21.25 6.73851 21.2484 5.71085 21.1102C4.70476 20.975 4.12511 20.7213 3.7019 20.2981C3.27869 19.8749 3.02502 19.2952 2.88976 18.2892C2.75159 17.2615 2.75 15.9068 2.75 14V12Z"
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
        d="M11.9426 1.25H12.0574C14.3658 1.24999 16.1748 1.24998 17.5863 1.43975C19.031 1.63399 20.1711 2.03933 21.0659 2.93414C21.9607 3.82895 22.366 4.96897 22.5603 6.41371C22.75 7.82519 22.75 9.63423 22.75 11.9426V12.0574C22.75 12.3718 22.75 12.6769 22.7495 12.9731C22.75 13 22.7494 13.0296 22.746 14.8816C22.7225 16.3793 22.5603 17.5863 22.366 19.031C22.1711 20.1711 21.0659 21.0659 20.1711 21.9607C19.031 22.366 17.5863 22.5603 16.1748 22.75C14.3658 22.75 12.0574 22.75 11.9426 22.75C9.63423 22.75 7.82519 22.75 6.41371 22.5603C4.96897 22.366 3.82895 21.9607 2.93414 21.0659C2.03933 20.1711 1.63399 19.031 1.43975 17.5863C1.27747 16.3793 1.25397 14.8816 1.25057 13.0295C1.25 13 1.25047 12.9731 1.25 12.6769V11.9426C1.24999 9.63423 1.24998 7.82519 1.43975 6.41371C1.63399 4.96897 2.03933 3.82895 2.93414 2.93414C3.82895 2.03933 4.96897 1.63399 6.41371 1.43975C7.82519 1.24998 9.63423 1.24999 11.9426 1.25ZM2.7535 13.75C2.76294 15.2526 2.79778 16.43 2.92637 17.3864C3.09825 18.6648 3.42514 19.4355 3.9948 20.0052C4.56445 20.5749 5.33517 20.9018 6.61358 21.0736C7.91356 21.2484 9.62177 21.25 12 21.25C14.3782 21.25 16.0864 21.2484 17.3864 21.0736C18.6648 20.9018 19.4355 20.5749 20.0052 20.0052C20.5749 19.4355 20.9018 18.6648 21.0736 17.3864C21.2022 16.43 21.2371 15.2526 21.2465 13.75H18.8397C17.8659 13.75 17.6113 13.766 17.3975 13.8644C17.1838 13.9627 17.0059 14.1456 16.3722 14.8849L15.7667 15.5913C15.1773 16.2803 14.7796 16.7453 14.2292 16.9984C13.6789 17.2515 13.067 17.2509 12.2945 17.2501C12.2503 17.25 12.2056 17.25 12.1603 17.25H11.8397C11.7944 17.25 11.7497 17.25 11.7055 17.2501C10.933 17.2509 10.3211 17.2515 9.77076 16.9984C9.22039 16.7453 8.82271 16.2803 8.32059 15.6933C8.23327 15.5913 7.62784 14.8849 6.60245 13.8644C6.38869 13.766 6.13407 13.75 5.16026 13.75H2.7535ZM21.25 12.25H18.8397C18.7944 12.25 18.7497 12.25 18.7055 12.2499C17.933 12.2491 17.3211 12.2485 16.7708 12.5016C16.2204 12.7547 15.8227 13.2197 15.3206 13.8067C14.6278 14.6151 13.9941 15.3544 13.6025 15.6356C13.3887 15.734 13.1341 15.75 12.1603 15.75H11.8397C10.8659 15.75 10.6113 15.734 10.3975 15.6356C10.1838 15.5373 10.0059 15.3544 9.37216 14.6151L8.76673 13.9087C8.17729 13.2197 7.77961 12.7547 7.22924 12.5016C6.67886 12.2485 6.06705 12.2491 5.29454 12.2499C5.25031 12.25 5.20556 12.25 5.16026 12.25H2.75001C2.75 12.1675 2.75 12.0842 2.75 12C2.75 9.62177 2.75159 7.91356 2.92637 6.61358C3.09825 5.33517 3.42514 4.56445 3.9948 3.9948C4.56445 3.42514 5.33517 3.09825 6.61358 2.92637C7.91356 2.75159 9.62177 2.75 12 2.75C14.3782 2.75 16.0864 2.75159 17.3864 2.92637C18.6648 3.09825 19.4355 3.42514 20.0052 3.9948C20.5749 4.56445 20.9018 5.33517 21.0736 6.61358C21.2484 7.91356 21.25 9.62177 21.25 12Z"
        fill="currentColor"
      />
    </svg>
  );
}

function FolderIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.85929 1.25001C6.88904 1.25001 6.91919 1.25002 6.94976 1.25002L6.98675 1.25001C7.33818 1.24999 7.56433 1.24998 7.78542 1.27065C8.7367 1.35961 9.63905 1.73337 10.3746 2.34313C10.5456 2.48485 10.7055 2.64477 10.954 2.89329L11.5303 3.46969C12.3761 4.3154 12.7012 4.6311 13.0768 4.84005C13.2948 4.96134 13.526 5.05713 13.766 5.12552C14.1793 5.24333 14.6324 5.25002 15.8284 5.25002L16.253 5.25002C17.526 5.25 18.5521 5.24998 19.364 5.35206C20.2054 5.45784 20.9204 5.68358 21.5077 6.21185C21.6061 6.30032 21.6997 6.39394 21.7882 6.49231C22.3165 7.07965 22.5422 7.79459 22.648 8.63601C22.75 9.4479 22.75 10.4741 22.75 11.747V14.0564C22.75 15.8942 22.75 17.3498 22.5969 18.489C22.4393 19.6615 22.1071 20.6104 21.3588 21.3588C20.6104 22.1071 19.6615 22.4393 18.489 22.5969C17.3498 22.75 15.8942 22.75 14.0564 22.75H9.94361C8.10584 22.75 6.65021 22.75 5.51099 22.5969C4.33857 22.4393 3.38962 22.1071 2.64126 21.3588C1.8929 20.6104 1.56078 19.6615 1.40315 18.489C1.24999 17.3498 1.25 15.8942 1.25002 14.0564L1.25002 6.94976C1.25002 6.91919 1.25001 6.88904 1.25001 6.85929C1.2499 6.06338 1.24982 5.55685 1.33237 5.11935C1.6949 3.19788 3.19788 1.6949 5.11935 1.33237C5.55685 1.24982 6.06338 1.2499 6.85929 1.25001ZM6.94976 2.75002C6.03312 2.75002 5.67873 2.75329 5.39746 2.80636C4.08277 3.05441 3.05441 4.08277 2.80636 5.39746C2.75329 5.67873 2.75002 6.03312 2.75002 6.94976V14C2.75002 15.9068 2.75161 17.2615 2.88978 18.2892C3.02504 19.2953 3.27871 19.8749 3.70192 20.2981C4.12513 20.7213 4.70478 20.975 5.71087 21.1103C6.73853 21.2484 8.0932 21.25 10 21.25H14C15.9068 21.25 17.2615 21.2484 18.2892 21.1103C19.2953 20.975 19.8749 20.7213 20.2981 20.2981C20.7213 19.8749 20.975 19.2953 21.1103 18.2892C21.2484 17.2615 21.25 15.9068 21.25 14V11.7979C21.25 10.4621 21.2486 9.5305 21.1597 8.82312C21.0731 8.13448 20.9141 7.76356 20.6729 7.49539C20.6198 7.43637 20.5637 7.3802 20.5046 7.32712C20.2365 7.08592 19.8656 6.92692 19.1769 6.84034C18.4695 6.75141 17.538 6.75002 16.2021 6.75002H15.8284C15.7912 6.75002 15.7545 6.75002 15.7182 6.75003C14.6702 6.75025 13.9944 6.75038 13.3548 6.56806C13.0041 6.46811 12.6661 6.32811 12.3475 6.15083C11.7663 5.82747 11.2885 5.3495 10.5476 4.60833C10.4697 4.53035L9.91943 3.98009C9.63616 3.69682 9.52778 3.58951 9.41731 3.49793C8.91403 3.08073 8.29664 2.825 7.64576 2.76413C7.50289 2.75077 7.35038 2.75002 6.94976 2.75002ZM12.25 10C12.25 9.5858 12.5858 9.25002 13 9.25002H18C18.4142 9.25002 18.75 9.5858 18.75 10C18.75 10.4142 18.4142 10.75 18 10.75H13C12.5858 10.75 12.25 10.4142 12.25 10Z"
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

function FireIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.4803 2.76059C13.2315 2.30898 14.208 2.28697 15.0418 2.88997C17.7027 4.81436 20.75 8.2447 20.75 13.1111C20.75 16.9175 19.1146 19.3652 17.0325 20.835C15.7533 21.738 14.3232 22.2609 13.0331 22.5258C12.5577 22.6872 12.1 22.75 11.7333 22.75C11.6306 22.75 11.521 22.746 11.4058 22.7374C11.242 22.746 11.0843 22.75 10.9333 22.75C9.47245 22.75 7.31363 22.2658 5.50409 20.806C3.6625 19.3203 2.25 16.8771 2.25 13.1111C2.25 10.0344 3.87536 7.9652 5.40507 6.79826C6.04192 6.31244 6.80509 6.30435 7.40898 6.63407C7.99302 6.95295 8.40231 7.56762 8.47627 8.28958L8.5621 9.12741C8.59508 9.44943 8.75974 9.71671 8.93177 9.84683C9.0125 9.90789 9.07802 9.92706 9.12163 9.93034C9.15843 9.93311 9.21562 9.92815 9.30063 9.8729C9.95369 9.44849 10.4496 8.68506 10.7833 7.78664C11.1138 6.89653 11.25 5.96663 11.25 5.33336V5.00973C11.25 4.03696 11.7444 3.20294 12.4803 2.76059ZM12.6314 21.0766C12.2057 21.1595 11.7992 21.2101 11.4272 21.2338C10.9433 21.1848 10.3335 21.0197 9.82415 20.6704C9.23942 20.2694 8.75 19.6065 8.75 18.4445C8.75 17.0422 9.61756 15.9772 10.5398 15.295C10.5423 15.3051 10.5441 15.3178 10.5441 15.3334V15.3443C10.5441 15.572 10.5441 15.9166 10.587 16.275C10.6296 16.6315 10.7214 17.0698 10.9474 17.4553C11.1049 17.724 11.3471 17.9513 11.6758 18.0481C11.9989 18.1433 12.3068 18.0833 12.5468 17.97C13.0028 17.7545 13.3288 17.3047 13.4657 16.8303C13.8778 17.1659 14.25 17.6907 14.25 18.4445C14.25 19.648 13.8025 20.3145 13.3124 20.6986C13.0975 20.867 12.8624 20.99 12.6314 21.0766ZM15.5176 20.0225C15.7384 19.8964 15.9557 19.759 16.1675 19.6095C17.8631 18.4126 19.25 16.4159 19.25 13.1111C19.25 8.92389 16.6279 5.88822 14.1627 4.10543C13.838 3.8706 13.5133 3.88975 13.2531 4.04619C12.9775 4.21188 12.75 4.5528 12.75 5.00973V5.33336C12.75 6.14196 12.5831 7.24891 12.1894 8.30886C11.7988 9.3605 11.1494 10.4604 10.118 11.1306C9.38388 11.6077 8.59212 11.4706 8.02694 11.0432C7.49344 10.6397 7.14144 9.97856 7.0699 9.28027L6.98408 8.44244C6.95826 8.19039 6.82167 8.02241 6.69016 7.95061C6.5785 7.88965 6.45645 7.88284 6.31484 7.99087C5.04758 8.9576 3.75 10.6247 3.75 13.1111C3.75 16.4562 4.98195 18.4575 6.44591 19.6385C6.84345 19.9592 7.263 20.2233 7.68701 20.4381C7.41384 19.8888 7.25 19.2282 7.25 18.4445C7.25 16.341 8.57017 14.8717 9.69806 14.0521C10.2109 13.6795 10.8273 13.6907 11.2979 13.9755C11.7522 14.2504 12.0441 14.7589 12.0441 15.3334C12.0441 15.5682 12.0448 15.8335 12.0763 16.0969C12.0815 16.14 12.0873 16.1814 12.0938 16.221C12.254 15.8525 12.5484 15.5666 12.897 15.4155C13.3152 15.2342 13.847 15.2379 14.2912 15.5719C14.9907 16.098 15.75 17.0424 15.75 18.4445C15.75 19.0383 15.666 19.5627 15.5176 20.0225Z"
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
