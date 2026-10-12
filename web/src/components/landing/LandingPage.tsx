'use client';

/* ============================================================================
   Organizer · Landing Page de Clase Mundial
   Inspirada en RateMat UCAB, ChronoTask y Linear / Apple Minimalist.
   
   Filosofía:
     1. Push, no pull: el producto es la notificación diaria en pantalla de bloqueo.
     2. Captura en 0 fricción: 2 segundos por voz o texto sin clasificar forzosamente.
     3. Inicio en una pantalla: cero scroll, cero parálisis por listas de 20 tareas.
     4. Sin reproches ni culpa: si algo no se hizo ayer, se reajusta con calma.
     5. Recursos independiente: notas y herramientas aisladas de la planificación.
   ========================================================================= */

import { useState } from 'react';
import Link from 'next/link';

export function LandingPage() {
  const [activeTab, setActiveTab] = useState<'hoy' | 'push' | 'calendario'>('hoy');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-blue-100 selection:text-blue-900 antialiased overflow-x-hidden font-sans">
      {/* ====================================================================
          1. NAVBAR FLOTANTE / STICKY
          ==================================================================== */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/85 border-b border-slate-200/70 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-[#1E3A6F] flex items-center justify-center text-white shadow-md shadow-blue-950/15 group-hover:scale-105 transition-transform duration-200">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <span className="font-bold text-lg sm:text-xl tracking-tight text-slate-950 group-hover:text-blue-900 transition-colors">
                Organizer
              </span>
            </Link>

            {/* Servicio Activo Badge */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-[11px] font-medium text-emerald-800">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Servicio activo
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#filosofia" className="hover:text-slate-950 transition-colors">
              Filosofía
            </a>
            <a href="#como-funciona" className="hover:text-slate-950 transition-colors">
              Cómo funciona
            </a>
            <a href="#modulos" className="hover:text-slate-950 transition-colors">
              Módulos
            </a>
            <a href="#faq" className="hover:text-slate-950 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Right Action CTAs */}
          <div className="flex items-center gap-3">
            <Link
              href="/entrar"
              className="hidden sm:inline-flex text-sm font-semibold text-slate-700 hover:text-slate-950 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Iniciar sesión
            </Link>

            <Link
              href="/entrar"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1E3A6F] hover:bg-[#162a52] text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
            >
              <GoogleIcon className="w-4 h-4" />
              <span>Empezar gratis</span>
              <svg className="w-3.5 h-3.5 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
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

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 bg-white/95 backdrop-blur-lg px-4 pt-2 pb-4 space-y-2">
            <a
              href="#filosofia"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
            >
              Filosofía
            </a>
            <a
              href="#como-funciona"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
            >
              Cómo funciona
            </a>
            <a
              href="#modulos"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
            >
              Módulos
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
            >
              FAQ
            </a>
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <Link
                href="/entrar"
                className="w-full text-center px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/entrar"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E3A6F] text-white font-semibold"
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
      <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-28 overflow-hidden">
        {/* Glow ambient background elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 pointer-events-none -z-10">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-blue-400/20 via-indigo-300/20 to-sky-300/15 blur-3xl rounded-full" />
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50/90 border border-blue-200/70 text-blue-900 text-xs sm:text-sm font-semibold shadow-xs mb-6 sm:mb-8 hover:bg-blue-100/80 transition-colors">
            <span className="text-blue-600 font-bold">✦</span>
            <span>Tu planificación devuelta a tiempo</span>
            <span className="text-blue-300">·</span>
            <span className="text-blue-700 font-medium">Push, no pull</span>
          </div>

          {/* Main Headline (Two tones) */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-950 leading-[1.08] sm:leading-[1.08] mb-6">
            Tu día resuelto{' '}
            <span className="bg-gradient-to-r from-blue-700 via-indigo-600 to-sky-600 bg-clip-text text-transparent">
              antes de que abras la app.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="max-w-2xl mx-auto text-base sm:text-xl text-slate-600 leading-relaxed font-normal mb-8 sm:mb-10">
            La app de planificación diseñada para estudiantes y mentes con ADHD. Sin listas infinitas que agobian: captura en 2 segundos y recibe tu día resumido en tu pantalla de bloqueo cada mañana.
          </p>

          {/* CTA Buttons Group */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-10">
            <Link
              href="/entrar"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-7 py-3.5 rounded-xl bg-[#1E3A6F] hover:bg-[#162a52] text-white text-base font-semibold shadow-md shadow-blue-950/20 hover:shadow-lg transition-all active:scale-[0.98]"
            >
              <GoogleIcon className="w-5 h-5 bg-white rounded-full p-0.5" />
              <span>Empezar con Google</span>
              <svg className="w-4 h-4 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>

            <a
              href="#como-funciona"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300/80 text-slate-800 text-base font-semibold shadow-xs hover:border-slate-400 transition-all active:scale-[0.98]"
            >
              <span>Ver cómo funciona</span>
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </a>
          </div>

          {/* Social Proof / Metrics Pill */}
          <div className="inline-flex flex-wrap items-center justify-center gap-2 sm:gap-3 px-4 py-2 rounded-2xl bg-white/80 border border-slate-200/90 shadow-xs text-xs sm:text-sm text-slate-700">
            <div className="flex items-center text-amber-500">
              {'★★★★★'.split('').map((star, i) => (
                <span key={i} className="text-base leading-none">★</span>
              ))}
            </div>
            <span className="font-semibold text-slate-900">100% libre de agobio</span>
            <span className="text-slate-300">·</span>
            <span>0 deuda acumulada</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500">Diseñado para iPhone y Escritorio</span>
          </div>
        </div>
      </section>

      {/* ====================================================================
          3. SHOWCASE VISUAL DE LA APLICACIÓN (MOCKUPS INTERACTIVOS)
          ==================================================================== */}
      <section id="como-funciona" className="py-12 sm:py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section heading */}
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
            <span className="text-xs font-bold tracking-widest uppercase text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200/60">
              VISTA PREVIA REAL
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 mt-4 tracking-tight">
              Una experiencia limpia en cada pantalla.
            </h2>
            <p className="text-slate-600 text-base sm:text-lg mt-3">
              Sin menús escondidos ni listas abrumadoras. Tu día ordenado visualmente y entregado en tus manos.
            </p>

            {/* Interactive View Selector */}
            <div className="inline-flex p-1 mt-6 rounded-xl bg-slate-200/70 border border-slate-300/60">
              <button
                type="button"
                onClick={() => setActiveTab('hoy')}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'hoy'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pantalla Hoy (iPhone)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('push')}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'push'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Notificación Push (8:00 AM)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('calendario')}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'calendario'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Vista Escritorio (Mac / PC)
              </button>
            </div>
          </div>

          {/* Interactive Mockup Container */}
          <div className="relative max-w-5xl mx-auto">
            {/* Ambient shadow glow behind devices */}
            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 via-indigo-500/5 to-transparent blur-3xl -z-10 rounded-3xl" />

            {/* Grid layout for Showcase: Laptop behind / side + iPhone hero foreground */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left / Center: iPhone Mockup */}
              <div className="lg:col-span-5 flex justify-center order-2 lg:order-1">
                {/* iPhone 16 Pro Frame */}
                <div className="relative w-[310px] sm:w-[340px] h-[670px] bg-slate-900 rounded-[52px] p-3 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.35)] ring-1 ring-slate-800/80 border-[4px] border-slate-700">
                  {/* Dynamic Island */}
                  <div className="absolute top-5 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-30 flex items-center justify-end pr-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-900/60 ring-1 ring-blue-500/40" />
                  </div>

                  {/* iPhone Screen Content */}
                  <div className="w-full h-full bg-[#F6F7F9] rounded-[42px] overflow-hidden flex flex-col relative text-slate-900">
                    {/* Status bar */}
                    <div className="pt-3 px-6 pb-2 flex justify-between items-center text-[12px] font-semibold text-slate-800 select-none">
                      <span>9:41</span>
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L12 22l7.03-4.39C20.26 16.07 21 14.12 21 12c0-4.97-4.03-9-9-9z"/>
                        </svg>
                        <span className="text-[10px]">5G</span>
                        <div className="w-5 h-2.5 border border-slate-700 rounded-sm p-0.5 flex items-center">
                          <div className="h-full w-full bg-slate-800 rounded-2xs"></div>
                        </div>
                      </div>
                    </div>

                    {/* App Header */}
                    <div className="px-5 pt-1 pb-3 flex justify-between items-end border-b border-slate-200/60 bg-white/70 backdrop-blur-md">
                      <div>
                        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                          Martes 6 de octubre
                        </p>
                        <h3 className="text-xl font-bold text-slate-950 tracking-tight">Hoy</h3>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-[11px] font-semibold">
                          ✦ Planear
                        </span>
                        <span className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs">
                          ⚙
                        </span>
                      </div>
                    </div>

                    {/* App Body Content */}
                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                      {/* Priority "Ahora" Card */}
                      <div className="p-3.5 rounded-2xl bg-[#1E3A6F] text-white shadow-md shadow-blue-950/20">
                        <div className="flex items-center justify-between text-[11px] text-blue-200 font-semibold mb-1">
                          <span className="uppercase tracking-wider">Ahora</span>
                          <span className="px-1.5 py-0.5 rounded bg-blue-900/80 text-[10px] text-blue-100">
                            Prioridad alta
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-white">
                          Entrega Informe de Laboratorio
                        </h4>
                        <p className="text-xs text-blue-200/90 mt-0.5">
                          Física II · Aula 204
                        </p>
                        <div className="flex gap-2 mt-3 pt-2 border-t border-blue-800/80">
                          <button type="button" className="flex-1 py-1.5 bg-white text-[#1E3A6F] rounded-lg text-xs font-bold text-center shadow-xs">
                            ✓ Hecho
                          </button>
                          <button type="button" className="px-3 py-1.5 bg-blue-900/60 hover:bg-blue-900 text-blue-100 rounded-lg text-xs font-medium">
                            Después
                          </button>
                        </div>
                      </div>

                      {/* Timeline Items */}
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                          Tu cronograma
                        </div>

                        {/* Class block (Green) */}
                        <div className="p-2.5 rounded-xl bg-[#E8F1EB] border-l-4 border-[#2F6B46] text-slate-800 flex items-center justify-between">
                          <div>
                            <div className="text-[11px] font-semibold text-[#2F6B46]">08:00 - 10:00</div>
                            <div className="text-xs font-bold text-slate-900">Cálculo III</div>
                            <div className="text-[10px] text-slate-500">Aula 302 · Prof. Rivas</div>
                          </div>
                          <span className="text-[10px] bg-emerald-100 text-[#2F6B46] font-semibold px-2 py-0.5 rounded-md">
                            Clase
                          </span>
                        </div>

                        {/* Task block (Navy) */}
                        <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-4 h-4 rounded-full border-2 border-slate-400" />
                            <div>
                              <div className="text-xs font-semibold text-slate-900">Revisión de código en GitHub</div>
                              <div className="text-[10px] text-slate-500">14:30 · Proyecto Personal</div>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400">45m</span>
                        </div>

                        {/* Reminder block (Amber) */}
                        <div className="p-2.5 rounded-xl bg-[#FBEFD9] border-l-4 border-[#B26B00] text-slate-900 flex items-center justify-between">
                          <div>
                            <div className="text-[11px] font-semibold text-[#B26B00]">18:00</div>
                            <div className="text-xs font-bold text-slate-900">Inscripción seminario web</div>
                          </div>
                          <span className="text-[10px] text-[#B26B00] font-semibold">Aviso</span>
                        </div>
                      </div>

                      {/* Streak Widget */}
                      <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🔥</span>
                          <div>
                            <div className="text-xs font-bold text-slate-900">14 días de racha</div>
                            <div className="text-[10px] text-slate-500">2 comodines de perdón activos</div>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                          En racha
                        </span>
                      </div>
                    </div>

                    {/* iOS TabBar dock */}
                    <div className="h-14 bg-white/95 border-t border-slate-200 px-6 flex justify-between items-center text-[10px] font-medium text-slate-500">
                      <div className="flex flex-col items-center text-blue-800 font-bold">
                        <span>☀️</span>
                        <span>Hoy</span>
                      </div>
                      <div className="flex flex-col items-center hover:text-slate-800">
                        <span>📅</span>
                        <span>Semana</span>
                      </div>
                      <div className="flex flex-col items-center hover:text-slate-800">
                        <span>📥</span>
                        <span>Tareas</span>
                      </div>
                      <div className="flex flex-col items-center hover:text-slate-800">
                        <span>📚</span>
                        <span>Recursos</span>
                      </div>
                    </div>

                    {/* Home Indicator */}
                    <div className="pb-1.5 pt-0.5 bg-white flex justify-center">
                      <div className="w-28 h-1 bg-slate-950/20 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Floating Cards Showcase and Desktop Mockup */}
              <div className="lg:col-span-7 space-y-5 order-1 lg:order-2">
                {/* Floating Card 1: iOS Lockscreen Push Notification */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-lg shadow-slate-200/60 hover:shadow-xl transition-all">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-md bg-[#1E3A6F] flex items-center justify-center text-white text-[10px] font-bold">
                        O
                      </div>
                      <span className="text-xs font-bold tracking-wider text-slate-900 uppercase">
                        ORGANIZER · PUSH
                      </span>
                    </div>
                    <span className="text-xs font-medium text-slate-400">Hoy · 8:00 AM</span>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-950">Tu plan del día está listo:</span>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        Pantalla de bloqueo
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 mt-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                      &quot;Hoy: Cálculo 8:00 · Entrega Lab 11:00 · Gym 18:00&quot;
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      ✦ No necesitas abrir la app ni recordar entrar: la información llega a ti antes de salir de la cama.
                    </p>
                  </div>
                </div>

                {/* Floating Card 2: 0-Friction Siri / Voice Capture */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-lg shadow-slate-200/60 hover:shadow-xl transition-all">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                        🎙️
                      </div>
                      <span className="text-xs font-bold tracking-wider text-slate-900 uppercase">
                        CAPTURA EN 0 FRICCIÓN
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                      1.2 segundos
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="p-2.5 rounded-xl bg-slate-900 text-white font-mono text-xs flex items-center justify-between">
                      <span>&quot;Oye Siri, anota comprar cuaderno de física&quot;</span>
                      <span className="text-emerald-400 text-[11px] font-sans font-semibold">✓ Guardado</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-2">
                      Sin seleccionar carpetas, sin fechas forzadas, sin campos obligatorios. Suéltalo y sigue con tu vida.
                    </p>
                  </div>
                </div>

                {/* Floating Card 3: Desktop View Mac Frame */}
                <div className="hidden sm:block rounded-2xl bg-slate-950 text-white p-4 shadow-xl border border-slate-800">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                        <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                        <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                      </div>
                      <span className="text-xs font-medium text-slate-400 pl-2">
                        Organizer Desktop · Vista Semanal
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">Sincronización en tiempo real</span>
                  </div>

                  <div className="mt-3 grid grid-cols-5 gap-2 text-center text-xs">
                    {['Lun 5', 'Mar 6', 'Mié 7', 'Jue 8', 'Vie 9'].map((dia, idx) => (
                      <div
                        key={dia}
                        className={`p-2 rounded-lg border ${
                          idx === 1
                            ? 'bg-blue-950/60 border-blue-500/40 text-blue-200'
                            : 'bg-slate-900/60 border-slate-800/80 text-slate-400'
                        }`}
                      >
                        <div className="font-bold text-[11px] mb-1">{dia}</div>
                        <div className="h-1.5 w-full bg-emerald-500/60 rounded-full mb-1" title="Clase fijada" />
                        <div className="h-1.5 w-3/4 bg-blue-500/70 rounded-full" title="Tarea planificada" />
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
          4. SECCIÓN BENTO: "¿POR QUÉ ES DIFERENTE?"
          ==================================================================== */}
      <section id="filosofia" className="py-16 sm:py-24 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
            <span className="text-xs font-bold tracking-widest uppercase text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200/60">
              FILOSOFÍA FUNDAMENTAL
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-950 mt-4 tracking-tight">
              ¿Por qué las demás apps de tareas te fallaron?
            </h2>
            <p className="text-slate-600 text-base sm:text-lg mt-3">
              El problema no es que no sepas organizarte. El problema es que las apps tradicionales están diseñadas para cerebros que aman revisar listas. Organizer está hecha para la realidad.
            </p>
          </div>

          {/* Bento Grid Layout (4 Asymmetric Cards) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Card 1: Push, no pull (md:col-span-7) */}
            <div className="md:col-span-7 p-6 sm:p-8 rounded-3xl bg-slate-50 border border-slate-200 hover:border-blue-300 transition-all flex flex-col justify-between group shadow-2xs">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl shadow-md shadow-blue-500/20 mb-5">
                  🔔
                </div>
                <div className="inline-block text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">
                  Principio 01 · El producto es el aviso
                </div>
                <h3 className="text-2xl font-bold text-slate-950 tracking-tight">
                  Push, no pull. La app va hacia ti.
                </h3>
                <p className="text-slate-600 text-base mt-2.5 leading-relaxed">
                  Cualquier sistema que dependa de que te acuerdes de entrar a la app fracasa el tercer día. En Organizer, tu plan del día llega a tu pantalla de bloqueo a las <strong>8:00 AM exactas</strong>. Contiene tus horas, tus materias y tus tareas. Lo lees sin desbloquear.
                </p>
              </div>
              <div className="mt-6 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Notificación sin rodeos ni badges engañosos:
                </div>
                <p className="text-sm font-semibold text-slate-900 mt-1 font-mono">
                  Hoy: Cálculo 8:00 · Informe 11:00 · Gym 18:00
                </p>
              </div>
            </div>

            {/* Card 2: Captura en 0 fricción (md:col-span-5) */}
            <div className="md:col-span-5 p-6 sm:p-8 rounded-3xl bg-slate-50 border border-slate-200 hover:border-blue-300 transition-all flex flex-col justify-between group shadow-2xs">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-2xl shadow-md shadow-indigo-500/20 mb-5">
                  ⚡
                </div>
                <div className="inline-block text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">
                  Principio 02 · Cero barreras
                </div>
                <h3 className="text-2xl font-bold text-slate-950 tracking-tight">
                  Captura en 0 fricción.
                </h3>
                <p className="text-slate-600 text-base mt-2.5 leading-relaxed">
                  Anotar toma 2 segundos. Con Siri, un atajo de iOS o un toque en la pantalla de inicio. Sin categorías obligatorias ni fechas forzadas: anota la idea antes de que se esfume.
                </p>
              </div>
              <div className="mt-6 p-4 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-between">
                <div className="text-xs font-medium text-slate-500">Tiempo de captura medido</div>
                <div className="text-sm font-extrabold text-indigo-700">&lt; 2 segundos</div>
              </div>
            </div>

            {/* Card 3: Inicio sin scroll (md:col-span-5) */}
            <div className="md:col-span-5 p-6 sm:p-8 rounded-3xl bg-slate-50 border border-slate-200 hover:border-blue-300 transition-all flex flex-col justify-between group shadow-2xs">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center text-2xl shadow-md shadow-sky-500/20 mb-5">
                  🎯
                </div>
                <div className="inline-block text-xs font-bold text-sky-700 uppercase tracking-wider mb-1">
                  Principio 03 · Foco absoluto
                </div>
                <h3 className="text-2xl font-bold text-slate-950 tracking-tight">
                  Inicio en una pantalla (sin scroll).
                </h3>
                <p className="text-slate-600 text-base mt-2.5 leading-relaxed">
                  Para una mente con sobrecarga o ADHD, una lista de 15 cosas pendientes equivale a una lista vacía: te paraliza. Organizer solo muestra lo que toca hoy y una acción inmediata en foco.
                </p>
              </div>
              <div className="mt-6 p-4 rounded-2xl bg-white border border-slate-200/80 flex items-center gap-3">
                <span className="text-xl">🛡️</span>
                <span className="text-xs font-semibold text-slate-700">
                  Cero listas infinitas. Cero sobrecarga cognitiva.
                </span>
              </div>
            </div>

            {/* Card 4: Sin reproches ni culpa (md:col-span-7) */}
            <div className="md:col-span-7 p-6 sm:p-8 rounded-3xl bg-slate-50 border border-slate-200 hover:border-blue-300 transition-all flex flex-col justify-between group shadow-2xs">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center text-2xl shadow-md shadow-emerald-700/20 mb-5">
                  🌱
                </div>
                <div className="inline-block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
                  Principio 04 · Cero culpa
                </div>
                <h3 className="text-2xl font-bold text-slate-950 tracking-tight">
                  Sin reproches ni deuda acumulada.
                </h3>
                <p className="text-slate-600 text-base mt-2.5 leading-relaxed">
                  Si ayer no pudiste completar algo, la app no te castiga ni deja tareas rojas pudriéndose en una lista de la vergüenza. Te pregunta con calma qué hacer hoy: ¿moverlo, reprogramarlo o descartarlo? Tu racha cuenta con comodines automáticos.
                </p>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-800">
                  Hacer hoy
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-800">
                  Mover de día
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-800">
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
      <section className="py-16 sm:py-24 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
            <span className="text-xs font-bold tracking-widest uppercase text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200/60">
              EL FLUJO COTIDIANO
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-950 mt-4 tracking-tight">
              Cómo transcurre tu día con Organizer.
            </h2>
            <p className="text-slate-600 text-base sm:text-lg mt-3">
              Un ciclo diseñado para adaptarse al ritmo real de estudio universitario y proyectos personales.
            </p>
          </div>

          {/* 4 Step Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md transition-all relative">
              <div className="text-4xl font-black text-slate-200 mb-3 font-mono">01</div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-lg mb-4">
                ⚡
              </div>
              <h3 className="text-lg font-bold text-slate-950 mb-2">
                Captura instantánea
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Se te ocurre algo mientras caminas o estás en clase. Lo dictas a Siri o anotas en 2 segundos. Queda a salvo en Pendientes sin distraerte.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md transition-all relative">
              <div className="text-4xl font-black text-slate-200 mb-3 font-mono">02</div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-lg mb-4">
                🗓️
              </div>
              <h3 className="text-lg font-bold text-slate-950 mb-2">
                Bloques con clases
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Tus materias fijas se cargan una vez. Acomodas tus tareas en los huecos de tiempo reales de tu semana, sin sobrecargar ningún día.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md transition-all relative">
              <div className="text-4xl font-black text-slate-200 mb-3 font-mono">03</div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-lg mb-4">
                ☀️
              </div>
              <h3 className="text-lg font-bold text-slate-950 mb-2">
                Notificación 8:00 AM
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                A las 8:00 AM tu teléfono vibra con el plan completo listo en la pantalla de bloqueo. Sabes qué toca sin necesidad de abrir la app.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md transition-all relative">
              <div className="text-4xl font-black text-slate-200 mb-3 font-mono">04</div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-lg mb-4">
                🔥
              </div>
              <h3 className="text-lg font-bold text-slate-950 mb-2">
                Cierre y racha
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Marcas lo cumplido en 30 segundos. Tu racha avanza y, si un día tuviste una emergencia, tu comodín protege tu progreso automáticamente.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          6. SECCIÓN DE MÓDULOS: "LOS 4 PILARES"
          ==================================================================== */}
      <section id="modulos" className="py-16 sm:py-24 bg-white border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
            <span className="text-xs font-bold tracking-widest uppercase text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200/60">
              LOS CUATRO PILARES
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-950 mt-4 tracking-tight">
              Cada cosa en su lugar, sin mezclar tu foco.
            </h2>
            <p className="text-slate-600 text-base sm:text-lg mt-3">
              Organizer separa estrictamente la ejecución de hoy de tus notas y referencias de largo plazo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Módulo 1: Hoy */}
            <div className="p-8 rounded-3xl bg-[#F8FAFC] border border-slate-200 hover:border-slate-300 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-lg font-bold">
                  ☀️
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-950">Módulo Hoy</h3>
                  <p className="text-xs text-slate-500">Ejecución inmediata</p>
                </div>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                Tu pantalla de arranque matutina. Sin scroll. Muestra tu tarea activa bajo el pulgar (&quot;Ahora&quot;), el horario del día y tu racha de constancia.
              </p>
              <ul className="space-y-2 text-xs font-medium text-slate-700">
                <li className="flex items-center gap-2">
                  <span className="text-blue-600 font-bold">✓</span> Acción rápida Hecho / Para después
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-600 font-bold">✓</span> Lo de ayer con resolución amigable
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-600 font-bold">✓</span> Racha con comodines automáticos
                </li>
              </ul>
            </div>

            {/* Módulo 2: Calendario y Clases */}
            <div className="p-8 rounded-3xl bg-[#F8FAFC] border border-slate-200 hover:border-slate-300 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center text-lg font-bold">
                  📅
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-950">Calendario & Clases</h3>
                  <p className="text-xs text-slate-500">Horario y huecos reales</p>
                </div>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                Tus materias fijas universitarias estructuran la semana. Visualiza tus bloques de tiempo libres para ubicar tareas de estudio sin fricción.
              </p>
              <ul className="space-y-2 text-xs font-medium text-slate-700">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-700 font-bold">✓</span> Plantilla fija de horario universitario
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-700 font-bold">✓</span> Vistas de Semana, Mes y Día
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-700 font-bold">✓</span> Recordatorios con fecha y aviso anticipado
                </li>
              </ul>
            </div>

            {/* Módulo 3: Tareas y Pendientes */}
            <div className="p-8 rounded-3xl bg-[#F8FAFC] border border-slate-200 hover:border-slate-300 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-lg font-bold">
                  📥
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-950">Pendientes</h3>
                  <p className="text-xs text-slate-500">Inbox & Carpetas</p>
                </div>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                La bandeja de entrada para todo lo que capturaste al vuelo. Organízalo en carpetas solo cuando tengas tiempo, o déjalo esperando fecha sin estrés.
              </p>
              <ul className="space-y-2 text-xs font-medium text-slate-700">
                <li className="flex items-center gap-2">
                  <span className="text-indigo-600 font-bold">✓</span> Captura sin categorización forzada
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-indigo-600 font-bold">✓</span> Carpetas limpias para proyectos
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-indigo-600 font-bold">✓</span> Planificación en un solo toque hacia hoy
                </li>
              </ul>
            </div>

            {/* Módulo 4: Recursos */}
            <div className="p-8 rounded-3xl bg-[#F8FAFC] border border-slate-200 hover:border-slate-300 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center text-lg font-bold">
                  📚
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-950">Recursos</h3>
                  <p className="text-xs text-slate-500">Módulo independiente</p>
                </div>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                Tus notas, herramientas, artículos y referencias viven en un módulo totalmente separado. Nunca persiguen al usuario ni contaminan la planificación diaria.
              </p>
              <ul className="space-y-2 text-xs font-medium text-slate-700">
                <li className="flex items-center gap-2">
                  <span className="text-purple-700 font-bold">✓</span> Totalmente aislado de tus tareas diarias
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-700 font-bold">✓</span> Enlaces, notas y apuntes de consulta
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-700 font-bold">✓</span> 0 notificaciones, 0 presión de lectura
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          7. SECCIÓN DE FAQ (PREGUNTAS FRECUENTES)
          ==================================================================== */}
      <section id="faq" className="py-16 sm:py-24 bg-[#F8FAFC]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <span className="text-xs font-bold tracking-widest uppercase text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200/60">
              RESOLVEMOS TUS DUDAS
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-950 mt-4 tracking-tight">
              Preguntas Frecuentes
            </h2>
            <p className="text-slate-600 text-base sm:text-lg mt-3">
              Todo lo que necesitas saber sobre cómo funciona Organizer en tu día a día.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: '¿Cómo funcionan las notificaciones push en mi iPhone si es una PWA?',
                a: 'Apple incorporó soporte nativo para Web Push a partir de iOS 16.4. Solo debes abrir Organizer en Safari, tocar en Compartir y seleccionar "Añadir a pantalla de inicio". Desde ese momento, la PWA funciona como una app nativa y nuestro servidor con pg_cron te envía la notificación matutina cada mañana a las 8:00 AM con tu plan detallado.',
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
                className="rounded-2xl bg-white border border-slate-200/90 shadow-2xs overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 font-bold text-slate-950 hover:text-blue-900 transition-colors"
                >
                  <span className="text-base sm:text-lg">{faq.q}</span>
                  <span
                    className={`w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 transition-transform duration-200 shrink-0 ${
                      openFaq === index ? 'rotate-180 bg-blue-50 text-blue-700' : ''
                    }`}
                  >
                    ↓
                  </span>
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-6 pt-1 text-slate-600 text-sm sm:text-base leading-relaxed border-t border-slate-100">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================================
          8. BANNER CTA FINAL DE ALTO IMPACTO (FONDO OSCURO CON RESPLANDOR)
          ==================================================================== */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto rounded-[36px] bg-slate-950 text-white p-8 sm:p-16 lg:p-20 relative overflow-hidden border border-slate-800 shadow-2xl">
          {/* Glowing ambient light */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 blur-3xl rounded-full pointer-events-none -z-0" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/20 blur-3xl rounded-full pointer-events-none -z-0" />

          <div className="relative z-10 max-w-3xl mx-auto text-center">
            <span className="inline-block px-3 py-1 rounded-full bg-blue-900/60 border border-blue-500/40 text-blue-200 text-xs font-semibold uppercase tracking-wider mb-6">
              COMIENZA HOY MISMO
            </span>

            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight mb-6">
              Toma el control de tu tiempo hoy mismo.
            </h2>

            <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed mb-10">
              Sin listas infinitas que agobian. Sin reproches si un día no llegas. Tu plan completo servido en tu pantalla de bloqueo cada mañana.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Link
                href="/entrar"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-base shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
              >
                <GoogleIcon className="w-5 h-5" />
                <span>Empezar con Google</span>
                <svg className="w-4 h-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span> 100% privado y seguro
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span> Diseñado para iPhone & Web
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span> Configuración en 30 segundos
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          9. FOOTER PULIDO
          ==================================================================== */}
      <footer className="border-t border-slate-200 bg-white py-12 text-sm text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#1E3A6F] flex items-center justify-center text-white text-sm font-bold">
                O
              </div>
              <div>
                <span className="font-bold text-slate-950 text-base">Organizer</span>
                <p className="text-xs text-slate-400">Tu planificación devuelta a tiempo.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-slate-600">
              <a href="#filosofia" className="hover:text-slate-950 transition-colors">
                Filosofía
              </a>
              <a href="#como-funciona" className="hover:text-slate-950 transition-colors">
                Cómo funciona
              </a>
              <a href="#modulos" className="hover:text-slate-950 transition-colors">
                Módulos
              </a>
              <a href="#faq" className="hover:text-slate-950 transition-colors">
                FAQ
              </a>
              <Link href="/entrar" className="hover:text-slate-950 transition-colors font-semibold text-blue-700">
                Iniciar sesión
              </Link>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <p>© {new Date().getFullYear()} Organizer. Hecho para cumplir objetivos reales. Push, no pull.</p>
            <p>Construido con Next.js, Tailwind CSS y Supabase Postgres.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/**
 * Logotipo oficial de Google en SVG
 */
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
