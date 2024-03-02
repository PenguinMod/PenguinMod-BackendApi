const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const express = require("express");
const v1Router = require("./v1/routes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: '*',
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
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

app.use("/api/v1", v1Router);

app.listen(PORT, () => {
  console.log(`API is listening on port ${PORT}`);
});