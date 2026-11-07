/* PIN Trainer — logika inti (dipakai mode mobile & desktop)
   - Maksimal 6 angka; begitu angka ke-6 masuk, PIN disimpan ke riwayat lalu otomatis di-reset.
   - Timer mulai saat angka pertama ditekan, berhenti di angka terakhir (akurasi milidetik).
   - Riwayat disimpan di localStorage; yang terbaru ada di paling bawah.
*/
(function () {
  'use strict';

  const MAX_DIGITS = 6;
  const HISTORY_LIMIT = 50;
  const STORAGE_KEY = 'pin-trainer:history:v1';

  const el = {
    slots: Array.from(document.querySelectorAll('#slots .slot')),
    timer: document.getElementById('timer'),
    timerValue: document.getElementById('timerValue'),
    timerUnit: document.getElementById('timerUnit'),
    history: document.getElementById('history'),
    list: document.getElementById('historyList'),
    empty: document.getElementById('historyEmpty'),
    clear: document.getElementById('clearHistory')
  };

  const state = {
    digits: [],
    startAt: 0,   // performance.now() saat angka pertama ditekan
    lastAt: 0,    // performance.now() saat angka terakhir ditekan
    raf: 0
  };

  let history = loadHistory();

  /* ---------------------------------------------------------
     Waktu
     --------------------------------------------------------- */

  // Pakai timestamp asli dari event (lebih akurat daripada saat handler jalan).
  function stamp(e) {
    const now = performance.now();
    const t = e && typeof e.timeStamp === 'number' ? e.timeStamp : now;
    return t > 0 && Math.abs(now - t) < 1000 ? t : now;
  }

  function formatTime(ms) {
    ms = Math.max(0, Math.floor(ms));
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const millis = ms % 1000;
    const head = minutes ? minutes + ':' + String(seconds).padStart(2, '0') : String(seconds);
    return { text: head + '.' + String(millis).padStart(3, '0'), unit: minutes ? 'menit' : 'detik' };
  }

  function agoText(at) {
    const s = Math.max(0, Math.floor((Date.now() - at) / 1000));
    if (s < 5) return 'baru saja';
    if (s < 60) return s + ' detik yang lalu';
    const m = Math.floor(s / 60);
    if (m < 60) return m + ' menit yang lalu';
    const h = Math.floor(m / 60);
    if (h < 24) return h + ' jam yang lalu';
    return Math.floor(h / 24) + ' hari yang lalu';
  }

  /* ---------------------------------------------------------
     Render
     --------------------------------------------------------- */

  function renderSlots() {
    el.slots.forEach(function (slot, i) {
      const d = state.digits[i];
      slot.textContent = d === undefined ? '' : d;
      slot.classList.toggle('is-filled', d !== undefined);
    });
  }

  function renderTimer(ms, mode) {
    const t = formatTime(ms);
    el.timerValue.textContent = t.text;
    el.timerUnit.textContent = t.unit;
    el.timer.classList.toggle('is-idle', mode === 'idle');
    el.timer.classList.toggle('is-running', mode === 'running');
    el.timer.classList.toggle('is-done', mode === 'done');
  }

  function renderHistory(flashLast) {
    el.list.textContent = '';
    const frag = document.createDocumentFragment();

    history.forEach(function (h, i) {
      const li = document.createElement('li');
      li.className = 'hist-item' + (flashLast && i === history.length - 1 ? ' is-new' : '');

      const pin = document.createElement('span');
      pin.className = 'hist-pin';
      pin.textContent = h.pin.split('').join(' ');

      const ago = document.createElement('span');
      ago.className = 'hist-ago';
      ago.dataset.at = String(h.at);
      ago.textContent = '(' + agoText(h.at) + ')';

      const dur = document.createElement('span');
      dur.className = 'hist-dur';
      const t = formatTime(h.ms);
      dur.textContent = '(' + t.text + ' ' + t.unit + ')';

      li.append(pin, ago, dur);
      frag.appendChild(li);
    });

    el.list.appendChild(frag);
    el.empty.hidden = history.length > 0;
    el.history.scrollTop = el.history.scrollHeight;
  }

  function refreshAgo() {
    el.list.querySelectorAll('.hist-ago').forEach(function (node) {
      node.textContent = '(' + agoText(Number(node.dataset.at)) + ')';
    });
  }

  /* ---------------------------------------------------------
     Timer loop (requestAnimationFrame, waktu dihitung dari performance.now)
     --------------------------------------------------------- */

  function tick() {
    renderTimer(performance.now() - state.startAt, 'running');
    state.raf = requestAnimationFrame(tick);
  }

  function stopLoop() {
    cancelAnimationFrame(state.raf);
    state.raf = 0;
  }

  /* ---------------------------------------------------------
     Aksi
     --------------------------------------------------------- */

  function press(digit, ts) {
    digit = String(digit);
    if (!/^[0-9]$/.test(digit) || state.digits.length >= MAX_DIGITS) return;

    const t = typeof ts === 'number' ? ts : performance.now();

    if (state.digits.length === 0) {
      state.startAt = t;      // timer mulai di angka pertama
      stopLoop();
      tick();
    }

    state.digits.push(digit);
    state.lastAt = t;
    renderSlots();

    if (state.digits.length === MAX_DIGITS) commit(); // 6 angka => simpan & reset otomatis
  }

  // Simpan PIN yang sedang diketik ke riwayat, lalu kosongkan input.
  // (dipanggil otomatis di angka ke-6, atau manual lewat tombol Enter)
  function commit() {
    if (state.digits.length === 0) return;

    stopLoop();
    const ms = Math.max(0, state.lastAt - state.startAt);

    history.push({ pin: state.digits.join(''), at: Date.now(), ms: ms });
    if (history.length > HISTORY_LIMIT) history = history.slice(-HISTORY_LIMIT);
    saveHistory();

    state.digits = [];
    state.startAt = 0;
    renderSlots();
    renderTimer(ms, 'done');
    renderHistory(true);
  }

  // Kosongkan input tanpa menyimpan ke riwayat.
  function reset() {
    stopLoop();
    state.digits = [];
    state.startAt = 0;
    renderSlots();
    renderTimer(0, 'idle');
  }

  function clearHistory() {
    history = [];
    saveHistory();
    renderHistory(false);
  }

  /* ---------------------------------------------------------
     Penyimpanan
     --------------------------------------------------------- */

  function loadHistory() {
    try {
      const arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (!Array.isArray(arr)) return [];
      return arr
        .filter(function (h) {
          return h && /^[0-9]{1,6}$/.test(h.pin) && isFinite(h.at) && isFinite(h.ms);
        })
        .slice(-HISTORY_LIMIT);
    } catch (err) {
      return [];
    }
  }

  function saveHistory() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (err) { /* storage tidak tersedia: abaikan */ }
  }

  /* ---------------------------------------------------------
     Init
     --------------------------------------------------------- */

  el.clear.addEventListener('click', function () {
    clearHistory();
    el.clear.blur(); // supaya Enter berikutnya tidak menekan tombol ini lagi
  });

  // Ganti mode (mis. layar diputar / jendela diubah ukurannya): mulai bersih.
  document.addEventListener('pintrainer:modechange', reset);

  document.addEventListener('visibilitychange', refreshAgo);
  setInterval(refreshAgo, 1000);

  renderSlots();
  renderTimer(0, 'idle');
  renderHistory(false);

  window.PinTrainer = {
    MAX_DIGITS: MAX_DIGITS,
    press: press,
    enter: commit,
    reset: reset,
    stamp: stamp
  };
})();
