import { useState, useEffect, useCallback } from 'react';

/**
 * useOnlineStatus
 *
 * Tracks browser online/offline state.
 * Exposes a helper to communicate with the service worker
 * for queuing check-ins when offline.
 */
export function useOnlineStatus() {
  const [online, setOnline] = useState(() => {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  /**
   * Send a check-in payload to the service worker to queue for background sync.
   * Returns a promise that resolves when the SW confirms it was queued.
   */
  const queueCheckin = useCallback((payload) => {
    return new Promise((resolve, reject) => {
      if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
        reject(new Error('No service worker available'));
        return;
      }

      const timeout = setTimeout(() => reject(new Error('SW response timed out')), 10000);

      const handler = (event) => {
        if (event.data?.type === 'CHECKIN_QUEUED') {
          clearTimeout(timeout);
          navigator.serviceWorker.removeEventListener('message', handler);
          resolve(event.data);
        }
      };
      navigator.serviceWorker.addEventListener('message', handler);

      navigator.serviceWorker.controller.postMessage({
        type: 'QUEUE_CHECKIN',
        payload,
      });
    });
  }, []);

  return { online, queueCheckin };
}

export default useOnlineStatus;
