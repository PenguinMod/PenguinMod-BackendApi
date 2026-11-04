/**
 * @typedef {Object} Utils
 * @property {import("../../../../db/UserManager")} UserManager
 */

/**
 *
 * @param {import("express").Application} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.post(
        "/api/v1/users/deleteaccount",
        utils.requireAuth(utils.UserManager, { require_admin: true }),
        async function (req, res) {
            const packet = req.body;

            const target = String(packet.target).toLowerCase();
            const reason = String(packet.reason);

            if (reason.length > 512) {
                return utils.error(res, 400, "ReasonTooLong");
            }

            const username = req.login.username;

            if (
                !target ||
                !(await utils.UserManager.existsByUsername(target, true))
            ) {
                return utils.error(res, 404, "TargetNotFound");
            }

            const success = await utils.UserManager.deleteAccount(target);

            const fields = [
                {
                    name: "Mod",
                    value: username,
                },
                {
                    name: "Target",
                    value: target,
                },
            ];

            fields.push({
                name: "Reason",
                value: `\`\`\`\n${reason}\n\`\`\``,
            });

            utils.logs.sendAdminLog(
                {
                    action: `User's account has been deleted`,
                    content: `${username} deleted ${target}'s account`,
                    fields,
                },
                {
                    name: username,
                    icon_url: String(
                        `${utils.env.ApiURL}/api/v1/users/getpfp?username=${username}`,
                    ),
                    url: `${utils.env.HomeURL}/profile?user=${username}`,
                },
                0xc40404,
            );

            res.status(success ? 200 : 500);
            res.header("Content-type", "application/json");
            res.send({ success });
        },
    );
};
