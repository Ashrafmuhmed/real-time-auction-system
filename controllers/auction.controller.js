const Auction = require('../models/auction.model');
const User = require('../models/user.model');
const {validationResult} = require("express-validator");

function ensureValidRequest(req) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error(errors.array()[0].msg);
        error.statusCode = 422;
        throw error;
    }
}

exports.getAuctions = async (req, res, next) => {

    try {
        const auctions = await Auction.findAll({
            include: [
                {
                    model: User,
                    as: 'auctionWinner',
                    target: 'winner'
                },
                {
                    model: User,
                    as: 'seller',
                    target: 'sellerId'
                }
            ]
        });
        console.log(req.user);
        if (!auctions.length) {
            return res.status(200).json({
                message: "No auctions found."
            });
        } else {
            return res.status(200).json({
                message: "Auctions found.",
                auctions
            })
        }
    } catch (error) {
        if (!error.statusCode)
            error.statusCode = 500;
        next(error);
    }

}

exports.createAuction = async (req, res, next) => {

    try {
        ensureValidRequest(req);
        const {title, description, startPrice, startTime, duration, status} = req.body;
        const auction = await Auction.create({
            title,
            description,
            startPrice,
            startTime,
            duration,
            sellerId: req.user.userId,
            status: status ?? 'pending'
        });
        console.log(new Date(startTime));
        res.status(200).json({
            message: "Auction created successfully.",
            auction
        });
    } catch (error) {
        if (!error.statusCode)
            error.statusCode = 500;
        next(error);
    }

}

exports.removeAuction = async (req, res, next) => {

    const {auction_id} = req.params;

    try {

        const auction = await Auction.findByPk(auction_id);
        if (!auction) {
            const err = new Error('Invalid id');
            err.statusCode = 404;
            throw err;
        }

        await auction.destroy();

    } catch (error) {

        if (!error.statusCode)
            error.statusCode = 500;
        next(error);

    }


}

const VALID_TRANSITIONS = {
    pending: ['active'],
    active: ['ended'],
    ended: [],
    cancelled: []
};

exports.startAuction = async (req, res, next) => {
    try {
        const {auction_id} = req.params;
        const auction = await Auction.findByPk(auction_id);

        if (!auction) {
            const err = new Error('Auction not found');
            err.statusCode = 404;
            throw err;
        }

        if (auction.sellerId !== req.user.userId) {
            const err = new Error('Not authorized to start this auction');
            err.statusCode = 403;
            throw err;
        }

        const allowed = VALID_TRANSITIONS[auction.status] || [];
        if (!allowed.includes('active')) {
            const err = new Error(`Cannot start auction with status: ${auction.status}`);
            err.statusCode = 400;
            throw err;
        }

        auction.status = 'active';
        await auction.save();

        res.status(200).json({
            message: 'Auction started successfully',
            auction
        });
    } catch (error) {
        if (!error.statusCode) error.statusCode = 500;
        next(error);
    }
};

exports.endAuction = async (req, res, next) => {
    try {
        const {auction_id} = req.params;
        const auction = await Auction.findByPk(auction_id, {
            include: [
                { model: User, as: 'auctionWinner' },
                { model: User, as: 'seller' }
            ]
        });

        if (!auction) {
            const err = new Error('Auction not found');
            err.statusCode = 404;
            throw err;
        }

        if (auction.sellerId !== req.user.userId) {
            const err = new Error('Not authorized to end this auction');
            err.statusCode = 403;
            throw err;
        }

        const allowed = VALID_TRANSITIONS[auction.status] || [];
        if (!allowed.includes('ended')) {
            const err = new Error(`Cannot end auction with status: ${auction.status}`);
            err.statusCode = 400;
            throw err;
        }

        auction.status = 'ended';
        await auction.save();

        const {sendAuctionEndedEmail} = require('../utils/mail');
        if (auction.winner && auction.auctionWinner) {
            try {
                await sendAuctionEndedEmail({
                    to: auction.auctionWinner.email,
                    name: auction.auctionWinner.name,
                    auctionTitle: auction.title,
                    winningBid: auction.currentBid
                });
            } catch (mailErr) {
                console.error('Failed to send winner email:', mailErr);
            }
        }

        res.status(200).json({
            message: 'Auction ended successfully',
            auction
        });
    } catch (error) {
        if (!error.statusCode) error.statusCode = 500;
        next(error);
    }
};
