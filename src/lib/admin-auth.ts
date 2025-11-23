import { cookies } from 'next/headers';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'friendle_admin_2024';

export async function verifyAdmin(): Promise<boolean> {
    try {
        const cookieStore = cookies();
        const session = cookieStore.get('admin_session');

        if (!session) {
            return false;
        }

        const decoded = Buffer.from(session.value, 'base64').toString();
        const [password] = decoded.split(':');

        return password === ADMIN_PASSWORD;
    } catch {
        return false;
    }
}
