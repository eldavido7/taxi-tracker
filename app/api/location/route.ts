import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
    const { sessionId, latitude, longitude } = await req.json();

    const user = verifyToken(req.headers.get('authorization') || '');
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!sessionId || typeof latitude !== 'number' || typeof longitude !== 'number') {
        return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
    }

    const location = await prisma.location.upsert({
        where: { sessionId },
        update: { latitude, longitude, updatedAt: new Date() },
        create: { sessionId, latitude, longitude },
    });

    return NextResponse.json(location, { headers: { 'Cache-Control': 'no-store' } });
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    const user = verifyToken(req.headers.get('authorization') || '');
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!sessionId) {
        return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }

    const location = await prisma.location.findUnique({ where: { sessionId } });

    if (!location) {
        return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    const oneMinuteAgo = new Date(Date.now() - 60_000);
    if (location.updatedAt < oneMinuteAgo) {
        return NextResponse.json({ error: 'Location stale' }, { status: 410 });
    }

    return NextResponse.json({
        latitude: location.latitude,
        longitude: location.longitude,
    }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function DELETE(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
        return NextResponse.json(
            { error: 'Missing sessionId' },
            { status: 400, headers: { 'Cache-Control': 'no-store, max-age=0' } }
        );
    }

    try {
        await prisma.location.delete({ where: { sessionId } });
        return NextResponse.json(
            { success: true },
            { headers: { 'Cache-Control': 'no-store, max-age=0' } }
        );
    } catch {
        return NextResponse.json(
            { error: 'Failed to delete location' },
            { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
        );
    }
}