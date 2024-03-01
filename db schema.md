# DB Schema

## Users

| Name | Datatype | Description |
|-|-|-|
| id | string | ID of the user. Usefull when storing things like a user report. |
| username | string | The user's username. |
| password | string | The user's hashed password. |
| privateCode | string | The user's current private code (token). |
| admin | boolean | Whether the user is an admin. |
| moderator | boolean | Whether the user is a moderator. |
| banned | boolean | Whether the user is banned. |
| rank | number | The current rank of the user. |
| badges | array\<string> | The badges the user has received. |
| bio | string | The user's bio/about me. |
| favoriteProjectType | number | The type of favorite project the user has. |
| favoriteProjectID | number | The ID of the favorite project the user has. |
| cubes | number | The number of cubes the user has. |
| firstLogin | number | The unix epoch of when the user first logged in. |
| lastLogin | number | The unix epoch of when the user last logged in. |
| followers | array\<string> | The IDs of the users that follow the user. |
| last upload | number | The unix time of when the user last uploaded a project. |

## User Messages

| Name | Datatype | Description |
|-|-|-|
| id | string | The message's unique ID. |
| recipient | string | The recipient's id. |
| type | string | The message's type. |
| text? | string | The text content of the message. |
| name? | string | The referenced project's name. |
| reason? | string | The referenced moderation action's reason. |
| remixName? | string | The referenced remix's name. |
| projectID? | string | The referenced project's ID. |
| disputable? | boolean | Whether the referenced moderation action is disputable. |
| moderator | boolean | Whether the message was sent by a moderator. |
| read | boolean | Whether the message has been read. |
| date | number | The unix timestamp of when the message was sent. |

## Reports

| Name | Datatype | Description |
|-|-|-|
| type | number | The type of report. 0 for user report, 1 for project report. |
| reportee | string | The reportee's id. can be a project id or a user id |
| reason | string | The reason for the report. |
| reporter | string | The reporter's id. |
| id | string | The report's unique ID. |

## Projects

| Name | Datatype | Description |
|-|-|-|
| id | number | The project's unique ID. This is also what the name of the files will be. |
| author | string | The author's ID. |
| title | string | The project's name. |
| instructions | string | The project instructions. |
| notes | string | The project notes. |
| remix | number/undefined  | Project ID it's a remix of, if it's not a remix then undefined. |
| featured | boolean | True if the project is featured, false if not. |
| date | number | Unix timestamp that the project was published |
| lastUpdate | number | Unix timestamp that the project was last updated |
| views | Array\<IP(string)> | An array of IPs that have seen the project. The IPs are encrypted. |
| loves | Array\<string> | An array of people that loved the project. The usernames are encrypted. |
| votes | Array\<string> | An array of people that voted for the project. The usernames are encrypted |
| rating | string | Rating of the project. |
