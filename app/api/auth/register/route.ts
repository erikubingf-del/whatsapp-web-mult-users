import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const { firstName, lastName, email, password, tier } = await req.json();

        // Validate input
        if (!firstName || !lastName || !email || !password) {
            return NextResponse.json(
                { error: 'First name, last name, email and password are required' },
                { status: 400 }
            );
        }

        // Combine first and last name
        const name = `${firstName.trim()} ${lastName.trim()}`;

        // Validate tier
        const validTiers = ['STARTER', 'PRO', 'BUSINESS'];
        const selectedTier = validTiers.includes(tier) ? tier : 'STARTER';

        if (password.length < 8) {
            return NextResponse.json(
                { error: 'Password must be at least 8 characters' },
                { status: 400 }
            );
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            // Check if it's a Google-only account (no password)
            const hint = !existingUser.password
                ? ' It looks like you signed up with Google. Try "Sign in with Google" or use "Forgot Password" to set a password.'
                : ' Try signing in or use "Forgot Password" if you don\'t remember your password.';

            return NextResponse.json(
                { error: 'An account with this email already exists.' + hint },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                tier: selectedTier,
            }
        });

        // Create tenant for the user
        await prisma.tenant.create({
            data: {
                name: `${name}'s Organization`,
                userId: user.id
            }
        });

        console.log(`New user registered: ${email}`);

        return NextResponse.json({
            message: 'Account created successfully',
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { error: 'An error occurred during registration. Please try again.' },
            { status: 500 }
        );
    }
}
