module.exports.ParseJSON = (str) => {
    let canParse = true
    try {
        JSON.parse(str)
    } catch {
        canParse = false
    }
    return canParse ? JSON.parse(str) : {}
}
module.exports.ParseArray = (str) => {
    if (!(String(str).startsWith("[") && String(str).endsWith("]"))) return []
    let canParse = true
    try {
        JSON.parse(str)
    } catch {
        canParse = false
    }
    if (typeof JSON.parse(str).pop != "function") return []
    return canParse ? JSON.parse(str) : []
}