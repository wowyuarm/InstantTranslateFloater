// API key will be retrieved from chrome.storage.sync so users don't have to
// modify the source code. A placeholder value is kept for backward compatibility
// but will be overwritten once the key is saved via the popup.
let API_KEY = 'sk-xxxxxxxxxxxxxxxxxxxxxxxx';
const ENDPOINT = 'https://api.deepseek.com/v1/chat/completions';

// Load API key from storage when the service worker starts
chrome.storage.sync.get(['apiKey'], (result) => {
  if (result.apiKey) {
    API_KEY = result.apiKey;
  }
});

// Update the key if it changes in storage
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.apiKey) {
    API_KEY = changes.apiKey.newValue;
  }
});

// Simple in-memory cache. A more robust solution could use chrome.storage.local.
const cache = new Map(); // K: text, V: { timestamp, result }
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Ensure it's a translation request
  if (request.type !== 'translate') return;

  const { id, text, context } = request;
  if (!text) return;

  // Use an async function to handle the request
  (async () => {
    try {
      const q = context || text; // Use context if available for better accuracy
      const cached = cache.get(q);
      let result;

      if (cached && (Date.now() - cached.timestamp < CACHE_DURATION_MS)) {
        result = cached.result;
      } else {
        result = await translateText(q);
        cache.set(q, { timestamp: Date.now(), result });
      }

      // Send the result back to the content script in the correct tab
      chrome.tabs.sendMessage(sender.tab.id, {
        type: 'translationResult',
        id,
        success: true,
        result
      });
    } catch (error) {
      console.error('ITF Translation Error:', error);
      chrome.tabs.sendMessage(sender.tab.id, {
        type: 'translationResult',
        id,
        success: false,
        error: error.message || 'Unknown error'
      });
    }
  })();

  // Return true to indicate that we will send a response asynchronously.
  return true;
});

/**
 * Fetches translation from the DeepSeek API.
 * @param {string} q The text to translate.
 * @returns {Promise<string>} The translated text.
 */
async function translateText(q) {
  if (!API_KEY || API_KEY.includes('sk-xxxxxxxx')) {
    throw new Error('API key is not set. Please configure it in the extension popup.');
  }

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are a professional, authentic translation engine. Translate the user-provided text to Simplified Chinese. Output only the translated text, without any explanations or extra content. The target language is Simplified Chinese.'
        },
        {
          role: 'user',
          content: q
        }
      ],
      stream: false,
      // Lower temperature is better for translation to be more precise
      temperature: 0.1, 
    })
  });

  if (!response.ok) {
    const errorBody = await response.json();
    const errorMessage = errorBody.error?.message || `HTTP error! status: ${response.status}`;
    throw new Error(errorMessage);
  }

  const json = await response.json();
  const translation = json.choices?.[0]?.message?.content?.trim();

  if (!translation) {
    throw new Error('Invalid API response structure or empty translation.');
  }

  return translation;
}
