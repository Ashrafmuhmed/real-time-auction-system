require('dotenv').config();

const cors = require('cors');
const express = require('express');
const http = require('http');
const {Server} = require('socket.io');

const authRouter = require('./routes/auth.route');
const auctionRouter = require('./routes/auction.route');
const {connectDb, sequelize} = require('./utils/db');
const {isAuthenticated} = require("./middlewares/is_authenticated");
const {socketAuthentication} = require('./middlewares/socket_authentication');
const auctionSocketController = require('./controllers/auctionSocket.controller');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*'
    }
});
app.use(cors());
app.use(express.json());

app.get('/health', isAuthenticated, (req, res) => {
    res.status(200).json({ok: true});
});

io.use(socketAuthentication);
io.on('connection', (socket) => {

    console.log('User connected : ' + socket.user.email);

    socket.on('disconnect', () => {
        console.log('User disconnected : ' + socket.id);
    });

    socket.on('joinAuction', async (payload, ack) => {
        return await auctionSocketController.joinAuction(socket, payload, ack, io);
    });

    socket.on( 'placeBid' , async ( payload , ack ) => {
        return await auctionSocketController.placeBid(payload, ack, sequelize, io, socket);
    });


});


app.use('/auth', authRouter);
app.use('/auction', isAuthenticated, auctionRouter);

app.use((req, res) => {
    res.status(404).json({error: 'Not found'});
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.statusCode ? err.statusCode : 500).json({error: err.message});
});

const port = Number(process.env.PORT) || 3000;
(async () => {
    await connectDb();
    console.log('Database Connected');
    server.listen(port, () => {
        console.log(`API listening on http://localhost:${port}`);
    });
})().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
