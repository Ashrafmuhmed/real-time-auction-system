const Auction = require('../models/auction.model')
const BiddingLogs = require("../models/biddingLogs.model");
const auctionIdValidation = async (socket, auctionId) => {
    const auction = await Auction.findByPk(auctionId);
    if (!auction) {
        const err = new Error("This auction does not exist");
        err.statusCode = 500;
        throw err;
    }
    await socket.join(String(auction.id));
    return { auction };
}

const joinAuction = async (socket, payload, ack) => {
    try {

        if (typeof ack !== 'function') {
            return;
        }

        if (!payload) {
            return ack({error: 'payload missing'});
        }

        const auctionId = payload.auctionId;
        console.log('user ' + socket.user.email + ' trying to join ' + auctionId);

        let joinnedBefore = false;
        socket.rooms.forEach((room) => {
            joinnedBefore |= (room == auctionId);
        })

        if (joinnedBefore) {
            return ack({error: 'already in this auction'});
        }

        const { auction } = await auctionIdValidation(socket, auctionId);
        return ack({ msg: 'ok', auction });
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
