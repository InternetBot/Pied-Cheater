// content_script.js - capture copy/paste & proctoring events

// Helper to send log messages
function logEvent(action, data) {
  chrome.runtime.sendMessage({ type: 'logEvent', data: Object.assign({ action }, data) });
}

// 1) Copy/Paste
document.addEventListener('copy', e => {
  const txt = document.getSelection().toString();
  logEvent('copy', { text: txt, url: location.href });
}, true);

document.addEventListener('paste', e => {
  const txt = e.clipboardData?.getData('text/plain') || '';
  logEvent('paste', { text: txt, url: location.href });
}, true);

// 2) Typing / Keystroke dynamics
['keydown','keyup'].forEach(evt => {
  document.addEventListener(evt, e => {
    logEvent(evt, { key: e.key, url: location.href });
  }, true);
});

// 3) Mouse movement
let lastTs = Date.now();
document.addEventListener('mousemove', e => {
  const now = Date.now();
  logEvent('mouseMove', { x: e.clientX, y: e.clientY, delta: now - lastTs, url: location.href });
  lastTs = now;
}, true);

// 4) Focus / blur
document.addEventListener('visibilitychange', () => {
  logEvent('focusEvent', { state: document.hidden ? 'blur' : 'focus', url: location.href });
}, true);

// 5) Screen size
function reportScreen() {
  logEvent('screenResize', { resolution: `${screen.width}x${screen.height}`, url: location.href });
}
reportScreen();
window.addEventListener('resize', reportScreen, true);

// 6) External link clicks
document.addEventListener('click', e => {
  const a = e.target.closest('a');
  if (a && a.href && !a.href.includes(location.hostname)) {
    logEvent('externalLink', { href: a.href, url: location.href });
  }
}, true);