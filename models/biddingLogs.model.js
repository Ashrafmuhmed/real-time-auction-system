const { sequelize } = require('../utils/db');
const {DataTypes} = require('sequelize');

const BiddingLogs = sequelize.define('biddingLogs', {

    id : {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
    } ,
    userId : {
        type: DataTypes.INTEGER,
        allowNull: false,
    } ,
    auctionId : {
        type: DataTypes.INTEGER,
        allowNull: false,
    } ,
    amount : {
        type: DataTypes.INTEGER,
        allowNull: false,
    }
} , {
    tableName: 'biddingLogs',
    timestamps: true,
});

module.exports = BiddingLogs;