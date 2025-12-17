import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { Resend } from 'resend';

// Initialize Resend (will be null if API key not set)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email }
        });

        // Always return success to prevent email enumeration
        if (!user) {
            return NextResponse.json({
                message: 'If an account exists with this email, a reset link will be sent.'
            });
        }

        // Delete any existing tokens for this user
        await prisma.verificationToken.deleteMany({
            where: { identifier: email }
        });

        // Generate a secure random token
        const token = crypto.randomBytes(32).toString('hex');

        // Token expires in 1 hour
        const expires = new Date(Date.now() + 60 * 60 * 1000);

        // Save the token
        await prisma.verificationToken.create({
            data: {
                identifier: email,
                token,
                expires
            }
        });

        const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

        // Send email if Resend is configured
        if (resend) {
            try {
                await resend.emails.send({
                    from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
                    to: email,
                    subject: 'Reset Your Password',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <h2 style="color: #0891b2; margin-bottom: 20px;">Password Reset Request</h2>
                            <p style="color: #333; font-size: 16px; line-height: 1.5;">
                                Hi${user.name ? ` ${user.name}` : ''},
                            </p>
                            <p style="color: #333; font-size: 16px; line-height: 1.5;">
                                We received a request to reset your password. Click the button below to create a new password:
                            </p>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${resetUrl}"
                                   style="background: linear-gradient(to right, #0891b2, #3b82f6);
                                          color: white;
                                          padding: 14px 28px;
                                          text-decoration: none;
                                          border-radius: 8px;
                                          font-weight: bold;
                                          display: inline-block;">
                                    Reset Password
                                </a>
                            </div>
                            <p style="color: #666; font-size: 14px; line-height: 1.5;">
                                This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.
                            </p>
                            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                            <p style="color: #999; font-size: 12px;">
                                If the button doesn't work, copy and paste this link into your browser:<br>
                                <a href="${resetUrl}" style="color: #0891b2; word-break: break-all;">${resetUrl}</a>
                            </p>
                        </div>
                    `
                });
                console.log(`Password reset email sent to: ${email}`);
            } catch (emailError) {
                console.error('Failed to send email:', emailError);
                // Continue even if email fails - we still created the token
            }
        } else {
            // Log to console if Resend not configured (dev mode fallback)
            console.log('=== PASSWORD RESET LINK ===');
            console.log(`Email: ${email}`);
            console.log(`Reset URL: ${resetUrl}`);
            console.log('(Configure RESEND_API_KEY in .env to send actual emails)');
            console.log('===========================');
        }

        return NextResponse.json({
            message: 'If an account exists with this email, a reset link will be sent.',
            // Only include resetUrl in development when Resend is not configured
            ...(process.env.NODE_ENV === 'development' && !resend && { resetUrl })
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        return NextResponse.json(
            { error: 'An error occurred. Please try again.' },
            { status: 500 }
        );
    }
}
