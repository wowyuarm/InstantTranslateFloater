// Load existing API key
function loadKey() {
    chrome.storage.sync.get(['API_KEY'], (result) => {
        document.getElementById('api-key').value = result.API_KEY || '';
    });
}

// Save API key to storage
function saveKey() {
    const key = document.getElementById('api-key').value.trim();
    chrome.storage.sync.set({ API_KEY: key }, () => {
        const status = document.getElementById('status');
        status.textContent = 'Saved';
        setTimeout(() => status.textContent = '', 1500);
    });
}

document.getElementById('save').addEventListener('click', saveKey);

document.addEventListener('DOMContentLoaded', loadKey);
