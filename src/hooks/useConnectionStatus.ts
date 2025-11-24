'use client';

import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';

/**
 * A hook to monitor the user's connection status.
 *
 * @returns An object with the following properties:
 * - `isOnline`: A boolean indicating if the browser is online (`navigator.onLine`).
 * - `isConnectedToFirebase`: A boolean indicating if the client is connected to Firebase Realtime Database.
 */
export function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isConnectedToFirebase, setIsConnectedToFirebase] = useState(true);
  const [hasConnectedOnce, setHasConnectedOnce] = useState(!db); // Skip waiting if no Firebase

  useEffect(() => {
    // Listen for browser online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Monitor Firebase connection state only if db is available
    if (!db) {
      console.warn('Firebase database not initialized. Connection monitoring disabled.');
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    const connectedRef = ref(db, '.info/connected');
    const unsubscribe = onValue(connectedRef, (snap) => {
      const connected = snap.val() === true;
      setIsConnectedToFirebase(connected);

      // Once we've connected successfully, track it
      if (connected) {
        setHasConnectedOnce(true);
      }
    });

    // Cleanup listeners on component unmount
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  // Only report as offline after we've connected at least once
  // This prevents the yellow bar from showing during initial connection
  const isEffectivelyConnected = hasConnectedOnce ? (isOnline && isConnectedToFirebase) : true;

  return { isOnline, isConnectedToFirebase: isEffectivelyConnected };
}
