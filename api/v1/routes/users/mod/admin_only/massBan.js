/* eslint-disable */

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
        "/api/v1/users/massbanregex",
        utils.requireAuth(utils.UserManager, { require_admin: true }),
        async function (req, res) {
            const packet = req.body;

            res.status(420);
            res.send({
                error: "This endpoint has been disabled. Contact ian if you really need it.",
            });

            return;

            const toggle = String(packet.toggle) === "true";

            const targetRegex = packet.targetRegex;

            const username = req.login.username;

            const count = await utils.UserManager.massBanByUsername(
                targetRegex,
                toggle,
            );

            utils.logs.sendAdminLog(
                {
                    action: `Admin has mass ${toggle ? "" : "un"}banned by regex \`${targetRegex}\``,
                    content: `${username} ${toggle ? "" : "un"}banned by regex: \`${targetRegex}\``,
                    fields: [
                        {
                            name: "Mod",
                            value: username,
                        },
                        {
                            name: "Target Regex",
                            value: `\`${targetRegex}\``,
                        },
                        {
                            name: "Count banned",
                            value: `${count}`,
                        },
                    ],
                },
                {
                    name: username,
                    icon_url: String(
                        `${utils.env.ApiURL}/api/v1/users/getpfp?username=${username}`,
                    ),
                    url: `${utils.env.HomeURL}/profile?user=${username}`,
                },
                toggle ? 0xc40404 : 0x45efc6,
            );

            res.status(200);
            res.header("Content-Type", "application/json");
            res.send({ success: true, count });
        },
    );
};
