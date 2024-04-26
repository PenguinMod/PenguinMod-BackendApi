# To Do

## API

- [x] Endpoints should be seperate files
- [ ] Literally just remake all of the endpoints lamo
- [x] Use MongoDB Database
  - [x] Make a login system
  - [x] Projects stuff
  - [x] Reports stuff
- [x] Use minio to store project shit (json and assets)
  - [x] Use protobufs to store project jsons
- [ ] OAuth2 (Someone please do this😭)
  - [x] Scratch Auth
  - [ ] Github Auth?
  - [ ] Google Auth??? (why this shit so difficult)
  - [x] Be able to connect an account with oauth (e.g. you want to sign in with a password and oauth)

## Projects

- [x] Store project assets seperately
- [ ] Moderator removed projects should be "under review" (only accessible by ID) unless specified to fully delete

## Studios

- [ ] Allow studios to contain a list of project IDs
- [ ] Endpoint to get a page of a studio's projects
- [ ] Allow studio creators to add users that can add projects (Managers)
- [ ] Allow members to follow groups
- [ ] Allow studios to enable project adding for all people, followers, managers, or no one
- [ ] Allow studios to earn badges
- [ ] Allow studios to have ranks (can be used for enabling future features)
- [ ] Allow studios to OWN projects (the author is the studio, would allow managers to edit the project)

## Moderation

- [ ] Allow project assets to be moderated
- [x] Allow reports to be reviewed by mods

## Reporting

- [x] Add reporting projects and users with reasons
- [ ] Save multiple reports from same user but don't count them
- [ ] Add report to user if they report too much content too quickly
- [ ] Add report to user if they report the same content more than 3 times
- [ ] Automatically add a report to projects with auto-detected content(?)

## Ranking

- [x] Rank users based on if they have more than 3 projects and signed in 5 days ago
- [x] Only ranked users should be able to use Custom Extensions, Files, iframe, HTTP, Website Requests, Network, etc.

## Extra

- [ ] Make sure changing password is secure. (should require login right before, make sure to verify that it does actually happen)

## Endpoints

- [x] dist
  - [x] JSZip (for loading projects on frontend)
  - [x] getProtobufSchema (for loading projects on frontend)
  - [x] pbf (for loading projects on frontend)

- [x] meta
  - [x] api
  - [x] home (redirs to home when you get /)
  - [x] pingpong (take a guess...)
  - [x] robots.txt (get those damn robs out of here!!E2!!11)

- [ ] projects
  - [x] get project metadata
  - [x] get project protobuf
  - [x] get project assets
  - [x] get project thumbnail
  - [x] redir
  - [x] toggle getting projects
  - [x] toggle posting projects
  - [x] get featured projects (sorted by newest) (page + page count) (meta)
  - [x] get remixes of a project (page + page count) (meta)
  - [ ] "remove" project
    - [ ] dispute
    - [ ] respond to dispute
    - [ ] download
    - [ ] restore
  - [x] delete project (admin/creator only)
  - [x] manually feature (admin only)
  - [x] vote toggle
  - [x] get if user voted (only check yourself/admin can check anyone)
  - [x] get all votes (just count)
  - [x] love toggle
  - [x] get if user loved (only check yourself/admin can check anyone)
  - [x] get people who voted (admin only)
  - [x] get people who loved (admin only)
  - [x] upload project
  - [x] update project
  - [x] search projects (page + page count) (meta)
  - [x] front page (just to make it easier to get all the projects on there)
  - [x] get projects by author (page + page count) (meta)

- [ ] Users
  - [x] get profile json
  - [x] user from code (no idea why this is used but wtv)
  - [x] request rank up
  - [x] check if banned
  - [x] assign possition
  - [ ] get site mods (admin only)
  - [ ] login
    - [x] login with password
    - [x] login with token
    - [ ] oauth
      - [ ] all methods
        - [x] scratch
        - [ ] github
        - [ ] google
      - [x] create account
      - [x] login
      - [x] link account
      - [x] unlink account
      - [x] add password
    - [x] change password
  - [x] logout
  - [ ] get id by username
  - [ ] get username by id
  - [ ] is admin, is mod, etc (admin only)
  - [ ] set my featured project
  - [ ] set bio
  - [ ] set a users featured project (admin)
  - [ ] set a users bio (admin)
  - [ ] get follower count
  - [ ] is following
  - [ ] follow toggle
  - [ ] get my feed?
  - [ ] ban toggle
  - [x] is banned
  - [ ] get badges
  - [ ] set badges (admin only/automated on some endpoints)

- [ ] Messages
  - [ ] get messages (page + page count)
  - [ ] add message
  - [ ] get message count
  - [ ] mark messages as read

- [ ] Reports
  - [ ] get reports (page + page count)
  - [ ] get reports on a certain user (page + page count (just in case theres a shit ton))
  - [ ] delete report
  - [ ] send report

- [ ] Misc
  - [x] get profanity list
  - [x] set profanity list
  - [ ] get site stats
  - [ ] get last tos, privacy policy, and uploading guidelines update
  - [ ] update tos, privacy policy, or uploading guidelines
