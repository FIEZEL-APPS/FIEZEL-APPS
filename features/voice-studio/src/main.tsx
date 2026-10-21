import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const mountedRoots = new WeakMap<Element, ReactDOM.Root>();

export function mountFiezelVoiceStudio(container: Element): ReactDOM.Root {
  let root = mountedRoots.get(container);
  if (!root) {
    root = ReactDOM.createRoot(container);
    mountedRoots.set(container, root);
  }
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  return root;
}

export function unmountFiezelVoiceStudio(container: Element): void {
  const root = mountedRoots.get(container);
  if (root) {
    root.unmount();
    mountedRoots.delete(container);
  }
}

// Register <fiezel-voice-studio> Web Component for seamless Vanilla PWA embedding
if (typeof window !== 'undefined' && 'customElements' in window) {
  if (!customElements.get('fiezel-voice-studio')) {
    class FiezelVoiceStudioElement extends HTMLElement {
      private mountContainer: HTMLDivElement | null = null;

      connectedCallback() {
        if (!this.mountContainer) {
          this.mountContainer = document.createElement('div');
          this.mountContainer.className = 'fiezel-voice-studio-host';
          this.appendChild(this.mountContainer);
        }
        mountFiezelVoiceStudio(this.mountContainer);
      }

      disconnectedCallback() {
        if (this.mountContainer) {
          unmountFiezelVoiceStudio(this.mountContainer);
        }
      }
    }
    customElements.define('fiezel-voice-studio', FiezelVoiceStudioElement);
  }

  (window as any).FiezelVoiceStudio = {
    mount: mountFiezelVoiceStudio,
    unmount: unmountFiezelVoiceStudio,
  };
}

// Auto-mount if standalone container (#fiezel-voice-studio-root or #root) is present
if (typeof document !== 'undefined') {
  const targetEl =
    document.getElementById('fiezel-voice-studio-root') || document.getElementById('root');
  if (targetEl) {
    mountFiezelVoiceStudio(targetEl);
  }
}
