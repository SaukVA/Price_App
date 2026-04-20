/**
 * Price Display — app.js
 */

let config    = {};  // App Config
let i18n      = {};  // Active language

const SCAN_TIMEOUT_MS  = 80;
const DISPLAY_TIME_MS  = 8000;
const SUPPORTED_LANGS  = ['es', 'en'];
const FALLBACK_LANG    = 'es';

let scanBuffer     = '';
let scanTimer      = null;
let resetTimer     = null;
let manualModeOpen = false;

// ── Home ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  config    = await loadConfig();
  i18n      = await loadLanguage(config.app?.language);
  applyLanguage();
  applyAppConfig(config.app);
  applyTheme(config.theme);
  applyLogo(config.logo);
  startClock();
  setStateIdle();
  initScanner();
  initManualInput();
});

// ── Configuration ──────────────────────────────────────────
async function loadConfig() {
  try {
    const res = await fetch('config.json');
    if (!res.ok) throw new Error('Cannot load config.json');
    return await res.json();
  } catch (e) {
    console.error('Error loading config:', e);
    return getDefaultConfig();
  }
}

function getDefaultConfig() {
  return {
    app:     { title: 'Price Display', language: 'es', currency_symbol: '€', currency_position: 'after' },
    api:     { base_url: '', endpoint: '/api/prices', timeout_ms: 5000 },
    display: { display_time_ms: 8000 },
    theme:   { primary_color: '#1a1a2e', accent_color: '#e94560', background_color: '#16213e', text_color: '#ffffff' },
    logo:    { enabled: false }
  };
}

// ── Language ────────────────────────────────────────────────
async function loadLanguage(lang) {
  const chosen = SUPPORTED_LANGS.includes(lang) ? lang : FALLBACK_LANG;
  try {
    const res = await fetch(`assets/i18n/${chosen}.json`);
    if (!res.ok) throw new Error(`Cannot load ${chosen}.json`);
    return await res.json();
  } catch (e) {
    console.error('Error loading language file:', e);
    // Si falla, intentar con el fallback
    if (chosen !== FALLBACK_LANG) {
      const fallback = await fetch(`assets/i18n/${FALLBACK_LANG}.json`);
      return await fallback.json();
    }
    return {};
  }
}

function applyLanguage() {
  const lang = config.app?.language || FALLBACK_LANG;
  document.documentElement.setAttribute('lang', lang);

  // Textos estáticos
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (i18n[key] !== undefined) el.textContent = i18n[key];
  });

  // Placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (i18n[key] !== undefined) el.placeholder = i18n[key];
  });

  // Tooltips
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (i18n[key] !== undefined) el.title = i18n[key];
  });
}

// ── App ────────────────────────────────────────────────────
function applyAppConfig(app) {
  if (!app) return;
  if (app.title) {
    document.title = app.title;
    const titleEl = document.getElementById('app-title');
    if (titleEl) titleEl.textContent = app.title;
  }
}

// ── Theme ──────────────────────────────────────────────────
function applyTheme(theme) {
  if (!theme) return;
  const root = document.documentElement;
  if (theme.primary_color)    root.style.setProperty('--primary',    theme.primary_color);
  if (theme.background_color) root.style.setProperty('--background', theme.background_color);
  if (theme.accent_color)     root.style.setProperty('--accent',     theme.accent_color);
  if (theme.text_color)       root.style.setProperty('--text',       theme.text_color);
  if (theme.font_family)      root.style.setProperty('--font',       theme.font_family);
}

// ── Logo ──────────────────────────────────────────────────
function applyLogo(logo) {
  const container = document.getElementById('logo-container');
  if (!container) return;
  if (!logo?.enabled) { container.innerHTML = ''; return; }
  const img = document.createElement('img');
  img.src          = logo.path   || 'assets/img/logo.png';
  img.alt          = config.app?.title || 'Logo';
  img.style.width  = logo.width  || '120px';
  img.style.height = logo.height || 'auto';
  img.onerror = () => { container.innerHTML = ''; console.warn('Logo not found:', img.src); };
  container.innerHTML = '';
  container.appendChild(img);
}

// ── Clock ─────────────────────────────────────────────────
function startClock() {
  const el = document.getElementById('clock');
  if (!el) return;
  const lang   = config.app?.language || FALLBACK_LANG;
  const update = () => {
    el.textContent = new Date().toLocaleTimeString(lang, {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };
  update();
  setInterval(update, 1000);
}

// ── Manual Input ──────────────────────────────────────────
function initManualInput() {
  const title    = document.getElementById('app-title');
  const input    = document.getElementById('manual-input');
  const btnSend  = document.getElementById('manual-submit');
  const btnClose = document.getElementById('manual-cancel');

  title.addEventListener('click', () => openManualInput());
  btnSend.addEventListener('click', () => submitManual());
  btnClose.addEventListener('click', () => closeManualInput());

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter')  { e.stopPropagation(); submitManual(); }
    if (e.key === 'Escape') { e.stopPropagation(); closeManualInput(); }
    e.stopImmediatePropagation();
  });
  input.addEventListener('keyup',    e => e.stopImmediatePropagation());
  input.addEventListener('keypress', e => e.stopImmediatePropagation());
}

function openManualInput() {
  manualModeOpen = true;
  scanBuffer = '';
  clearTimeout(scanTimer);
  clearTimeout(resetTimer);
  document.getElementById('app-title').classList.add('hidden');
  document.getElementById('manual-input-wrapper').classList.remove('hidden');
  const input = document.getElementById('manual-input');
  input.value = '';
  input.focus();
  setStatus('info', i18n.status_manual);
}

function closeManualInput() {
  manualModeOpen = false;
  document.getElementById('manual-input-wrapper').classList.add('hidden');
  document.getElementById('app-title').classList.remove('hidden');
  setStatus('ok', i18n.status_ready);
}

function submitManual() {
  const input = document.getElementById('manual-input');
  const code  = input.value.trim();
  if (!code) return;
  closeManualInput();
  lookupBarcode(code);
}

// ── Scanner ───────────────────────────────────────────────
function initScanner() {
  document.addEventListener('keydown', (e) => {
    if (manualModeOpen) return;
    if (e.key === 'Enter') {
      if (scanBuffer.length > 0) {
        const code = scanBuffer.trim();
        scanBuffer = '';
        clearTimeout(scanTimer);
        lookupBarcode(code);
      }
      return;
    }
    if (e.key.length === 1) {
      scanBuffer += e.key;
      clearTimeout(scanTimer);
      scanTimer = setTimeout(() => {
        if (scanBuffer.length >= 4) {
          const code = scanBuffer.trim();
          scanBuffer = '';
          lookupBarcode(code);
        } else {
          scanBuffer = '';
        }
      }, SCAN_TIMEOUT_MS * 3);
    }
  });
}

// ── API Call ──────────────────────────────────────────────
async function lookupBarcode(barcode) {
  clearTimeout(resetTimer);
  setStateLoading(barcode);

  const base     = config.api?.base_url   ?? '';
  const endpoint = config.api?.endpoint   || '/api/prices';
  const timeout  = config.api?.timeout_ms || 5000;
  const url      = `${base}${endpoint}/${encodeURIComponent(barcode)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (res.status === 404) {
      setStateNotFound(barcode);
    } else if (!res.ok) {
      setStateError(`${i18n.error_server} (${res.status})`);
    } else {
      const item = await res.json();
      setStateResult(item);
    }
  } catch (e) {
    clearTimeout(timer);
    setStateError(e.name === 'AbortError' ? i18n.error_timeout : i18n.error_connection);
  }

  const displayTime = config.display?.display_time_ms || DISPLAY_TIME_MS;
  resetTimer = setTimeout(setStateIdle, displayTime);
}

// ── Price Format ─────────────────────────────────────────
function formatPrice(value) {
  if (value === null || value === undefined) return '—';
  const symbol    = config.app?.currency_symbol   || '€';
  const pos       = config.app?.currency_position || 'after';
  const lang      = config.app?.language          || FALLBACK_LANG;
  const formatted = Number(value).toLocaleString(lang, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return pos === 'before' ? `${symbol} ${formatted}` : `${formatted} ${symbol}`;
}

// ── State ────────────────────────────────────────────────
function setStateIdle() {
  showScreen('screen-idle');
  setStatus('ok', i18n.status_idle);
}

function setStateLoading(barcode) {
  document.getElementById('loading-barcode').textContent = barcode;
  showScreen('screen-loading');
  setStatus('loading', `${i18n.status_loading} ${barcode}…`);
}

function setStateResult(item) {
  document.getElementById('result-name').textContent    = item.name    || item.nombre || '—';
  document.getElementById('result-barcode').textContent = item.barcode || item.codigo || '';
  document.getElementById('result-price').textContent   = formatPrice(item.price ?? item.precio);
  showScreen('screen-result');
  setStatus('ok', `${i18n.status_result} ${item.name || item.nombre || '—'}`);
  startCountdown('countdown-bar');
}

function setStateNotFound(barcode) {
  document.getElementById('notfound-barcode').textContent = barcode;
  showScreen('screen-notfound');
  setStatus('error', `${i18n.status_notfound} ${barcode}`);
  startCountdown('countdown-bar-notfound');
}

function setStateError(msg) {
  document.getElementById('error-msg').textContent = msg;
  showScreen('screen-error');
  setStatus('error', msg);
  startCountdown('countdown-bar-error');
}

// ── Helpers ───────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
}

function setStatus(state, text) {
  const dot   = document.getElementById('status-dot');
  const label = document.getElementById('status-label');
  if (dot)   { dot.className = 'status-dot'; dot.classList.add(state); }
  if (label) label.textContent = text;
}

function startCountdown(barId) {
  const displayTime = config.display?.display_time_ms || DISPLAY_TIME_MS;
  const bar = document.getElementById(barId);
  if (!bar) return;
  bar.style.transition = 'none';
  bar.style.width = '100%';
  bar.getBoundingClientRect();
  bar.style.transition = `width ${displayTime}ms linear`;
  bar.style.width = '0%';
}
