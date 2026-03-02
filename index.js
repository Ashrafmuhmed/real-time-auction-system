require('dotenv').config();

const cors = require('cors');
const express = require('express');

const authRouter = require('./routes/auth.route');
const auctionRouter = require('./routes/auction.route');
const {connectDb} = require('./utils/db');
const {isAuthenticated} = require("./middlewares/is_authenticated");

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', isAuthenticated , (req, res) => {
    res.status(200).json({ok: true});
});

app.use('/auth', authRouter);
app.use('/auction' , isAuthenticated , auctionRouter );

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
    app.listen(port, () => {
        console.log(`API listening on http://localhost:${port}`);
    });
})().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});

