const Auction = require('../models/auction.model')
exports.joinAuction = async (socket, auctionId) => {
    const auction = await Auction.findByPk(auctionId);
    if (!auction) {
        const err = new Error("This auction does not exist");
        err.statusCode = 500;
        throw err;
    }
    return socket.join(auction.id);
}