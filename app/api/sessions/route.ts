import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function POST(req: Request) {
    const user = verifyToken(req.headers.get('authorization') || '');
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { driverId, origin, destination } = await req.json();

        const session = await prisma.session.create({
            data: {
                userId: user.userId,
                driverId,
                origin,
                destination,
                status: 'active',
            },
        });

        return NextResponse.json(session);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }
}
