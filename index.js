require('dotenv').config();
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const express = require("express");
const endpointLoader = require("./api/endpointLoader");
const um = require('./api/v1/db/UserManager');
const cast = require("./utils/Cast");
const logs = require('./utils/Logs');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const requestIp = require('request-ip');
const {OAuth2Client} = require('google-auth-library');
const ipaddr = require('ipaddr.js');
const { promisify } = require('util');

function escapeXML(unsafe) {
    unsafe = String(unsafe);
    return unsafe.replace(/[<>&'"\n]/g, c => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            case '\n': return '&#10;'
        }
    });
};

function error(res, code, error) {
    res.status(code);
    res.header("Content-Type", 'application/json');
    res.json({ "error": error });
}

const app = express();
const PORT = process.env.PORT || 8080;
const MAXVIEWS = process.env.MaxViews || 10000; // it will take up to 10000 views then reset after
const VIEWRESETRATE = process.env.ViewResetRate || 1000 * 60 * 60; // reset every hour
const upload = multer({ dest: 'tmp/uploads/' });

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
app.use(requestIp.mw());

const Cast = new cast();
const UserManager = new um();

(async () => {
    await UserManager.init(MAXVIEWS, VIEWRESETRATE);

    /*
    app.get("/test", (req, res) => {
        res.sendFile(path.join(__dirname, 'test.html'));
    });
    */

    app.use((req, res, next) => {
        // get the actuall ip
        req.realIP = ipaddr.process(process.env.isCFTunnel === "true" ? req.get("CF-Connecting-IP") : req.clientIp);

        if (req.realIP.kind() === 'ipv6') {
            req.realIP = req.realIP.toNormalizedString();
        } else {
            req.realIP = req.realIP.toIPv4MappedAddress().toNormalizedString();
        }
        
        next();
    });

    // ip banning
    app.use(async (req, res, next) => {
        if (await UserManager.isIPBanned(req.realIP)) {
            return error(res, 418, "You are banned from using this service."); // 418 for the sillies
        }
        next();
    });

    app.get("/robots.txt", (req, res) => {
        res.sendFile(path.join(__dirname, 'robots.txt'));
    });

    endpointLoader(app, 'v1/routes', {
        UserManager: UserManager,
        homeDir: path.join(__dirname, "./"),
        Cast: Cast,
        escapeXML: escapeXML,
        error: error,
        env: process.env,
        upload: upload,
        allowedSources: ["https://extensions.penguinmod.com", "https://extensions.turbowarp.org"],
        uploadCooldown: Number(process.env.UploadCooldown) || 1000 * 60 * 8,
        unlinkAsync: promisify(fs.unlink),
        path: path,
        PORT: PORT,
        logs,
        googleOAuth2Client: OAuth2Client,
        ipaddr
    });

    app.use((err, req, res, next) => {
        console.log(`ERROR: ${err}`);
        res.status(500);
        res.send("An error occured, sorry about that.");
    })

    app.listen(PORT, () => {
        console.log(`API is listening on port ${PORT}`);
    });
})();