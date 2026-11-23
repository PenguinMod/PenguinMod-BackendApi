/**
 * @typedef {Object} Utils
 * @property {import("../../../db/UserManager")} UserManager
 */

/**
 *
 * @param {import("express").Application} app Express app
 * @param {Utils} utils Utils
 */

module.exports = "iamnotloadingonpurpose";

/*

module.exports = (app, utils) => {
    app.post(
        "/api/v1/projects/interactions/showMeMore",
        utils.cors(),
        async (req, res) => {
            const packet = req.body;

            const token = String(packet.token);

            const projectID = String(packet.projectID);

            if (!token || !projectID) {
                return res.status(400).json({ error: "Missing username, token, love, or projectID" });
            }

            const login = await utils.UserManager.loginWithToken(token);
            if (!login.success) {
                res.status(401).json({ error: "Reauthenticate" });
                return;
            }
            const username = login.username;

            if (!(await utils.UserManager.projectExists(projectID))) {
                return res.status(404).json({ error: "Project not found" });
            }

            const id = await utils.UserManager.getIDByUsername(username);

            const projectMeta =
                await utils.UserManager.getProjectMetadata(projectID);

            const instructions = projectMeta.instructions;
            const notes = projectMeta.notes;

            const concatted = instructions + "\n\n" + notes;

            await utils.UserManager.collectAndMore(id, concatted);

            return res.send({ success: true });
        },
    );
};

*/
