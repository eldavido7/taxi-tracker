import prisma from '@/lib/prisma';
import { NextResponse, NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

// Use the correct type for dynamic route params
export async function POST(
    req: NextRequest,
    context: { params: { id: string } } // Changed from direct destructuring
) {
    const user = verifyToken(req.headers.get('authorization') || '');
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionId = context.params.id; // Access params from context
    if (!sessionId) {
        return NextResponse.json({ error: 'Missing session ID' }, { status: 400 });
    }

    try {
        const existing = await prisma.session.findUnique({
            where: { id: sessionId },
        });

        if (!existing || existing.status === 'ended') {
            return NextResponse.json({ error: 'Session not found or already ended' }, { status: 404 });
        }

        const updated = await prisma.session.update({
            where: { id: sessionId },
            data: {
                status: 'ended',
                updatedAt: new Date(),
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to end session' }, { status: 500 });
    }
}