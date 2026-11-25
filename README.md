# PenguinMod-BackendApi

This is the backend API for PenguinMod.

## Layout

The setup for the server is in index.js. The super DB class is in api/v1/db/DBController.js.
It creates the sub-classes: Authentication.js, Projects.js, Users.js, etc.

## Vulnerabilities

Please report any security vulnerabilities using GitHub's security tab on the
repository, or join the PenguinMod discord on the website and DM a developer.

## Development

With docker, run `docker compose up -d --build`

Or, if you'd rather have it running on your machine raw, do this:

1. Install MongoDB
    - [Windows](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-windows/)
    - [Mac](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-os-x/)
    - [Linux](https://docs.mongodb.com/manual/administration/install-on-linux/)
2. Run `mongod` to start mongodb
3. Run `npm i`
4. Install minio and start it
    - [Linux](https://min.io/docs/minio/linux/index.html)
    - [Mac](https://min.io/docs/minio/macos/index.html)
    - [Windows](https://min.io/docs/minio/windows/index.html)
5. Add a `.env` file copied from the .env.template file and fill in the values.
6. Run `npm run dev` to start the server in development mode.

## Deployment

Simply use docker as you would with development.

You will likely want a Cloudflare tunnel to keep your server more private and isolated.

You should also setup BackBlaze. This is where all your project assets will be stored.

We keep our costs down by using whats called the "Bandwidth Alliance". All this
means is that our assets are in a public bucket and we access them via a
Cloudflare proxy. And it saves us a bunch of money.
