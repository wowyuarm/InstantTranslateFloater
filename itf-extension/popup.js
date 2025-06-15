document.addEventListener('DOMContentLoaded', () => {
    const featureToggle = document.getElementById('feature-toggle');

    // Load the current state from storage and set the toggle accordingly.
    chrome.storage.sync.get(['isFeatureEnabled'], (result) => {
        featureToggle.checked = !!result.isFeatureEnabled;
    });

    // When the toggle is changed, save the new state to storage.
    featureToggle.addEventListener('change', () => {
        const isEnabled = featureToggle.checked;
        chrome.storage.sync.set({ isFeatureEnabled: isEnabled });
    });
}); 