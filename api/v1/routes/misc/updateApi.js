const { createHash, timingSafeEqual } = require("crypto");

module.exports = (app, utils) => {
    if (utils.env.IncludeReload !== "true") {
        return;
    }
    app.post("/api/v1/misc/updateApi", async (req, res) => {
        const packet = req.body;
        const headers = req.headers;

        const secretHash = "sha256=".concat(createHash("sha256").update(utils.env.ReloadApiKey).update(JSON.stringify(packet)).digest("hex"));
        const providedHash = headers["x-hub-signature-256"];

        utils.logs.sendServerLog(`in server: ${secretHash}\nsent: ${providedHash}`, 0x11c195);

        if (!timingSafeEqual(Buffer.from(secretHash), Buffer.from(providedHash))) {
            res.sendStatus(401);
            return;
        }

        // Now we send a request to the host machine since we're in a docker container
        utils.logs.sendServerLog("Received update request, restarting server...", 0x11c195);

        res.sendStatus(200);

        fetch("http://host.docker.internal:3000/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                token: utils.env.ReloadApiKey
            })
        });
    });
}