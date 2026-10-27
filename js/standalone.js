// Off-Shopify buy flow: the page's own handler posts to /cart/add.js, which only exists on the store.
// This runs first (capture on window) and sends the shopper to the live store's cart instead.
(function () {
  'use strict';
  var STORE = window.QV_STORE;
  var VARIANT = {};
  (window.QV_BUY.variants || []).forEach(function (v) { VARIANT[v.opt] = v.id; });
  var DEFAULT = 'Stealth Black';
  var ON = /0px 0px 0px 2px/;

  function pickedColour() {
    var b = document.querySelectorAll('#shop button[data-dc-tpl="123"]');
    for (var i = 0; i < b.length; i++) {
      if (ON.test(b[i].getAttribute('style') || '')) return b[i].getAttribute('aria-label') || '';
    }
    return '';
  }

  window.addEventListener('click', function (e) {
    var el = e.target && e.target.closest && e.target.closest('#qv-root a, #qv-root button');
    if (!el) return;
    var text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    var cart = /^add to cart$/i.test(text);
    var checkout = /^(pre-book|buy now)$/i.test(text) || (/buy qore/i.test(text) && /vox/i.test(text));
    if (!cart && !checkout) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    var id = VARIANT[pickedColour()] || VARIANT[DEFAULT];
    window.location.href = cart
      ? STORE + '/cart/add?id=' + id + '&quantity=1'
      : STORE + '/cart/' + id + ':1';
  }, true);
})();
