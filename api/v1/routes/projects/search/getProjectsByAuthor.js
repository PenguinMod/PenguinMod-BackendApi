const UserManager = require("../../../db/UserManager");

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
    app.get('/api/v1/projects/getprojectsbyauthor', async (req, res) => {
        const packet = req.query;

        const username = String(packet.username).toLowerCase();
        const token = packet.token;

        const authorUsername = String(packet.authorUsername).toLowerCase();
        const page = utils.handle_page(packet.page);

        if (!authorUsername) {
            return utils.error(res, 400, "Missing author username");
        }

        if (!await utils.UserManager.existsByUsername(authorUsername)) {
            return utils.error(res, 404, "UserNotFound")
        }

        const logged_in = username && token && await utils.UserManager.loginWithToken(username, token);

        const target_data = await utils.UserManager.getUserData(authorUsername);
        const user_data = await utils.UserManager.getUserData(username);
        let isMod = false;
        if (logged_in)
            isMod = user_data.moderator || user_data.admin;

        const id = target_data.id;
        const privateProfile = target_data.privateProfile;
        const canFollowingSeeProfile = target_data.allowFollowingView;

        if (privateProfile) {
            if (!logged_in) {
                return await utils.error(res, 403, "PrivateProfile");
            }

            const user_id = await utils.UserManager.getIDByUsername(username);
            const is_following = await utils.UserManager.isFollowing(id, user_id);

            if (username !== authorUsername && (
                !(is_following && canFollowingSeeProfile) && !isMod
            )) {
                return await utils.error(res, 403, "PrivateProfile");
            }
        }

        const projects = (await utils.UserManager.getProjectsByAuthor(id, page, Number(utils.env.PageSize)))
        .map(project => {
            project.author = {
                username: authorUsername,
                id: id
            }

            return project;
        });

        for (const project of projects) {
            await utils.UserManager.addImpression(project.id);
        }

        return res.send(projects);
    });
}
