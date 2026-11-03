/**
 * @typedef {Object} Utils
 * @property {import("../../db/UserManager")} UserManager
 */

/**
 *
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.get("/api/v1/projects/canuploadprojects", async (req, res) => {
        const canUpload =
            await utils.UserManager.getRuntimeConfigItem("uploadingEnabled");

        res.status(200).json({ canUpload });
    });
};
