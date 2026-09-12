/* ============================================================================
   Organizer · Tema de los comps
   Tres estados, igual que iOS: claro, oscuro, y "lo que diga el sistema".

   - Sin data-theme  -> manda prefers-color-scheme (el estado por defecto).
   - data-theme="light" / "dark" -> eleccion explicita, gana sobre el sistema.

   El indice (index.html) manda el tema a cada comp por postMessage para que
   los dos temas se revisen sin recargar y sin perder el estado de la pagina.
   ========================================================================= */

(function () {
  function apply(theme) {
    if (theme === 'light' || theme === 'dark') {
      document.documentElement.setAttribute('data-theme', theme);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  var fromUrl = new URLSearchParams(location.search).get('theme');
  if (fromUrl) apply(fromUrl);

  window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'organizer:theme') apply(e.data.theme);
  });

  window.setTheme = apply;
})();
