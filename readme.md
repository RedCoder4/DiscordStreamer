# DiscordStreamer
DiscordStreamer is a 24/7 Music Streaming Discord Bot framework for a server-radio, made for ease of use.

**WARNING!** *This module will drastically drain your bandwidth depending on your playlist size. It will be a one-time thing only, unless you add more songs! Also be prepared to use a lot of disk space!*
## Usage 
```js
var DiscordStreamer = require("discordstreamer");
var stream = new DiscordStreamer("bot token", __dirname, {"vc": "Voice channel ID", "feed", "Feed text channel ID", "djs": ["Someone's Discord user ID"], "masterUsers": ["Your Discord user ID"]});
stream.init();
```

## Playlists
Playlists are stored using RethinkDB.

## Functionality
DiscordStreamer offers variety of functions to host your server radio perfectly.

User commands
  - queue - Lets the people see upcoming songs.
  - info - Shows information about the framework.

DJ commands
  - add - Adds a YouTube video to the playlist file.
  - skip - Skips the currently playing song forcibly.
  - reshuffle - Reshuffles the playlist, and starts skips to the first song.

Masteruser commands
  - eval - Evaluates code.
  - restore - Converts post 1.0.0 playlist to RethinkDB.

## Support
We have documentation right [here!](https://cernodile.com/docs/DiscordStreamer) However, if you're lost and need more information, contact us at

[![Discord](https://discordapp.com/api/guilds/256444503123034112/widget.png?style=banner2)](https://discord.gg/NQcgJzR)