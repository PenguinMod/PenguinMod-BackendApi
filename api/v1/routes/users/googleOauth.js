const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

module.exports = (app, utils) => {
    app.use(passport.initialize());

    passport.serializeUser((user, done) => {
        done(null, user);
    });

    passport.deserializeUser((user, done) => {
        done(null, user);
    });

    passport.use(new GoogleStrategy({
        clientID: 'YOUR_GOOGLE_CLIENT_ID',
        clientSecret: 'YOUR_GOOGLE_CLIENT_SECRET',
        callbackURL: 'YOUR_CALLBACK_URL'
    },
    (accessToken, refreshToken, profile, done) => {
        // Now profile have user shit
        return done(null, profile);
    }));

    app.get('/test/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

    app.get('/test/google/callback', passport.authenticate('google', { failureRedirect: '/changethisidk' }), (req, res) => {
        // test
        res.json(req.user);
    });
};