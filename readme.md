# DiscordStreamer
DiscordStreamer is a 24/7 Music Streaming Discord Bot framework for a server-radio, made for ease of use.

**WARNING!** *This module will drastically drain your bandwidth depending on your playlist size. It will be a one-time thing only, unless you add more songs! Also be prepared to use a lot of disk space!*
## Usage 
```js
var DiscordStreamer = require("discordstreamer");
var stream = new DiscordStreamer("bot token", __dirname, {"vc": "Voice channel ID", "feed": "Feed text channel ID", "djs": ["Someone's Discord user ID"], "masterUsers": ["Your Discord user ID"]});
stream.init();
```

## Playlists
Playlists are stored using [RethinkDB](http://www.rethinkdb.com).
## Functionality
DiscordStreamer offers variety of functions to host your server radio perfectly.

User commands
  - queue - Lets the people see upcoming songs.
    - list
    - playlist
  - info - Shows information about the framework.
    - framework
    - source

DJ commands
  - add - Adds a YouTube video to the playlist file.
    - request
  - skip - Skips the currently playing song forcibly.
  - reshuffle - Reshuffles the playlist, and starts skips to the first song.
    - shuffle

Masteruser commands
  - eval - Evaluates code.
  - restore - Converts post 1.0.0 playlist to RethinkDB.
  - shutdown - Shuts down the bot's current process.
    - off

## Support
We have documentation right [here!](https://cernodile.com/docs/DiscordStreamer) However, if you're lost and need more information, contact us at

[![Discord](https://discordapp.com/api/guilds/256444503123034112/widget.png?style=banner2)](https://discord.gg/NQcgJzR)

## Installation
Installation guides are provided in [the wiki](https://github.com/teamcernodile/discordstreamer/wiki). For an OS that does not have an installation guide yet, contact us on the DiscordStreamer community using the button above.
