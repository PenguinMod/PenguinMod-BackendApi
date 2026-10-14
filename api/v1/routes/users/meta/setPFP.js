const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const Magic = require("mmmagic");
const magic = new Magic.Magic(Magic.MAGIC_MIME_TYPE);
const UserManager = require("../../../db/UserManager");

/**
 * @typedef {Object} Utils
 * @property {UserManager} UserManager
 */

/**
 *
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.post(
        "/api/v1/users/setpfp",
        utils.cors(),
        utils.upload.single("picture"),
        async (req, res) => {
            const packet = req.query;

            const token = String(packet.token);

            const pictureName = req.file;

            const login = await utils.UserManager.loginWithToken(token);
            if (!login.success) {
                utils.error(res, 400, "Reauthenticate");
                return;
            }
            const id = login.id;

            if (!pictureName) {
                return utils.error(res, 400, "No picture was provided");
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

                await utils.UserManager.setProfilePicture(id, resized_picture);

                res.status(200);
                res.header("Content-Type", "application/json");
                res.json({ success: true });
            });
        },
    );
};
