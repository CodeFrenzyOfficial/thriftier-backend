# Node.js + TypeScript Backend Starter

A production-grade starter for building REST APIs using Node.js, TypeScript, and Express with a clean layered architecture.

## Features

- TypeScript configured for strict mode
- Express app with:
  - Security headers via `helmet`
  - CORS
  - Rate limiting
  - Request logging via `morgan`
  - Centralized error handling
- Layered structure:
  - `controllers/`
  - `routes/`
  - `services/`
  - `middlewares/`
  - `utils/`
  - `types/`
- Environment-based config using `dotenv`
- Ready-to-use scripts for development and production

## Getting Started

```bash
npm install
npm run dev
```

Build and run in production:

```bash
npm run build
npm start
```

Environment variables live in `.env` (see `.env.example`).
