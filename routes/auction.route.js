const router = require('express').Router();
const auctionController = require('../controllers/auction.controller');
const auctionValidation = require('../validators/auction.validator');

router.get( '/' , auctionController.getAuctions  );

router.post( '/', auctionValidation.auctionCreationValidator ,auctionController.createAuction );

router.delete( '/:auction_id' , auctionController.removeAuction );


module.exports = router;