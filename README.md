# Real-Time Live Bidding Auction System

A real-time auction platform where users can create auctions, place bids, and watch live updates as the action happens. Built with Socket.IO for instant bid notifications and countdown timers.

## Features

- Real-time bid updates via WebSocket
- User authentication (register/login)
- Create and manage auctions
- Live countdown timers
- Bid history tracking

## Tech Stack

- **Backend:** Node.js, Express, Socket.IO
- **Database:** PostgreSQL, Sequelize
- **Auth:** JWT, bcrypt

## API Endpoints

### Auth
- `POST /auth/register` - Register
- `POST /auth/login` - Login
- `GET /auth/me` - Get current user

### Auctions
- `GET /auction` - List all
- `POST /auction` - Create
- `GET /auction/:id` - Get one
- `PUT /auction/:id` - Update
- `PUT /auction/:id/start` - Start
- `PUT /auction/:id/end` - End

### Users
- `GET /users/:id/auctions` - User's auctions
- `GET /users/:id/bids` - User's bids

## Socket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `joinAuction` | client→server | Join auction room |
| `placeBid` | client→server | Place bid |
| `startCountDown` | server→client | Timer start |
| `auction:update` | server→client | New bid |
| `auction:ended` | server→client | Auction ended |
