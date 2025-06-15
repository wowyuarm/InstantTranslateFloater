// --- Global State ---
let isFeatureEnabled = false;
let lastHoveredElement = null; // Not used in CapsLock mode but kept for compatibility
const HIGHLIGHT_CLASS = 'itf-highlight';
const connectors = new Map(); // id -> { line, anchorRect }

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
    if (!isFeatureEnabled || e.key !== 'CapsLock') return;
    e.preventDefault();
    handleCapsLockTrigger();
}, true);

window.addEventListener('scroll', () => {
    connectors.forEach((_, id) => updateConnectorPosition(id));
});


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

function handleCapsLockTrigger() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;

    const text = sel.toString().trim();
    if (!text) return;

    const { fullSentence } = extendToSentence(sel);
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const anchorRect = {
        left: rect.left + window.scrollX,
        top: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height
    };

    const id = `itf-card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    renderFloatingCard({ id, src: text, state: 'loading', anchorRect });

    chrome.runtime.sendMessage({
        type: 'translate',
        id,
        text,
        context: fullSentence
    });

    sel.removeAllRanges();
}

function handleTranslationTrigger(target) {
    const text = target.textContent.trim();
    if (!text) return;

    const context = target.parentElement.textContent.trim() || text;
    const payload = { text, context };
    
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

function renderFloatingCard({ id, src, state, anchorRect }) {
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
    if (anchorRect) {
      createConnector(id, anchorRect);
    }
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

function createConnector(id, anchorRect) {
  const line = document.createElement('div');
  line.className = 'itf-connector';
  line.dataset.connectorFor = id;
  document.body.appendChild(line);
  connectors.set(id, { line, anchorRect });
  updateConnectorPosition(id);
}

function updateConnectorPosition(id) {
  const entry = connectors.get(id);
  if (!entry) return;
  const { line, anchorRect } = entry;
  const card = document.querySelector(`[data-itf-card="${id}"]`);
  if (!card) return;
  const cardRect = card.getBoundingClientRect();
  const startX = anchorRect.left - window.scrollX + anchorRect.width / 2;
  const startY = anchorRect.top - window.scrollY + anchorRect.height / 2;
  const endX = cardRect.left;
  const endY = cardRect.top + cardRect.height / 2;
  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  line.style.top = `${startY}px`;
  line.style.left = `${startX}px`;
  line.style.width = `${length}px`;
  line.style.transformOrigin = '0 0';
  line.style.transform = `rotate(${angle}deg)`;
}

function updateConnectorForCard(id) {
  updateConnectorPosition(id);
}

// Expose for layout manager
window.updateConnectorForCard = updateConnectorForCard;

function removeCard(card) {
    card.dataset.itfState = 'closing';
    card.style.opacity = '0';
    card.style.transform = 'translateX(20px)';
    setTimeout(() => {
        card.remove();
        const id = card.dataset.itfCard;
        const conn = connectors.get(id);
        if (conn) {
            conn.line.remove();
            connectors.delete(id);
        }
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
