/* ============================================================
   VLIJT Werken-bij — mobiel hamburger-menu (shared)
   Bouwt de hamburger + full-screen overlay en cloont de
   bestaande .nav-links, zodat elke pagina automatisch klopt.
   ============================================================ */
(function () {
  'use strict';
  var nav = document.getElementById('nav') || document.querySelector('.nav');
  if (!nav) return;
  var inner = nav.querySelector('.nav-inner');
  var links = nav.querySelector('.nav-links');
  if (!inner || !links) return;

  // ---- hamburger-knop ----
  var burger = document.createElement('button');
  burger.className = 'nav-burger';
  burger.type = 'button';
  burger.setAttribute('aria-label', 'Menu openen');
  burger.setAttribute('aria-expanded', 'false');
  burger.innerHTML = '<span class="bx"><span></span><span></span></span>';
  inner.appendChild(burger);

  // ---- overlay opbouwen ----
  var overlay = document.createElement('div');
  overlay.className = 'nav-overlay';
  overlay.id = 'nav-overlay';

  var eyebrow = document.createElement('span');
  eyebrow.className = 'nav-overlay-eyebrow';
  eyebrow.textContent = 'Werken bij VLIJT';

  var ul = document.createElement('ul');
  ul.className = 'nav-overlay-links';

  var sourceItems = links.querySelectorAll('li');
  var n = 0;
  sourceItems.forEach(function (li) {
    var srcA = li.querySelector('a');
    if (!srcA) return;
    var isCta = li.classList.contains('nav-cta');
    var outLi = document.createElement('li');
    if (isCta) outLi.className = 'is-cta';
    var a = document.createElement('a');
    a.setAttribute('href', srcA.getAttribute('href'));
    var label = srcA.textContent.trim();
    if (isCta) {
      a.textContent = label;
    } else {
      n++;
      a.innerHTML = '<span class="idx">0' + n + '</span>' + label;
    }
    outLi.appendChild(a);
    ul.appendChild(outLi);
  });

  var foot = document.createElement('div');
  foot.className = 'nav-overlay-foot';
  foot.innerHTML = '<span class="slogan">Lachen is beter leven.</span>' +
                   '<a href="https://www.vlijttandartsen.nl">www.vlijttandartsen.nl</a>';

  overlay.appendChild(eyebrow);
  overlay.appendChild(ul);
  overlay.appendChild(foot);
  document.body.appendChild(overlay);

  // ---- open / dicht ----
  var isOpen = false;
  function open() {
    isOpen = true;
    overlay.classList.add('open');
    nav.classList.add('menu-open');
    document.body.classList.add('menu-locked');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Menu sluiten');
  }
  function close() {
    isOpen = false;
    overlay.classList.remove('open');
    nav.classList.remove('menu-open');
    document.body.classList.remove('menu-locked');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Menu openen');
  }
  function toggle() { isOpen ? close() : open(); }

  burger.addEventListener('click', toggle);

  // sluit bij klik op een link
  ul.addEventListener('click', function (e) {
    if (e.target.closest('a')) close();
  });
  // sluit bij klik op lege overlay-ruimte
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) close();
  });
  // sluit met Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen) close();
  });
  // sluit als we naar desktop-breedte gaan
  window.addEventListener('resize', function () {
    if (isOpen && window.innerWidth > 900) close();
  });
})();
