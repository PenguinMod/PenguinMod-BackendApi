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
    app.post('/api/v1/projects/setCanBeFeatured', utils.cors(), async (req, res) => {
        const packet = req.body;

        const token = packet.token;

        const projectID = packet.projectID;

        const canBeFeatured = !!packet.toggle;

        if (!token || typeof projectID !== "string") {
            return utils.error(res, 400, "Missing token or projectID");
        }

        const login = await utils.UserManager.loginWithToken(token);
        if (!login.success) {
            utils.error(res, 401, "Reauthenticate")
            return;
        }
        const username = login.username;

        if (!await utils.UserManager.isAdmin(username)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        if (!await utils.UserManager.projectExists(projectID)) {
            return utils.error(res, 404, "Project not found");
        }

        await utils.UserManager.setCanBeFeatured(projectID, canBeFeatured);

        utils.logs.sendAdminLog(
            {
                action: `Project ${canBeFeatured ? "can" : "cannot"} be featured now`,
                content: `${username} changed featurability of ${projectID}`,
                fields: [
                    {
                        name: "Admin",
                        value: username
                    },
                    {
                        name: "Project ID",
                        value: projectID
                    },
                    {
                        name: "URL",
                        value: `${utils.env.StudioURL}/#${projectID}`
                    }
                ]
            },
            {
                name: username,
                icon_url: String(`${utils.env.ApiURL}/api/v1/users/getpfp?username=${username}`),
                url: String("https://penguinmod.com/profile?user=" + username)
            },
            0xc8e847
        );
        
        return res.send({ success: true });
    });
}