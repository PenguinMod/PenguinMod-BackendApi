import fs from 'fs';
import path from 'path';

export default (app, utils) => {
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
        }
        res.status(200);
        res.send(html);
    });
}