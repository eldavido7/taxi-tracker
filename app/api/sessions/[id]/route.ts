import prisma from '@/lib/prisma';
import { NextResponse, NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id: sessionId } = await context.params;

    const user = verifyToken(req.headers.get('authorization') || '');
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!sessionId) {
        return NextResponse.json({ error: 'Missing session ID' }, { status: 400 });
    }

    try {
        const session = await prisma.session.findUnique({
            where: { id: sessionId },
            include: {
                user: { select: { id: true, name: true, email: true } },
                driver: { select: { id: true, name: true, email: true, phone: true } },
            },
        });

        if (!session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        return NextResponse.json(session, { status: 200 });
    } catch (error) {
        console.error('Error fetching session:', error);
        return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id: sessionId } = await context.params;

    const user = verifyToken(req.headers.get('authorization') || '');
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!sessionId) {
        return NextResponse.json({ error: 'Missing session ID' }, { status: 400 });
    }

    try {
        const { distance, duration } = await req.json();

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
                distance: distance ? parseFloat(distance) : null,
                duration: duration || null,
                endedAt: new Date(),
                updatedAt: new Date(),
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error ending session:', error);
        return NextResponse.json({ error: 'Failed to end session' }, { status: 500 });
    }
}