const {body} = require("express-validator");
const User = require("../models/user.model");

exports.registerationlidation = [
    body('email').isEmail().withMessage('Enter a vaild email').custom(async (value) => {
        const user = await User.findOne({where: {email: value}});
        if (user) return Promise.reject('Email already exists');
        return true;
    }),
    body('name').trim().isLength({min: 5, max: 30}).withMessage('name length from 5 -> 30'),
    body('password').trim().isStrongPassword({
        minLength: 6,
        minLowercase: 1,
        minNumbers: 1,
        minSymbols: 0,
        minUppercase: 1
    }).withMessage('Password must be at least 6 characters'),
];

exports.loginValidation = [
    body('email').trim().isEmail().withMessage('Enter a valid email').custom(async (value) => {
        const user = await User.findOne({ where : {email:value} });
        if( !user ){
            throw  new Error(`Invalid email or password`);
        }
    }).withMessage('Invalid email or password')
];

exports.forgotPasswordValidation = [
    body('email').trim().isEmail().withMessage('Enter a valid email'),
];

exports.resetPasswordValidation = [
    body('password').trim().isStrongPassword({
        minLength: 6,
        minLowercase: 1,
        minNumbers: 1,
        minSymbols: 0,
        minUppercase: 1
    }).withMessage('Password must be at least 6 characters and include upper/lowercase letters and numbers'),
];
