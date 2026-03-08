const Auction = require('./auction.model');
const User = require('./user.model');
const BiddingLogs = require('./biddingLogs.model');

exports.initAssociations = () => {

    User.hasMany(Auction, {
        foreignKey: 'sellerId' ,
        as : 'auctionsOrganizer' ,
        onDelete: 'CASCADE',
    });

    Auction.belongsTo(User, {
        as : 'seller' ,
        foreignKey : 'sellerId'
    });

    User.hasMany(Auction, {
        foreignKey: 'winner' ,
        as : 'auctionsWins'
    });

    Auction.belongsTo(User, {
        as : 'auctionWinner' ,
        foreignKey : 'winner'
    });


    Auction.belongsToMany(User, {
        as: 'auctionBids',
        through: BiddingLogs,
        onDelete: 'CASCADE',
        foreignKey: 'auctionId' ,
        otherKey: 'userId'
    });

    User.belongsToMany(Auction, {
        as : 'bids' ,
        through: BiddingLogs,
        onDelete: 'CASCADE',
        foreignKey: 'userId' ,
        otherKey : 'auctionId'
    });


}