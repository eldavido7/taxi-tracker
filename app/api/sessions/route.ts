import prisma from '@/lib/prisma';
import { NextResponse, NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

// Define the expected shape of the request body for better type safety
interface SessionRequestBody {
    driverId: string;
    origin: string;
    destination: string;
    destinationName?: string;
}

export async function POST(req: NextRequest) {
    // Verify the user from the authorization header
    const token = req.headers.get('authorization') || '';
    const user = verifyToken(token);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { driverId, origin, destination, destinationName } = await req.json() as SessionRequestBody;

        // Optional: Add runtime validation to ensure required fields are present
        if (!driverId || !origin || !destination) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Create the session in the database
        const session = await prisma.session.create({
            data: {
                userId: user.userId,
                driverId,
                origin,
                destination,
                destinationName,
                status: 'active',
            },
            include: {
                user: { select: { id: true, name: true, email: true } },
                driver: { select: { id: true, name: true, email: true, phone: true } },
            },
        });

        return NextResponse.json(session, { status: 201 });
    } catch (error) {
        console.error('Error creating session:', error);
        return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const token = req.headers.get('authorization') || '';
    const user = verifyToken(token);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const sessions = await prisma.session.findMany({
            where: { userId: user.userId },
            include: {
                user: { select: { id: true, name: true, email: true } },
                driver: { select: { id: true, name: true, email: true, phone: true } },
            },
        });

        return NextResponse.json({ sessions });
    } catch (error) {
        console.error('Error fetching sessions:', error);
        return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }
}