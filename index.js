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
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
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

// Endpoints can ask for these
const sharedDependencies = {
    db
};

glob('./api/**').then((paths) => { // ["/api/core/index.js", "/api/v1/test/get.js"] things like that
    // make sure these paths are usable
    const apiPaths = paths
        .map(path => "/" + path.replace(/\\/gmi, "/")) // makes these into valid URLs
        .filter(path => path.endsWith('.js')) // removes folders that only have other folders inside
        .map(path => path.endsWith('index.js') ? path.replace('/index.js', '') : path.replace('.js', '')); // index.js marks that the folder name should be the endpoint, otherwise the file name is the endpoint
    const filePaths = paths
        .filter(path => path.endsWith('.js')) // removes folders that only have other folders inside
        .map(path => "./" + path.replace(/\\/gmi, "/")); // makes them just typed the same way you would type them in a require function
    
    // create the endpoints on the app
    for (let i = 0; i < filePaths.length; i++) {
        const filePath = filePaths[i];
        const apiPath = apiPaths[i];
        const module = require(filePath);
        if (module.method && module.endpoint) {
            if (!app[module.method]) {
                console.warn('[!]', apiPath, 'has an invalid method');
                continue;
            }
            app[module.method](apiPath, (req, res) => {
                module.endpoint(req, res);
            });
            console.log('[-]', apiPath, 'is registered');
        } else {
            console.warn('[!]', apiPath, 'is missing a method and or endpoint');
        }
        // some modules need extra dependencies
        if (module.setDependencies) {
            module.setDependencies(sharedDependencies);
        }
    }
});

app.listen(port, () => console.log('[+] Started server on port ' + port));