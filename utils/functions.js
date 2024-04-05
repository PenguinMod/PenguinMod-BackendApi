function escapeXML(unsafe) {
    unsafe = String(unsafe);
    return unsafe.replace(/[<>&'"\n]/g, c => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            case '\n': return '&#10;'
        }
    });
};

function error(res, code, error) {
    res.status(code);
    res.header("Content-Type", 'application/json');
    res.json({ "error": error });
}