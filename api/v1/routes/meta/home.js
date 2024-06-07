export default function(app, utils) {
    app.get("/", (req, res) => {
        res.redirect("https://penguinmod.com");
    });
}