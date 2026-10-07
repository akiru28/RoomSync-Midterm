/* components.js — marker-based component loader
   Injects header/footer/modals at HTML comment markers.
   Sets nav active states, sidebar toggle, and auth-aware header links. */

(function(){
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const ICONS = {
    menu: [['path', { d: 'M4 7h16M4 12h16M4 17h16' }]],
    user: [['circle', { cx: '12', cy: '8', r: '3.5' }], ['path', { d: 'M5 20a7 7 0 0 1 14 0' }]],
    dashboard: [['rect', { x: '4', y: '4', width: '7', height: '7', rx: '1.5' }], ['rect', { x: '13', y: '4', width: '7', height: '7', rx: '1.5' }], ['rect', { x: '4', y: '13', width: '7', height: '7', rx: '1.5' }], ['rect', { x: '13', y: '13', width: '7', height: '7', rx: '1.5' }]],
    rooms: [['path', { d: 'M4 20V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v15' }], ['path', { d: 'M4 20h16M9 20v-5h6v5M9 8h.01M15 8h.01' }]],
    labs: [['path', { d: 'M9 3h6M10 3v6l-5.5 9.2A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.8L14 9V3' }], ['path', { d: 'M8 15h8' }]],
    calendar: [['rect', { x: '3', y: '5', width: '18', height: '16', rx: '2' }], ['path', { d: 'M16 3v4M8 3v4M3 10h18' }]],
    reservation: [['rect', { x: '3', y: '5', width: '18', height: '16', rx: '2' }], ['path', { d: 'M16 3v4M8 3v4M3 10h18M12 13v5M9.5 15.5h5' }]],
    list: [['path', { d: 'M9 6h11M9 12h11M9 18h11' }], ['path', { d: 'm4 6 1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2' }]],
    report: [['path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }], ['path', { d: 'M14 2v6h6M12 12v4M12 19h.01' }]],
    admin: [['path', { d: 'M12 3 20 6v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6z' }], ['path', { d: 'm9 12 2 2 4-4' }]],
    logout: [['path', { d: 'M10 17l5-5-5-5M15 12H3' }], ['path', { d: 'M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6' }]],
    search: [['circle', { cx: '10.8', cy: '10.8', r: '6.8' }], ['path', { d: 'm16 16 4.5 4.5' }]],
    folder: [['path', { d: 'M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' }], ['path', { d: 'M3 10h18' }]],
    alert: [['path', { d: 'm10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z' }], ['path', { d: 'M12 9v4M12 17h.01' }]],
    eye: [['path', { d: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z' }], ['circle', { cx: '12', cy: '12', r: '3' }]],
    eyeOff: [['path', { d: 'm3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8' }], ['path', { d: 'M9.9 5.2A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a16 16 0 0 1-3.1 3.8M6.2 6.2C3.5 8 2 12 2 12s3.6 7 10 7c1 0 1.9-.2 2.8-.5' }]],
    close: [['path', { d: 'm6 6 12 12M18 6 6 18' }]],
  };

  function createIcon(name, className){
    const icon = document.createElementNS(SVG_NS, 'svg');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('aria-hidden', 'true');
    icon.setAttribute('focusable', 'false');
    icon.classList.add('icon-svg');
    if(className) icon.classList.add(className);
    (ICONS[name] || []).forEach(([tag, attributes])=>{
      const shape = document.createElementNS(SVG_NS, tag);
      Object.entries(attributes).forEach(([key, value])=>shape.setAttribute(key, value));
      icon.appendChild(shape);
    });
    return icon;
  }
  window.RoomSyncIcons = { create: createIcon };
  window.RoomSyncSkeletons = {
    tableRows(count, columns) {
      const rows = Math.max(1, Math.min(12, Number(count) || 1));
      const cells = Math.max(1, Math.min(10, Number(columns) || 1));
      return Array.from({ length: rows }, (_, row) =>
        `<tr aria-hidden="true">${Array.from({ length: cells }, (_, column) =>
          `<td><span class="skeleton skeleton-line" style="width:${column === 0 ? 72 : 48 + ((row + column) % 3) * 16}%"></span></td>`
        ).join('')}</tr>`
      ).join('');
    },
    cards(count) {
      const cards = Math.max(1, Math.min(12, Number(count) || 1));
      return Array.from({ length: cards }, (_, index) =>
        `<article class="card skeleton-card" aria-hidden="true">
          <span class="skeleton skeleton-line" style="width:${58 + (index % 3) * 9}%"></span>
          <span class="skeleton skeleton-line" style="width:42%"></span>
          <span class="skeleton skeleton-line" style="width:76%"></span>
          <span class="skeleton skeleton-line" style="width:54%"></span>
        </article>`
      ).join('');
    },
    listItems(count) {
      const items = Math.max(1, Math.min(10, Number(count) || 1));
      return Array.from({ length: items }, (_, index) =>
        `<li aria-hidden="true"><span class="skeleton skeleton-line" style="width:${58 + (index % 3) * 12}%"></span></li>`
      ).join('');
    },
    stat() {
      return '<span class="skeleton skeleton-stat" aria-hidden="true"></span>';
    },
    lines(count) {
      const lines = Math.max(1, Math.min(10, Number(count) || 1));
      return Array.from({ length: lines }, (_, index) =>
        `<span class="skeleton skeleton-line" style="width:${54 + (index % 3) * 14}%"></span>`
      ).join('');
    },
  };

  const COMMENT_MARKERS = {
    header: 'header injected',
    sidebar: 'sidebar injected',
    footer: 'footer injected',
    modals: 'modals injected'
  };

  async function loadHtml(url){
    try{
      const res = await fetch(url);
      if(!res.ok) throw new Error('HTTP ' + res.status);
      return await res.text();
    }catch(e){
      console.warn('[components] Failed to load', url, e);
      return null;
    }
  }

  function findMarker(root, markerText){
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
    let n;
    while((n = tw.nextNode())){
      if(n.nodeValue && n.nodeValue.trim() === markerText) return n;
    }
    return null;
  }

  function injectAtMarker(root, markerText, html){
    if(!html) return false;
    const marker = findMarker(root, markerText);
    if(!marker){
      console.debug('[components] Marker not found:', markerText);
      return false;
    }
    const tpl = document.createElement('template');
    tpl.innerHTML = html.trim();
    const frag = tpl.content;
    marker.parentNode.replaceChild(frag, marker);
    return true;
  }

  function setActiveNavLinks(){
    const current = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    document.querySelectorAll('.topnav a, .sidebar a, .landing-nav a').forEach(a=>{
      if(a.classList.contains('btn') || a.hasAttribute('data-logout') || a.classList.contains('nav-user-pill')) return;
      const href = a.getAttribute('href');
      if(!href || href.startsWith('#')) return;
      const page = href.split('/').pop().split('#')[0].split('?')[0].toLowerCase();
      if(page === current){
        a.classList.add('active');
        a.setAttribute('aria-current', 'page');
      }
    });
  }

  function setupSidebarToggle(){
    const headerInner = document.querySelector('.header-inner');
    const sidebar = document.getElementById('sidebar');
    if(!sidebar || !headerInner) return;
    if(document.querySelector('.nav-toggle')) return;

    let backdrop = document.querySelector('.sidebar-backdrop');
    if(!backdrop){
      backdrop = document.createElement('div');
      backdrop.className = 'sidebar-backdrop';
      backdrop.setAttribute('aria-hidden', 'true');
      document.body.appendChild(backdrop);
    }

    const toggle = document.createElement('button');
    toggle.className = 'nav-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-label','Toggle navigation');
    toggle.setAttribute('aria-controls','sidebar');
    toggle.setAttribute('aria-expanded','false');
    toggle.appendChild(createIcon('menu'));

    function setOpen(open){
      sidebar.classList.toggle('open', open);
      backdrop.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    }

    toggle.addEventListener('click', (e)=>{
      e.stopPropagation();
      const open = sidebar.classList.contains('open');
      setOpen(!open);
    });

    backdrop.addEventListener('click', ()=> setOpen(false));

    sidebar.querySelectorAll('a').forEach(a=>{
      a.addEventListener('click', ()=> setOpen(false));
    });

    document.addEventListener('keydown', e=>{
      if(e.key === 'Escape' && sidebar.classList.contains('open')){
        setOpen(false);
      }
    });

    headerInner.insertBefore(toggle, headerInner.firstChild);
  }

  function applyIcons(){
    document.querySelectorAll('.nav-toggle').forEach(button=>{
      button.replaceChildren(createIcon('menu'));
    });
    document.querySelectorAll('.sidebar-user-avatar').forEach(avatar=>{
      avatar.replaceChildren(createIcon('user'));
    });
    const navIcons = {
      'dashboard.html': 'dashboard',
      'rooms.html': 'rooms',
      'labs.html': 'labs',
      'calendar.html': 'calendar',
      'reservation.html': 'reservation',
      'my-reservations.html': 'list',
      'reports.html': 'report',
      'admin.html': 'admin',
      'profile.html': 'user',
    };
    document.querySelectorAll('.sidebar a').forEach(link=>{
      const iconName = link.hasAttribute('data-logout')
        ? 'logout'
        : navIcons[(link.getAttribute('href') || '').split('/').pop().toLowerCase()];
      if(!iconName || link.querySelector('.nav-icon')) return;
      const wrapper = document.createElement('span');
      wrapper.className = 'nav-icon';
      wrapper.appendChild(createIcon(iconName));
      link.prepend(wrapper);
    });
  }

  function applyAuthToHeader(){
    if (window.Auth) window.Auth.renderNavigation();
  }

  document.addEventListener('DOMContentLoaded', async ()=>{
    const root = document.getElementById('app') || document.body;
    const base = '../components/';

    const [headerHtml, sidebarHtml, footerHtml, modalHtml] = await Promise.all([
      loadHtml(base + 'header.html'),
      loadHtml(base + 'sidebar.html'),
      loadHtml(base + 'footer.html'),
      loadHtml(base + 'modals/reserve-modal.html')
    ]);

    injectAtMarker(root, COMMENT_MARKERS.header, headerHtml);
    injectAtMarker(root, COMMENT_MARKERS.sidebar, sidebarHtml);
    injectAtMarker(root, COMMENT_MARKERS.footer, footerHtml);
    injectAtMarker(root, COMMENT_MARKERS.modals, modalHtml);

    applyIcons();
    setActiveNavLinks();
    setupSidebarToggle();
    applyAuthToHeader();
    document.dispatchEvent(new CustomEvent('roomsync:components-ready'));
  });

  /* Global modal helpers (exposed for inline handlers) */
  function openModal(id){
    const m = document.getElementById(id);
    if(!m) return;
    m.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
  }
  function closeModal(id){
    const m = document.getElementById(id);
    if(!m) return;
    m.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
  }

  document.addEventListener('keydown', e=>{
    if(e.key !== 'Escape') return;
    document.querySelectorAll('.modal[aria-hidden="false"]').forEach(m=>{
      closeModal(m.id);
    });
  });

  document.addEventListener('click', e=>{
    if(e.target.matches('[data-dismiss]')){
      const id = e.target.getAttribute('data-dismiss');
      closeModal(id);
    }
    if(e.target.classList && e.target.classList.contains('modal')){
      const panel = e.target.querySelector('.modal-panel');
      if(panel && !panel.contains(e.target)) closeModal(e.target.id);
    }
  });

  window.openModal = openModal;
  window.closeModal = closeModal;

  window.openReserveModal = id => {
    openModal('reserve-modal');
    const sel = document.querySelector('#modal-reserve-form select[name="room_id"]');
    if(sel && id) sel.value = String(id);
  };
})();
