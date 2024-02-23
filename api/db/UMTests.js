const UserManager = require('./UserManager');
const colors = require('colors');

async function tests() {
    const manager = new UserManager();
    await manager.init();

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