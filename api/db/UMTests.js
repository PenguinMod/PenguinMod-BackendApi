const UserManager = require('./UserManager');
const colors = require('colors');

async function tests() {
    const manager = new UserManager();
    await manager.init();

    await manager.reset();

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

    let getID = await manager.getIDByUsername('test');
    if (!getID) {
        console.log("[ FAIL ]".red, "Failed to get ID by username");
        return false;
    }
    console.log("[ PASS ]".green, "Got ID by username");

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

    let getUsernameByID = await manager.getUsernameByID(getID);
    if (getUsernameByID !== 'test') {
        console.log("[ FAIL ]".red, "Failed to get username by ID");
        return false;
    }
    console.log("[ PASS ]".green, "Got username by ID");

    let changeUsername = await manager.changeUsername(getID, 'newtest');
    if (!await manager.existsByUsername("newtest")) {
        console.log("[ FAIL ]".red, "Failed to change username");
        return false;
    }
    console.log("[ PASS ]".green, "Changed username");

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