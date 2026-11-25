const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const Magic = require("mmmagic");
const magic = new Magic.Magic(Magic.MAGIC_MIME_TYPE);
/**
 * @typedef {Object} Utils
 * @property {import("../../../db/UserManager")} UserManager
 */

/**
 *
 * @param {import("express").Application} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.post(
        "/api/v1/users/setpfp",
        utils.requireAuth(utils.UserManager),
        utils.upload.single("picture"),
        utils.unlinkMulter,
        async (req, res) => {
            const pictureName = req.file;

            const id = req.login.id;

            if (!pictureName) {
                return res
                    .status(400)
                    .json({ error: "No picture was provided" });
            }

            if (
                pictureName.size >
                (Number(process.env.UploadSize) || 5) * 1024 * 1024
            ) {
                return res.status(400).json({ error: "File too large" });
            }

            const picture = fs.readFileSync(
                path.join(utils.homeDir, pictureName.path),
            );

            const allowedImages = ["image/png", "image/jpeg"];
            const allowedAnimated = ["image/gif", "image/webp"];

            const allowedTypes = allowedImages.concat(allowedAnimated);

            magic.detect(picture, async (err, result) => {
                if (err) {
                    return res.status(400).json({ error: "Invalid file type" });
                }

                if (!allowedTypes.includes(result)) {
                    return res.status(400).json({ error: "Invalid file type" });
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
                    return res.status(400).json({ error: "Invalid image" });
                }

                await utils.UserManager.setProfilePicture(id, resized_picture);

                res.status(200).json({ success: true });
            });
        },
    );
};
