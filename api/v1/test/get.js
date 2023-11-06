const mongodb = require("mongodb");

const dependencies = {
    /**
     * @type {mongodb.Db}
     */
    db: null
};

const setDependencies = (deps) => {
    dependencies = {
        ...deps
    };
};

const method = "get";
const endpoint = (req, res) => {
    const db = dependencies.db;
    console.log(db);
    res.send('dah');
};

module.exports = {
    method,
    endpoint,
    setDependencies
};