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
    // Numpad
    const np = /^Numpad([0-9])$/.exec(e.code || '');
    if (np) return np[1];
    const m = /^Digit([0-9])$/.exec(e.code || ''); // mis. Shift ditekan / layout AZERTY
    return m ? m[1] : null;
  }

  // Hanya block Enter/Esc jika fokus benar-benar di elemen input teks
  function isTextInput(target) {
    if (!(target instanceof Element)) return false;
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
    if (target.isContentEditable) return true;
    return false;
  }

  function light(digit, on) {
    if (keyEls[digit]) keyEls[digit].classList.toggle('is-down', on);
  }

  // Pastikan fokus tidak terjebak di tombol/link sehingga Enter bisa ditangkap
  function blurIfNeeded() {
    const active = document.activeElement;
    if (active && active !== document.body && !isTextInput(active)) {
      active.blur();
    }
  }

  // Klik mouse pada div.dkey di mode desktop
  const padDesktop = document.getElementById('padDesktop');
  if (padDesktop) {
    padDesktop.addEventListener('pointerdown', function (e) {
      const key = e.target.closest('[data-key]');
      if (!key) return;
      const digit = key.dataset.key;
      if (!/^[0-9]$/.test(digit)) return;
      e.preventDefault();
      light(digit, true);
      T.press(digit, T.stamp(e));
      blurIfNeeded();
    });

    padDesktop.addEventListener('pointerup', function (e) {
      const key = e.target.closest('[data-key]');
      if (!key) return;
      const digit = key.dataset.key;
      if (/^[0-9]$/.test(digit)) light(digit, false);
    });

    padDesktop.addEventListener('pointerleave', function (e) {
      const key = e.target.closest('[data-key]');
      if (!key) return;
      const digit = key.dataset.key;
      if (/^[0-9]$/.test(digit)) light(digit, false);
    }, true);
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
      blurIfNeeded(); // lepas fokus dari button supaya Enter berikutnya tidak ter-block
      return;
    }

    if (e.key === 'Enter') {
      if (isTextInput(e.target)) return; // biar input teks bekerja normal
      e.preventDefault();
      if (!e.repeat) T.enter();
    } else if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'Delete') {
      if (isTextInput(e.target)) return;
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
