/**
 * @typedef {Object} Utils
 * @property {import("../../../../db/UserManager")} UserManager
 */

/**
 *
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.post(
        "/api/v1/users/setbioadmin",
        utils.requireAuth(utils.UserManager, { require_mod: true }),
        async function (req, res) {
            const packet = req.body;

            const target = String(packet.target).toLowerCase();
            const bio = String(packet.bio);

            const username = req.login.username;

            if (bio.length > 2048) {
                utils.error(res, 400, "BioLengthMustBeLessThan2048Chars");
                return;
            }

            const oldBio = await utils.UserManager.getBio(target);

            await utils.UserManager.setBio(target, bio);

            utils.logs.sendBioUpdateLog(username, target, oldBio, bio);

            res.status(200);
            res.header("Content-Type", "application/json");
            res.send({ success: true });
        },
    );
};
