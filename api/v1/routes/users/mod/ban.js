module.exports = (app, utils) => {
    app.post('/api/v1/users/ban', async function (req, res) {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const target = (String(packet.target)).toLowerCase();
        const toggle = packet.toggle;
        const time = packet.time || 0;
        const reason = packet.reason;

        if (!username || !token || !target || typeof toggle !== "boolean" || typeof reason !== "string" || reason.length > 512 || typeof time !== "number" || time < 0) {
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

        const isTempBanned = await utils.UserManager.isTempBanned(target);
        if (!toggle && isTempBanned) {
            await utils.UserManager.unTempBan(target);
        } else if (toggle && time) {
            await utils.UserManager.tempBanUser(target, reason, time);
        } else {
            await utils.UserManager.setPermBanned(target, toggle, reason)
        }


        if (toggle && time) {
            await utils.UserManager.sendMessage(targetID, {type: `tempban`, time: time, reason: reason}, false, 0);
        } else if (toggle) {
            await utils.UserManager.sendMessage(targetID, {type: "ban", reason: reason}, false, 0);
        } else {
            await utils.UserManager.sendMessage(targetID, {type: "unban"}, false, 0);
        }

        let fields = [
            {
                name: "Mod",
                value: username
            },
            {
                name: "Target",
                value: target
            },
            
        ]

        if (toggle && time) {
            fields.push({
                name: "Time",
                value: `${time/1000} seconds (${time/(1000*60*60)} hours)`
            })
        }

        fields.push(
            {
                name: "Reason",
                value: `\`\`\`\n${reason}\n\`\`\``
            },
            {
                name: "URL",
                value: `https://penguinmod.com/profile?userid=${targetID}`
            }
        )

        utils.logs.sendAdminLog(
            {
                action: `User has been ${toggle && time ? "temp " : ""}${toggle ? "" : "un"}banned`,
                content: `${username} ${toggle ? "" : "un"}banned ${target}`,
                fields
            },
            {
                name: username,
                icon_url: String("http://localhost:8080/api/v1/users/getpfp?username=" + username),
                url: String("https://penguinmod.com/profile?user=" + username)
            },
            toggle ? 0xc40404 : 0x45efc6
        );

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send({ success: true });
    });
}