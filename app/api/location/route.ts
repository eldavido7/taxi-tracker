import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { driverId, latitude, longitude } = body;

    if (!driverId || typeof latitude !== "number" || typeof longitude !== "number") {
        return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
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

    // ❗️ Auto-expire after 1 minute of inactivity
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

    if (location.updatedAt < oneMinuteAgo) {
        return NextResponse.json({ error: "Location stale" }, { status: 410 }); // 410 Gone
    }

    return NextResponse.json(location);

}

// DELETE /api/location?driverId=abc123
export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url);
    const driverId = searchParams.get("driverId");

    if (!driverId) {
        return NextResponse.json({ error: "Missing driverId" }, { status: 400 });
    }

    try {
        await prisma.location.delete({
            where: { driverId },
        });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json(
            { error: "Failed to delete location" },
            { status: 500 }
        );
    }
}