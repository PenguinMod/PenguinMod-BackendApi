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
        const is_author = logged_in && username == authorUsername;

        const target_data = await utils.UserManager.getUserData(target);

        const id = target_data.id;
        const privateProfile = target_data.privateProfile;
        const canFollowingSeeProfile = target_data.allowFollowingView;

        if (privateProfile) {
            if (!logged_in) {
                await utils.error(res, 403, "PrivateProfile");
            }

            const user_id = await utils.UserManager.getIDByUsername(username);
            const is_following = await utils.UserManager.isFollowing(id, user_id);

            if (username !== target && (
                !(is_following && canFollowingSeeProfile) && !isMod
            )) {
                await utils.error(res, 403, "PrivateProfile");
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
