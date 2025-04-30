// popup.js — control UI and manual export of two separate logs
const toggleButton = document.getElementById('toggleButton');
const statusDiv    = document.getElementById('status');
const exportBtn    = document.getElementById('exportButton');
const msgArea      = document.getElementById('messageArea');

function updateUI(on) {
  statusDiv.textContent = on ? 'Tracking ON' : 'Tracking OFF';
  statusDiv.style.color   = on ? 'green' : 'red';
  toggleButton.textContent = on ? 'Stop Tracking' : 'Start Tracking';
}

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get('isTracking', ({ isTracking }) => updateUI(!!isTracking));
});

toggleButton.addEventListener('click', () => {
  chrome.storage.local.get('isTracking', ({ isTracking }) => {
    const next = !isTracking;
    chrome.storage.local.set({ isTracking: next }, () => updateUI(next));
  });
});

// helper to download JSON array as file
function downloadBlob(dataArray, filename) {
  const blob = new Blob([JSON.stringify(dataArray, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

exportBtn.addEventListener('click', () => {
  chrome.storage.local.get('logData', ({ logData = [] }) => {
    // split into copy/paste vs proctoring events
    const copyPaste = logData.filter(e => e.action === 'copy' || e.action === 'paste');
    const proctor   = logData.filter(e => !(e.action === 'copy' || e.action === 'paste'));
    const ts = new Date().toISOString().replace(/[:.]/g, '-');

    if (copyPaste.length) {
      downloadBlob(copyPaste, `copy-paste-log-${ts}.json`);
    }
    if (proctor.length) {
      downloadBlob(proctor, `proctoring-log-${ts}.json`);
    }
    msgArea.textContent = 'Downloads started';
    setTimeout(() => msgArea.textContent = '', 3000);
  });
});