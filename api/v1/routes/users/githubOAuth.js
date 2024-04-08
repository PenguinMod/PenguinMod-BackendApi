module.exports = (app, utils) => {
    app.get('/api/v1/users/githubOAuth', (req, res) => {
        const endpoint = 'https://github.com/login/oauth/authorize';
        const params = new URLSearchParams({
            client_id: utils.env.GithubOauthId,
            redirect_uri: 'http://localhost:8080/api/v1/users/githubCallback',
            scope: 'read:user user:email', // what to doxx from person
            state: utils.UserManager.generateOAuth2State()
        }).toString();
        const authUrl = `${endpoint}?${params}`;
        res.redirect(authUrl);
    });
};