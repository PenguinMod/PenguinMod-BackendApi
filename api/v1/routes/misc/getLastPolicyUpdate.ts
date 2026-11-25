/**
 * @typedef {Object} Utils
 * @property {import("../../db/UserManager")} UserManager
 */

/**
 *
 * @param {import("express").Application} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.get("/api/v1/misc/getLastPolicyUpdate", async function (req, res) {
        const lastPolicyUpdate = await utils.UserManager.getLastPolicyUpdate();

        res.status(200).json(lastPolicyUpdate);
    });
};
