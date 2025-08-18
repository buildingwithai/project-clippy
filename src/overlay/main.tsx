import React from 'react';
import ReactDOM from 'react-dom/client';
import Overlay from './Overlay';
import '../index.css';

// Notify parent window that React overlay is ready
window.parent.postMessage({ type: 'CLIPPY_OVERLAY_READY' }, '*');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Overlay />
  </React.StrictMode>,
);
