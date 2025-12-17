import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '@/lib/prisma';

// PATCH /api/admin/users/[userId] - Update user
export async function PATCH(
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
        const { tier, role, isTrialActive } = body;

        // Build update data
        const updateData: Record<string, unknown> = {};
        if (tier) updateData.tier = tier;
        if (role) updateData.role = role;
        if (typeof isTrialActive === 'boolean') updateData.isTrialActive = isTrialActive;

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                tier: true,
                role: true,
                isTrialActive: true,
            }
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error('Admin user update error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// GET /api/admin/users/[userId] - Get user details
export async function GET(
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

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                tenant: {
                    include: {
                        profiles: {
                            include: {
                                _count: {
                                    select: { chats: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error('Admin get user error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/admin/users/[userId] - Delete user
export async function DELETE(
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

        // Prevent self-deletion
        if (userId === token.sub) {
            return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
        }

        await prisma.user.delete({
            where: { id: userId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Admin delete user error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
