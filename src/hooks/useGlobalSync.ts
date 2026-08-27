import { useEffect, useState, useCallback } from 'react';

export interface UseGlobalSyncOptions {
  onRefresh: () => Promise<void> | void;
}

export function useGlobalSync({ onRefresh }: UseGlobalSyncOptions) {
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(new Date());
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  const triggerRefresh = useCallback(async () => {
    try {
      setIsSyncing(true);
      await onRefresh();
      setLastSyncedAt(new Date());
    } catch (err) {
      console.warn('[useGlobalSync] Error during sync refresh:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [onRefresh]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerRefresh();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleFocus = () => {
      triggerRefresh();
    };

    const handleCustomSync = () => {
      triggerRefresh();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('ragsignal:sync', handleCustomSync);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('ragsignal:sync', handleCustomSync);
    };
  }, [triggerRefresh]);

  return {
    isSyncing,
    lastSyncedAt,
    isOnline,
    triggerRefresh,
  };
}
