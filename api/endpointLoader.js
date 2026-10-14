const path = require("path");
const fs = require("fs");
require("colors");

// TODO: This is a mess and i hate it. is there really no better way that won't make me rip my hair out?

function readFiles(path) {
    const flat = [];
    const all = fs
        .readdirSync(path, { withFileTypes: true })
        .map((item) => item.name)
        .filter(
            (item) =>
                item[0] !== "_" &&
                (item.endsWith(".js") ||
                    fs.lstatSync(`${path}/${item}`).isDirectory()),
        );

    all.forEach((item) => {
        if (fs.lstatSync(`${path}/${item}`).isDirectory()) {
            const sub = readFiles(`${path}/${item}`);
            sub.forEach((subItem) => {
                flat.push(`${item}/${subItem}`);
            });
        } else {
            flat.push(item);
        }
    });
    return flat;
}

function loadEndpoints(app, dir, utils = {}) {
    const endpointDir = path.join(__dirname, dir);

    readFiles(endpointDir).forEach((file) => {
        const endpointPath = path.join(endpointDir, file);
        try {
            const endpoint = require(endpointPath);
            endpoint(app, utils);
        } catch (e) {
            console.real_error(
                `${"[ ERROR ]".red} loading endpoint ${file}: ${e}`,
            );
        }
    });
}
module.exports = loadEndpoints;
