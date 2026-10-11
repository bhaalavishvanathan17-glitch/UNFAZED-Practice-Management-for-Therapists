# UNFAZED

A SaaS platform that helps therapists in India manage their private practice through a single branded website.

> ⚠️ **Educational Project** — This is a course project. It has not undergone a security, privacy, or operational review for real clinical use.

## Tech Stack

| Layer    | Technology                                         |
|----------|----------------------------------------------------|
| Frontend | React, Vite, Tailwind CSS, React Router            |
| Backend  | Node.js, Express.js, Mongoose                      |
| Database | MongoDB Atlas                                      |
| Auth     | JWT, bcryptjs                                      |

## Project Structure

```
unfazed/
├── unfazed-backend/     # Express.js API server
│   └── src/
│       ├── config/      # Database configuration
│       ├── app.js       # Express app setup
│       └── server.js    # Server entry point
├── unfazed-frontend/    # React + Vite application
│   └── src/
│       ├── api/         # Axios API client
│       ├── pages/       # Page components
│       ├── App.jsx      # Root component with routing
│       └── main.jsx     # Entry point
├── .gitignore
└── README.md
```

## Prerequisites

- **Node.js** v18+ (current: v24)
- **npm** v9+
- **MongoDB Atlas** account ([Sign up free](https://www.mongodb.com/cloud/atlas))

## Setup Instructions

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd unfazed
```

### 2. Set up the backend

```bash
cd unfazed-backend

# Copy the example env and fill in your MongoDB URI
cp .env.example .env

# Install dependencies
npm install

# Start the development server (with auto-restart)
npm run dev
```

The backend runs on **http://localhost:5001**.

Verify it's working:
```bash
curl http://localhost:5001/api/health
```

### 3. Set up the frontend

```bash
cd unfazed-frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend runs on **http://localhost:5173**.

### 4. Set up MongoDB Atlas

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free cluster.
2. Create a database user with read/write permissions.
3. Add your IP address to the network access list (or allow access from anywhere for development).
4. Get the connection string and update `MONGODB_URI` in `unfazed-backend/.env`.

## Environment Variables

### Backend (`unfazed-backend/.env`)

| Variable       | Description                          | Required |
|----------------|--------------------------------------|----------|
| `PORT`         | Server port (default: 5001)          | No       |
| `NODE_ENV`     | `development` or `production`        | No       |
| `MONGODB_URI`  | MongoDB Atlas connection string      | Yes      |
| `JWT_SECRET`   | Secret key for JWT token signing     | Yes      |
| `FRONTEND_URL` | Frontend URL for CORS                | Yes      |

### Frontend (`unfazed-frontend/.env`)

| Variable       | Description                          | Required |
|----------------|--------------------------------------|----------|
| `VITE_API_URL` | Backend API URL (for production)     | No*      |

\* In development, the Vite dev server proxies `/api` requests to the backend automatically.

## Development Progress

- [x] **Phase 0** — Project setup, folder structure, basic landing page
- [x] **Phase 1** — Authentication & branded profiles
- [x] **Phase 2** — Appointment scheduling
- [x] **Phase 3** — Client CRM & intake
- [x] **Phase 4** — Payments & packages
- [x] **Phase 5** — Clinical documentation
- [x] **Phase 6** — Communication & notifications
- [x] **Phase 7** — Subscriptions, entitlements & analytics

## Scripts

### Backend
| Command         | Description                           |
|-----------------|---------------------------------------|
| `npm run dev`   | Start with nodemon (auto-restart)     |
| `npm start`     | Start without auto-restart            |

### Frontend
| Command         | Description                           |
|-----------------|---------------------------------------|
| `npm run dev`   | Start Vite dev server                 |
| `npm run build` | Build for production                  |
| `npm run preview` | Preview production build            |

## License

ISC
