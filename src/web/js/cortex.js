// Cortex Web UI Interactions
document.addEventListener('htmx:afterSwap', function(evt) {
  // Highlight active nav link
  const path = window.location.pathname;
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === path);
  });
});

document.addEventListener('htmx:responseError', function(evt) {
  showToast('Request failed: ' + (evt.detail?.xhr?.statusText || 'Unknown error'), 'error');
});

document.addEventListener('htmx:sendError', function(evt) {
  showToast('Network error. Is the server running?', 'error');
});

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 200);
  }, 4000);
}

function formatDate(iso) {
  if (!iso) return 'never';
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  return d.toLocaleDateString();
}

window.showToast = showToast;
window.formatDate = formatDate;
