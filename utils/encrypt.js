const KEY = process.env.EncryptKey
const cryptojs = require("crypto-js")

module.exports.encrypt = (str) => {
    return cryptojs.AES.encrypt(str, String(KEY)).toString()
}
module.exports.decrypt = (str) => {
    return cryptojs.AES.decrypt(str, String(KEY)).toString(cryptojs.enc.Utf8)
}