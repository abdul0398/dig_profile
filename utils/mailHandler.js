const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const sender_mail = process.env.MAIL;
const app_pass = process.env.APP_PASS;


// Construct the path to the HTML file in the 'views' directory
const htmlFilePath = path.join(__dirname, "..", 'views', 'email.html');

// Read the HTML file
let htmlContent = fs.readFileSync(htmlFilePath, 'utf8');



const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    auth: {
        user: sender_mail,
        pass: app_pass
    }
})

const sendVerificationEmail = async (mail, url) => {
  const mailHmtl = htmlContent.replace('{{verificationLink}}', url);
  await transporter.sendMail({
    from: sender_mail,
    to: mail,
    subject: 'Email Verification',
    text: mailHmtl,
  });
};

module.exports = {
  sendVerificationEmail,
};
