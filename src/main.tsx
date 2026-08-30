import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { CardScoutApp } from '@/components/cardscout-app';
import '@/app/globals.css';
import { cardMarketService } from '@/src/services/card-market-service';
import { registerCardScoutWebMcp } from '@/src/webmcp/register-tools';

const root = document.getElementById('root');

if (!root) {
  throw new Error('CardScout could not find the application root.');
}

void registerCardScoutWebMcp(cardMarketService, document, (toolName, result) => {
  window.dispatchEvent(
    new CustomEvent('cardscout:webmcp-result', { detail: { toolName, result } }),
  );
});

createRoot(root).render(
  <StrictMode>
    <CardScoutApp />
  </StrictMode>,
);

