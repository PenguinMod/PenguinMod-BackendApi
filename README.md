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
5. Add a `.env` file with the following:

    ```env
    # General
    PORT=8080

    MinioClientID=yourID
    MinioClientSecret=yourSecret

    # OAuth
    ScratchOAuthClientID=id
    ScratchOAuthClientSecret=secret

    GithubOAuthClientID=id
    GithubOAuthClientSecret=secret

    GoogleOAuthClientID=id
    GoogleOAuthClientSecret=secret

    #Misc
    MaxViews=maxViewsBeforeViewCheckerReset (ex: 100)
    ViewResetRate=resetRateOfViewChecker (ex: 1 hour)

    HardRejectExpirationTime=hardRejectExpirationTime (ex: 5 days) (this is in seconds)

    PageSize=pageSize
    MaxPageSize=maxPageSize

    UploadingEnabled=bool
    ViewingEnabled=bool

    FeatureAmount=10 # amount of votes to be featured
    FollowAmount=50 # amount of followers to get badge
    LoveAmount=50 # amount of loves to get badge

    FeedExpirationTime=86400000 # amount of time before an item in your feed expires (in milliseconds) (this is 1 day)
    FeedSize=25 # max items in someones feed

    # Moderator logs
    HeatWebhook=abc
    BioWebhook=def
    ReportWebhook=ghi
    ModWebhook=jkl
    AdminWebhook=mno
    ```

6. Run `npm run dev` to start the server in development mode.

## Deployment

1. idk man follow [this](https://www.mongodb.com/docs/manual/administration/security-checklist/#std-label-security-checklist)
