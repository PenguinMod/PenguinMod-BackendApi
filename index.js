require('dotenv').config();

const BlockedIPs = require("./blockedips.json"); // if you are cloning this, make sure to make this file

const express = require('express');
const { MongoClient, ServerApiVersion } = require("mongodb");
const bodyParser = require('body-parser');
const { glob } = require("glob");
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const app = express();
const port = 8080;
const maxSize = '50mb';

// connect to MongoDB
const dbClient = new MongoClient("mongodb://127.0.0.1:27017", {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
await dbClient.connect();
const db = dbClient.db("penguinmod");
await db.command({ ping: 1 });

app.use(cors({
    origin: '*',
    utilsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}));
app.use(bodyParser.urlencoded({
    limit: maxSize,
    extended: false
}));
app.use(bodyParser.json({ limit: maxSize }));
app.use((req, res, next) => {
    if (BlockedIPs.includes(req.ip)) return res.sendStatus(403);
    console.log(`${req.ip}: ${req.originalUrl}`);
    next();
});
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
app.get('/', async function (_, res) { // just basic stuff. returns the home page
    res.redirect('https://penguinmod.com');
});
app.get('/robots.txt', async function (_, res) { // more basic stuff!!!!! returns robots.txt
    res.sendFile(path.join(__dirname, './robots.txt'));
});

// TODO: how are endpoints gonna get this?
const sharedDependencies = {
    db
};

// routers
const router_core = require('./api/core');
const router_test = require('./api/v1/test');
// "endpoints"
app.use('/api/core', router_core);
app.use('/api/v1/test', router_test);

app.listen(port, () => console.log('[+] Started server on port ' + port));