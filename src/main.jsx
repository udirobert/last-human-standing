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

const VITE_WORLD_ID_APP_ID = import.meta.env.VITE_WORLD_ID_APP_ID || ''

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

// Only mount the MiniKitProvider when we have a real World ID
// app id AND we're inside a world-app or farcaster context.
// Outside those, the provider logs "MiniKit is not installed"
// and "App ID not provided during install" to the console on
// every page load — those red errors scare non-World-App
// visitors and make the app look broken. We only need the
// provider when the WLD/cUSD payment paths or wallet auth are
// actually going to run.
function isMiniAppHost() {
  if (typeof window === 'undefined') return false;
  // World App injects a `world-app` global or sits on
  // worldapp.org. Farcaster injects fc:frame.
  return Boolean(
    (window).__WORLD_APP__ ||
      (window).Warpcast ||
      window.location !== window.parent.location ||
      /worldapp|farcaster|fc:frame|warpcast/i.test(window.location.search + ' ' + (document.referrer || '')),
  );
}

const shouldMountMiniKit = Boolean(VITE_WORLD_ID_APP_ID) && isMiniAppHost();

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
  <MiniKitProvider appId={VITE_WORLD_ID_APP_ID}>{appTree}</MiniKitProvider>
) : (
  appTree
);

createRoot(document.getElementById('root')).render(wrappedTree);
