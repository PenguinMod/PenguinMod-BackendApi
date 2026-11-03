const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const Magic = require("mmmagic");
const magic = new Magic.Magic(Magic.MAGIC_MIME_TYPE);
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
        "/api/v1/users/setpfpadmin",
        utils.requireAuth(utils.UserManager, { require_admin: true }),
        utils.upload.single("picture"),
        async (req, res) => {
            const packet = req.body;

            const target = String(packet.target).toLowerCase();

            const pictureName = req.file;

            const username = req.login.username;

            const targetID = await utils.UserManager.getIDByUsername(
                target,
                false,
            );
            if (!targetID) {
                return utils.error(res, 400, "TargetNotFound");
            }

            if (!pictureName) {
                return utils.error(res, 400, "InvalidPicture");
            }

            if (
                pictureName.size >
                (Number(process.env.UploadSize) || 5) * 1024 * 1024
            ) {
                return utils.error(res, 400, "File too large");
            }

            const picture = fs.readFileSync(
                path.join(utils.homeDir, pictureName.path),
            );

            const allowedImages = ["image/png", "image/jpeg"];
            const allowedAnimated = ["image/gif", "image/webp"];

            const allowedTypes = allowedImages.concat(allowedAnimated);

            magic.detect(picture, async (err, result) => {
                if (err) {
                    return utils.error(res, 400, "Invalid file type");
                }

                if (!allowedTypes.includes(result)) {
                    return utils.error(res, 400, "Invalid file type");
                }

                let resized_picture;

                try {
                    const animated = allowedAnimated.includes(result);

                    resized_picture = await sharp(picture, {
                        animated,
                    })
                        .resize(100, 100)
                        .webp()
                        .toBuffer();
                } catch (e) {
                    console.warn(`Sharp error: ${e}`);
                    return utils.error(res, 400, "Invalid image");
                }

                await utils.UserManager.setProfilePicture(
                    targetID,
                    resized_picture,
                );

                utils.logs.sendAdminUserLog(
                    username,
                    target,
                    "Admin or mod has updated user's profile picture.",
                    0xf4a220,
                );

                res.status(200).json({ success: true });
            });
        },
    );
};
