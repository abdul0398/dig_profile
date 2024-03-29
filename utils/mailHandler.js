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
    host: 'mail.jomejourney.com',
    port: 465,
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
    html: mailHmtl,
  });
};

 async function sentLeadMail(mail, leadStr){
  await transporter.sendMail({
    from: sender_mail,
    to: mail,
    subject: "You Got A Lead",
    text: leadStr,
  });
}

async function bulkMailSender(mails, leadStr) {
  if(mails?.length === 0 || mails[0] === "") return;
  try {
    mails.forEach(async mail=>{
      if(mail != ""){
        await sentLeadMail(mail, leadStr);
      }
    })
  } catch (error) {
    console.log("Error is sending the Lead to mail", error.message);
    return;
  }
}

module.exports = {
  sendVerificationEmail,
  sentLeadMail,
  bulkMailSender
};
