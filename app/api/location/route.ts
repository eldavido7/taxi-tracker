import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from '@/lib/auth';   // NEW – optional auth

export async function POST(req: NextRequest) {
    const { driverId, latitude, longitude } = await req.json();

    // (Optional) verify if caller is authenticated
    //  – driver app or trusted server might not send a token at all
    verifyToken(req.headers.get('authorization') || '');

    if (!driverId || typeof latitude !== 'number' || typeof longitude !== 'number') {
        return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
    }

    // leave existing upsert logic unchanged
    const location = await prisma.location.upsert({
        where: { driverId },
        update: { latitude, longitude },
        create: { driverId, latitude, longitude },
    });

    return NextResponse.json(location, { headers: { 'Cache-Control': 'no-store' } });
}

/* ---------- GET: fetch driver location  ---------- */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const driverId = searchParams.get('driverId');
    const sessionId = searchParams.get('sessionId'); // NEW

    let targetDriverId = driverId;

    // New convenience: look up driverId via sessionId if provided
    if (!driverId && sessionId) {
        const session = await prisma.session.findUnique({
            where: { id: sessionId },
            select: { driverId: true },
        });
        targetDriverId = session?.driverId || null;
    }

    if (!targetDriverId) {
        return NextResponse.json({ error: 'driverId or sessionId required' }, { status: 400 });
    }

    const location = await prisma.location.findUnique({ where: { driverId: targetDriverId } });

    if (!location) {
        return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    // stale check unchanged
    const oneMinuteAgo = new Date(Date.now() - 60_000);
    if (location.updatedAt < oneMinuteAgo) {
        return NextResponse.json({ error: 'Location stale' }, { status: 410 });
    }

    return NextResponse.json(location, { headers: { 'Cache-Control': 'no-store' } });
}

// DELETE /api/location?driverId=abc123
export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url);
    const driverId = searchParams.get("driverId");

    if (!driverId) {
        return NextResponse.json(
            { error: "Missing driverId" },
            { status: 400, headers: { "Cache-Control": "no-store, max-age=0" } }
        );
    }

    try {
        await prisma.location.delete({
            where: { driverId },
        });
        return NextResponse.json(
            { success: true },
            { headers: { "Cache-Control": "no-store, max-age=0" } }
        );
    } catch {
        return NextResponse.json(
            { error: "Failed to delete location" },
            { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } }
        );
    }
}