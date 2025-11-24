'use client';

import { useConnectionStatus } from '@/hooks/useConnectionStatus';

/**
 * A banner that displays the current connection status.
 * It appears at the top of the screen when the user is offline or
 * disconnected from Firebase.
 */
function ConnectionStatus() {
  const { isOnline, isConnectedToFirebase } = useConnectionStatus();

  // We are offline if the browser says so OR if Firebase is disconnected.
  // Firebase can be disconnected even if the browser thinks it's online (e.g., firewall).
  const isEffectivelyOffline = !isOnline || !isConnectedToFirebase;

  if (!isEffectivelyOffline) {
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
