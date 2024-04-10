module.exports = (app, utils) => {
    app.get('/api/v1/users/githubCallback', async (req, res) => {
        const { code, state } = req.query;

        if (!code || !state) {
            return res.status(400).send('State mismatch or missing code');
        }

        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                accept: 'application/json'
            },
            body: JSON.stringify({
                client_id: utils.env.GithubOauthId,
                client_secret: utils.env.GithubOauthSecret,
                code: code,
                redirect_uri: 'http://localhost:8080/api/v1/users/githubCallback',
                state: state
            })
        });
        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        const userResponse = await fetch('https://api.github.com/user', {
        headers: {
            Authorization: `token ${accessToken}`
        }
        });
        const userData = await userResponse.json();

        res.send(`Hello, ${userData.login}`);
    });
};
