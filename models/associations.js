const Auction = require('./auction.model');
const User = require('./user.model');

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



}