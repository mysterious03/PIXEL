/**
 * PIXEL ODVPA — Popup Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const openSidepanelBtn = document.getElementById('open-sidepanel-btn');
  const toggleInpageHudBtn = document.getElementById('toggle-inpage-hud-btn');
  const scanPageBtn = document.getElementById('scan-page-btn');
  const backendIndicator = document.getElementById('backend-indicator');

  // Check Studio backend status
  chrome.runtime.sendMessage({ type: 'CHECK_BACKEND' }, (res) => {
    if (res && res.isOnline) {
      backendIndicator.textContent = 'Studio :3000 Active';
      backendIndicator.style.color = '#38bdf8';
    } else {
      backendIndicator.textContent = 'On-Device Standalone';
    }
  });

  // Open side panel dock
  openSidepanelBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' }, (res) => {
      // If direct side panel API opened, close popup
      if (res && res.success) {
        window.close();
      } else {
        // Fallback: alert or guide
        chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel/sidepanel.html') });
        window.close();
      }
    });
  });

  // Toggle in-page HUD
  toggleInpageHudBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'TOGGLE_HUD' }, () => {
          window.close();
        });
      }
    });
  });

  // Scan and show bounding boxes
  scanPageBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'TOGGLE_OVERLAYS' }, () => {
          window.close();
        });
      }
    });
  });
});
