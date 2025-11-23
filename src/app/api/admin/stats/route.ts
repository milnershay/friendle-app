import { NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { verifyAdmin } from '@/lib/admin-auth';

// Initialize Firebase Admin (only once)
if (getApps().length === 0) {
  initializeApp({
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  });
}

export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getDatabase();
    const roomsRef = db.ref('rooms');

    const snapshot = await roomsRef.once('value');
    const rooms = snapshot.val() || {};

    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    let totalRooms = 0;
    let activeRooms = 0;
    let oldRooms = 0;
    let totalPlayers = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const room of Object.values(rooms) as any[]) {
      totalRooms++;
      const lastUpdate = room.updatedAt || room.createdAt || 0;
      const roomAge = now - lastUpdate;

      if (roomAge < ONE_HOUR) {
        activeRooms++;
      }
      if (roomAge > TWENTY_FOUR_HOURS) {
        oldRooms++;
      }

      totalPlayers += Object.keys(room.players || {}).length;
    }

    return NextResponse.json({
      totalRooms,
      activeRooms,
      oldRooms,
      totalPlayers,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve stats', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
