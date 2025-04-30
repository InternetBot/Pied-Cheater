// background.js - Copy/Paste & Proctoring Logger (Manifest V3)

// Inject content_script.js into existing tabs on install/startup
function injectIntoExistingTabs() {
  chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] }, (tabs) => {
    tabs.forEach(tab => {
      if (tab.id) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true },
          files: ['content_script.js']
        }, () => {
          if (chrome.runtime.lastError) {
            console.warn('Injection failed on tab', tab.id, chrome.runtime.lastError.message);
          }
        });
      }
    });
  });
}

// Initialize storage and inject on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ isTracking: false, logData: [] }, () => {
    console.log('Logger initialized. Tracking OFF.');
  });
  injectIntoExistingTabs();
});

// Ensure storage keys and inject on startup
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(['isTracking','logData'], (res) => {
    if (typeof res.isTracking === 'undefined') chrome.storage.local.set({ isTracking: false });
    if (typeof res.logData     === 'undefined') chrome.storage.local.set({ logData: [] });
    console.log(`Startup: tracking=${res.isTracking}`);
  });
  injectIntoExistingTabs();
});

// Generic helper: log one entry
function logToStorage(entry) {
  chrome.storage.local.get('logData', ({ logData=[] }) => {
    logData.push(entry);
    if (logData.length > 20000) logData.shift();
    chrome.storage.local.set({ logData });
  });
}

// Listen for copy/paste and proctoring messages
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'logEvent') {
    const now = Date.now();
    const entry = Object.assign({}, msg.data, {
      isoTime:   new Date(now).toISOString(),
      timestamp: now,
      domain:    msg.data.url ? new URL(msg.data.url).hostname : '',
      tabId:     sender.tab?.id || null,
      windowId:  sender.tab?.windowId || null
    });
    logToStorage(entry);
    sendResponse({ status: 'ok' });
    return true;
  }

  // Manual export via message
  if (msg.type === 'exportData') {
    chrome.storage.local.get('logData', ({ logData }) => {
      if (logData.length) {
        const dataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logData, null,2));
        chrome.downloads.download({
          url:    dataUrl,
          filename: `copy-paste-log-${new Date().toISOString().replace(/[:.]/g,'-')}.json`,
          saveAs: true
        });
        sendResponse({ exported: true });
      } else {
        sendResponse({ exported: false });
      }
    });
    return true;
  }
});

// Tab switch logging
ochrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  chrome.tabs.get(tabId, tab => {
    const ts = Date.now();
    logToStorage({
      action:    'tabSwitch',
      text:      '',
      url:       tab.url || '',
      domain:    tab.url ? new URL(tab.url).hostname : '',
      timestamp: ts,
      isoTime:   new Date(ts).toISOString(),
      tabId,
      windowId
    });
  });
});

// Idle state logging
chrome.idle.onStateChanged.addListener(state => {
  const ts = Date.now();
  logToStorage({
    action:    'idleState',
    text:      state,
    url:       '',
    domain:    '',
    timestamp: ts,
    isoTime:   new Date(ts).toISOString(),
    tabId:     null,
    windowId:  null
  });
});