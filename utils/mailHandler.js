const nodemailer = require('nodemailer');

const sender_mail = process.env.MAIL;
const app_pass = process.env.APP_PASS;

const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    auth: {
        user: sender_mail,
        pass: app_pass
    }
})

const sendVerificationEmail = async (mail, url) => {
  await transporter.sendMail({
    from: sender_mail,
    to: mail,
    subject: 'Email Verification',
    text: `Click the following link to verify your email: ${url}`,
  });
};

module.exports = {
  sendVerificationEmail,
};
