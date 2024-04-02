const UserManager = require('./UserManager');
const prompt = require('prompt-sync')();
const colors = require('colors');


let understands = process.argv.includes("-u") || 
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

    let getReports = await manager.getReports(0, 2);
    if (getReports[0].data.length !== 1) {
        console.log("[ FAIL ]".red, "Failed to get reports");
        return false;
    }
    console.log("[ PASS ]".green, "Got reports");

    let deleteReport = await manager.deleteReport(getReportsByType[0].id);
    if ((await manager.getReportsByType(0)).length !== 0) {
        console.log("[ FAIL ]".red, "Failed to delete report");
        return false;
    }
    console.log("[ PASS ]".green, "Deleted report");

    let publishProject = await manager.publishProject(
        Buffer.from("test file"),
        await manager.getIDByUsername("newtest"),
        "testproject",
        Buffer.from("test image"),
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

    let getProjectFile = (await manager.getProjectFile(getProjects[0].id)).toString();
    if (getProjectFile !== "test file") {
        console.log("[ FAIL ]".red, "Failed to get project file");
        return false;
    }
    console.log("[ PASS ]".green, "Got project file");

    let getProjectThumbnail = (await manager.getProjectImage(getProjects[0].id)).toString();
    if (getProjectThumbnail !== "test image") {
        console.log("[ FAIL ]".red, "Failed to get project thumbnail");
        return false;
    }
    console.log("[ PASS ]".green, "Got project thumbnail");

    let getProjectData = await manager.getProjectMetadata(getProjects[0].id);
    if (
        getProjectData.author       !== getID         ||
        getProjectData.title        !== "testproject" ||
        getProjectData.instructions !== "testinst"    ||
        getProjectData.notes        !== "testnotes"   ||
        getProjectData.remix        !== null   ||
        getProjectData.rating       !== "E"
    ) {
        console.log("[ FAIL ]".red, "Failed to get project data");
        return false;
    }
    console.log("[ PASS ]".green, "Got project data");

    let hasSeenProjectFalse = await manager.hasSeenProject(getProjects[0].id, "myipfrfr");
    if (hasSeenProjectFalse) {
        console.log("[ FAIL ]".red, "Failed to check if seen project");
        return false;
    }
    console.log("[ PASS ]".green, "Checked if seen project");

    let projectView = await manager.projectView(getProjects[0].id, "myipfrfr");

    let hasSeenProjectTrue = await manager.hasSeenProject(getProjects[0].id, "myipfrfr");
    if (!hasSeenProjectTrue) {
        console.log("[ FAIL ]".red, "Failed to check if seen project/Failed to view project");
        return false;
    }
    console.log("[ PASS ]".green, "Checked if seen project/Viewed project");

    let getProjectViews = await manager.getProjectViews(getProjects[0].id);
    if (getProjectViews !== 1) {
        console.log("[ FAIL ]".red, "Failed to get project views");
        return false;
    }
    console.log("[ PASS ]".green, "Got project views");

    let hasLovedProjectFalse = await manager.hasLovedProject(getProjects[0].id, getID);
    if (hasLovedProjectFalse) {
        console.log("[ FAIL ]".red, "Failed to check if loved project");
        return false;
    }
    console.log("[ PASS ]".green, "Checked if loved project");

    let projectLove = await manager.loveProject(getProjects[0].id, getID, true);

    let hasLovedProjectTrue = await manager.hasLovedProject(getProjects[0].id, getID);
    if (!hasLovedProjectTrue) {
        console.log("[ FAIL ]".red, "Failed to check if loved project/Failed to love project");
        return false;
    }
    console.log("[ PASS ]".green, "Checked if loved project/Loved project");

    let getProjectLoves = await manager.getProjectLoves(getProjects[0].id);
    if (getProjectLoves !== 1) {
        console.log("[ FAIL ]".red, "Failed to get project loves");
        return false;
    }
    console.log("[ PASS ]".green, "Got project loves");

    let hasVotedProjectFalse = await manager.hasVotedProject(getProjects[0].id, getID);
    if (hasVotedProjectFalse) {
        console.log("[ FAIL ]".red, "Failed to check if voted project");
        return false;
    }
    console.log("[ PASS ]".green, "Checked if voted project");

    let projectVote = await manager.voteProject(getProjects[0].id, getID, true);

    let hasVotedProjectTrue = await manager.hasVotedProject(getProjects[0].id, getID);
    if (!hasVotedProjectTrue) {
        console.log("[ FAIL ]".red, "Failed to check if voted project/Failed to vote project");
        return false;
    }
    console.log("[ PASS ]".green, "Checked if voted project/Voted project");

    let getProjectVotes = await manager.getProjectVotes(getProjects[0].id);
    if (getProjectVotes !== 1) {
        console.log("[ FAIL ]".red, "Failed to get project votes");
        return false;
    }
    console.log("[ PASS ]".green, "Got project votes");

    let featureProject = await manager.featureProject(getProjects[0].id, true);
    let getFeaturedProjects = await manager.getFeaturedProjects();
    if (getFeaturedProjects.length !== 1) {
        console.log("[ FAIL ]".red, "Failed to feature/get projects");
        return false;
    }
    console.log("[ PASS ]".green, "Featured/got projects");

    let updateProject = await manager.updateProject(
        getProjects[0].id,
        Buffer.from("new file"),
        "new project",
        Buffer.from("new image"),
        "new inst",
        "new notes",
        "E"
    );
    let getUpdatedProjectData = await manager.getProjectMetadata(getProjects[0].id);
    if (
        getUpdatedProjectData.title        !== "new project" ||
        getUpdatedProjectData.instructions !== "new inst"    ||
        getUpdatedProjectData.notes        !== "new notes"   ||
        getUpdatedProjectData.rating       !== "E"
    ) {
        console.log("[ FAIL ]".red, "Failed to update project");
        return false;
    }
    if ((await manager.getProjectFile(getProjects[0].id)).toString() !== "new file") {
        console.log("[ FAIL ]".red, "Failed to update project file");
        return false;
    }
    if ((await manager.getProjectImage(getProjects[0].id)).toString() !== "new image") {
        console.log("[ FAIL ]".red, "Failed to update project image");
        return false;
    }
    console.log("[ PASS ]".green, "Updated project");

    let deleteProject = await manager.deleteProject(getProjects[0].id);
    let getDeletedProject = await manager.getProjectMetadata(getProjects[0].id);
    if (getDeletedProject) {
        console.log(getDeletedProject);
        console.log("[ FAIL ]".red, "Failed to delete project");
        return false;
    }
    console.log("[ PASS ]".green, "Deleted project");

    let stupidPerson = await manager.createAccount('stupid', 'password');
    let stupidPersonID = await manager.getIDByUsername('stupid');

    let follow = await manager.followUser(stupidPersonID, getID, true);
    let isFollowing = await manager.isFollowing(stupidPersonID, getID);
    if (!isFollowing) {
        console.log("[ FAIL ]".red, "Failed to follow user/check if following user");
        return false;
    }
    console.log("[ PASS ]".green, "Followed user and checked if following user");

    let getFollowers = await manager.getFollowers("newtest");
    if (getFollowers.length !== 1) {
        console.log("[ FAIL ]".red, "Failed to get followers");
        return false;
    }
    console.log("[ PASS ]".green, "Got followers");



    await manager.reset(true); // will have already asked so

    return true;
}


(async () => {
    if (!understands) {
        let pmt = prompt("This will reset the database, are you sure? (Y/n) ");
        if (typeof pmt !== "string" ||
            pmt === "n"
        ) {
            process.exit(0);
        }
        understands = true;
    }

    let result = await tests();
    if (result) {
        console.log("[ PASS ]".green, "All tests passed");
        process.exit(0);
    }
    console.log("[ FAIL ]".red, "Tests failed");
    process.exit(1);
})();