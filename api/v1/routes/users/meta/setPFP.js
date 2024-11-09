const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Magic = require('mmmagic');
const magic = new Magic.Magic(Magic.MAGIC_MIME_TYPE);

module.exports = (app, utils) => {
    app.post('/api/v1/users/setpfp', utils.cors(), utils.upload.single("picture"), async (req, res) => {
        const packet = req.query;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const pictureName = req.file;

        if (!await utils.UserManager.loginWithToken(username, token)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        if (!pictureName) {
            return utils.error(res, 400, "No picture was provided");
        }

        const picture = fs.readFileSync(path.join(utils.homeDir, pictureName.path));

        const allowedTypes = ["image/png", "image/jpeg"];

        // ATODO: make sure the pfp isnt too big, this is a pfp, not an open world video game

        magic.detect(picture, async (err, result) => {
            if (err) {
                return utils.error(res, 400, "Invalid file type");
            }

            if (!allowedTypes.includes(result)) {
                return utils.error(res, 400, "Invalid file type");
            }

            const resized_picture = await sharp(picture).resize(100, 100).toBuffer()

            await utils.UserManager.setProfilePicture(username, resized_picture);

            res.status(200);
            res.header("Content-Type", 'application/json');
            res.json({ "success": true });
        });
    });
}