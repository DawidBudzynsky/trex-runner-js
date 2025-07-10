import Runner from './js/runner.js'

/**
 * Main logic of this runner game
 * @date 2024/04/20
 */

function onDocumentLoad() {
  if (window.__runnerInitialized) return;
  window.__runnerInitialized = true;

  try {
    new Runner('.interstitial-wrapper');
  } catch (err) {
    console.warn('Runner init error:', err);
  }
}

document.addEventListener('DOMContentLoaded', onDocumentLoad)
