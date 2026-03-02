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
