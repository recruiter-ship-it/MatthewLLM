
let widgetFrame = null;
let isWidgetVisible = false;
let currentHighlight = null;

const WIDGET_ID = 'matthew-lm-widget-iframe';
const HIGHLIGHT_ID = 'matthew-lm-highlight-element';

function createWidget() {
    if (document.getElementById(WIDGET_ID)) return;

    widgetFrame = document.createElement('iframe');
    widgetFrame.id = WIDGET_ID;
    widgetFrame.src = chrome.runtime.getURL('widget.html');
    // All styling is now controlled by content.css for better management
    document.body.appendChild(widgetFrame);
}

function toggleWidget() {
    if (!widgetFrame) createWidget();
    
    isWidgetVisible = !isWidgetVisible;

    if (isWidgetVisible) {
        widgetFrame.style.display = 'block'; // Make it part of the layout
        // Use a timeout to allow the 'display' change to be processed before adding the class for transition
        setTimeout(() => {
            widgetFrame.classList.add('visible');
        }, 10);
    } else {
        widgetFrame.classList.remove('visible');
        // Listen for the transition to end before setting display to 'none'
        widgetFrame.addEventListener('transitionend', () => {
            if (!isWidgetVisible) { // Check again in case it was quickly reopened
                 widgetFrame.style.display = 'none';
            }
        }, { once: true });
    }
}

function getPageContent() {
    // Temporarily hide the widget to avoid capturing its own text
    let widgetWasVisible = false;
    if (widgetFrame && widgetFrame.classList.contains('visible')) {
        widgetFrame.style.setProperty('display', 'none', 'important');
        widgetWasVisible = true;
    }

    const mainContent = document.querySelector('main') || document.body;
    const relevantContent = mainContent.innerText;
    
    if (widgetWasVisible) {
        widgetFrame.style.removeProperty('display');
    }

    return relevantContent.substring(0, 15000); // Limit to avoid performance issues
}

function highlightElement(text) {
    removeHighlight(); // Remove previous highlight
    if (!text) return;

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while(node = walker.nextNode()) {
        if (node.nodeValue.includes(text)) {
            const range = document.createRange();
            range.selectNode(node.parentElement);
            const rect = range.getBoundingClientRect();

            currentHighlight = document.createElement('div');
            currentHighlight.id = HIGHLIGHT_ID;
            currentHighlight.style.cssText = `
                position: absolute;
                left: ${window.scrollX + rect.left - 4}px;
                top: ${window.scrollY + rect.top - 4}px;
                width: ${rect.width + 8}px;
                height: ${rect.height + 8}px;
                background-color: rgba(59, 130, 246, 0.2);
                border: 2px solid rgba(59, 130, 246, 0.8);
                border-radius: 4px;
                z-index: 99999990;
                pointer-events: none;
                transition: all 0.2s ease-in-out;
            `;
            document.body.appendChild(currentHighlight);
            node.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return true;
        }
    }
    return false;
}

function removeHighlight() {
    if (currentHighlight) {
        currentHighlight.remove();
        currentHighlight = null;
    }
}

// Listen for messages from the background script or the widget
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleWidget') {
        toggleWidget();
        sendResponse({ success: true });
    } else if (request.action === 'getPageContent') {
        const content = getPageContent();
        sendResponse({ content });
    } else if (request.action === 'highlightElement') {
        const success = highlightElement(request.text);
        sendResponse({ success });
    } else if (request.action === 'removeHighlight') {
        removeHighlight();
        sendResponse({ success: true });
    }
});

// Create the widget frame on initial load, but keep it hidden
createWidget();
      