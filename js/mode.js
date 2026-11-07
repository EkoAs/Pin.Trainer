/* PIN Trainer — deteksi mode (mobile / desktop)
   Dimuat sinkron di <head> supaya layout benar sejak gambar pertama.
   - mobile : layar sentuh (pointer kasar & tanpa hover) ATAU lebar <= 720px
   - desktop: selain itu (mouse + keyboard fisik)
*/
(function () {
  'use strict';

  var root = document.documentElement;
  var query = '(max-width: 720px), (hover: none) and (pointer: coarse)';
  var mq = window.matchMedia(query);

  function apply() {
    var mode = mq.matches ? 'mobile' : 'desktop';
    if (root.getAttribute('data-mode') === mode) return;
    root.setAttribute('data-mode', mode);
    document.dispatchEvent(new CustomEvent('pintrainer:modechange', { detail: { mode: mode } }));
  }

  apply();

  if (mq.addEventListener) mq.addEventListener('change', apply);
  else if (mq.addListener) mq.addListener(apply);
})();
