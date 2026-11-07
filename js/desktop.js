/* PIN Trainer — input dari keyboard fisik (aktif di semua mode)
   - Angka 0-9 (baris atas maupun numpad) : isi PIN
   - Enter                               : simpan PIN yang sedang diketik
   - Esc / Backspace / Delete            : reset
   Tampilan deretan angka di mode desktop menyala sesuai tombol yang ditekan.
*/
(function () {
  'use strict';

  const T = window.PinTrainer;
  if (!T) return;

  const keyEls = {};
  document.querySelectorAll('#padDesktop [data-key]').forEach(function (n) {
    keyEls[n.dataset.key] = n;
  });

  const held = new Map(); // e.code -> angka yang sedang ditahan

  function digitOf(e) {
    if (/^[0-9]$/.test(e.key)) return e.key;
    const m = /^Digit([0-9])$/.exec(e.code || ''); // mis. Shift ditekan / layout AZERTY
    return m ? m[1] : null;
  }

  function isInteractive(target) {
    return target instanceof Element &&
      !!target.closest('button, a, input, textarea, select, [contenteditable="true"]');
  }

  function light(digit, on) {
    if (keyEls[digit]) keyEls[digit].classList.toggle('is-down', on);
  }

  window.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return; // biarkan shortcut browser

    const digit = digitOf(e);
    if (digit !== null) {
      e.preventDefault();
      if (e.repeat) return; // tahan tombol tidak dihitung berulang
      held.set(e.code, digit);
      light(digit, true);
      T.press(digit, T.stamp(e));
      return;
    }

    if (e.key === 'Enter') {
      if (isInteractive(e.target)) return; // biar tombol yang sedang fokus bekerja normal
      e.preventDefault();
      if (!e.repeat) T.enter();
    } else if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      if (!e.repeat) T.reset();
    }
  });

  window.addEventListener('keyup', function (e) {
    const digit = held.get(e.code);
    if (digit === undefined) return;
    held.delete(e.code);
    let stillHeld = false;
    held.forEach(function (d) { if (d === digit) stillHeld = true; });
    if (!stillHeld) light(digit, false);
  });

  window.addEventListener('blur', function () {
    held.clear();
    Object.keys(keyEls).forEach(function (d) { light(d, false); });
  });
})();
