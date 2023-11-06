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

const method = "post";
const endpoint = (req, res) => {
    const db = dependencies.db;
    
};

module.exports = {
    method,
    endpoint,
    setDependencies
};