const fs = require('fs');
const path = require('path');

const UserManager = require("../../db/UserManager");

/**
 * @typedef {Object} Utils
 * @property {UserManager} UserManager
 */

/**
 * 
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.get("/api/v1/users/sendloginsuccess", async function (req, res) {
        const packet = req.query;

        const token = packet.token;
        const username = (String(packet.username)).toLowerCase();

        if (!token || !username) {
            utils.error(res, 400, "Missing token or username");
            return;
        }

        let html = fs.readFileSync(path.join(utils.homeDir, 'success.html'), 'utf8');

        html = html.replace("{{ HOMEPAGE }}", `"${utils.env.HomeURL}"`);

        res.status(200);
        res.header("Content-Type", "text/html");
        res.send(html);
    });
}