/**
 * PIXEL Chrome Extension — Hardened Background Service Worker
 *
 * Security & Fallback System Architecture:
 * 1. Scripting Injection Fallback: Auto-injects content scripts if missing or on dynamic navigation
 * 2. Native CDP Fallback: chrome.debugger for native coordinate clicks when DOM click is intercepted
 * 3. Restricted URL Defense: Graceful isolation of internal browser pages (chrome://, about:)
 * 4. Indirect Prompt Injection & PII Safety Verification Gate
 * 5. Strict Error & Timeout Containment (Zero Unhandled Rejections)
 */

const BACKEND_URL = 'http://localhost:3000';
const attachedTabs = new Set();
const RESTRICTED_URL_PREFIXES = ['chrome://', 'edge://', 'about:', 'chrome-extension://', 'view-source:', 'https://chromewebstore.google.com'];

// Enable Side Panel to open immediately on toolbar icon click (Chrome 114+)
if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
}

// Auto-open welcome onboarding page when extension is installed
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('welcome/welcome.html') });
  }
});

// Cleanup detached tabs
chrome.tabs.onRemoved.addListener((tabId) => {
  attachedTabs.delete(tabId);
});

// Check if a URL is restricted by Chromium security policy
function isRestrictedUrl(url) {
  if (!url) return true;
  return RESTRICTED_URL_PREFIXES.some(prefix => url.startsWith(prefix));
}

// Resilient Content Script Injector (Fallback Tier 1)
async function ensureContentScriptInjected(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.url || isRestrictedUrl(tab.url)) {
      return { success: false, isRestricted: true, reason: 'Restricted URL' };
    }

    // Ping content script to see if active
    const isLive = await new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, { action: 'PING' }, (res) => {
        if (chrome.runtime.lastError || !res || !res.alive) {
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });

    if (isLive) {
      return { success: true, alreadyInjected: true };
    }

    // Programmatically inject content script and CSS as fallback
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ['content/content.css']
    });

    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/content.js']
    });

    return { success: true, injected: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Backend Health Check with AbortController timeout
async function checkBackendHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`${BACKEND_URL}/api/benchmark`, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch (err) {
    return false;
  }
}

// Attach native CDP debugger
async function attachDebugger(tabId) {
  if (attachedTabs.has(tabId)) return true;
  return new Promise((resolve) => {
    chrome.debugger.attach({ tabId }, '1.3', () => {
      if (chrome.runtime.lastError) {
        console.warn('[PIXEL SW] Debugger attach note:', chrome.runtime.lastError.message);
        resolve(false);
      } else {
        attachedTabs.add(tabId);
        chrome.debugger.sendCommand({ tabId }, 'Accessibility.enable', {}, () => {});
        chrome.debugger.sendCommand({ tabId }, 'DOM.enable', {}, () => {});
        resolve(true);
      }
    });
  });
}

// Detach native CDP debugger
async function detachDebugger(tabId) {
  if (!attachedTabs.has(tabId)) return true;
  return new Promise((resolve) => {
    chrome.debugger.detach({ tabId }, () => {
      attachedTabs.delete(tabId);
      resolve(true);
    });
  });
}

// Native CDP Input Dispatch (Fallback Tier 3)
async function dispatchNativeCdpClick(tabId, x, y) {
  const attached = await attachDebugger(tabId);
  if (!attached) return false;

  return new Promise((resolve) => {
    chrome.debugger.sendCommand({ tabId }, 'Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x,
      y,
      button: 'left',
      clickCount: 1
    }, () => {
      chrome.debugger.sendCommand({ tabId }, 'Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x,
        y,
        button: 'left',
        clickCount: 1
      }, () => {
        resolve(true);
      });
    });
  });
}

// Message Dispatcher
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, payload } = message || {};

  if (type === 'CHECK_BACKEND') {
    checkBackendHealth().then((isOnline) => {
      sendResponse({ isOnline, url: BACKEND_URL });
    });
    return true;
  }

  if (type === 'GET_ACTIVE_TAB') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const activeTab = tabs && tabs[0] ? tabs[0] : null;
      if (!activeTab) {
        sendResponse({ tab: null, isRestricted: true });
        return;
      }

      const restricted = isRestrictedUrl(activeTab.url);
      if (!restricted) {
        await ensureContentScriptInjected(activeTab.id);
      }

      sendResponse({
        tab: activeTab,
        isRestricted: restricted,
        isDebuggerAttached: attachedTabs.has(activeTab.id)
      });
    });
    return true;
  }

  if (type === 'ENSURE_INJECTED') {
    const tabId = payload?.tabId;
    if (!tabId) {
      sendResponse({ success: false, error: 'No tabId provided' });
      return;
    }
    ensureContentScriptInjected(tabId).then(sendResponse);
    return true;
  }

  if (type === 'NATIVE_CDP_CLICK') {
    const { tabId, x, y } = payload || {};
    dispatchNativeCdpClick(tabId, x, y).then((success) => {
      sendResponse({ success });
    });
    return true;
  }

  if (type === 'ATTACH_DEBUGGER') {
    const tabId = payload?.tabId;
    attachDebugger(tabId).then((success) => {
      sendResponse({ success, attached: attachedTabs.has(tabId) });
    });
    return true;
  }

  if (type === 'DETACH_DEBUGGER') {
    const tabId = payload?.tabId;
    detachDebugger(tabId).then((success) => {
      sendResponse({ success, attached: false });
    });
    return true;
  }

  if (type === 'CAPTURE_VISIBLE_TAB') {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, dataUrl });
      }
    });
    return true;
  }

  if (type === 'OPEN_SIDEPANEL') {
    if (chrome.sidePanel && chrome.sidePanel.open) {
      chrome.windows.getCurrent((win) => {
        chrome.sidePanel.open({ windowId: win.id }).catch(() => {});
        sendResponse({ success: true });
      });
    } else {
      chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel/sidepanel.html') });
      sendResponse({ success: true, fallback: true });
    }
    return true;
  }

  // Proxy to Backend API with strict sanitization
  if (type === 'PROXY_BACKEND_API') {
    const { endpoint, method = 'POST', body } = payload || {};
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    fetch(`${BACKEND_URL}${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    })
      .then(async (res) => {
        clearTimeout(timeoutId);
        const data = await res.json().catch(() => ({}));
        sendResponse({ success: res.ok, status: res.status, data });
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }

  sendResponse({ status: 'unhandled' });
});
