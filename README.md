# WhatsApp Multi-User Manager

A self-hosted solution for managing multiple WhatsApp Web sessions with automated message backup and analytics.

## Features

- **Multi-Account Management**: Connect and manage multiple WhatsApp accounts from a single dashboard
- **Automated Backup**: Automatically backup messages when WhatsApp connects
- **Message History**: Browse and search through backed up conversations
- **Real-time View**: See live WhatsApp Web sessions with remote control
- **User Authentication**: Secure login with email/password or Google OAuth
- **Structured Logging**: Winston-based logging with file rotation
- **Session Recovery**: Automatic crash detection and session recovery
- **Docker Support**: Easy deployment with Docker Compose

## Tech Stack

- **Frontend**: Next.js 16, React 19, TailwindCSS
- **Backend**: Express.js, Socket.IO
- **Database**: SQLite (development) / PostgreSQL (production)
- **Browser Automation**: Playwright
- **Authentication**: NextAuth.js

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/whatsapp-web-mult-users.git
cd whatsapp-web-mult-users
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your settings
```

4. Initialize the database:
```bash
npx prisma migrate dev
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Docker Deployment

### Using Docker Compose

1. Create your environment file:
```bash
cp .env.example .env
# Set NEXTAUTH_SECRET (required!)
```

2. Start the application:
```bash
docker-compose up -d
```

### With PostgreSQL (Production)

```bash
docker-compose --profile with-postgres up -d
```

### With Redis (for caching/queues)

```bash
docker-compose --profile with-redis up -d
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Database connection string | Yes |
| `NEXTAUTH_SECRET` | Secret for JWT encryption (min 32 chars) | Yes |
| `NEXTAUTH_URL` | Application URL | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | No |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | No |
| `LOG_LEVEL` | Logging level (debug, info, warn, error) | No |
| `PORT` | Server port (default: 3000) | No |

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── components/        # Reusable components
│   ├── history/           # Message history page
│   ├── login/             # Authentication pages
│   └── profile/           # Profile management
├── server/                # Backend server code
│   ├── engine/            # Browser & session management
│   └── logger.ts          # Winston logging configuration
├── prisma/                # Database schema
├── tests/                 # Jest test files
└── public/                # Static assets
```

## API Endpoints

### Profiles
- `GET /api/profiles` - List all profiles
- `POST /api/profiles` - Create new profile
- `GET /api/profiles/:id` - Get profile details
- `PUT /api/profiles/:id` - Update profile
- `DELETE /api/profiles/:id` - Delete profile
- `GET /api/profiles/:id/status` - Get connection status
- `GET /api/profiles/:id/screenshot` - Get live screenshot
- `POST /api/profiles/:id/scrape` - Trigger backup

### History
- `GET /api/profiles/:id/history` - Get chat list
- `GET /api/chats/:id/messages` - Get messages
- `GET /api/search` - Search messages

### Authentication
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

## Security Considerations

- Always use HTTPS in production
- Set a strong `NEXTAUTH_SECRET`
- Keep your `.env` file secure and never commit it
- Regularly backup your database
- Monitor logs for suspicious activity

## Troubleshooting

### WhatsApp Web not loading
- Ensure Playwright browsers are installed: `npx playwright install chromium`
- Check if the session directory has proper permissions

### Session keeps disconnecting
- WhatsApp may require phone verification periodically
- Check server logs for error messages

### Backup not working
- Ensure the session is connected (green status)
- Check if IndexedDB extraction is supported in the browser

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is for educational purposes. WhatsApp is a trademark of Meta Platforms, Inc.

---

Built with Next.js and Playwright
