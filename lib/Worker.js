var Eris = require('eris');
var fs = require('fs');
var r = require('rethinkdb');
var process = require('process');
var CommandManager = require('./CommandManager.js');
var VoiceManager = require('./VoiceManager.js');
const pkg = require('../package.json');
module.exports = class Worker {
  /**
  * @function constructor
  * @param String token Used to authenticate the streamer.
  * @param String dir Directory the streamer is executed at.
  * @param Object options Sets the options for streamer.
  * @param String options.vc Sets the voice channel where it will stream.
  * @param String options.feed Sets the text channel where it will respond to everything.
  * @param Array [options.djs=[]] Sets the appropiate DJs for the channel.
  * @param Array [options.masterUsers=[]] Sets the people, who are able to execute dangerous commands.
  * @param String [options.prefix=->] Sets the prefix the bot will respond to.
  * @param String [options.host=localhost] Sets the RethinkDB host to connect to.
  * @param String [options.saveDir=/discordstreamer/] Sets the file saving directory.
  * @param Boolean [options.supportDevs=false] Choose whether to broadcast message to support developers or not.
  * @param Number [options.broadcastTime=60] Interval between broadcasts.
  * @param Number [options.backupTime=30] Interval between local JSON backups.
  * @returns null
  */
  constructor(token, dir, options) {
    if (!token || !dir) throw new Error("Missing required parameters");
    this.token = token;
    this.dir = dir;
    this.bot = new Eris(this.token);
    this.reconnect = false;
    this.connectedToDb = false;
    this.options = {};
    this.options.vc = '';
    this.options.feed = '';
    this.options.djs = [];
    this.options.masterUsers = [];
    this.options.blacklist = [];
    this.options.prefix = '->';
    this.options.host = 'localhost';
    this.options.saveDir = '/discordstreamer/';
    this.options.supportDevs = false;
    this.options.broadcastTime = 60;
    this.options.backupTime = 30;
    if (typeof options === 'object') {
      for (var key in options) {
        this.options[key] = options[key];
      }
    }
    if (this.options.vc.length === 0 || this.options.feed.length === 0) {
      throw new Error("Voice Channel and Text Channel IDs are missing!");
    }
    r.connect(this.options.host).then(db => {this.conn = db;this.connectedToDb = true;}).catch(e => {this.connectedToDb = false;});
    this.r = r;
    this.msgContainer = new Map();
    this.firstMsg = true;
  }
  /**
   * @function forceUpdate
   * @returns null
   */
  debugMsg (string, error, exit) {
    if (!exit && error) {
      console.error('\u001b[31mDiscordStreamer: \u001b[0m' + string);
    } else if (!exit && !error) {
      console.log('\u001b[32mDiscordStreamer: \u001b[0m' + string);
    } else {
      if (error) {
        throw new Error(string);
      } else {
        console.log('\u001b[32mDiscordStreamer: \u001b[0m' + string);
        process.exit(0);
      }
    }
  }
  forceUpdate () {
    this.commandHandler.update(this);
    this.connection.update(this);
  }
  /**
   * @function supportDevs
   * @returns null
   */
  supportDevs () {
    var responses = ["Support DiscordStreamer by joining the [official server](https://discord.gg/NQcgJzR)", "DiscordStreamer isn't free to host, anything to help us cover our fees is appreciated! [Learn more](https://discord.gg/NQcgJzR)", "Listen to the latest tracks on official server at [here](https://discord.gg/NQcgJzR)"];
    if (this.firstMsg || this.connection.newMsg) {
      this.firstMsg = false;
      if (this.connection) this.connection.newMsg = false;
      this.debugMsg("Thank you for supporting us! Sent a broadcast message to the specified feed channel!");
      this.bot.createMessage(this.options.feed, {"content": "", "embed": {"author": {"icon_url": "https://cdn.discordapp.com/avatars/154603113079111680/76b809c1c36c236eb49f726ada4aca5b.webp?size=128", "name": "Cernodile#0168"}, "title": "A message from the developers", "color": 0xffffff, "description": responses[Math.floor(Math.random() * responses.length)]}});
    } else {
      this.debugMsg("Thank you for supporting us! Skipped a broadcast message due to lack of messages!");
    }
    setTimeout(() => {
      this.supportDevs();
    }, 60000 * this.options.broadcastTime);
  }
  /**
   * @function init
   * @returns null
   */
  init () {
    this.debugMsg("Initializing DiscordStreamer!");
    process.on('warning', (w) => {
      if (w.name === 'DeprecationWarning') {
        return this.debugMsg("Please ignore the DeprecationWarning, it's most likely that one of our dependencies is a bit outdated.", true);
      }
    });
    var https = require('https');
    this.debugMsg("Checking for updates...");
    https.get("https://raw.githubusercontent.com/TeamCernodile/DiscordStreamer/master/package.json", res => {
      if (res.statusCode !== 200) {
        return this.debugMsg(`STATUS: ${res.statusCode}`, true);
      }
      res.setEncoding('utf8');
      let rawData = '';
      res.on('data', (chunk) => rawData += chunk);
      res.on('end', () => {
        try {
          let parsedData = JSON.parse(rawData);
          if (parsedData.version > pkg.version) {
            this.debugMsg("OUTDATED VERSION! Please update immediately! If you run in trouble after updating, check out the wiki at https://github.com/TeamCernodile/DiscordStreamer/wiki", true);
          } else if (parsedData.version < pkg.version) {
            this.debugMsg("Thanks for supporting DiscordStreamer by testing our public test builds!");
          } else {
            this.debugMsg("Running latest version of DiscordStreamer!");
          }
        } catch (e) {
          this.debugMsg(e.message, true);
        }
      });
    }).on('error', (e) => {
     this.debugMsg(`Got error: ${e.message}`, true);
    });
    this.bot.connect().catch(e => {
      throw new Error(e.message);
    });
    this.bot.on('ready', () => {
      if (this.bot.channelGuildMap.hasOwnProperty(this.options.vc) && this.bot.channelGuildMap.hasOwnProperty(this.options.feed)) {
        var feedChannel = this.bot.guilds.get(this.bot.channelGuildMap[this.options.feed]).channels.get(this.options.feed);
        var voiceChannel = this.bot.guilds.get(this.bot.channelGuildMap[this.options.vc]).channels.get(this.options.vc);
        if (voiceChannel.permissionsOf(this.bot.user.id).json["voiceSpeak"]) {
          if (feedChannel.permissionsOf(this.bot.user.id).json["sendMessages"] || feedChannel.permissionsOf(this.bot.user.id).json["readMessages"]) {
            this.__setup();
            var con = this;
            setInterval(() => {
              con.__backup();
            }, 60000 * this.options.backupTime);
          } else {
            throw new Error("Invalid text channel permissions.");
          }
        } else {
          throw new Error("Unable to speak at specified voice channel.");
        }
      } else {
        throw new Error("Invalid voice channel and text channel IDs.");
      }
    });
    this.bot.on('voiceChannelJoin', (m, channel) => {
      // Using joinVoiceChannel won't affect alreading running stream, instead it could fix stuff when there's a Gateway drop.
      if (channel.id === this.options.vc) {
        this.bot.joinVoiceChannel(this.options.vc).then((vc) => {
          this.connection.vc = vc;
        }).catch(console.log);
      }
    });
  }
  __setup () {
    if (this.bot.ready && !this.reconnect) {
      if (this.options.supportDevs) {
        this.supportDevs();
      }
      this.reconnect = true;
      this.connection = new VoiceManager(this);
      this.commandHandler = new CommandManager(this);
      this.r.dbList().run(this.conn).then(r => {
        if (r.indexOf(this.bot.user.id) === -1) {
          this.debugMsg("Setup initialized, you may have to restart your bot, if it won't work!");
          this.r.dbCreate(this.bot.user.id).run(this.conn, (e) => {
            this.r.db(this.bot.user.id).tableCreate('playlist').run(this.conn, (e) => {
              this.conn.use(this.bot.user.id);
              if (!this.options.playlist) {
                this.r.table('playlist').insert({"urlID": "EP625xQIGzs", "name": "Tobu - Hope [NCS Release]", "length": "04:45"}).run(this.conn, (e) => {
                  require('ytdl-core')("EP625xQIGzs").on('error', (e) => {throw new Error("Failed to fetch default song, your bot won't function properly until you add a song!")}).pipe(fs.createWriteStream(this.dir + this.options.saveDir + "EP625xQIGzs.mp3"));
                  this.r.table('playlist').run(this.conn, (e, r) => {
                    r.toArray().then(array => {
                      this.connection.start();
                      this.forceUpdate();
                      this.__backup();
                    });
                  });
                });
              } else {
                var d = require(this.dir + '/' + this.options.playlist);
                for (var i in d.discordstreamer.playlist) {
                  console.log('Inserting ' + d.discordstreamer.playlist[i].urlID + ' to ' + this.bot.user.id + '.playlist');
                  this.r.table('playlist').insert(d.discordstreamer.playlist[i]).run(this.conn, () => {});
                }
              }
            });
          });
        } else {
          this.debugMsg("Skipping setup! Found user ID in the database.");
          this.conn.use(this.bot.user.id);
          this.r.table('playlist').run(this.conn, (e, r) => {
            r.toArray().then(array => {
              this.connection.start();
              this.forceUpdate();
              this.__backup();
            });
          });
        }
      }).catch(e => {
        this.__dbError(e, true);
      });
    } else {
      this.__reconnect(this);
    }
  }
  __dbError (e, started) {
    if (e.msg === "First argument to `run` must be an open connection.") {
      this.connectedToDb = false;
      if (!fs.existsSync(this.dir + '/' + this.bot.user.id + '-backup.json')) {
        throw new Error('Unable to continue using bot! Missing backup playlist!');
      } else {
        var backup = require(this.dir + '/' + this.bot.user.id + '-backup.json');
        if (!started) this.connection.start(backup.playlist);
        this.forceUpdate();
      }
    } else {
      throw new Error("Unknown error encountered!\n" + e.message);
    }
  }
  __reconnect (c) {
    c.debugMsg("Reconnection initialized!");
    // Reconnects voice channel.
    c.bot.joinVoiceChannel(c.options.vc).then((vc) => {
      c.connection.vc = vc;
    }).catch(console.log);
  }
  __backup () {
    this.debugMsg("Backup initialized");
    if (this.connectedToDb) {
      this.r.table('playlist').run(this.conn).then(r => {
        r.toArray().then(array => {
          var playlist = {"playlist": array};
          fs.writeFileSync(this.dir + '/' + this.bot.user.id + '-backup.json', JSON.stringify(playlist));
        });
      }).catch(e => {
        this.__dbError(e);
      });
    } else {
      this.debugMsg("Backup skipped, not connected to database.");
    }
  }
};
