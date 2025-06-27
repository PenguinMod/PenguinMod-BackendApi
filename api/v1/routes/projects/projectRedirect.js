const fs = require('fs');
const path = require('path');

const UserManager = require("../../db/UserManager");

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
    const projectTemplate = fs.readFileSync(path.join(utils.homeDir, 'project.html')).toString();
    app.get('/:id', async function (req, res) {
        const json = await utils.UserManager.getProjectMetadata(String(req.params.id));
    
        if (!json) {
            return utils.error(res, 404, 'Not Found');
        }

        let html = projectTemplate;
        for (const prop in json) {
            html = html.replaceAll(`{project.${prop}}`, utils.escapeXML(json[prop]));
            html = html.replaceAll(`{studio_url}`, utils.env.StudioURL);
            html = html.replaceAll(`{api_url}`, utils.env.ApiURL);
        }
        res.status(200);
        res.send(html);
    });
}
