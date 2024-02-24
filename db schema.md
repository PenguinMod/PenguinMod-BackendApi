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
| badges | array (string) | The badges the user has received. |
| bio | string | The user's bio/about me. |
| favoriteProjectType | number | The type of favorite project the user has. |
| favoriteProjectID | number | The ID of the favorite project the user has. |
| cubes | number | The number of cubes the user has. |
| firstLogin | number | The unix epoch of when the user first logged in. |
| lastLogin | number | The unix epoch of when the user last logged in. |

## User Messages

| Name | Datatype | Description |
|-|-|-|
| _id | string | The message's unique ID. |
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
| id | string | The project's unique ID, this is also what the name of the file will be. |
| author | string | The author's ID. |
| title | string | The project's name. |
| image | string | ID of the image file. |
| instructions | string | The project instructions. |
| notes | string | The project notes. |
| remix | string | Project ID it's a remix of, if it's not a remix then undefined. |
