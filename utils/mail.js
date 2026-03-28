const sgMail = require('@sendgrid/mail');

function assertSendGridReady() {

    if (!process.env.SENDGRID_API_KEY) {
        const error = new Error('Missing SENDGRID_API_KEY environment variable.');
        error.statusCode = 500;
        throw error;
    }

    if (!process.env.SENDGRID_FROM_EMAIL) {
        const error = new Error('Missing SENDGRID_FROM_EMAIL environment variable.');
        error.statusCode = 500;
        throw error;
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

exports.sendPasswordResetEmail = async ({to, name, resetUrl}) => {
    assertSendGridReady();

    await sgMail.send({
        to,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: 'Password reset request',
        text:
            `Hello ${name || ''},\n\n` +
            `You requested to reset your password. Use this link:\n${resetUrl}\n\n` +
            'This link expires in 15 minutes.\n' +
            'If you did not request this, ignore this email.',
        html:
            `<p>Hello ${name || ''},</p>` +
            '<p>You requested to reset your password.</p>' +
            `<p><a href="${resetUrl}">Reset password</a></p>` +
            '<p>This link expires in 15 minutes.</p>' +
            '<p>If you did not request this, ignore this email.</p>',
    });
};

exports.sendAuctionEndedEmail = async ({to, name, auctionTitle, winningBid}) => {
    assertSendGridReady();

    await sgMail.send({
        to,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: `Congratulations! You won the auction: ${auctionTitle}`,
        text:
            `Hello ${name || ''},\n\n` +
            `Congratulations! You have won the auction "${auctionTitle}" with a bid of $${winningBid}.\n\n` +
            'Please contact the seller for next steps.',
        html:
            `<p>Hello ${name || ''},</p>` +
            `<p>Congratulations! You have won the auction "<strong>${auctionTitle}</strong>" with a bid of <strong>$${winningBid}</strong>.</p>` +
            '<p>Please contact the seller for next steps.</p>',
    });
};
