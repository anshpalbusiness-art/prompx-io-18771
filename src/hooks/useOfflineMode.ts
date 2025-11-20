import { useState, useEffect } from 'react';

export const useOfflineMode = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [offlineModeEnabled, setOfflineModeEnabled] = useState(() => {
    const saved = localStorage.getItem('offlineModeEnabled');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const toggleOfflineMode = (enabled: boolean) => {
    setOfflineModeEnabled(enabled);
    localStorage.setItem('offlineModeEnabled', JSON.stringify(enabled));
  };

  return {
    isOffline: isOffline || offlineModeEnabled,
    offlineModeEnabled,
    toggleOfflineMode,
    isNetworkOffline: isOffline,
  };
};
