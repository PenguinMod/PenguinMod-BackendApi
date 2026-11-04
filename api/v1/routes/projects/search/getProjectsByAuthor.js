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
    app.get(
        "/api/v1/projects/getprojectsbyauthor",
        utils.maybeAuth(utils.UserManager),
        async (req, res) => {
            const packet = req.query;

            const authorUsername = String(packet.authorUsername).toLowerCase();
            const page = utils.handle_page(packet.page);

            if (
                !authorUsername ||
                !(await utils.UserManager.existsByUsername(authorUsername))
            ) {
                return utils.error(res, 404, "User not found");
            }

            const logged_in = !!req.login;
            const username = logged_in ? req.login.username : null;

            const target_data =
                await utils.UserManager.getUserData(authorUsername);
            let isMod = false;
            if (logged_in) {
                const user_data = await utils.UserManager.getUserData(username);
                isMod = user_data.moderator || user_data.admin;
            }

            const id = target_data.id;
            const privateProfile = target_data.privateProfile;
            const canFollowingSeeProfile = target_data.allowFollowingView;

            if (privateProfile) {
                if (!logged_in) {
                    return await utils.error(res, 403, "PrivateProfile");
                }

                const user_id = req.login.id;
                const is_following = await utils.UserManager.isFollowing(
                    id,
                    user_id,
                );

                if (
                    username !== authorUsername &&
                    !(is_following && canFollowingSeeProfile) &&
                    !isMod
                ) {
                    return await utils.error(res, 403, "PrivateProfile");
                }
            }

            const projects = (
                await utils.UserManager.getProjectsByAuthor(
                    id,
                    page,
                    Number(utils.env.PageSize),
                )
            ).map((project) => {
                project.author = {
                    username: authorUsername,
                    id: id,
                };

                return project;
            });

            for (const project of projects) {
                await utils.UserManager.addImpression(project.id);
            }

            return res.send(projects);
        },
    );
};
