const express = require('express');
const router = express.Router();

// basic information endpoint
const path = require('path');

router.get('/', (_, res) => {
    res.status(200);
    res.sendFile(path.join(__dirname, '../../metadata.json'));
});

module.exports = router;