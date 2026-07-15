import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MiniKitProvider } from '@worldcoin/minikit-js/minikit-provider'
import './index.css'
import App from './App.jsx'
import { WorldProvider } from './world/WorldProvider.jsx'
import { RoundProvider } from './world/RoundProvider.jsx'
import { wagmiConfig } from './wallet/config.js'

// The Mini App and World ID products may use separate Developer Portal apps.
// Keep the legacy fallback so existing deployments continue to initialize
// while the production env is migrated to the explicit Mini App value.
const VITE_MINI_APP_ID = import.meta.env.VITE_MINI_APP_ID || import.meta.env.VITE_WORLD_ID_APP_ID || ''

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

// Mount MiniKitProvider with the Mini App app id. WorldIdVerify owns the
// distinct World ID app id used by IDKit proof requests.
// The provider gracefully handles non-World-App contexts (it logs an
// informational "MiniKit is not installed" message) and ensures
// MiniKit is initialized in time for deep-link / store-continuation
// scenarios that heuristic host detection may miss.
const shouldMountMiniKit = Boolean(VITE_MINI_APP_ID);

const appTree = (
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
  </StrictMode>
);

const wrappedTree = shouldMountMiniKit ? (
  <MiniKitProvider appId={VITE_MINI_APP_ID}>{appTree}</MiniKitProvider>
) : (
  appTree
);

createRoot(document.getElementById('root')).render(wrappedTree);
