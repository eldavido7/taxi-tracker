import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET!;

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];

    try {
        const payload = jwt.verify(token, JWT_SECRET) as { userId: string };

        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: {
                id: true,
                email: true,
                name: true,
                sessions: true,
                trips: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ user });
    } catch (err) {
        console.error('Token verification failed:', err);
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
}

export async function PATCH(req: NextRequest) {
    const authHeader = req.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];

    try {
        const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
        const { name, email } = await req.json();

        if (!name && !email) {
            return NextResponse.json({ error: 'At least one field (name or email) is required' }, { status: 400 });
        }

        const updateData: { name?: string; email?: string } = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;

        const user = await prisma.user.update({
            where: { id: payload.userId },
            data: updateData,
            select: {
                id: true,
                email: true,
                name: true,
                sessions: true,
                trips: true,
            },
        });

        return NextResponse.json({ user });
    } catch (err) {
        console.error('Error updating user:', err);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}