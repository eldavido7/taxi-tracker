import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';

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
    const resetToken = req.headers.get('x-reset-token');

    if (!authHeader && !resetToken) {
        return NextResponse.json({ error: 'Missing Authorization or Reset Token header' }, { status: 401 });
    }

    let userId: string | null = null;

    // Handle reset token
    if (resetToken) {
        try {
            const payload = jwt.verify(resetToken, JWT_SECRET) as { userId: string };
            userId = payload.userId;
        } catch (err) {
            console.error('Reset token verification failed:', err);
            return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 401 });
        }
    }

    // Handle auth token
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
            userId = payload.userId;
        } catch (err) {
            console.error('Auth token verification failed:', err);
            return NextResponse.json({ error: 'Invalid or expired auth token' }, { status: 401 });
        }
    }

    if (!userId) {
        return NextResponse.json({ error: 'No valid authentication provided' }, { status: 401 });
    }

    try {
        const { name, email, password } = await req.json();

        if (!name && !email && !password) {
            return NextResponse.json({ error: 'At least one field (name, email, or password) is required' }, { status: 400 });
        }

        const updateData: { name?: string; email?: string; password?: string } = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (password) {
            if (password.length < 6) {
                return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
            }
            updateData.password = await bcrypt.hash(password, 10);
        }

        const user = await prisma.user.update({
            where: { id: userId },
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