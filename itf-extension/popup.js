document.addEventListener('DOMContentLoaded', () => {
    const featureToggle = document.getElementById('feature-toggle');
    const apiKeyInput = document.getElementById('api-key-input');

    // Load the current state from storage and set the UI accordingly.
    chrome.storage.sync.get(['isFeatureEnabled', 'apiKey'], (result) => {
        featureToggle.checked = !!result.isFeatureEnabled;
        if (result.apiKey) {
            apiKeyInput.value = result.apiKey;
        }
    });

    // When the toggle is changed, save the new state to storage.
    featureToggle.addEventListener('change', () => {
        const isEnabled = featureToggle.checked;
        chrome.storage.sync.set({ isFeatureEnabled: isEnabled });
    });

    // When the API key input changes, save the new value.
    apiKeyInput.addEventListener('input', () => {
        const apiKey = apiKeyInput.value.trim();
        chrome.storage.sync.set({ apiKey: apiKey });
    });
});
