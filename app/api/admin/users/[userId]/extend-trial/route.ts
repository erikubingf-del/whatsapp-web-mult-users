import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '@/lib/prisma';

// POST /api/admin/users/[userId]/extend-trial - Extend user trial
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const token = await getToken({ req });

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is admin
        const adminUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { role: true },
        });

        if (adminUser?.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const { userId } = await params;
        const body = await req.json();
        const { days } = body;

        if (!days || days < 1) {
            return NextResponse.json({ error: 'Days must be at least 1' }, { status: 400 });
        }

        // Get current user
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { trialEndsAt: true, isTrialActive: true }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Calculate new trial end date
        const currentEnd = user.trialEndsAt || new Date();
        const newEndDate = new Date(currentEnd);
        newEndDate.setDate(newEndDate.getDate() + days);

        // Update user
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                trialEndsAt: newEndDate,
                isTrialActive: true
            },
            select: {
                id: true,
                trialEndsAt: true,
                isTrialActive: true
            }
        });

        return NextResponse.json({
            success: true,
            user: updatedUser,
            message: `Trial extended by ${days} days`
        });
    } catch (error) {
        console.error('Extend trial error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
