/**
 * Theme helper to query, update, and broadcast theme states.
 */

export function getSystemTheme() {
  return localStorage.getItem('theme') || 'dark';
}

export function setSystemTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  // Dispatch custom event to notify all listening React components
  window.dispatchEvent(new Event('theme-change'));
}
