/**
 * @typedef {Object} Utils
 * @property {import("../../../db/UserManager")} UserManager
 */

/**
 *
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.post(
        "/api/v1/users/setBio",
        utils.requireAuth(utils.UserManager),
        async function (req, res) {
            const packet = req.body;

            const bio = String(packet.bio);

            const username = req.login.username;

            if (bio.length > 2048) {
                utils.error(res, 400, "BioTooLong");
                return;
            }

            const userID = req.login.id;

            let trigger = await utils.UserManager.checkForIllegalWording(bio);
            if (trigger) {
                utils.error(res, 400, "IllegalWordsUsed");

                const illegalWordIndex =
                    await utils.UserManager.getIndexOfIllegalWording(bio);

                const before = bio.substring(0, illegalWordIndex[0]);
                const after = bio.substring(illegalWordIndex[1], bio.length);
                const illegalWord = bio.substring(
                    illegalWordIndex[0],
                    illegalWordIndex[1],
                );

                utils.logs.sendHeatLog(
                    before + "\x1b[31;1m" + illegalWord + "\x1b[0m" + after,
                    trigger,
                    "profileBio",
                    [username, userID],
                );

                return;
            }

            trigger =
                await utils.UserManager.checkForPotentiallyIllegalWording(bio);
            if (trigger) {
                const illegalWordIndex =
                    await utils.UserManager.getIndexOfPotentiallyIllegalWording(
                        bio,
                    );

                const before = bio.substring(0, illegalWordIndex[0]);
                const after = bio.substring(illegalWordIndex[1], bio.length);
                const illegalWord = bio.substring(
                    illegalWordIndex[0],
                    illegalWordIndex[1],
                );

                utils.logs.sendHeatLog(
                    before + "\x1b[33;1m" + illegalWord + "\x1b[0m" + after,
                    trigger,
                    "profileBio",
                    [username, userID],
                    0xffbb00,
                );
            }

            await utils.UserManager.setBio(username, bio);

            res.status(200);
            res.header("Content-Type", "application/json");
            res.send({ success: true });
        },
    );
};
