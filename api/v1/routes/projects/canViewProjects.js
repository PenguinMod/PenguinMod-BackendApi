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
    app.get("/api/v1/projects/canviewprojects", async (req, res) => {
        const viewing =
            await utils.UserManager.getRuntimeConfigItem("viewingEnabled");

        res.status(200).json({ viewing: viewing });
    });
};
