import path from 'path';
import fs from 'fs';

function readFiles(path) {
    let flat = [];
    let all = fs.readdirSync(path, {withFileTypes: true})
    .map(item => item.name)
    .filter(item => 
        item[0] !== "_" &&
        (item.endsWith(".js") ||
         fs.lstatSync(`${path}/${item}`).isDirectory()
        )
    );

    all.forEach(item => {
        if (fs.lstatSync(`${path}/${item}`).isDirectory()) {
            // recurse
            let sub = readFiles(`${path}/${item}`);
            sub.forEach(subItem => {
                flat.push(`${item}/${subItem}`);
            })
            
        } else {
            flat.push(item);
        }
    })
    return flat;
}

async function loadEndpoints(app, dir, utils = {}) {
    let endpointDir = path.join(import.meta.dirname, dir);
    let files = readFiles(endpointDir);
    for (const file of files) {
        const endpointPath = path.join(endpointDir, file);
        const endpoint = (await import(endpointPath)).default;
        endpoint(app, utils);
    };
}
export default loadEndpoints;