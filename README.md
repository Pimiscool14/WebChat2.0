# WebChat

Discord-style chat app with React, Socket.io, and MongoDB.

## Run locally

### 1. MongoDB

Install MongoDB locally or use [MongoDB Atlas](https://www.mongodb.com/atlas), then copy `server/.env.example` to `server/.env` and set `MONGO_URI`.

Important: don’t commit `server/.env` (it contains secrets).

### 2. Backend

```bash
cd server
npm install
npm start
```

Runs on http://localhost:3000

### 3. Frontend

```bash
cd client
npm install
npm run dev
```

Opens on http://localhost:5173

## Layout

- **Left rail** — Home, Friends, and server shortcuts
- **Sidebar** — server list, channels, or friends list
- **Right panel** — chat messages and composer (Discord-style)

## Friends

- Click the **👥** button on the left rail
- Add friends by username (they must have an account)
- **Pending** tab — accept or decline incoming requests
- Green dot = online, gray = offline
