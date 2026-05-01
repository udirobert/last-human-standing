import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'
import { WorldProvider } from './world/WorldProvider.jsx'
import { RoundProvider } from './world/RoundProvider.jsx'
import { wagmiConfig } from './wallet/config.js'
import ErrorBoundary from './components/ErrorBoundary.jsx'

const queryClient = new QueryClient();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <WorldProvider>
            <RoundProvider>
              <App />
            </RoundProvider>
          </WorldProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  </StrictMode>,
)