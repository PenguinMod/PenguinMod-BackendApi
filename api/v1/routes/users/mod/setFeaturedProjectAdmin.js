module.exports = (app, utils) => {
    app.post('/api/v1/users/setmyfeaturedprojectadmin', async function (req, res) {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const target = (String(packet.target)).toLowerCase();
        const project = packet.project;
        const title = packet.title;

        if (!await utils.UserManager.loginWithToken(username, token)) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }

        if (!await utils.UserManager.isAdmin(username) && !await utils.UserManager.isModerator(username)) {
            utils.error(res, 400, "Unauthorized");
            return;
        }

        if (typeof project !== "number" || typeof title !== "number") {
            utils.error(res, 400, "InvalidInput")
            return;
        }

        if (!await utils.UserManager.projectExists(project)) {
            utils.error(res, 400, "InvalidProject")
            return;
        }

        if (packet.title < 0 || packet.title > 500) {
            utils.error("InvalidTitleType")
        }

        await utils.UserManager.setFeaturedProject(target, project);
        await utils.UserManager.setFeaturedProjectTitle(target, title);

        utils.logs.sendAdminLog(username, target, "Admin or mod has updated user's featured project.");

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send({ "success": true });
    });
}
