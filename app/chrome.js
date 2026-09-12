/* ============================================================================
   Organizer · Cromo compartido de los comps
   Barra de estado de iOS, barra de pestanas y barra de inicio.

   La barra de pestanas es un componente real: 4 modulos (decision 30/34),
   icono Y etiqueta siempre, 49px + area segura. El resto es cromo del
   sistema, dibujado aqui para que el presupuesto de altura de cada pantalla
   sea verificable: 47px arriba, 83px abajo. Quedan 714px para la pantalla.
   ========================================================================= */

(function () {
  var TABS = [
    { id: 'inicio',   label: 'Inicio',   icon: 'house',        href: 'inicio.html' },
    // El modulo del calendario abre en Dia ("que hago ahora"). Semana y Mes
    // son las otras dos vistas del mismo modulo, no otras pestanas.
    { id: 'semana',   label: 'Semana',   icon: 'calendar',     href: 'dia.html' },
    { id: 'tareas',   label: 'Tareas',   icon: 'check-circle', href: 'tareas.html' },
    { id: 'recursos', label: 'Recursos', icon: 'bookmark',     href: 'recursos.html' },
  ];

  var STATUS_GLYPHS =
    '<svg viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="7.5" width="3" height="4.5" rx="1"/>' +
    '<rect x="4.5" y="5" width="3" height="7" rx="1"/><rect x="9" y="2.5" width="3" height="9.5" rx="1"/>' +
    '<rect x="13.5" y="0" width="3" height="12" rx="1"/></svg>' +
    '<svg viewBox="0 0 18 12" fill="currentColor"><path d="M9 11.2 6.6 8.6a3.4 3.4 0 0 1 4.8 0L9 11.2Z"/>' +
    '<path d="M13.3 6.2a6.4 6.4 0 0 0-8.6 0L3.3 4.7a8.5 8.5 0 0 1 11.4 0l-1.4 1.5Z"/></svg>' +
    '<svg viewBox="0 0 26 12" style="width:25px" fill="none"><rect x=".5" y=".5" width="21" height="11" rx="3.2"' +
    ' stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="16" height="8" rx="2" fill="currentColor"/>' +
    '<path d="M23 4v4a2.2 2.2 0 0 0 0-4Z" fill="currentColor" opacity=".4"/></svg>';

  function statusbar(el) {
    el.className = 'statusbar';
    el.innerHTML =
      '<span class="num">' + (el.dataset.statusbar || '8:03') + '</span>' +
      '<span class="statusbar__glyphs">' + STATUS_GLYPHS + '</span>';
  }

  function tabbar(el) {
    var current = el.dataset.tabbar;
    el.className = 'tabbar';
    el.setAttribute('aria-label', 'Secciones');
    el.innerHTML = TABS.map(function (t) {
      var on = t.id === current;
      return '<a class="tab" href="' + t.href + '"' + (on ? ' aria-current="page"' : '') + '>' +
        '<span class="ico ico--lg" data-icon="' + t.icon + '"></span>' +
        '<span>' + t.label + '</span></a>';
    }).join('');
  }

  function build() {
    document.querySelectorAll('[data-statusbar]').forEach(statusbar);
    document.querySelectorAll('[data-tabbar]').forEach(tabbar);
    document.querySelectorAll('[data-homebar]').forEach(function (el) { el.className = 'homebar'; });
    if (window.renderIcons) window.renderIcons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
