const { body } = require('express-validator');

const Auction = require('../models//auction.model');
const User = require('../models//user.model');


exports.auctionCreationValidator = [
    body('title').trim().isLength({ min: 5 , max: 30 }).custom(
        async value => {
            const auction = await Auction.findOne({ where : {title:value} });
            if ( auction ) {
                throw new Error('Title already exists');
            }
        }
    ).withMessage('Title already exists'),
];
