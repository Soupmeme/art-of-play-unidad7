// Dev-only tools, hidden unless the URL contains ?dev (rule 2).
// Nothing in this file may change the simulation; it only observes.

import Stats from 'three/addons/libs/stats.module.js';

export function isDevMode(search = window.location.search) {
  return new URLSearchParams(search).has('dev');
}

export function createDevTools(container) {
  const stats = new Stats();
  stats.dom.style.position = 'absolute';
  container.appendChild(stats.dom);

  const info = document.createElement('div');
  info.className = 'dev-info';
  container.appendChild(info);

  return {
    begin: () => stats.begin(),
    end: () => stats.end(),
    setInfo: (lines) => {
      info.textContent = lines.join('\n');
    },
  };
}
