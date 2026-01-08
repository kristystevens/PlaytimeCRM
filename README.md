# Ginza CRM

A comprehensive CRM system for managing Players, Game Runners, and Agents/Affiliates in a poker community.

## Features

- **Player Management**: Track players with VIP tiers, churn risk, financial metrics, and assignments
- **Runner Management**: Monitor game runners with retention metrics and performance tracking
- **Agent Management**: Track affiliates with referral metrics and fraud risk assessment
- **Activity Logging**: Complete audit trail of all system activities
- **Message Queue**: Manage communication tasks for players
- **Role-Based Access Control**: ADMIN, OPS, RUNNER, and AGENT roles with appropriate permissions
- **Dashboard**: KPI cards, top performers, and alerts

## Tech Stack

- **Next.js 14** (App Router) with TypeScript
- **TailwindCSS** + **shadcn/ui** for UI components
- **Prisma** + **PostgreSQL** for database
- **NextAuth** (Credentials provider) for authentication
- **Zod** for validation
- **TanStack Table** for sortable tables
- **Recharts** for charts (ready for implementation)
- **Vitest** for testing

## Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- npm or yarn

## Setup

1. **Clone the repository** (if applicable) or navigate to the project directory

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://ginza:ginza_dev_password@localhost:5432/ginza_crm?schema=public"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="change-this-to-a-random-secret-in-production"
   ```

4. **Start PostgreSQL with Docker**:
   ```bash
   docker-compose up -d
   ```

5. **Run Prisma migrations**:
   ```bash
   npm run db:migrate
   ```

6. **Seed the database**:
   ```bash
   npm run db:seed
   ```

7. **Start the development server**:
   ```bash
   npm run dev
   ```

8. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Default Test Accounts

After seeding, you can log in with:

- **Admin**: `admin@ginza.com` / `admin123`
- **Ops**: `ops@ginza.com` / `ops123`

## Database Commands

- **Generate Prisma Client**: `npm run db:push` (or `npx prisma generate`)
- **Create migration**: `npm run db:migrate`
- **Open Prisma Studio**: `npm run db:studio`
- **Seed database**: `npm run db:seed`

## Docker Commands

- **Start database**: `docker-compose up -d`
- **Stop database**: `docker-compose down`
- **View logs**: `docker-compose logs -f postgres`
- **Reset database** (removes all data): `docker-compose down -v`

## Role-Based Access Control (RBAC)

### ADMIN
- Full access to all features
- User management
- All CRUD operations

### OPS
- Full access except user management
- Can manage players, runners, agents
- Can view activity logs and messages

### RUNNER
- Read own runner profile
- View assigned players
- Update notes and lastActiveAt for assigned players
- Cannot access runners list or agents list

### AGENT
- Read own agent profile
- View referred players
- Cannot access runners list
- Limited to own data

## Project Structure

```
ginza-crm/
├── app/                    # Next.js app router pages
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard page
│   ├── players/           # Player management
│   ├── runners/           # Runner management
│   ├── agents/            # Agent management
│   ├── activity/          # Activity logs
│   └── messages/          # Message queue
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── layout/           # Layout components
├── lib/                   # Utility functions
│   ├── auth.ts           # NextAuth configuration
│   ├── metrics.ts        # Computed metrics
│   ├── rbac.ts           # RBAC helpers
│   └── validations.ts    # Zod schemas
├── prisma/                # Prisma schema and migrations
│   └── seed.ts           # Database seed script
└── types/                 # TypeScript type definitions
```

## Key Features

### Player Management
- Track VIP tiers (BRONZE, SILVER, GOLD, WHALE)
- Monitor churn risk (LOW, MED, HIGH)
- Financial metrics: deposits, wagered, net PnL
- Assign to runners and track referrals from agents
- Value score calculation

### Runner Management
- Track retention metrics (7d, 30d)
- Monitor assigned players
- Strike count and status tracking
- Payout history

### Agent Management
- Track referred players
- Monitor active players (7d, 30d)
- Financial metrics: deposits driven, wager volume
- Fraud risk assessment
- Payout history

### Activity Logging
- Complete audit trail
- Filter by entity type, action, date range
- Track all create/update/delete/assign operations

### Message Queue
- Create message tasks for players
- Track communication status
- Template-based messaging (stub implementation)

## Testing

Run tests with:
```bash
npm test
```

Current test coverage:
- Value score calculation
- Churn status classification

## Next Steps / Future Enhancements

1. **Webhook Ingestion**: Real-time data sync from external systems
2. **Wallet Sync**: Automatic wallet address verification and balance tracking
3. **Real Telegram Bot**: Integrate with Telegram Bot API for actual messaging
4. **Advanced Charts**: Implement Recharts for deposit trends and player activity
5. **Export Functionality**: CSV/Excel export for reports
6. **Real-time Updates**: WebSocket support for live dashboard updates
7. **Email Notifications**: Alert system for high churn risk, etc.
8. **Advanced Analytics**: More sophisticated metrics and forecasting
9. **Bulk Operations**: Bulk assign, bulk update, etc.
10. **Search Improvements**: Full-text search across all entities

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `NEXTAUTH_URL` | Base URL for NextAuth | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Secret for JWT signing | Required |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL (optional) | - |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token (optional) | - |

## Troubleshooting

### Database Connection Issues
- Ensure Docker is running: `docker ps`
- Check if PostgreSQL is up: `docker-compose ps`
- Verify DATABASE_URL in `.env` matches docker-compose.yml

### Migration Issues
- Reset database: `docker-compose down -v && docker-compose up -d`
- Run migrations: `npm run db:migrate`

### Authentication Issues
- Clear browser cookies
- Verify NEXTAUTH_SECRET is set
- Check that users exist in database (run seed script)

## License

This project is for internal use only.

## Support

For issues or questions, please contact the development team.

