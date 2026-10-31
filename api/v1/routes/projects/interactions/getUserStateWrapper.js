/**
 * @typedef {Object} Utils
 * @property {import("../../../db/UserManager")} UserManager
 */

/**
 *
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.get(
        "/api/v1/projects/getuserstatewrapper",
        utils.requireAuth(utils.UserManager),
        async (req, res) => {
            const packet = req.query;

            const projectID = String(packet.projectId);

            const id = req.login.id;

            if (
                !projectID ||
                !(await utils.UserManager.projectExists(projectID))
            ) {
                return utils.error(res, 404, "Project not found");
            }

            // TODO: probably condense this into one db operation
            const hasLoved = await utils.UserManager.hasLovedProject(
                projectID,
                id,
            );
            const hasVoted = await utils.UserManager.hasVotedProject(
                projectID,
                id,
            );

            return res.send({ hasLoved, hasVoted });
        },
    );
};
