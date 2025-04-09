# TODO

## Bugs

- [ ] bug fix: [invalid json while uploading](https://discord.com/channels/1033551490331197462/1326306569368899696)
- [ ] fix mods cant edit projects
- [ ] fix clicking update edits brings you to a broken edit page

## Features

- [ ] block people: [suggestion](https://discord.com/channels/1033551490331197462/1325445592305893470/1325533771281465405)
- [ ] bulk read, delete, and mark unread messages (provide an array of message ids or something to the api, and the action will be done)
- [ ] mods review project, say its good, all reports are cast aside until project is updated next\
- [ ] possibly ratelimit adding votes & likes, or just changing votes & likes if adding specifically cant be ratelimited
- [ ] ratelimit renames, changing pfp, updating projects (if not already), reports, and bio updates
- [ ] delete reports of a project when the project is deleted
- [ ] delete reports of a user when the account is deleted

## Studios

- [ ] Allow studios to contain a list of project IDs
  - [ ] If we go with the user method, this could be searched just like looking for an author's projects
- [ ] Allow studio creators to add users that can add projects (Managers)
- [ ] Allow members to follow groups
- [ ] Allow studios to enable project adding for all people, followers, managers, or no one
  - [ ] Extra logic required if we go with user method
- [ ] Allow studios to earn badges
- [ ] Allow studios to have ranks (can be used for enabling future features)
- [ ] Allow studios to OWN projects (the author is the studio, would allow managers to edit the project)
  - [ ] Potentially mark studios as users without a login method?
    - [ ] This is useful for most of these todos
    - [ ] This avoids several struggles but also requires a bit of extra logic
