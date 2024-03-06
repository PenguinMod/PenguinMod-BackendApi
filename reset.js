const um = require('./api/db/UserManager');

const UserManager = new um();

(async () => {
    console.log("Initializing database...")
    await UserManager.init();
    console.log("Database initialized.")
    console.log("Resetting database...")
    await UserManager.reset();
    console.log("Database reset complete.")
})();