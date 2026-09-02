import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ScoutApp } from '@/components/scout-app';
import '@/app/globals.css';
import { cardMarketService } from '@/src/services/card-market-service';
import { registerScoutWebMcp } from '@/src/webmcp/register-tools';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Scout could not find the application root.');
}

void registerScoutWebMcp(cardMarketService, document, (toolName, result) => {
  window.dispatchEvent(
    new CustomEvent('scout:webmcp-result', { detail: { toolName, result } }),
  );
});

createRoot(root).render(
  <StrictMode>
    <ScoutApp />
  </StrictMode>,
);
