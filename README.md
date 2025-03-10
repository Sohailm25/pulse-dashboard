# Pulse Dashboard

A personal productivity dashboard for tracking projects, habits, and goals.

## Features

- User authentication
- Project management with phases and subgoals
- Habit tracking with streaks
- Minimum Viable Goal (MVG) tracking
- Daily, weekly, monthly, and quarterly views

## Tech Stack

- Frontend: React, TypeScript, Tailwind CSS, Framer Motion
- Backend: Express.js, PostgreSQL
- State Management: Zustand
- Authentication: JWT

## Deployment on Railway

### Prerequisites

- A Railway account
- A PostgreSQL database on Railway

### Environment Variables

Set the following environment variables in your Railway project:

- `DATABASE_URL`: The PostgreSQL connection string (provided by Railway)
- `JWT_SECRET`: A secure random string for signing JWT tokens
- `NODE_ENV`: Set to `production` for deployment
- `PORT`: Set to `$PORT` (Railway will provide this)

### Deployment Steps

1. Connect your GitHub repository to Railway
2. Add a PostgreSQL database to your project
3. Set the environment variables
4. Deploy the application

Railway will automatically run the build and start scripts defined in package.json.

## Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with the required environment variables
4. Start the development server: `npm run dev`
5. Start the backend server: `npm run dev:server`

## Database Initialization

To initialize the database schema:

```
npm run init-db
```

This will create the necessary tables in the PostgreSQL database.

## License

MIT