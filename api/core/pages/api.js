const ApiVersions = require("../../../versions.json");

const StartTime = Date.now();

const TYPE = "GET";
const FUNC = (_, res) => {
    // display details in JSON
    const content = {
        "versions": ApiVersions,
        "since": StartTime
    };

    res.status(200);
    res.header("Content-Type", 'application/json');
    res.json(content);
};

module.exports = {
    type: TYPE,
    callback: FUNC
};