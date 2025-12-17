import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '@/lib/prisma';

// GET /api/admin/stats - Get dashboard statistics
export async function GET(req: NextRequest) {
    try {
        const token = await getToken({ req });

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is admin
        const user = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { role: true },
        });

        if (user?.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        // Get statistics
        const [
            totalUsers,
            activeTrials,
            totalProfiles,
            totalMessages,
            usersByTier,
            recentSignups
        ] = await Promise.all([
            // Total users
            prisma.user.count(),

            // Active trials
            prisma.user.count({
                where: { isTrialActive: true }
            }),

            // Total profiles
            prisma.profile.count(),

            // Total messages
            prisma.message.count(),

            // Users by tier
            prisma.user.groupBy({
                by: ['tier'],
                _count: { tier: true }
            }),

            // Recent signups (last 7 days)
            prisma.user.count({
                where: {
                    createdAt: {
                        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    }
                }
            })
        ]);

        // Transform tier data
        const tierMap: Record<string, number> = {};
        usersByTier.forEach(item => {
            tierMap[item.tier] = item._count.tier;
        });

        // Calculate paid users (non-trial)
        const paidUsers = totalUsers - activeTrials;

        return NextResponse.json({
            totalUsers,
            activeTrials,
            paidUsers,
            totalProfiles,
            totalMessages,
            usersByTier: tierMap,
            recentSignups
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
