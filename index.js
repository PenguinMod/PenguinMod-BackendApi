require('dotenv').config();
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const express = require("express");
const endpointLoader = require("./api/endpointLoader");
const um = require('./api/db/UserManager');
const cast = require("./utils/Cast");
const path = require('path');
const functions = require('./utils/functions');

const app = express();
const PORT = process.env.PORT || 3000;
const MAXVIEWS = process.env.MAXVIEWS || 10000; // it will take up to 10000 views then reset after
const VIEWRESETRATE = process.env.VIEWRESETRATE || 1000 * 60 * 60; // reset every hour

app.use(cors({
    origin: '*',
    utilsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}));
app.use(express.urlencoded({
    limit: process.env.ServerSize,
    extended: false
}));
app.use(express.json({
    limit: process.env.ServerSize
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

function error(res, code, message) {
    res.status(code);
    res.header("Content-Type", 'application/json');
    res.json({ "error": message });
}

const Cast = new cast();
const UserManager = new um();

(async () => {
    await UserManager.init();

    app.get("/test", (req, res) => {
        res.sendFile(path.join(__dirname, 'test.html'));
    });

    endpointLoader(app, 'v1/routes', {
        UserManager: UserManager,
        homeDir: path.join(__dirname, "./"),
        Cast: Cast,
        escapeXML: functions.escapeXML,
        generateProfileJSON: functions.generateProfileJSON,
        safeZipParse: functions.safeZipParse,
        error: error,
        env: process.env
    });

    app.listen(PORT, () => {
        console.log(`API is listening on port ${PORT}`);
    });
})();