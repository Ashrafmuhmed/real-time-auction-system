const router = require('express').Router();
const authController = require('../controllers/auth.controller');
const authValidator = require('../validators/auth.validator');

router.post('/register', authValidator.registerationlidation, authController.register);

router.post('/login', authValidator.loginValidation , authController.login);

router.post('/forgot-password', authValidator.forgotPasswordValidation, authController.forgotPassword);

router.post('/reset-password/:token', authValidator.resetPasswordValidation, authController.resetPassword);

module.exports = router;
