import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Server-side only - this environment variable is NOT exposed to the browser
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'friendle_admin_2024';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (password === ADMIN_PASSWORD) {
      // Create a secure session token
      const token = Buffer.from(`${ADMIN_PASSWORD}:${Date.now()}`).toString('base64');

      // Set HTTP-only cookie (cannot be accessed by JavaScript)
      const cookieStore = await cookies();
      cookieStore.set('admin_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('admin_session');

    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Validate session token
    try {
      const decoded = Buffer.from(session.value, 'base64').toString();
      const [password] = decoded.split(':');

      if (password === ADMIN_PASSWORD) {
        return NextResponse.json({ authenticated: true });
      }
    } catch {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({ authenticated: false }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

export async function DELETE(request: NextRequest) {
  const cookieStore = await cookies();
  cookieStore.delete('admin_session');
  return NextResponse.json({ success: true });
}
