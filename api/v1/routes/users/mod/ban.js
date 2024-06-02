module.exports = (app, utils) => {
    app.post('/api/v1/users/ban', async function (req, res) {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const target = (String(packet.target)).toLowerCase();
        const toggle = packet.toggle;
        const reason = packet.reason;

        if (!username || !token || !target || typeof toggle !== "boolean" || typeof reason !== "string" || reason.length > 512) {
            utils.error(res, 400, "InvalidData");
            return;
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            utils.error(res, 401, "InvalidToken");
            return;
        }

        if (!await utils.UserManager.isAdmin(username) && !await utils.UserManager.isModerator(username)) {
            utils.error(res, 403, "Unauthorized");
            return;
        }

        if (!await utils.UserManager.existsByUsername(target)) {
            utils.error(res, 404, "NotFound");
            return;
        }

        if (!await utils.UserManager.isAdmin(username) && await utils.UserManager.isAdmin(target)) {
            utils.error(res, 403, "Unauthorized");
            return;
        }

        const targetID = await utils.UserManager.getIDByUsername(target);

        await utils.UserManager.setBanned(target, toggle, reason);

        if (toggle) {
            await utils.UserManager.sendMessage(targetID, {type: "ban", reason: reason}, false, 0);
        } else {
            await utils.UserManager.sendMessage(targetID, {type: "unban"}, false, 0);
        }

        utils.logs.sendAdminLog(
            {
                action: `User has been ${toggle ? "" : "un"}banned`,
                content: `${username} ${toggle ? "" : "un"}banned ${target}`,
                fields: [
                    {
                        name: "Mod",
                        value: username
                    },
                    {
                        name: "Target",
                        value: target
                    },
                    {
                        name: "Reason",
                        value: `\`\`\`\n${reason}\n\`\`\``
                    },
                    {
                        name: "URL",
                        value: `https://penguinmod.com/profile?userid=${targetID}`
                    }
                ]
            },
            {
                name: username,
                icon_url: String("http://localhost:8080/api/v1/users/getpfp?username=" + username),
                url: String("https://penguinmod.com/profile?user=" + username)
            }
        );

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send({ success: true });
    });
}