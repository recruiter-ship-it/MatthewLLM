
// background.js

// This script handles the browser action (clicking the extension icon).

chrome.action.onClicked.addListener((tab) => {
  // Ensure we have a valid tab with an ID to send a message to.
  if (tab.id) {
    // Send a message to the content script in the active tab.
    // The content script will be responsible for creating and showing/hiding the UI.
    chrome.tabs.sendMessage(tab.id, { type: 'toggle_widget' }, (response) => {
      if (chrome.runtime.lastError) {
        // This error typically means the content script hasn't been injected yet.
        // This can happen on first load, or on special pages like chrome://extensions.
        console.log(`[MatthewLM] Content script not ready yet on tab ${tab.id}, it will be injected automatically by manifest.json. Error: ${chrome.runtime.lastError.message}`);
      } else {
        console.log(`[MatthewLM] Toggle message sent to tab ${tab.id}. Response:`, response);
      }
    });
  }
});
