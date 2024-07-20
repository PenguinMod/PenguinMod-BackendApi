const crypto = require("crypto");

let encoder = new TextEncoder();

async function verifySignature(secret, header, payload) {
    let parts = header.split("=");
    let sigHex = parts[1];

    let algorithm = { name: "HMAC", hash: { name: 'SHA-256' } };

    let keyBytes = encoder.encode(secret);
    let extractable = false;
    let key = await crypto.subtle.importKey(
        "raw",
        keyBytes,
        algorithm,
        extractable,
        [ "sign", "verify" ],
    );

    let sigBytes = hexToBytes(sigHex);
    let dataBytes = encoder.encode(payload);
    let equal = await crypto.subtle.verify(
        algorithm.name,
        key,
        sigBytes,
        dataBytes,
    );

    return equal; 
}

function hexToBytes(hex) {
    let len = hex.length / 2;
    let bytes = new Uint8Array(len);

    let index = 0;
    for (let i = 0; i < hex.length; i += 2) {
        let c = hex.slice(i, i + 2);
        let b = parseInt(c, 16);
        bytes[index] = b;
        index += 1;
    }

    return bytes;
} 

module.exports = (app, utils) => {
    if (utils.env.IncludeReload !== "true") {
        return; 
    }
    app.post("/api/v1/misc/updateApi", async (req, res) => {
        const packet = req.body;
        const headers = req.headers;

        const providedHash = headers["x-hub-signature-256"];

        if (!providedHash) {
            res.sendStatus(400);
            return;
        }

        const verified = await verifySignature(utils.env.ReloadApiKey, providedHash, JSON.stringify(packet));

        if (!verified) {
            res.sendStatus(400);
            return;
        }

        // Now we send a request to the host machine since we're in a docker container
        await utils.logs.sendServerLog("Received update request, restarting server...", 0x11c195); 

        res.sendStatus(200); 

        fetch("http://host.docker.internal:3000/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                token: utils.env.ReloadApiKey
            })
        }).then(res => res.json())
        .then(async res => {
            await utils.logs.sendServerLog(JSON.stringify(res), 0x11c195);
        })
    });
}