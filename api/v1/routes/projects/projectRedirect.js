const fs = require('fs');
const path = require('path');

module.exports = (app, options) => {
    const projectTemplate = fs.readFileSync(path.join(options.homeDir, 'project.html')).toString();
    app.get('/:id', async function (req, res) {
        const json = options.UserManager.getProjectData(String(req.params.id));
        if (!json) {
            res.sendFile(path.join(options.homeDir, '404-noproject.html'));
            return;
        }
        let html = projectTemplate;
        for (const prop in json) {
            html = html.replaceAll(`{project.${prop}}`, escapeXML(json[prop]));
        }
        res.status(200);
        res.send(html);
    });
}