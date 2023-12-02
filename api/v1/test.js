const express = require('express');
const router = express.Router();

// basic endpoints to test saving data in the database
// should get removed eventually
router.get('/get', (_, res) => {
    res.send('dah');
});
router.post('/set', (_, res) => {
    res.send('dooh');
});

module.exports = router;