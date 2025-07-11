import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;

        if (!id) {
            return NextResponse.json({ error: 'Missing driver ID' }, { status: 400 });
        }

        try {
            const driver = await prisma.driver.findUnique({
                where: { id },
                // include: { location: true },
            });

            if (!driver) {
                return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
            }

            return NextResponse.json(driver);
        } catch {
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }
    }
    catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}