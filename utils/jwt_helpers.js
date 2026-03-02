const jwt = require('jsonwebtoken');

exports.generateAccessToken = (user) => {
    return jwt.sign(
        { userId : user.id , email : user.email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY },
    )
};

exports.verifyAccessToken = (token) => {
    return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
}