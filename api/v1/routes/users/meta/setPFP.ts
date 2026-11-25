import { Application } from "express";
import { requireAuth } from "../../../../../utils/auth";
import Magic from "mmmagic";
import { Utils } from "../../../../../index";
import { unlinkMulter } from "../../../../../utils/misc";
import { readFileSync } from "fs";
import sharp from "sharp";

const magic = new Magic.Magic(Magic.MAGIC_MIME_TYPE);

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/setpfp",
        ...requireAuth(utils.manager.auth),
        utils.upload.single("picture"),
        unlinkMulter,
        async function (req, res) {
            const pictureName = req.file;

            const id = res.locals.login.id;

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

            const picture = readFileSync(pictureName.path);

            const allowedImages = ["image/png", "image/jpeg"];
            const allowedAnimated = ["image/gif", "image/webp"];

            const allowedTypes = allowedImages.concat(allowedAnimated);

            magic.detect(picture, async function (err, result) {
                if (err) {
                    return res.status(400).json({ error: "Invalid file type" });
                }

                if (Array.isArray(result) || !allowedTypes.includes(result)) {
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

                await utils.manager.users.setProfilePicture(
                    id,
                    resized_picture,
                );

                res.status(200).json({ success: true });
            });
        },
    );
}
