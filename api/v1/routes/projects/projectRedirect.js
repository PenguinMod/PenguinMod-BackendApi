const fs = require('fs');
const path = require('path');

module.exports = (app, options) => {
    const projectTemplate = fs.readFileSync(path.join(options.homeDir, 'project.html')).toString();
    app.get('/:id', async function (req, res) {
        const json = await options.UserManager.getProjectData(String(req.params.id));
    
        if (!json) {
            res.status(404);
            res.send('Not found');
            return;
        }

        let html = projectTemplate;
        for (const prop in json) {
            html = html.replaceAll(`{project.${prop}}`, options.escapeXML(json[prop]));
        }
        res.status(200);
        res.send(html);
    });
}