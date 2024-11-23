require('dotenv').config();
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
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
require('colors');

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
const PORT = Number(process.env.PORT) || 8080;
const MAXVIEWS = Number(process.env.MaxViews) || 10000; // it will take up to 10000 views then reset after
const VIEWRESETRATE = Number(process.env.ViewResetRate) || 1000 * 60 * 60; // reset every hour
const upload = multer({
    dest: 'tmp/uploads/',
    limits: { fileSize: ((Number(process.env.UploadSize)) || 5)  * 1024 * 1024 } // 5mb - max size per asset
});

app.use(cors({
    origin: '*', // this gets overwritten by some endpoints (all that use your login)
    utilsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
})); 
app.use(bodyParser.json());
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
    windowMs: 5000,  // 20 requests per 5 seconds
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
}));
app.use(requestIp.mw());

const Cast = new cast();
const UserManager = new um();

(async () => {
    await UserManager.init(MAXVIEWS, VIEWRESETRATE);

    // log when starting and what time zone (utc+-x)
    console.log(`Starting at ${new Date().toLocaleString('en-US', { timeZone: 'CST' })} CST...`.green);

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

    function cumulative_file_size_limit(utils) {
        return async function (req, res, next) {
            const unlink = async () => {
                if (req.files.jsonFile)
                await utils.unlinkAsync(req.files.jsonFile[0].path);
                if (req.files.thumbnail)
                await utils.unlinkAsync(req.files.thumbnail[0].path);
                for (let asset of req.files.assets) {
                    await utils.unlinkAsync(asset.path);
                }
            }

            const maxCombinedSize = (Number(process.env.CumulativeUploadSize) || 32) * 1024 * 1024;
            let combinedSize = 0;

            if (req.files.jsonFile) combinedSize += req.files.jsonFile[0].size;
            if (req.files.thumbnail) combinedSize += req.files.thumbnail[0].size;

            if (req.files.assets)
                for (let asset of req.files.assets)
                    combinedSize += asset.size;

            if (combinedSize > maxCombinedSize) {
                await unlink();
                return utils.error(res, 400, "Files too big");
            }

            next();
        }
    }

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
        ipaddr,
        rateLimiter: rateLimit,
        cumulative_file_size_limit: cumulative_file_size_limit,
        cors: () => cors({
            origin: function (origin, callback) {
                const whitelist = [process.env.HomeURL, "http://localhost:5173", "http://test.mydomain.com:5173"];
                const idxWebPreview = ".cloudworkstations.dev"; //project idx sigma development
                if (!origin || whitelist.indexOf(origin) !== -1 || origin.endsWith(idxWebPreview)) {
                  callback(null, true)
                } else {
                  callback(null, false)
                }
            },
        }),
    });

    app.use((err, req, res, next) => {
        if (err instanceof multer.MulterError) {
            return error(res, 400, `One of your assets is too large. The maximum size is ${Number(process.env.UploadSize) || 5}mb.`);
        }

        console.error(err);
        error(res, 500, "InternalError");
    })

    app.listen(PORT, () => {
        console.log(`API is listening on port ${PORT}`);
    });
})();
