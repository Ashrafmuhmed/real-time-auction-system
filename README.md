# Real-Time Live Bidding Auction System

A Node.js + Socket.IO real-time auction platform.

## Features

- User authentication (register/login)
- Create, start, and end auctions
- Real-time bidding with Socket.IO
- Live countdown timers
- Bid history tracking

## Tech Stack

- **Backend:** Node.js, Express, Socket.IO
- **Database:** PostgreSQL, Sequelize
- **Auth:** JWT, bcrypt
- **Frontend:** Vanilla JS

## Setup

```bash
npm install
```

Create `.env` file:

```env
PORT=3000
DB_HOST=localhost
DB_NAME=auction_db
DB_USER=postgres
DB_PASS=your_password
JWT_SECRET=your_secret
```

```bash
npm start
```

Open `front/index.html` in browser.

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
