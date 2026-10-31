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
    app.post(
        "/api/v1/users/setmyfeaturedproject",
        utils.requireAuth(utils.UserManager),
        async function (req, res) {
            const packet = req.body;

            const project = String(packet.project);
            const title = Number(packet.title);

            const username = req.login.username;

            if (!project || !(await utils.UserManager.projectExists(project))) {
                utils.error(res, 400, "InvalidProject");
                return;
            }

            if (packet.title < 0 || packet.title > 500) {
                utils.error(res, 400, "InvalidTitle");
            }

            await utils.UserManager.setFeaturedProject(username, project);
            await utils.UserManager.setFeaturedProjectTitle(username, title);

            res.status(200);
            res.header("Content-Type", "application/json");
            res.send({ success: true });
        },
    );
};
