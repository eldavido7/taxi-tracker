import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';

const REFRESH_SECRET = process.env.REFRESH_SECRET || 'refreshsecret';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export async function POST(req: NextRequest) {
    const { refreshToken } = await req.json();

    if (!refreshToken) {
        return NextResponse.json({ error: 'Missing refresh token' }, { status: 400 });
    }

    try {
        const payload = jwt.verify(refreshToken, REFRESH_SECRET) as { userId: string };

        const user = await prisma.user.findUnique({ where: { id: payload.userId } });

        if (!user || user.refreshToken !== refreshToken) {
            return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
        }

        const newAccessToken = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Generate new refresh token
        const newRefreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, { expiresIn: '1d' });

        // Update in database
        await prisma.user.update({
            where: { id: payload.userId },
            data: { refreshToken: newRefreshToken },
        });

        return NextResponse.json({
            token: newAccessToken,
            refreshToken: newRefreshToken
        });

    } catch (err) {
        console.error('Refresh token error:', err);
        return NextResponse.json({ error: 'Invalid or expired refresh token' }, { status: 401 });
    }
}
