const fs = require("fs");
const path = require("path");
/**
 * @typedef {Object} Utils
 * @property {import("../../../../db/UserManager")} UserManager
 */

/**
 *
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.get("/api/v1/users/sendloginsuccess", async function (req, res) {
        const packet = req.query;

        // TODO: this is the last shitty vestage of token via parameters.
        // we need to change all the oauth things to make them somehow
        // give the client the client the token without doing this.
        // maybe we could make an iframe with the home page and send
        // across there?

        const token = String(packet.token);
        const username = String(packet.username).toLowerCase();

        if (!token || !username) {
            utils.error(res, 400, "Missing token or username");
            return;
        }

        let html = fs.readFileSync(
            path.join(utils.homeDir, "success.html"),
            "utf8",
        );

        html = html.replace("{{ HOMEPAGE }}", `"${utils.env.HomeURL}"`);

        res.status(200);
        res.header("Content-Type", "text/html");
        res.send(html);
    });
};
