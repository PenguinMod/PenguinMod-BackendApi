const path = require('path');
const fs = require('fs');

function loadEndpoints(app, dir) {
    let endpointDir = path.join(__dirname, dir);
    fs.readdirSync(endpointDir).forEach(file => {
        // Only load JavaScript files
        if (file.endsWith('.js')) {
            const endpointPath = path.join(endpointDir, file);
            // Require the endpoint module
            const endpoint = require(endpointPath);
            // Mount the endpoint to the Express app
            endpoint(app);
        }
    });
}
module.exports = loadEndpoints;