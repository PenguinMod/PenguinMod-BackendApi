# PenguinMod-BackendApi

Do not use PenguinMod-IntermediateBackendApi anymore once this is completed.

This is intended to be a major rewrite of the entire API to be organized much better, and use MongoDB & other systems for better scalability.

## Contributing

You can create endpoints by adding folders & files. Please make sure your code is easy to read or at least has comments :D

## Vulnerabilities

Please report any security vulnerabilities using GitHub's security tab on the repository, or join the PenguinMod discord on the website and DM a developer.

## Get Started

1. Install MongoDB
    - [Windows](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-windows/)
    - [Mac](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-os-x/)
    - [Linux](https://docs.mongodb.com/manual/administration/install-on-linux/)
2. Run `mongod` to start mongodb
3. Run `npm i`. if this doesn't work run it with --force
4. Install minio
   - [Minio](https://docs.min.io/docs/minio-quickstart-guide.html)
5. Add a `.env` file copied from the .env.template file and fill in the values.
6. Run `npm run dev` to start the server in development mode.

## Deployment

1. idk man just make sure people cant access your mongodb or minio stuff. There is a docker-compose and a dockerfile, but we have not yet put it in the repo.
