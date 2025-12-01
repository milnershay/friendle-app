'use client';

import { useState, useEffect } from 'react';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';

/**
 * A banner that displays the current connection status.
 * It appears at the top of the screen when the user is offline or
 * disconnected from Firebase.
 */
function ConnectionStatus() {
  const { isOnline, isConnectedToFirebase } = useConnectionStatus();
  const [hasConnectedOnce, setHasConnectedOnce] = useState(false);

  useEffect(() => {
    // Track if we have ever successfully connected to Firebase.
    // This prevents the banner from showing on initial load.
    if (isConnectedToFirebase) {
      setHasConnectedOnce(true);
    }
  }, [isConnectedToFirebase]);

  // We are offline if the browser says so OR if Firebase is disconnected.
  const isEffectivelyOffline = !isOnline || !isConnectedToFirebase;

  // Only show the banner if we've connected at least once before.
  if (!hasConnectedOnce || !isEffectivelyOffline) {
    return null;
  }

  const message = !isOnline
    ? 'You are offline. Please check your internet connection.'
    : 'Connecting to server...';

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center bg-yellow-500 p-2 text-center text-sm text-white shadow-md"
    >
      {message}
    </div>
  );
}

export default ConnectionStatus;
