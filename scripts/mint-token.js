require('dotenv/config');
const jwt = require('jsonwebtoken');
const [role = 'CLINICIAN', sub = 'usr_dr_smith'] = process.argv.slice(2);
console.log(
  jwt.sign({ role }, process.env.JWT_SECRET, {
    subject: sub,
    algorithm: 'HS256',
    expiresIn: '1h',
  }),
);
