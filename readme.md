# DiscordStreamer
DiscordStreamer is a 24/7 Music Streaming Discord Bot framework for a server-radio, made for ease of use.

**WARNING!** *This module will drastically drain your bandwidth, be prepared to lose about 500GB-800GB per month, if you intend to do it for one bot, and 24/7.*
## Usage 
```js
var DiscordStreamer = require("discordstreamer");
var stream = new DiscordStreamer("bot token", {"channel": "Voice channel ID", "feed", "Feed text channel ID", "masterUser": ["Your Discord user ID"]});
stream.connect();
stream.on("ready", () => {
  stream.startPlaying(__dirname + "./playlist.json");
});
```

## Playlists
Playlists are done using a unique format, and they all must be structured as JSON. Here is an example of a perfect playlist envoirement

```json
{
    "discordstreamer": {
        "playlist": [
            {
                "urlID": "ecP-XLv1Rv0",
                "name": "Bassjackers ft. Luciana - Fireflies (Official Music Video)",
                "length": "03:11"
            }
        ]
    }
}
```

## Functionality
DiscordStreamer offers variety of functions to host your server radio perfectly.

User commands
  - queue - Lets the people see upcoming songs.
  - info - Shows information about the framework.

Masteruser commands
  - add - Adds a YouTube video to the playlist file. **(NOTE! Must be prefixed with https:// and be on youtube.com, not youtu.be!)**
  - skip - Skips the currently playing song.
  - reshuffle - Reshuffles the playlist, and starts skips to the first song.

## Support
We have documentation right [here!](https://cernodile.com/docs/DiscordStreamer). However, if you're lost and need more information, contact us at

[![Discord](https://discordapp.com/api/guilds/256444503123034112/widget.png?style=banner2)](https://discord.gg/NQcgJzR)
