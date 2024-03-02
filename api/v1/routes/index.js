const express = require('express');
const router = express.Router();

// basic endpoints to test saving data in the database
// should get removed eventually
router.get('/', (req, res) => {
    res.send('Hello World!');
});

module.exports = router;