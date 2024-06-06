module.exports = (app, utils) => {
    app.post('/api/v1/users/banuserip', async function (req, res) {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const target = (String(packet.target)).toLowerCase();
        const toggle = packet.toggle;

        if (!username || !token || !target || typeof toggle !== "boolean") {
            utils.error(res, 400, "InvalidData");
            return;
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            utils.error(res, 401, "InvalidToken");
            return;
        }

        if (!await utils.UserManager.isAdmin(username)) {
            utils.error(res, 403, "Unauthorized");
            return;
        }

        if (!await utils.UserManager.existsByUsername(target)) {
            utils.error(res, 404, "NotFound");
            return;
        }

        // dont send a message since they cant access the site anyways :bleh:

        await utils.UserManager.banUserIP(target, toggle);

        utils.logs.sendAdminLog(
            {
                action: `${target}'s IPs have been ${toggle ? "" : "un"}banned`,
                content: `${username} banned the IPs of ${target}`,
                fields: [
                    {
                        name: "Mod",
                        value: username
                    },
                    {
                        name: "Target",
                        value: target
                    },
                ]
            },
            {
                name: username,
                icon_url: String(`${utils.env.ApiURL}/api/v1/users/getpfp?username=${username}`),
                url: String("https://penguinmod.com/profile?user=" + username)
            },
            toggle ? 0xc40404 : 0x45efc6
        );

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send({ success: true });
    });
}