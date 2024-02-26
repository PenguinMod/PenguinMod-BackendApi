const UserManager = require('./UserManager');
const colors = require('colors');


const understands = process.argv.includes("-u") || 
                    process.argv.includes("--understands");

async function tests() {
    const manager = new UserManager();
    await manager.init();

    await manager.reset(understands);

    ////////////////////
    // Create account //
    ////////////////////

    let createAccountSuccess = await manager.createAccount('test', 'password');
    if (!createAccountSuccess) {
        console.log("[ FAIL ]".red, "Failed to create account");
        return false;
    }
    console.log("[ PASS ]".green, "Created account");

    let createAccountFail = await manager.createAccount('test', 'hahaimstealingyourusername');
    if (createAccountFail) {
        console.log("[ FAIL ]".red, "Created account with same username");
        return false;
    }
    console.log("[ PASS ]".green, "Failed to create account with same username");

    ////////////////////
    // Password Login //
    ////////////////////

    let passwordLoginSuccess = await manager.loginWithPassword('test', 'password');
    if (!passwordLoginSuccess) {
        console.log("[ FAIL ]".red, "Failed to login with password");
        return false;
    }
    console.log("[ PASS ]".green, "Logged in with password");

    let passwordLoginFail = await manager.loginWithPassword('test', 'hahaimstealingyouraccount');
    if (passwordLoginFail) {
        console.log("[ FAIL ]".red, "Logged in with wrong password");
        return false;
    }
    console.log("[ PASS ]".green, "Logged in with wrong password");

    let token = await manager.loginWithPassword('test', 'password');

    /////////////////
    // Token Login //
    /////////////////

    let tokenLoginSuccess = await manager.loginWithToken('test', token);
    if (!tokenLoginSuccess) {
        console.log("[ FAIL ]".red, "Failed to login with token");
        return false;
    }
    console.log("[ PASS ]".green, "Logged in with token");

    let tokenLoginFail = await manager.loginWithToken('test', 'notyourtoken');
    if (tokenLoginFail) {
        console.log("[ FAIL ]".red, "Logged in with wrong token");
        return false;
    }
    console.log("[ PASS ]".green, "Failed to login with wrong token");

    /////////////////////
    // Get ID/Username //
    /////////////////////

    let getID = await manager.getIDByUsername('test');
    if (!getID) {
        console.log("[ FAIL ]".red, "Failed to get ID by username");
        return false;
    }
    console.log("[ PASS ]".green, "Got ID by username");

    let getUsernameByID = await manager.getUsernameByID(getID);
    if (getUsernameByID !== 'test') {
        console.log("[ FAIL ]".red, "Failed to get username by ID");
        return false;
    }
    console.log("[ PASS ]".green, "Got username by ID");

    /////////////////
    // User Exists //
    /////////////////

    let existsByUsername = await manager.existsByUsername('test');
    if (!existsByUsername) {
        console.log("[ FAIL ]".red, "Failed to check if user exists by username");
        return false;
    }
    console.log("[ PASS ]".green, "Checked if user exists by username");

    let existsByID = await manager.existsByID(getID);
    if (!existsByID) {
        console.log("[ FAIL ]".red, "Failed to check if ID exists");
        return false;
    }
    console.log("[ PASS ]".green, "Checked if user exists by ID");

    //////////////////////
    // Change User Data //
    //////////////////////

    let changeUsername = await manager.changeUsername(getID, 'newtest');
    if (!await manager.existsByUsername("newtest")) {
        console.log("[ FAIL ]".red, "Failed to change username");
        return false;
    }
    console.log("[ PASS ]".green, "Changed username");

    let logout = await manager.logout('newtest');
    if (await manager.loginWithToken('newtest', token)) {
        console.log("[ FAIL ]".red, "Failed to logout");
        return false;
    }
    console.log("[ PASS ]".green, "Logged out");

    let changePassword = await manager.changePassword('newtest', 'newpassword');
    token = await manager.loginWithPassword('newtest', 'newpassword');
    if (!token) {
        console.log("[ FAIL ]".red, "Failed to change password");
        return false;
    }
    console.log("[ PASS ]".green, "Changed password");

    let setBio = await manager.setBio('newtest', 'I am a test');
    let bio = await manager.getBio('newtest');
    if (bio !== 'I am a test') {
        console.log("[ FAIL ]".red, "Failed to set/get bio");
        return false;
    }
    console.log("[ PASS ]".green, "Set/get bio");

    let setCubes = await manager.setCubes('newtest', 5);
    let cubes = await manager.getCubes('newtest');
    if (cubes !== 5) {
        console.log("[ FAIL ]".red, "Failed to set/get cubes");
        return false;
    }
    console.log("[ PASS ]".green, "Set/get cubes");

    let setRank = await manager.setRank('newtest', 1);
    let rank = await manager.getRank('newtest');
    if (rank !== 1) {
        console.log("[ FAIL ]".red, "Failed to set/get rank");
        return false;
    }
    console.log("[ PASS ]".green, "Set/get rank");

    let addBadge = await manager.addBadge('newtest', 'testbadge');
    let badges = await manager.getBadges('newtest');
    if (!badges.includes('testbadge')) {
        console.log("[ FAIL ]".red, "Failed to add/get badge");
        return false;
    }
    console.log("[ PASS ]".green, "Add/get badge");

    let removeBadge = await manager.removeBadge('newtest', 'testbadge');
    badges = await manager.getBadges('newtest');
    if (badges.includes('testbadge')) {
        console.log("[ FAIL ]".red, "Failed to remove badge");
        return false;
    }
    console.log("[ PASS ]".green, "Removed badge");

    let setAdmin = await manager.setAdmin('newtest', true);
    let admin = await manager.isAdmin('newtest');
    if (!admin) {
        console.log("[ FAIL ]".red, "Failed to set/get admin");
        return false;
    }
    console.log("[ PASS ]".green, "Set/get admin");

    let setModerator = await manager.setModerator('newtest', true);
    let moderator = await manager.isModerator('newtest');
    if (!moderator) {
        console.log("[ FAIL ]".red, "Failed to set/get moderator");
        return false;
    }
    console.log("[ PASS ]".green, "Set/get moderator");

    let setBanned = await manager.setBanned('newtest', true);
    let banned = await manager.isBanned('newtest');
    if (!banned) {
        console.log("[ FAIL ]".red, "Failed to set/get banned");
        return false;
    }
    console.log("[ PASS ]".green, "Set/get banned");

    ///////////////
    // Reporting //
    ///////////////

    let userToReport = await manager.createAccount('imstupid', 'password');

    let report = await manager.report(
        0,
        await manager.getIDByUsername("imstupid"),
        "they are stupid",
        await manager.getIDByUsername("newtest")
    );

    let getReportsByType = await manager.getReportsByType(0);
    if (getReportsByType.length !== 1) {
        console.log("[ FAIL ]".red, "Failed to get reports by type");
        return false;
    }
    console.log("[ PASS ]".green, "Got reports by type");

    let getReportsByReporter = await manager.getReportsByReporter(await manager.getIDByUsername("newtest"));
    if (getReportsByReporter.length !== 1) {
        console.log("[ FAIL ]".red, "Failed to get reports by reporter");
        return false;
    }
    console.log("[ PASS ]".green, "Got reports by reporter");

    let getReportsByReported = await manager.getReportsByReportee(await manager.getIDByUsername("imstupid"));
    if (getReportsByReported.length !== 1) {
        console.log("[ FAIL ]".red, "Failed to get reports by reportee");
        return false;
    }
    console.log("[ PASS ]".green, "Got reports by reportee");

    let deleteReport = await manager.deleteReport(getReportsByType[0].id);
    if ((await manager.getReportsByType(0)).length !== 0) {
        console.log("[ FAIL ]".red, "Failed to delete report");
        return false;
    }
    console.log("[ PASS ]".green, "Deleted report");

    let publishProject = await manager.publishProject(
        Buffer.from("hello world"),
        "newtest",
        "testproject",
        Buffer.from("image"),
        "testinst",
        "testnotes",
        undefined,
        "E"
    );
    let getProjects = (await manager.getProjects(0, 2))[0].data;
    if (getProjects.length !== 1) {
        console.log("[ FAIL ]".red, "Failed to publish/get projects");
        return false;
    }
    console.log("[ PASS ]".green, "Published/got projects");

    await manager.reset(true); // will have already asked so

    return true;
}


(async () => {
    let result = await tests();
    if (result) {
        console.log("[ PASS ]".green, "All tests passed");
        process.exit(0);
    }
    console.log("[ FAIL ]".red, "Tests failed");
    process.exit(1);
})();