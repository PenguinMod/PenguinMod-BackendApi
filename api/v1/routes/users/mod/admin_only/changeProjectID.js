const UserManager = require("../../../../db/UserManager");

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
    app.post('/api/v1/users/changeprojectid', utils.cors(), async function (req, res) {
        const packet = req.body;

        const token = packet.token;

        const target = String(packet.target);
        const newId = String(packet.newId);

        const login = await utils.UserManager.loginWithToken(token);
        if (!login.success) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }
        const username = login.username;
        if (!await utils.UserManager.isAdmin(username)) {
            utils.error(res, 403, "FeatureDisabledForThisAccount");
            return;
        }
        if (!await utils.UserManager.projectExists(target, true)) {
            utils.error(res, 400, "ProjectDoesNotExist");
            return;
        }
        if (await utils.UserManager.projectExists(newId, true)) {
            utils.error(res, 400, "IDIsTaken");
            return;
        }

        const projectName = (await utils.UserManager.getProjectMetadata(target)).title;

        await utils.UserManager.changeProjectID(target, newId);

        const fields = [
            {
                name: "Admin",
                value: username
            },    
            {
                name: "Title",
                value: projectName
            },
            {
                name: "URL",
                value: `${utils.env.StudioURL}/#${newId}`
            }
        ];

        utils.logs.sendAdminLog(
            {
                action: `Admin has changed project ${target}'s id to now be ${newId}.`,
                content: `${username} changed a project's id`,
                fields
            },
            {
                name: username,
                icon_url: String(`${utils.env.ApiURL}/api/v1/users/getpfp?username=${username}`),
                url: String("https://penguinmod.com/profile?user=" + username)
            },
            0xc6be27
        );

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.json({ "success": true });
    });
}