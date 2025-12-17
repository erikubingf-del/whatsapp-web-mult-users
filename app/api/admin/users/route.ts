import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '@/lib/prisma';

// GET /api/admin/users - List all users with stats
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

        // Get all users with their tenant data
        const users = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                tenant: {
                    include: {
                        profiles: {
                            include: {
                                chats: {
                                    include: {
                                        _count: {
                                            select: { messages: true }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        // Transform data for response
        const usersWithStats = users.map(user => {
            const profileCount = user.tenant?.profiles?.length || 0;
            const messageCount = user.tenant?.profiles?.reduce((total, profile) => {
                return total + profile.chats.reduce((chatTotal, chat) => {
                    return chatTotal + chat._count.messages;
                }, 0);
            }, 0) || 0;

            return {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role || 'user',
                tier: user.tier,
                isTrialActive: user.isTrialActive,
                trialEndsAt: user.trialEndsAt,
                trialStartedAt: user.trialStartedAt,
                createdAt: user.createdAt,
                profileCount,
                messageCount,
            };
        });

        return NextResponse.json({ users: usersWithStats });
    } catch (error) {
        console.error('Admin users error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
