const Auction = require('../models/auction.model')
const BiddingLogs = require("../models/biddingLogs.model");
const User = require('../models/user.model');

const getAuctionTiming = (auction) => {
    const startTimeMs = new Date(auction.startTime).getTime();
    const durationSeconds = Number(auction.duration);
    if (!Number.isFinite(startTimeMs) || !Number.isFinite(durationSeconds)) {
        const err = new Error('Invalid auction timing configuration');
        err.statusCode = 500;
        throw err;
    }
    return {
        startTimeMs,
        endTimeMs: startTimeMs + (durationSeconds * 1000),
    };
};

const auctionIdValidation = async (socket, auctionId) => {
    const auction = await Auction.findByPk(auctionId , {
        include: [
            {
                model : User ,
                as : 'seller'
            }
        ]
    });

    // if no auction with that id
    if (!auction) {
        const err = new Error("This auction does not exist");
        err.statusCode = 404;
        throw err;
    }

    // if the auction has ended
    const {startTimeMs, endTimeMs} = getAuctionTiming(auction);
    if (Date.now() >= endTimeMs) {
        const err = new Error("Auction expired");
        err.statusCode = 409;
        throw err;
    }

    if( socket.user.userId === auction.seller.id ){
        const err = new Error("You are the creator of this auction you are not allowed to join it.");
        err.statusCode = 403;
        throw err;
    }

    return { auction, startTimeMs, endTimeMs, roomId: String(auction.id) };
}

const joinAuction = async (socket, payload, ack, io) => {
    try {

        if (typeof ack !== 'function') {
            return;
        }

        if (!payload) {
            return ack({error: 'payload missing'});
        }

        const auctionId = String(payload.auctionId);
        console.log('user ' + socket.user.email + ' trying to join ' + auctionId);

        const { auction, endTimeMs, roomId } = await auctionIdValidation(socket, auctionId);

        if (socket.rooms.has(roomId)) {
            return ack({error: 'already in this auction'});
        }

        await socket.join(roomId);

        const serverNowMs = Date.now();
        socket.emit('startCountDown', {
            auctionId: roomId,
            endTime: endTimeMs,
            serverNow: serverNowMs,
        });

        ack({ msg: 'ok', auction, auctionId: roomId, endTime: endTimeMs, serverNow: serverNowMs });
    } catch (error) {
        console.log(error);
        return ack({error: error.message || error});
    }
};

const bidValidation = async (auctionId, amount, options = {}) => {

    const {transaction, lock, auction: existingAuction} = options;
    const auction = existingAuction;

    if (!auction) {
        const err = new Error("This auction does not exist");
        err.statusCode = 500;
        throw err;
    }

    if (auction.currentBid == null) {

        // make sure the bid is higher than the start price
        if (auction.startPrice > amount) {
            const err = new Error('The cant be lass than the start price');
            err.statusCode = 500;
            throw err;
        }

    } else {

        // there is already someone added the highest bit
        if (auction.currentBid >= amount) {
            const err = new Error('The bid value cant be lass than the current highest bid');
            err.statusCode = 500;
            throw err;
        }

    }

};

const placeBid = async ( payload , ack , sequelize , io , socket ) => {
    if (typeof ack !== 'function') {
        return;
    }
    try {
        if (!payload) {
            return ack({error: 'payload missing'});
        }

        const {auctionId, amount} = payload;
        if (!auctionId || !amount) {
            return ack({error: 'missing payload data'});
        }
        console.log('placing bid', {user: socket.user.email, auctionId, amount});

        await sequelize.transaction(async (t) => {
            const auction = await Auction.findByPk(auctionId, {
                transaction: t,
                lock: t.LOCK.UPDATE,
            });

            if (!auction) {
                const err = new Error("This auction does not exist");
                err.statusCode = 404;
                throw err;
            }

            const {startTimeMs, endTimeMs} = getAuctionTiming(auction);
            const nowMs = Date.now();

            // cant place a bid, the auction hasnt started yet
            if (nowMs < startTimeMs) {
                const err = new Error('This auction has not started yet.');
                err.statusCode = 409;
                throw err;
            }

            // cant place a bit, the auction has finished
            if (nowMs >= endTimeMs) {
                const err = new Error('This auction is already finished.');
                err.statusCode = 409;
                throw err;
            }

            await bidValidation(auctionId, amount, {
                transaction: t,
                lock: t.LOCK.UPDATE,
                auction,
            });

            auction.currentBid = amount;
            auction.winner = socket.user.userId;
            await auction.save({transaction: t});

            await BiddingLogs.create({
                userId: socket.user.userId,
                auctionId,
                amount,
            }, {transaction: t});
        });

        io.to(String(auctionId)).emit('auction:update', {
            auctionId,
            amount,
            bidder: socket.user.userId,
        });
        return ack({msg: 'ok', auctionId, amount});
    } catch (error) {
        console.log(error);
        return ack({error: error.message || error});
    }
};

module.exports = {
    auctionIdValidation,
    joinAuction,
    bidValidation,
    placeBid
};
