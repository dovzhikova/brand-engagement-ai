# CAROL Bike Reddit Engagement Platform

A web application for managing Reddit engagement for CAROL Bike's social media team. The platform enables multi-account Reddit management with persona-based AI response generation, content discovery, review workflows, and direct publishing.

## Features

- **Multi-Account Management**: Connect and manage multiple Reddit accounts via OAuth
- **Persona System**: Define unique personalities (tone, goals, traits) for each account
- **Content Discovery**: Automated and manual fetching of relevant Reddit posts/comments
- **AI Draft Generation**: LLM-powered responses using persona-specific parameters
- **Review Workflow**: Edit, proofread, approve/reject drafts before publishing
- **Direct Publishing**: Post comments/replies to Reddit from the platform

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + TypeScript + Vite |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL + Prisma |
| Cache/Queue | Redis + Bull |
| AI | OpenAI / Anthropic Claude |

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Reddit API credentials (create app at https://www.reddit.com/prefs/apps)
- OpenAI or Anthropic API key

## Setup

### 1. Clone and install dependencies

```bash
cd carol-bike-reddit

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure environment variables

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your configuration

# Frontend (optional for production)
cd ../frontend
cp .env.example .env
```

### 3. Set up the database

```bash
cd backend

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# (Optional) Seed initial data
npm run db:seed
```

### 4. Start the development servers

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Reddit OAuth Setup

1. Go to https://www.reddit.com/prefs/apps
2. Click "Create App" or "Create Another App"
3. Fill in:
   - Name: CAROL Bike Engagement (or your preferred name)
   - Type: web app
   - Redirect URI: http://localhost:3000/api/accounts/oauth/callback
4. Copy the client ID (under the app name) and secret to your `.env`

## Project Structure

```
carol-bike-reddit/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma       # Database schema
│   ├── src/
│   │   ├── api/
│   │   │   ├── controllers/    # Route handlers
│   │   │   ├── middleware/     # Auth, error handling
│   │   │   └── routes/         # API endpoints
│   │   ├── services/
│   │   │   ├── ai/            # AI integration
│   │   │   ├── reddit/        # Reddit API
│   │   │   └── workflow/      # Discovery, jobs
│   │   ├── utils/             # Helpers
│   │   ├── app.ts             # Express app
│   │   └── index.ts           # Entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Page components
│   │   ├── services/          # API client
│   │   ├── hooks/             # React hooks
│   │   ├── types/             # TypeScript types
│   │   └── App.tsx            # Main app
│   └── package.json
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout

### Reddit Accounts
- `GET /api/accounts` - List accounts
- `GET /api/accounts/oauth/init` - Start OAuth
- `PATCH /api/accounts/:id` - Update account

### Personas
- `GET /api/personas` - List personas
- `POST /api/personas` - Create persona
- `PUT /api/personas/:id` - Update persona

### Engagements
- `GET /api/engagements` - List engagement items
- `POST /api/engagements/:id/analyze` - AI analysis
- `POST /api/engagements/:id/generate` - Generate draft
- `POST /api/engagements/:id/approve` - Approve
- `POST /api/engagements/:id/publish` - Publish to Reddit

### Discovery
- `POST /api/discovery/fetch` - Start discovery job
- `GET /api/discovery/status` - Job status

## Business Rules

1. **80/20 Rule**: Responses max 80% value, 20% product mention
2. **Relevance Threshold**: Only engage with posts scoring ≥ 6
3. **Account Warm-up**: New accounts in warm-up for 14 days
4. **Rate Limits**: Max 10 posts per account per day
5. **Disclosure**: Disclose affiliation when required
6. **No Medical Claims**: Only cite backed research

## License

Private - CAROL Bike Internal Use Only
