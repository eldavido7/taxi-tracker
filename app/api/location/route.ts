import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { driverId, latitude, longitude } = body;

    if (!driverId || !latitude || !longitude) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const location = await prisma.location.upsert({
        where: { driverId },
        update: { latitude, longitude },
        create: {
            driverId,
            latitude,
            longitude,
        },
    });

    return NextResponse.json(location);
}

// GET /api/location?driverId=abc123
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const driverId = searchParams.get("driverId");

    if (!driverId) {
        return NextResponse.json({ error: "Missing driverId" }, { status: 400 });
    }

    const location = await prisma.location.findUnique({
        where: { driverId },
    });

    if (!location) {
        return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    return NextResponse.json(location);
}
