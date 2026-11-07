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
        "/api/v1/projects/interactions/voteToggle",
        utils.requireAuth(utils.UserManager),
        async (req, res) => {
            const packet = req.body;

            const vote = String(packet.toggle) === "true";
            const projectID = String(packet.projectId);

            const id = req.login.id;

            if (
                !projectID ||
                !(await utils.UserManager.projectExists(projectID))
            ) {
                return utils.error(res, 404, "Project not found");
            }

            if (
                (await utils.UserManager.hasVotedProject(projectID, id)) ===
                vote
            ) {
                return utils.error(res, 400, "DoesNothing");
            }

            await utils.UserManager.voteProject(projectID, id, vote);

            const metadata =
                await utils.UserManager.getProjectMetadata(projectID);

            const authorMeta = await utils.UserManager.getUserData(
                metadata.author.username,
            );

            const author_username = metadata.author.username;

            if (
                metadata.votes >= utils.env.LoveAmount &&
                !authorMeta.badges.includes("votes")
            ) {
                await utils.UserManager.addBadge(author_username, "votes");
                await utils.UserManager.sendMessage(
                    metadata.author.id,
                    { type: "newBadge", badge: "votes" },
                    false,
                    projectID,
                );
            }

            res.status(200).json({ success: true });
        },
    );
};
