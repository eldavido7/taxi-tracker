import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'refreshsecret';

export async function POST(req: Request) {
    try {
        const { name, email, password } = await req.json();

        if (!name || !email || !password) {
            return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return NextResponse.json({ error: 'User already exists.' }, { status: 409 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
            },
        });

        const token = jwt.sign({ userId: newUser.id, email: newUser.email }, JWT_SECRET, {
            expiresIn: '1h',
        });

        const refreshToken = jwt.sign({ userId: newUser.id }, REFRESH_SECRET, {
            expiresIn: '1d',
        });

        await prisma.user.update({
            where: { id: newUser.id },
            data: { refreshToken },
        });

        return NextResponse.json({
            token,
            refreshToken,
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
            },
        });
    } catch (error) {
        console.error('Register error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
