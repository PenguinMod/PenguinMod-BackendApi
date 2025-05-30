module.exports = (app, utils) => {
    app.post('/api/v1/users/setmyfeaturedproject', utils.cors(), async function (req, res) {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const project = String(packet.project);
        const title = packet.title;

        if (!await utils.UserManager.loginWithToken(username, token)) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }

        if (!project || typeof title !== "number") {
            utils.error(res, 400, "InvalidInput")
            return;
        }

        if (!await utils.UserManager.projectExists(project)) {
            utils.error(res, 400, "InvalidProject")
            return;
        }

        if (packet.title < 0 || packet.title > 500) {
            utils.error(res, 400, "InvalidTitle");
        }

        await utils.UserManager.setFeaturedProject(username, project);
        await utils.UserManager.setFeaturedProjectTitle(username, title);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send({ "success": true });
    });
}