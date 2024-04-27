require('dotenv').config();
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const express = require("express");
const endpointLoader = require("./api/endpointLoader");
const um = require('./api/v1/db/UserManager');
const cast = require("./utils/Cast");
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const requestIp = require('request-ip');
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

function sendHeatLog(text, type, location, color="\x1b[0m") {
    const body = JSON.stringify({
        embeds: [{
            title: `Filter Triggered`,
            color: 0xff0000,
            description: `\`\`\`${text}\n\`\`\``,
            fields: [
                {
                    name: "Type",
                    value: `\`${type}\``
                },
                {
                    name: "Location",
                    value: `${JSON.stringify(location)}`
                }
            ],
            timestamp: new Date().toISOString()
        }]
    });
    fetch(process.env.HeatWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body
    });
}

function sendBioUpdateLog(username, target, oldBio, newBio) {
    const body = JSON.stringify({
        content: `${target}'s bio was edited by ${username}`,
        embeds: [{
            title: `${target} had their bio edited`,
            color: 0xff0000,
            fields: [
                {
                    name: "Edited by",
                    value: `${username}`
                },
                {
                    name: "URL",
                    value: `https://penguinmod.com/profile?user=${target}`
                },
            ],
            author: {
                name: String(target).substring(0, 50),
                icon_url: String("https://trampoline.turbowarp.org/avatars/by-username/" + String(target).substring(0, 50)),
                url: String("https://penguinmod.com/profile?user=" + String(target).substring(0, 50))
            },
            timestamp: new Date().toISOString()
        }, {
            title: `New Bio for ${target}`,
            color: 0xffbb00,
            description: `${newBio}`
        }, {
            title: `Original Bio for ${target}`,
            color: 0xffbb00,
            description: `${oldBio}`
        }]
    });
    fetch(process.env.ApproverLogWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body
    });
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

    app.get("/test", (req, res) => {
        res.sendFile(path.join(__dirname, 'test.html'));
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
        uploadCooldown: process.env.uploadCooldown || 1000 * 60 * 8,
        unlinkAsync: promisify(fs.unlink),
        path: path,
        PORT: PORT,
        sendHeatLog: sendHeatLog,
        sendBioUpdateLog: sendBioUpdateLog
    });

    app.listen(PORT, () => {
        console.log(`API is listening on port ${PORT}`);
    });
})();