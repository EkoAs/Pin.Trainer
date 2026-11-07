/* PIN Trainer — input sentuh untuk numpad (mode mobile)
   Memakai pointerdown (bukan click) supaya tidak ada jeda 300ms dan
   timestamp-nya akurat. Beberapa jari sekaligus didukung.
*/
(function () {
  'use strict';

  const T = window.PinTrainer;
  const pad = document.getElementById('padMobile');
  if (!T || !pad) return;

  const active = new Map(); // pointerId -> tombol yang sedang ditekan

  function run(btn, ts) {
    const key = btn.dataset.key;
    if (key === 'enter') T.enter();
    else if (key === 'reset') T.reset();
    else T.press(key, ts);
  }

  pad.addEventListener('pointerdown', function (e) {
    const btn = e.target.closest('button[data-key]');
    if (!btn || (e.pointerType === 'mouse' && e.button !== 0)) return;

    e.preventDefault();
    active.set(e.pointerId, btn);
    btn.classList.add('is-down');
    run(btn, T.stamp(e));

    if (navigator.vibrate) navigator.vibrate(6); // getar singkat (jika didukung)
  });

  function release(e) {
    const btn = active.get(e.pointerId);
    if (!btn) return;
    active.delete(e.pointerId);
    btn.classList.remove('is-down');
  }
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);

  // Aktivasi lewat keyboard (Tab + Enter/Spasi) => click dengan detail === 0
  pad.addEventListener('click', function (e) {
    const btn = e.target.closest('button[data-key]');
    if (btn && e.detail === 0) run(btn);
  });

  // Cegah menu tekan-lama pada tombol
  pad.addEventListener('contextmenu', function (e) { e.preventDefault(); });
})();
