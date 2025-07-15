import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

const JWT_SECRET = process.env.JWT_SECRET!;
const EMAIL_USER = process.env.EMAIL_USER!;
const EMAIL_PASS = process.env.EMAIL_PASS!;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
    },
});

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();
        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return NextResponse.json({ error: 'Email not found' }, { status: 404 });
        }

        const resetToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
        const resetLink = `${APP_URL}/reset-password?token=${resetToken}`;

        await transporter.sendMail({
            from: `"Driver Tracker" <${EMAIL_USER}>`,
            to: email,
            subject: 'Password Reset Request',
            html: `<p>Click <a href="${resetLink}">here</a> to reset your password. This link expires in 1 hour.</p>`,
        });

        return NextResponse.json({ message: 'Reset link sent to your email' }, { status: 200 });
    } catch (error) {
        console.error('Error sending reset email:', error);
        return NextResponse.json({ error: 'Failed to send reset email' }, { status: 500 });
    }
}