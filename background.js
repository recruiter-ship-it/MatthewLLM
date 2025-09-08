// Listen for when the user clicks on the extension's action icon
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, { action: 'toggleWidget' });
  }
});

// Relay messages from the widget (iframe) to the content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Check if the message is from our extension's iframe
  if (sender.origin && (new URL(sender.origin)).protocol === 'chrome-extension:') {
    if (request.target === 'content_script') {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].id) {
          // Forward the message to the content script of the active tab
          chrome.tabs.sendMessage(tabs[0].id, request, (response) => {
            // Send the response from the content script back to the widget
            sendResponse(response);
          });
        }
      });
      // Return true to indicate that we will send a response asynchronously
      return true;
    }
  }
});
