
// content.js

let iframe = null;
let isWidgetVisible = false;

function createWidgetFrame() {
  if (iframe) return;

  iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL('widget.html');
  iframe.id = 'matthewlm-widget-iframe';
  iframe.style.position = 'fixed';
  iframe.style.bottom = '0';
  iframe.style.right = '0';
  iframe.style.width = '100%'; // Full width to allow positioning content on the right
  iframe.style.height = '100%'; // Full height
  iframe.style.border = 'none';
  iframe.style.zIndex = '2147483647';
  iframe.style.display = 'block'; // Always block, visibility controlled by content
  iframe.style.backgroundColor = 'transparent';
  iframe.style.pointerEvents = 'none'; // Allow clicking through the iframe container
  
  document.body.appendChild(iframe);
}

function toggleWidget() {
    if (!iframe) {
        createWidgetFrame();
    }
    
    isWidgetVisible = !isWidgetVisible;
    
    // Message the iframe itself to tell it to show/hide its main window
    iframe.contentWindow.postMessage({ type: 'toggle_widget_window', visible: isWidgetVisible }, '*');
}


// --- Message Listener from background script or popup ---

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'toggle_widget') {
        toggleWidget();
        sendResponse({ status: 'widget toggled', visible: isWidgetVisible });
    }
    // Listen for requests from the iframe to get page content
    else if (request.type === 'get_page_content_from_cs') {
        console.log('[MatthewLM CS] Received request for page content.');
        sendResponse({ content: document.body.innerText });
    }
     // Listen for requests from the iframe to highlight contacts
    else if (request.type === 'highlight_contacts_from_cs') {
        clearHighlights();
        const { contacts } = request;
        if (contacts) {
            const contactValues = [...new Set([contacts.email, contacts.phone, contacts.linkedin, contacts.other].filter(Boolean))];
            contactValues.forEach(value => {
                if (typeof value === 'string' && value.includes('linkedin.com/in/')) {
                     // Try to highlight just the profile name as it's more likely to be unique text
                    const profileName = value.split('linkedin.com/in/')[1].replace(/[/]/g, '');
                    highlightText(document.body, profileName);
                }
                highlightText(document.body, value);
            });
        }
    }
    
    return true; // Keep the message channel open for async response
});


// --- Highlighting Logic ---

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightText(container, textToHighlight) {
  if (!textToHighlight || typeof textToHighlight !== 'string' || textToHighlight.trim().length < 4) {
    return;
  }
  
  const treeWalker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode: function (node) {
      const parentTag = node.parentElement.tagName.toLowerCase();
      if (parentTag === 'script' || parentTag === 'style' || parentTag === 'title' || node.parentElement.closest('#matthewlm-widget-iframe')) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes = [];
  while (treeWalker.nextNode()) {
    if (treeWalker.currentNode.nodeValue.includes(textToHighlight)) {
       nodes.push(treeWalker.currentNode);
    }
  }

  const regex = new RegExp(`(${escapeRegExp(textToHighlight)})`, 'gi');

  for (const node of nodes) {
    if (node.parentElement && node.parentElement.classList.contains('matthewlm-highlight')) {
        continue;
    }
    const parts = node.nodeValue.split(regex);
    if (parts.length > 1) {
      const fragment = document.createDocumentFragment();
      for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 1 && parts[i]) {
          const span = document.createElement('span');
          span.textContent = parts[i];
          span.className = 'matthewlm-highlight';
          fragment.appendChild(span);
        } else if (parts[i]) {
          fragment.appendChild(document.createTextNode(parts[i]));
        }
      }
      if(node.parentNode) {
        node.parentNode.replaceChild(fragment, node);
      }
    }
  }
}

function clearHighlights() {
    const highlights = document.querySelectorAll('.matthewlm-highlight');
    highlights.forEach(highlightNode => {
        const parent = highlightNode.parentNode;
        if (parent) {
            parent.replaceChild(document.createTextNode(highlightNode.textContent), highlightNode);
            parent.normalize();
        }
    });
}

// Initial setup
createWidgetFrame();
