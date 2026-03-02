const { sequelize } = require('../utils/db');
const {DataTypes} = require("sequelize");

const Auction = sequelize.define('auction' , {
    title : {
        type : DataTypes.STRING,
        allowNull : false ,
        unique : true,
    } ,
    description : {
        type : DataTypes.STRING,
        allowNull : false ,
    } ,
    startPrice : {
        type : DataTypes.DOUBLE,
        allowNull : false ,
    } ,
    startTime : {
        type : DataTypes.DATE,
        allowNull : false ,
    } ,
    duration : { // in sec
        type : DataTypes.INTEGER,
        allowNull : false ,
    } ,
    status : {
        type : DataTypes.ENUM('active' , 'ended' , 'cancelled' , 'pending' ) ,
        default : 'pending' ,
    allowNull : false ,
    } ,
    sellerId : {
        type : DataTypes.INTEGER,
        allowNull : false ,
    } ,
    currentBid : {
        type : DataTypes.INTEGER,
        allowNull : true ,
    } ,
    winner : {
        type : DataTypes.INTEGER,
        allowNull : true ,
    }
} , {
    tableName : 'auctions',
    timestamps: false,
} );

module.exports = Auction;