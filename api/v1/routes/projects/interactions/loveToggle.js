/**
 * @typedef {Object} Utils
 * @property {import("../../../db/UserManager")} UserManager
 */

/**
 *
 * @param {import("express").Application} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.post(
        "/api/v1/projects/interactions/loveToggle",
        utils.requireAuth(utils.UserManager),
        async (req, res) => {
            const packet = req.body;

            const love = String(packet.toggle) === "true";
            const projectID = String(packet.projectId);

            const id = req.login.id;

            if (
                !projectID ||
                !(await utils.UserManager.projectExists(projectID))
            ) {
                return utils.error(res, 404, "Project not found");
            }

            if (
                (await utils.UserManager.hasLovedProject(projectID, id)) ===
                love
            ) {
                return utils.error(res, 400, "DoesNothing");
            }

            const projectMeta =
                await utils.UserManager.getProjectMetadata(projectID);
            const authorID = projectMeta.author.id;
            const authorUsername = projectMeta.author.username;
            const authorMeta =
                await utils.UserManager.getUserData(authorUsername);

            if (
                projectMeta.loves >= utils.env.LoveAmount &&
                !authorMeta.badges.includes("likes")
            ) {
                await utils.UserManager.addBadge(authorUsername, "likes");
                await utils.UserManager.sendMessage(
                    authorID,
                    { type: "newBadge", badge: "likes" },
                    false,
                    projectID,
                );
            }

            const instructions = projectMeta.instructions;
            const notes = projectMeta.notes;

            const concatted = instructions + "\n\n" + notes;

            await utils.UserManager.loveProject(projectID, id, love);
            await utils.UserManager.collectAndInteractLove(id, concatted, love);

            res.status(200).json({ success: true });
        },
    );
};
