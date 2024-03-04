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

async function generateProfileJSON(UserManager, username, includeBio) {
    const badges = await UserManager.getBadges(username);
    const isDonator = badges.includes('donator');

    let rank = await UserManager.getRank(username);
    const signInDate = await UserManager.getFirstLogin(username);
    const userProjects = await UserManager.getProjectsByAuthor(username);
    const canRequestRankUp = (userProjects.length >= 3 // if we have 3 projects and
        && (Date.now() - signInDate) >= 4.32e+8)      // first signed in 5 days ago
        || badges.length > 0;                        // or we have a badge

    const followers = await UserManager.getFollowers(username);

    let myFeaturedProject = await UserManager.getFeaturedProject(username);
    let myFeaturedProjectTitle = UserManager.getFeaturedProjectTitle(username, "myFeaturedProjectTitle");

    const isBanned = UserManager.isBanned(username);
    let bio = '';
    if (!isBanned && includeBio) {
        bio = UserManager.getBio(username);
    }

    return {
        username,
        admin: AdminAccountUsernames.get(username),
        approver: ApproverUsernames.get(username),
        banned: isBanned, // skipped in /profile but provided in /usernameFromCode
        badges,
        donator: isDonator,
        rank,
        bio,
        myFeaturedProject,
        myFeaturedProjectTitle,
        followers: followers.length,
        canrankup: canRequestRankUp && rank === 0,
        viewable: userProjects.length > 0,
        projects: userProjects.length // we check projects anyways so might aswell
    };
};

function safeZipParse(buffer, options) {
    return new Promise((resolve) => {
        if (!buffer) return resolve();
        JSZip.loadAsync(buffer, options).then(zip => {
            resolve(zip);
        }).catch(() => {
            resolve();
        });
    });
};

function error(res, code, error) {
    res.status(code);
    res.header("Content-Type", 'application/json');
    res.json({ "error": error });
}