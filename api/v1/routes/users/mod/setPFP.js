const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Magic = require('mmmagic').Magic;
const magic = new Magic();

module.exports = (app, utils) => {
    app.post('/api/v1/users/setpfpadmin', utils.upload.single("picture"), async (req, res) => {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const target = (String(packet.target)).toLowerCase();

        const pictureName = req.file;

        if (!await utils.UserManager.loginWithToken(username, token)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        if (!await utils.UserManager.isAdmin(username) && !await utils.UserManager.isModerator(username)) {
            return utils.error(res, 403, "FeatureDisabledForThisAccount");
        }

        if (!await utils.UserManager.existsByUsername(target)) {
            return utils.error(res, 400, "TargetNotFound");
        }

        if (!pictureName) {
            return utils.error(res, 400, "InvalidPicture");
        }

        const picture = fs.readFileSync(path.join(utils.HomeDir, pictureName.path));

        const allowedTypes = ["image/png", "image/jpeg"];

        magic.detect(picture, async (err, result) => {
            if (err) {
                return utils.error(res, 400, "Invalid file type");
            }

            if (!allowedTypes.includes(result)) {
                return utils.error(res, 400, "Invalid file type");
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