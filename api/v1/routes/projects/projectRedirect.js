const fs = require('fs');
const path = require('path');

module.exports = (app, utils) => {
    const projectTemplate = fs.readFileSync(path.join(utils.homeDir, 'project.html')).toString();
    app.get('/:id', async function (req, res) {
        const json = await utils.UserManager.getProjectMetadata(String(req.params.id));
    
        if (!json) {
            res.status(404);
            res.send('Not found');
            return;
        }

        let html = projectTemplate;
        for (const prop in json) {
            html = html.replaceAll(`{project.${prop}}`, utils.escapeXML(json[prop]));
            html = html.replaceAll(`{studio_url}`, utils.env.StudioURL);
        }
        res.status(200);
        res.send(html);
    });
}