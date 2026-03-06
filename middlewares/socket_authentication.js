const jwt = require('jsonwebtoken');

exports.socketAuthentication = (socket, next) => {
    const token = socket.handshake.auth.token;
    try {
        // console.log(token);
        const user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        socket.user = user;
        next();
    } catch (err) {
        next(err);
    }
}