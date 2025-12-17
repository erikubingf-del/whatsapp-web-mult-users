import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { writeFile, unlink, mkdir } from 'fs/promises';
import path from 'path';
import prisma from '@/lib/prisma';

// POST - Upload logo
export async function POST(req: NextRequest) {
    try {
        const token = await getToken({ req });
        if (!token?.sub) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('logo') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // Validate file type
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            return NextResponse.json({ error: 'Invalid file type. Use PNG, JPG, SVG, or WebP.' }, { status: 400 });
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            return NextResponse.json({ error: 'File too large. Maximum size is 2MB.' }, { status: 400 });
        }

        // Get tenant
        const tenant = await prisma.tenant.findFirst({
            where: { userId: token.sub }
        });

        if (!tenant) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
        }

        // Create upload directory if it doesn't exist
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'logos');
        await mkdir(uploadDir, { recursive: true });

        // Delete old logo if exists
        if (tenant.logoUrl) {
            const oldPath = path.join(process.cwd(), 'public', tenant.logoUrl);
            try {
                await unlink(oldPath);
            } catch {
                // File might not exist, ignore
            }
        }

        // Generate filename
        const ext = file.name.split('.').pop() || 'png';
        const filename = `${tenant.id}-${Date.now()}.${ext}`;
        const filepath = path.join(uploadDir, filename);
        const publicUrl = `/uploads/logos/${filename}`;

        // Save file
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filepath, buffer);

        // Update tenant
        await prisma.tenant.update({
            where: { id: tenant.id },
            data: { logoUrl: publicUrl }
        });

        return NextResponse.json({
            success: true,
            logoUrl: publicUrl
        });

    } catch (error) {
        console.error('Logo upload error:', error);
        return NextResponse.json({ error: 'Failed to upload logo' }, { status: 500 });
    }
}

// DELETE - Remove logo
export async function DELETE(req: NextRequest) {
    try {
        const token = await getToken({ req });
        if (!token?.sub) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenant = await prisma.tenant.findFirst({
            where: { userId: token.sub }
        });

        if (!tenant) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
        }

        // Delete file if exists
        if (tenant.logoUrl) {
            const filepath = path.join(process.cwd(), 'public', tenant.logoUrl);
            try {
                await unlink(filepath);
            } catch {
                // File might not exist, ignore
            }
        }

        // Clear logoUrl in database
        await prisma.tenant.update({
            where: { id: tenant.id },
            data: { logoUrl: null }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Logo delete error:', error);
        return NextResponse.json({ error: 'Failed to delete logo' }, { status: 500 });
    }
}
