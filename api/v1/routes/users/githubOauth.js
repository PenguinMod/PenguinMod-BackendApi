module.exports = (app, utils) => {
  app.get('/api/v1/users/githubCallback', async (req, res) => {
    const { code, state } = req.query;

    if (!code || !state || !utils.verifyState(state)) {
      return res.status(400).send('State mismatch or missing code');
    }

    try {
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json'
        },
        body: JSON.stringify({
          client_id: 'ID',
          client_secret: 'SECRET',
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
    } catch (error) {
      console.error('Authentication failed:', error);
      res.sendStatus(500);
    }
  });

  app.get('/api/v1/users/githubOauth', (req, res) => {
    const endpoint = 'https://github.com/login/oauth/authorize';
    const params = new URLSearchParams({
      client_id: 'ID',
      redirect_uri: 'http://localhost:8080/api/v1/users/githubCallback',
      scope: 'read:user user:email', // what to doxx from person
      state: // I forgot what to do here
    }).toString();
    const authUrl = `${endpoint}?${params}`;
    res.redirect(authUrl);
  });
};
