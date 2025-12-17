# Testing Guide - WhatsApp Multi-User Manager

This guide will help you test and verify all components of the application.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Setup database
npx prisma db push

# 3. Run tests
npm test

# 4. Start development server
npm run dev
```

## Test Commands

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- --testPathPatterns="encryption"
```

## Manual Testing Checklist

### 1. Authentication Flow

#### Register New User
1. Go to `/register`
2. Fill in name, email, password
3. Click "Register"
4. **Expected**: User created, 30-day trial activated, redirected to dashboard

#### Login
1. Go to `/login`
2. Enter email and password
3. Click "Sign In"
4. **Expected**: Redirected to dashboard

#### Password Reset
1. Go to `/login`, click "Forgot Password?"
2. Enter email address
3. Check server console for reset link (in development)
4. Open reset link
5. Enter new password
6. **Expected**: Password updated, can login with new password

### 2. Dashboard & Profiles

#### Create Profile
1. Login to dashboard
2. Click "New Profile"
3. Enter profile name
4. Click "Create"
5. **Expected**: Profile created, appears in list

#### Start WhatsApp Session
1. Click "Start Session" on a profile
2. Wait for QR code to appear
3. Scan QR code with WhatsApp mobile
4. **Expected**: Status changes to "Connected"

#### Run Backup
1. With connected profile, click "Backup"
2. **Expected**: Messages and media downloaded, stored in database

### 3. Search & History

#### Search Messages
1. Go to `/history`
2. Enter search term
3. **Expected**: Results show matching messages from all profiles

#### Use Advanced Filters
1. Click "Advanced Filters"
2. Set date range, profile, media type
3. **Expected**: Results filtered accordingly

### 4. Admin Dashboard

#### Access Admin (requires admin role)
1. Go to `/admin`
2. **Expected**: See user list, statistics

#### Manage Users
1. Change user tier dropdown
2. Extend trial (+7 days button)
3. **Expected**: Changes saved to database

### 5. Settings

#### Change Language
1. Go to `/settings`
2. Select language (EN, PT, ES, FR, DE)
3. **Expected**: UI updates to selected language

#### Enable 2FA
1. Go to Settings > Security
2. Click "Enable 2FA"
3. Scan QR code with authenticator app
4. Enter code to verify
5. **Expected**: 2FA enabled, backup codes displayed

## API Testing

### Using curl

```bash
# Login and get session
curl -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get profiles (with session cookie)
curl http://localhost:3000/api/profiles \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"

# Search messages
curl "http://localhost:3000/api/messages/search?q=hello" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/signin` | POST | Login |
| `/api/auth/signout` | POST | Logout |
| `/api/profiles` | GET | List profiles |
| `/api/profiles` | POST | Create profile |
| `/api/profiles/:id` | PATCH | Update profile |
| `/api/profiles/:id` | DELETE | Delete profile |
| `/api/profiles/:id/backup` | POST | Run backup |
| `/api/messages/search` | GET | Search messages |
| `/api/admin/users` | GET | List users (admin) |
| `/api/admin/stats` | GET | Dashboard stats (admin) |

## Database Verification

```bash
# Open Prisma Studio to view database
npx prisma studio
```

### Check User Data
1. Open Prisma Studio
2. Click on "User" table
3. Verify users have correct fields:
   - `tier`: STARTER/PRO/BUSINESS
   - `isTrialActive`: true/false
   - `trialEndsAt`: Date
   - `role`: user/admin

### Check Messages
1. Click on "Message" table
2. Verify backed up messages include:
   - `body`: Message text
   - `timestamp`: When sent
   - `mediaUrl`: Local path if media
   - `mediaType`: image/video/audio/document

## Troubleshooting

### Tests Failing

```bash
# Clear Jest cache
npx jest --clearCache

# Regenerate Prisma
npx prisma generate
```

### Database Issues

```bash
# Reset database
npx prisma db push --force-reset

# View database
npx prisma studio
```

### WhatsApp Session Issues
1. Clear browser data: Delete `sessions/` folder
2. Restart server
3. Try reconnecting

### Build Errors

```bash
# Check TypeScript
npx tsc --noEmit

# Clean and rebuild
rm -rf .next
npm run build
```

## Creating Admin User

To make a user admin, use Prisma Studio or run:

```bash
# Using Prisma Studio
npx prisma studio
# Then edit user record, set role = "admin"
```

Or create a script:

```typescript
// scripts/make-admin.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function makeAdmin(email: string) {
    await prisma.user.update({
        where: { email },
        data: { role: 'admin' }
    });
    console.log(`Made ${email} an admin`);
}

makeAdmin('your@email.com');
```

## Environment Variables

Create `.env` file:

```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Optional: Encryption
ENCRYPTION_KEY="your-32-char-encryption-key"
```

## Test Coverage

Run coverage report:

```bash
npm run test:coverage
```

Coverage targets:
- Statements: > 70%
- Branches: > 60%
- Functions: > 70%
- Lines: > 70%

## Continuous Integration

For CI/CD, add to your workflow:

```yaml
- name: Install dependencies
  run: npm ci

- name: Generate Prisma
  run: npx prisma generate

- name: Run tests
  run: npm test

- name: Type check
  run: npx tsc --noEmit

- name: Build
  run: npm run build
```
