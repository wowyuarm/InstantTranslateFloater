document.addEventListener('DOMContentLoaded', () => {
    const featureToggle = document.getElementById('feature-toggle');
    const apiKeyInput = document.getElementById('api-key-input');

    // Load the current state from storage and set UI accordingly
    chrome.storage.sync.get(['isFeatureEnabled', 'apiKey'], (result) => {
        featureToggle.checked = !!result.isFeatureEnabled;
        if (result.apiKey) {
            apiKeyInput.value = result.apiKey;
        }
    });

    // Save feature toggle state
    featureToggle.addEventListener('change', () => {
        const isEnabled = featureToggle.checked;
        chrome.storage.sync.set({ isFeatureEnabled: isEnabled });
    });

    // Save API key whenever it changes
    apiKeyInput.addEventListener('input', () => {
        const key = apiKeyInput.value.trim();
        chrome.storage.sync.set({ apiKey: key });
    });
});
