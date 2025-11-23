import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { verifyAdmin } from '@/lib/admin-auth';

// Initialize Firebase Admin (only once)
if (getApps().length === 0) {
  initializeApp({
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  });
}

export async function POST(request: NextRequest) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { hours } = await request.json();

    if (typeof hours !== 'number' || hours <= 0) {
      return NextResponse.json({ error: 'Invalid "hours" parameter. Must be a positive number.' }, { status: 400 });
    }

    const db = getDatabase();
    const roomsRef = db.ref('rooms');

    const snapshot = await roomsRef.once('value');
    const rooms = snapshot.val() || {};

    const now = Date.now();
    const cutoff = now - hours * 60 * 60 * 1000;
    const ONE_HOUR = 60 * 60 * 1000;

    let totalRooms = 0;
    let deletedCount = 0;
    const deletions: Promise<void>[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const [roomId, room] of Object.entries(rooms) as [string, any][]) {
      totalRooms++;
      const lastUpdate = room.updatedAt || room.createdAt || 0;
      const roomAge = now - lastUpdate;
      const isActive = roomAge < ONE_HOUR;

      if (lastUpdate < cutoff && !isActive) {
        deletions.push(roomsRef.child(roomId).remove());
        deletedCount++;
      }
    }

    await Promise.all(deletions);

    return NextResponse.json({
      success: true,
      deletedCount,
      totalRooms,
      cleanedRoomsOlderThan: `${hours} hours`,
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: 'Cleanup failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
