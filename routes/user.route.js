const router = require('express').Router();
const auctionController = require('../controllers/auction.controller');

router.get( '/:userId/auctions', auctionController.getUserAuctions );

router.get( '/:userId/bids', auctionController.getUserBids );

module.exports = router;
