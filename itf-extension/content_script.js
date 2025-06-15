// --- Global State ---
let isFeatureEnabled = false;
let ctrlPressed = false;
let altPressed = false;
let lastHoveredElement = null; // The DOM element currently highlighted
const HIGHLIGHT_CLASS = 'itf-highlight';

let cardOrder = 0;

// --- Initialization ---

// 1. Load initial state from storage
chrome.storage.sync.get(['isFeatureEnabled'], (result) => {
    isFeatureEnabled = !!result.isFeatureEnabled;
});

// 2. Listen for state changes from the popup
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.isFeatureEnabled) {
        isFeatureEnabled = !!changes.isFeatureEnabled.newValue;
        // If the feature is disabled, remove any existing highlight
        if (!isFeatureEnabled) {
            removeHighlight();
        }
    }
});

// --- Event Listeners ---

document.addEventListener('keydown', (e) => {
    if (!isFeatureEnabled) return;
    
    // Check if the key is one of our modifiers
    const isModifier = e.key === 'Control' || e.key === 'Alt';
    if (!isModifier) return;

    // To prevent flicker when holding down the key
    if ((e.ctrlKey && ctrlPressed) || (e.altKey && altPressed)) return;
    
    ctrlPressed = e.ctrlKey;
    altPressed = e.altKey;
}, true);

document.addEventListener('keyup', (e) => {
    // If the feature is disabled, or if the released key isn't a modifier, do nothing
    if (!isFeatureEnabled || (e.key !== 'Control' && e.key !== 'Alt')) return;
    
    ctrlPressed = false;
    altPressed = false;
    removeHighlight();
}, true);

// Use mousemove to detect where the cursor is and highlight text
document.addEventListener('mousemove', (e) => {
    if (!isFeatureEnabled || (!ctrlPressed && !altPressed)) {
        return;
    }
    handleHighlight(e);
}, true);

// Listen for clicks on highlighted elements to trigger translation
document.addEventListener('click', (e) => {
    if (!isFeatureEnabled || (!ctrlPressed && !altPressed)) return;

    const target = e.target;
    if (target && target.classList.contains(HIGHLIGHT_CLASS)) {
        e.preventDefault();
        e.stopPropagation();
        handleTranslationTrigger(target);
    }
}, true); // Use capture phase to catch the event early


// --- Core Logic ---

function handleHighlight(e) {
    // Find the element under the cursor
    let target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target) {
        removeHighlight();
        return;
    }
    
    // Do not highlight our own UI
    if (target.closest('[data-itf-card]') || target.classList.contains(HIGHLIGHT_CLASS)) {
        return;
    }

    // This is a simple heuristic. It works best on elements that are direct text containers.
    // A more complex implementation would be needed for deeply nested or complex structures.
    if (target.childNodes.length === 1 && target.childNodes[0].nodeType === Node.TEXT_NODE) {
        if (target === lastHoveredElement) return; // Already highlighted
        
        removeHighlight(); // Clear previous highlight
        
        const text = target.textContent.trim();
        if (text) {
             target.classList.add(HIGHLIGHT_CLASS);
             lastHoveredElement = target;
        }
    } else {
        removeHighlight();
    }
}

function removeHighlight() {
    if (lastHoveredElement) {
        lastHoveredElement.classList.remove(HIGHLIGHT_CLASS);
        lastHoveredElement = null;
    }
}

function handleTranslationTrigger(target) {
    const text = target.textContent.trim();
    if (!text) return;
    
    let payload;
    // We get the whole sentence as context for both word and sentence translation
    // This simplifies the logic compared to the previous Selection-based method
    const context = target.parentElement.textContent.trim() || text;

    if (ctrlPressed) { // Word translation
        // A simple regex to check if it's a single word (or hyphenated)
        if (!/^[a-zA-Z-]+$/.test(text)) {
            console.warn("ITF: Ctrl+Click is for single words. Use Alt+Click for sentences.");
            return;
        }
        payload = { text, context };
    } else { // Sentence translation
        payload = { text, context: text };
    }
    
    const id = `itf-card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    renderFloatingCard({ id, src: text, state: 'loading' });

    chrome.runtime.sendMessage({
        type: 'translate',
        id,
        ...payload
    });

    // We handled the action, so remove the highlight
    removeHighlight();
}


// --- Message Listener from Service Worker ---
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'translationResult' && msg.id) {
    updateFloatingCard(msg);
  }
});


// --- UI Management (Functions from previous implementation remain largely the same) ---

function renderFloatingCard({ id, src, state }) {
  const card = document.createElement('div');
  card.dataset.itfCard = id;
  card.dataset.order = cardOrder++;
  card.dataset.itfState = state;

  card.innerHTML = `
    <div class="itf-close" title="Close">×</div>
    <div class="itf-source-text">${escapeHtml(src)}</div>
    <div class="itf-body">
        <div class="itf-loading-spinner"></div>
    </div>
  `;

  document.body.appendChild(card);
  
  setTimeout(() => {
    card.dataset.itfState = 'done';
    layoutCards();
  }, 10);

  card.querySelector('.itf-close').addEventListener('click', () => {
    removeCard(card);
  });
}

function updateFloatingCard({ id, success, result, error }) {
  const card = document.querySelector(`[data-itf-card="${id}"]`);
  if (!card) return;

  const body = card.querySelector('.itf-body');
  if (success) {
    body.innerHTML = `<div class="itf-result-text">${escapeHtml(result)}</div>`;
  } else {
    body.innerHTML = `<div class="itf-error-text" title="Click to retry">Translation failed: ${escapeHtml(error)}</div>`;
    const errorEl = body.querySelector('.itf-error-text');
    errorEl.addEventListener('click', () => {
      const srcText = card.querySelector('.itf-source-text').textContent;
      body.innerHTML = `<div class="itf-loading-spinner"></div>`;
      chrome.runtime.sendMessage({
        type: 'translate',
        id,
        text: srcText,
        context: srcText,
      });
    });
  }
  layoutCards();
}

function removeCard(card) {
    card.dataset.itfState = 'closing';
    card.style.opacity = '0';
    card.style.transform = 'translateX(20px)';
    setTimeout(() => {
        card.remove();
        layoutCards();
    }, 300);
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }
