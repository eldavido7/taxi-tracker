import prisma from '@/lib/prisma';
import { NextResponse, NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

// Define the expected shape of the request body for better type safety
interface SessionRequestBody {
    driverId: string;
    origin: string;
    destination: string;
}

export async function POST(req: NextRequest) {
    // Verify the user from the authorization header
    const user = verifyToken(req.headers.get('authorization') || '');
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Parse the request body and validate its structure
        const { driverId, origin, destination } = await req.json() as SessionRequestBody;

        // Optional: Add runtime validation to ensure required fields are present
        if (!driverId || !origin || !destination) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Create the session in the database
        const session = await prisma.session.create({
            data: {
                userId: user.userId, // Ensure user.userId is a valid field from verifyToken
                driverId,
                origin,
                destination,
                status: 'active',
            },
        });

        return NextResponse.json(session, { status: 201 });
    } catch (error) {
        console.error('Error creating session:', error);
        return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }
}