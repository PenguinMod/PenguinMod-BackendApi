import { requireAuth } from "../../../../../../utils/auth";
import sharp from "sharp";
import Magic from "mmmagic";
import { readFileSync } from "fs";
import { Application } from "express";
import { Utils } from "../../../../../../index";
import { unlinkMulter } from "../../../../../../utils/misc";
import { pmUserAuthor, sendAdminLog } from "../../../../../../utils/logs";
import { makeUsername } from "../../../../db/new-types";
const magic = new Magic.Magic(Magic.MAGIC_MIME_TYPE);

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/setpfpadmin",
        ...requireAuth(utils.manager.auth, { require_admin: true }),
        utils.upload.single("picture"),
        unlinkMulter,
        async function (req, res) {
            const packet = req.body;

            const target = makeUsername(String(packet.target));

            const pictureName = req.file;

            if (!pictureName) {
                return res.status(400).json({ error: "InvalidPicture" });
            }

            const username = res.locals.login.username;

            const targetData = await utils.manager.users.getUserData(target);
            if (!targetData) {
                return res.status(400).json({ error: "TargetNotFound" });
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

            magic.detect(picture, async (err, result) => {
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
                    targetData.id,
                    resized_picture,
                );

                sendAdminLog(
                    {
                        action: "Admin or mod has updated user's profile picture.",
                        content: `${target}'s PFP has been updated by ${username}`,
                        fields: {},
                    },
                    pmUserAuthor(username),
                    0xf4a220,
                );

                res.status(200).json({ success: true });
            });
        },
    );
}
