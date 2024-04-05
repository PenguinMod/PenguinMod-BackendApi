require('dotenv').config();
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const express = require("express");
const endpointLoader = require("./api/endpointLoader");
const um = require('./api/v1/db/UserManager');
const cast = require("./utils/Cast");
const path = require('path');
const functions = require('./utils/functions');
const multer = require('multer');
const protobuf = require('protobufjs');

const app = express();
const PORT = process.env.PORT || 3000;
const MAXVIEWS = process.env.MaxViews || 10000; // it will take up to 10000 views then reset after
const VIEWRESETRATE = process.env.ViewResetRate || 1000 * 60 * 60; // reset every hour
const MAXASSETS = process.env.MaxAssets || 40;
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

const Cast = new cast();
const UserManager = new um();

(async () => {
    await UserManager.init(MAXVIEWS, VIEWRESETRATE);

    app.get("/test", (req, res) => {
        res.sendFile(path.join(__dirname, 'test.html'));
    });

    endpointLoader(app, 'v1/routes', {
        UserManager: UserManager,
        homeDir: path.join(__dirname, "./"),
        Cast: Cast,
        escapeXML: functions.escapeXML,
        error: functions.error,
        env: process.env,
        upload: upload,
        MAXASSETS: MAXASSETS,
        projectProto: protobuf.loadSync('api/v1/db/protobufs/project.proto')
    });

    app.listen(PORT, () => {
        console.log(`API is listening on port ${PORT}`);
    });
})();