const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Magic = require('mmmagic');
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
    app.post('/api/v1/users/setpfpadmin', utils.cors(), utils.upload.single("picture"), async (req, res) => {
        const packet = req.body;

        const token = packet.token;

        const target = (String(packet.target)).toLowerCase();

        const pictureName = req.file;

        const login = await utils.UserManager.loginWithToken(token);
        if (!login.success) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }
        const username = login.username;

        if (!await utils.UserManager.hasModPerms(username)) {
            return utils.error(res, 403, "FeatureDisabledForThisAccount");
        }

        if (!await utils.UserManager.existsByUsername(target)) {
            return utils.error(res, 400, "TargetNotFound");
        }

        if (!pictureName) {
            return utils.error(res, 400, "InvalidPicture");
        }

        if (pictureName.size > ((Number(process.env.UploadSize)) || 5)  * 1024 * 1024) {
            return utils.error(res, 400, "File too large");
        }

        const picture = fs.readFileSync(path.join(utils.homeDir, pictureName.path));

        const allowedTypes = ["image/png", "image/jpeg"];

        magic.detect(picture, async (err, result) => {
            if (err) {
                console.log(err);
                return utils.error(res, 400, "Invalid file type");
            }

            if (!allowedTypes.includes(result)) {
                return utils.error(res, 400, `Invalid file type, ${result}`);
            }

            const resized_picture = await sharp(picture).resize(100, 100).toBuffer()

            await utils.UserManager.setProfilePicture(target, resized_picture);

            utils.logs.sendAdminUserLog(username, target, "Admin or mod has updated user's profile picture.", 0xf4a220);

            res.status(200);
            res.header("Content-Type", 'application/json');
            res.json({ "success": true });
        });
    });
}