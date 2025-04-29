module.exports = (app, utils) => {
    app.post('/api/v1/users/setBadges', utils.cors(), async function (req, res) {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const targets = packet.targets;
        const badges = packet.badges;
        const removing = packet.removing == "true";

        if (!await utils.UserManager.loginWithToken(username, token)) {
            utils.error(res, 401, "InvalidToken");
            return;
        }

        if (!await utils.UserManager.isAdmin(username)) {
            utils.error(res, 403, "Unauthorized");
            return;
        }

        if (!Array.isArray(targets)) {
            utils.error(res, 400, "InvalidTargets");
            return;
        }

        if (!Array.isArray(badges)) {
            utils.error(res, 400, "InvalidBadges");
            return;
        }

        for (const target of targets) {
            if (!await utils.UserManager.existsByUsername(target)) {
                utils.error(res, 404, `UserNotFound ${target}`);
                return;
            }
            const current_badges = await utils.UserManager.getBadges(target);
            const merged = badges.concat(current_badges);

            await utils.UserManager.setBadges(target, merged);
        }

        utils.logs.sendAdminUserLog(username, target, "Admin has updated many user's badges.", 0x3d4ddc, [
            {
                name: "Badges",
                value: badges.join(", ")
            },
            {
                name: "Targets",
                value: targets.join(", ")
            }
        ]);

        res.status(200);
        res.header('Content-type', "application/json");
        res.send({ success: true });
    });
}