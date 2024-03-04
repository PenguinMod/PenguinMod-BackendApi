const bodyParser = require('body-parser');
require('dotenv').config();
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const express = require("express");
const endpointLoader = require("./endpointLoader");
const um = require('./db/UserManager');
const cast = require("../utils/Cast");
const path = require('path');
const functions = require('../utils/functions');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: '*',
    utilsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}));
app.use(bodyParser.urlencoded({
    limit: process.env.ServerSize,
    extended: false
}));
app.set('trust proxy', 1);
app.use(rateLimit({
    validate: {
        trustProxy: true,
        xForwardedForHeader: true,
    },
    windowMs: 5000,  // 150 requests per 5 seconds
    limit: 150,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
}));

const Cast = new cast();
const UserManager = new um();
UserManager.init();

(async () => {
    await UserManager.init();

    endpointLoader(app, 'v1/routes', {
        UserManager: UserManager,
        homeDir: path.join(__dirname, "../"),
        Cast: Cast,
        escapeXML: functions.escapeXML,
        generateProfileJSON: functions.generateProfileJSON,
        safeZipParse: functions.safeZipParse
    });

    app.listen(PORT, () => {
        console.log(`API is listening on port ${PORT}`);
    });
})();