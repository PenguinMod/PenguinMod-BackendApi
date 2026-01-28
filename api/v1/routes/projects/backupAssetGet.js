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
    app.get("/api/v1/projects/backupassetget", async (req, res) => {
        if (!(await utils.UserManager.getRuntimeConfigItem("viewingEnabled"))) {
            return utils.error(res, 503, "Viewing is disabled");
        }

        const packet = req.query;

        const asset_name = String(packet.asset_name);

        if (!asset_name) {
            return utils.error(res, 400, "No asset");
        }

        const asset = new Uint8Array(
            await utils.UserManager.backupAssetCheck(asset_name),
        ).buffer;

        if (!asset) {
            return utils.error(res, 400, "Not found");
        }

        res.header("Cache-Control", "public, max-age=999999999");
        return res.send(asset);
    });
};
