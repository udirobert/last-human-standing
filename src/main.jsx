import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'
import { WorldProvider } from './world/WorldProvider.jsx'
import { RoundProvider } from './world/RoundProvider.jsx'
import { wagmiConfig } from './wallet/config.js'

// Register service worker for offline support and background sync
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });
      console.log('SW registered:', reg.scope);

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              reg.active?.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        }
      });
    } catch (err) {
      console.warn('SW registration failed:', err);
    }
  });
}

const queryClient = new QueryClient();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WorldProvider>
          <RoundProvider>
            <App />
          </RoundProvider>
        </WorldProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
)
