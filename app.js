// ============================
// ✅ BACKEND (app.js)
// ============================

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(bodyParser.json());

const otpStore = {}; // In-memory store

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

app.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  const now = Date.now();
  const existing = otpStore[email];

  if (existing && existing.expiresAt > now) {
    return res.json({ message: 'OTP already sent' });
  }

  const otp = generateOTP();
  otpStore[email] = { otp, expiresAt: now + 60000 };
  console.log(`Generated OTP for ${email}: ${otp}`);

  let transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your OTP Code',
    text: `Your OTP is: ${otp}\nIt is valid for 60 seconds.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ message: 'Error sending OTP' });
  }
});

app.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore[email];
  const now = Date.now();

  console.log(`🔍 Received email: ${email}`);
  console.log(`🔐 Received OTP: '${otp}'`);
  console.log(`📂 Stored OTP: '${record?.otp}'`);
  console.log(`⏱️  Expires at: ${record?.expiresAt}, Now: ${now}`);

  if (!record || record.expiresAt <= now) {
    delete otpStore[email];
    return res.status(400).json({ message: 'OTP expired or invalid' });
  }

  if (record.otp.toString() === otp.toString()) {
    delete otpStore[email];
    return res.json({ message: 'OTP verified successfully' });
  } else {
    return res.status(400).json({ message: 'Invalid OTP' });
  }
});

// Cleanup expired OTPs every 30 seconds
setInterval(() => {
  const now = Date.now();
  for (const email in otpStore) {
    if (otpStore[email].expiresAt <= now) {
      delete otpStore[email];
    }
  }
}, 30000);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));