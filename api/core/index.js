const path = require('path');

const method = "get";
const endpoint = (req, res) => {
    res.status(200);
    res.sendFile(path.join(__dirname, '../../metadata.json'));
};

module.exports = {
    method,
    endpoint
};