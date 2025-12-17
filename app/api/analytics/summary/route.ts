import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
    try {
        const token = await getToken({ req });

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = token.sub;

        // Get user's tenant
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { tenant: { select: { id: true } } }
        });

        const tenantId = user?.tenant?.id;

        if (!tenantId) {
            return NextResponse.json({
                totalMessages: 0,
                totalChats: 0,
                activePhones: 0,
                activityLast7Days: [],
                messagesByProfile: []
            });
        }

        // Get profiles for this tenant
        const profiles = await prisma.profile.findMany({
            where: { tenantId },
            select: {
                id: true,
                name: true,
                isActive: true,
                _count: {
                    select: { chats: true }
                }
            }
        });

        // Count total messages across all profiles
        const totalMessages = await prisma.message.count({
            where: {
                chat: {
                    profile: {
                        tenantId
                    }
                }
            }
        });

        // Count total chats
        const totalChats = await prisma.chat.count({
            where: {
                profile: {
                    tenantId
                }
            }
        });

        // Count active phones
        const activePhones = profiles.filter(p => p.isActive).length;

        // Get activity for last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const messagesLast7Days = await prisma.message.findMany({
            where: {
                chat: {
                    profile: {
                        tenantId
                    }
                },
                timestamp: {
                    gte: sevenDaysAgo
                }
            },
            select: {
                timestamp: true
            }
        });

        // Group by date
        const activityByDate: Record<string, number> = {};
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
            activityByDate[dateStr] = 0;
        }

        messagesLast7Days.forEach(msg => {
            if (msg.timestamp) {
                const dateStr = msg.timestamp.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
                if (activityByDate[dateStr] !== undefined) {
                    activityByDate[dateStr]++;
                }
            }
        });

        const activityLast7Days = Object.entries(activityByDate).map(([date, count]) => ({
            date,
            count
        }));

        // Get messages by profile
        const messagesByProfile = await Promise.all(
            profiles.map(async (profile) => {
                const count = await prisma.message.count({
                    where: {
                        chat: {
                            profileId: profile.id
                        }
                    }
                });
                return {
                    name: profile.name,
                    count
                };
            })
        );

        // Sort by count descending
        messagesByProfile.sort((a, b) => b.count - a.count);

        return NextResponse.json({
            totalMessages,
            totalChats,
            activePhones,
            activityLast7Days,
            messagesByProfile
        });
    } catch (error) {
        console.error('Analytics summary error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
