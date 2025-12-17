import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const { email, token, password } = await req.json();

        if (!email || !token || !password) {
            return NextResponse.json(
                { error: 'Email, token, and password are required' },
                { status: 400 }
            );
        }

        // Validate password strength
        if (password.length < 8) {
            return NextResponse.json(
                { error: 'Password must be at least 8 characters' },
                { status: 400 }
            );
        }

        // Find the token
        const verificationToken = await prisma.verificationToken.findFirst({
            where: {
                identifier: email,
                token
            }
        });

        if (!verificationToken) {
            return NextResponse.json(
                { error: 'Invalid or expired reset link' },
                { status: 400 }
            );
        }

        // Check if token has expired
        if (new Date() > verificationToken.expires) {
            // Delete the expired token
            await prisma.verificationToken.delete({
                where: {
                    identifier_token: {
                        identifier: email,
                        token
                    }
                }
            });

            return NextResponse.json(
                { error: 'Reset link has expired. Please request a new one.' },
                { status: 400 }
            );
        }

        // Find the user
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Update the user's password
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        });

        // Delete the used token
        await prisma.verificationToken.delete({
            where: {
                identifier_token: {
                    identifier: email,
                    token
                }
            }
        });

        console.log(`Password reset successful for: ${email}`);

        return NextResponse.json({
            message: 'Password has been reset successfully'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json(
            { error: 'An error occurred. Please try again.' },
            { status: 500 }
        );
    }
}

// Verify token endpoint (GET)
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const email = searchParams.get('email');
        const token = searchParams.get('token');

        if (!email || !token) {
            return NextResponse.json(
                { valid: false, error: 'Missing email or token' },
                { status: 400 }
            );
        }

        // Find the token
        const verificationToken = await prisma.verificationToken.findFirst({
            where: {
                identifier: email,
                token
            }
        });

        if (!verificationToken) {
            return NextResponse.json(
                { valid: false, error: 'Invalid reset link' },
                { status: 400 }
            );
        }

        // Check if token has expired
        if (new Date() > verificationToken.expires) {
            return NextResponse.json(
                { valid: false, error: 'Reset link has expired' },
                { status: 400 }
            );
        }

        return NextResponse.json({ valid: true });

    } catch (error) {
        console.error('Verify token error:', error);
        return NextResponse.json(
            { valid: false, error: 'An error occurred' },
            { status: 500 }
        );
    }
}
