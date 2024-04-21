const nodemailer = require('nodemailer');
const pug = require('pug');
const Transport = require('nodemailer-brevo-transport');

const { convert } = require('html-to-text');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `Tosin Onilogbo <${process.env.EMAIL_FROM}>`;
  }

  // 1) Create a transporter - is basically a service that sends the email because it's not node.js that sends the email itself.
  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      // Brevo
      return nodemailer.createTransport(
        new Transport({ apiKey: process.env.BREVO_APIKEY }), // generated ethereal password
      );
    }
    // Mailtrap
    return nodemailer.createTransport({
      // Mailtrap is good for safe email testing for development and staging. You can send fake emails to clients, but these emails
      // will never reach these clients and instead be trapped in your Mailtrap.
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  // Send the actual email
  async send(template, subject) {
    // 1) Render HTML based on the pug template
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject,
    });

    // 2) Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: convert(html), // including a text version of our email is better for email delivery rates and also for spam folders
    };

    // 3) Create a transport and send the email
    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send('welcome', 'Welcome to the Natours Family!');
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token (valid for only 10 minutes',
    );
  }
};

// This way no longer needed
// const sendEmail = async (options) => {
//   // 1) Create a transporter - is basically a service that sends the email because it's not node.js that sends the email itself.

//   // For Mailtrap
//   const transporter = nodemailer.createTransport({
//     // Mailtrap is good for safe email testing for development and staging. You can send fake emails to clients, but these emails
//     // will never reach these clients and instead be trapped in your Mailtrap.
//     host: process.env.EMAIL_HOST,
//     port: process.env.EMAIL_PORT,
//     auth: {
//       user: process.env.EMAIL_USERNAME,
//       pass: process.env.EMAIL_PASSWORD,
//     },
//   });
//   // For Gmail
//   //   const transporter = nodemailer.createTransport({
//   //     host: 'smtp.gmail.com',
//   //     port: 465,
//   //     secure: true, // true for 465, false for other ports
//   //     auth: {
//   //       user: process.env.EMAIL_USERNAME,
//   //       pass: process.env.EMAIL_PASSWORD,
//   //     },
//   //     // Activate in gmail "less secure app" option
//   //   });

//   // 2) Define the email options
//   const mailOptions = {
//     from: 'Tosin Onilogbo <tosin@io.com>',
//     to: options.email,
//     subject: options.subject,
//     text: options.message,
//   };

//   // 3) Send the email
//   await transporter.sendMail(mailOptions);
// };

// module.exports = sendEmail;
