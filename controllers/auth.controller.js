const User = require('../models/user.model');
const {validationResult} = require('express-validator');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const {Op} = require('sequelize');
const {generateAccessToken} = require('../utils/jwt_helpers');
const {sendPasswordResetEmail} = require('../utils/mail');

function ensureValidRequest(req) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error(errors.array()[0].msg);
        error.statusCode = 422;
        throw error;
    }
}

exports.register = async (req, res, next) => {
    try {
        const {email, password, name} = req.body;
        ensureValidRequest(req);
        const hashedPassword = await bcrypt.hash(password, 12);
        const user = await User.create({name, email, password: hashedPassword});
        res.status(200).json({message: 'successfully registered', user: {name, email}});
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.login = async (req, res, next) => {
    const {email, password} = req.body;
    ensureValidRequest(req);

    try {
        const user = await User.findOne({where: {email}});

        if (!user) {
            return res.status(401).json({message: 'Wrong email or password'});
        }

        const matchPassword = await bcrypt.compare(password, user.password);

        if (matchPassword) {
            const jwt = generateAccessToken(user);
            res.status(200).json({message: 'successfully logged in', token: jwt});
        } else {
            res.status(401).json({message: 'Wrong email or password'});
        }

    } catch (err) {
        if (!err.statusCode) err.statusCode = 500;
        next(err);
    }

};

exports.forgotPassword = async (req, res, next) => {
    try {
        ensureValidRequest(req);

        const {email} = req.body;
        const user = await User.findOne({where: {email}});

        if (!user) {
            return res.status(200).json({message: 'If the email exists, a reset link has been sent.'});
        }

        const rawToken = crypto.randomBytes(32).toString('hex');
        const expireAt = new Date(Date.now() + 15 * 60 * 1000);

        user.resetToken = rawToken;
        user.resetTokenExpire = expireAt;
        await user.save({fields: ['resetToken', 'resetTokenExpire']});

        const baseClientUrl =
            process.env.RESET_PASSWORD_CLIENT_URL ||
            `${req.protocol}://${req.get('host')}/auth/reset-password`;
        const resetUrl = `${baseClientUrl}${baseClientUrl.includes('?') ? '&' : '?'}token=${rawToken}`;

        try {
            await sendPasswordResetEmail({
                to: user.email,
                name: user.name,
                resetUrl,
            });
        } catch (mailError) {
            user.resetToken = null;
            user.resetTokenExpire = null;
            await user.save({fields: ['resetToken', 'resetTokenExpire']});
            throw mailError;
        }

        return res.status(200).json({message: 'If the email exists, a reset link has been sent.'});
    } catch (err) {
        if (!err.statusCode) err.statusCode = 500;
        next(err);
    }
};

exports.resetPassword = async (req, res, next) => {
    try {
        ensureValidRequest(req);

        const {token} = req.params;
        const {password} = req.body;

        const user = await User.findOne({
            where: {
                resetToken: token,
                resetTokenExpire: {
                    [Op.gt]: new Date(),
                },
            },
        });

        if (!user) {
            const error = new Error('Invalid or expired reset token');
            error.statusCode = 400;
            throw error;
        }

        user.password = await bcrypt.hash(password, 12);
        user.resetToken = null;
        user.resetTokenExpire = null;

        await user.save({fields: ['password', 'resetToken', 'resetTokenExpire']});

        return res.status(200).json({message: 'Password has been reset successfully'});
    } catch (err) {
        if (!err.statusCode) err.statusCode = 500;
        next(err);
    }
};

exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findByPk(req.user.userId, {
            attributes: ['id', 'name', 'email', 'registeredAt']
        });

        if (!user) {
            const err = new Error('User not found');
            err.statusCode = 404;
            throw err;
        }

        res.status(200).json({ user });
    } catch (err) {
        if (!err.statusCode) err.statusCode = 500;
        next(err);
    }
};
