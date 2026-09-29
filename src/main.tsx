import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ScoutApp } from '@/components/scout-app';
import '@/app/globals.css';
const root = document.getElementById('root');

if (!root) {
  throw new Error('Scout could not find the application root.');
}

createRoot(root).render(
  <StrictMode>
    <ScoutApp />
  </StrictMode>,
);
