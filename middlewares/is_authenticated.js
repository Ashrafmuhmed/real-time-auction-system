const {verifyAccessToken} = require("../utils/jwt_helpers");
exports.isAuthenticated = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if(!authHeader){
        const err = new Error('Not authorized');
        err.status = 401;
        return next(err);
    }
    const token = req.headers.authorization.split(' ')[1];
    console.log(authHeader);
    try {
        const decod = verifyAccessToken(token);
        if (decod) {
            req.user = decod; // id , email
            next();
        } else {
            throw new Error('Unauthorized');
        }

    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({error: 'Access token expired'});
        }
        return res.status(403).json({error: 'Invalid access token'});
    }
}