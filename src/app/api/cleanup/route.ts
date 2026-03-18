import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

// Initialize Firebase Admin (only once)
if (getApps().length === 0) {
  initializeApp({
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  });
}

/**
 * API route to cleanup old rooms.
 * Designed to be called by a cron job (e.g., Vercel Cron).
 * Requires authorization via `CRON_SECRET`.
 *
 * @param request - The incoming request.
 * @returns A JSON response with the result of the cleanup.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is called by Vercel Cron or authorized source
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDatabase();
    const roomsRef = db.ref('rooms');

    // Get all rooms
    const snapshot = await roomsRef.once('value');
    const rooms = snapshot.val() || {};

    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    const TWO_HOURS = 2 * 60 * 60 * 1000;
    const THIRTY_MINUTES = 30 * 60 * 1000;

    let deletedCount = 0;
    const deletions: Promise<void>[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const [roomId, room] of Object.entries(rooms) as [string, any][]) {
      const roomAge = now - (room.createdAt || now);
      const inactiveTime = now - (room.lastActivity || room.createdAt || now);
      const playerCount = Object.keys(room.players || {}).length;

      // Delete if:
      // 1. Empty room older than 30 minutes
      // 2. Inactive room (no activity) for 2+ hours
      // 3. Any room older than 24 hours
      const shouldDelete =
        (playerCount === 0 && roomAge > THIRTY_MINUTES) ||
        (inactiveTime > TWO_HOURS) ||
        (roomAge > TWENTY_FOUR_HOURS);

      if (shouldDelete) {
        deletions.push(roomsRef.child(roomId).remove());
        deletedCount++;
      }
    }

    await Promise.all(deletions);

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deletedCount} rooms`,
      deletedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: 'Cleanup failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
