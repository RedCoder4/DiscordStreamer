var Eris = require('eris');
var r = require('rethinkdb');
var CommandManager = require('./CommandManager.js');
var VoiceManager = require('./VoiceManager.js');
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
  * @param String [options.host=localhost]
  * @returns null
  */
  constructor(token, dir, options) {
    if (!token || !dir) throw new Error("Missing required parameters");
    this.token = token;
    this.dir = dir;
    this.bot = new Eris(this.token);
    this.options = {};
    this.options.vc = '';
    this.options.feed = '';
    this.options.djs = [];
    this.options.masterUsers = [];
    this.options.prefix = '->';
    this.options.host = 'localhost';
    this.options.saveDir = '/discordstreamer/';
    this.options.supportDevs = false;
    this.options.broadcastTime = 60; // In minutes
    if (typeof options === 'object') {
      for (var key in options) {
        this.options[key] = options[key];
      }
    }
    r.connect(this.options.host).then(db => {this.conn = db});
    this.r = r;
    this.msgContainer = new Map();
  }
  /**
   * @function forceUpdate
   * @returns null
   */
  debugMsg (string) {
    return console.log('\u001b[32mDiscordStreamer: \u001b[0m' + string);
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
    this.bot.createMessage(this.options.feed, {"content": "", "embed": {"author": {"icon_url": "https://cdn.discordapp.com/avatars/154603113079111680/76b809c1c36c236eb49f726ada4aca5b.webp?size=128", "name": "Cernodile#0168"}, "title": "A message from the developers", "color": 0xffffff, "description": responses[Math.floor(Math.random() * responses.length)]}});
    setTimeout(() => {
      this.supportDevs();
    }, 60000 * this.options.broadcastTime);
  }
  /**
   * @function init
   * @returns null
   */
  init () {
    this.bot.connect();
    this.bot.once('ready', () => {
      if (this.options.supportDevs) {
        this.supportDevs();
      }
      this.connection = new VoiceManager(this);
      this.commandHandler = new CommandManager(this);
      this.r.dbList().run(this.conn, (e, r) => {
        if (r.indexOf(this.bot.user.id) === -1) {
          this.r.dbCreate(this.bot.user.id).run(this.conn, (e) => {
            this.r.db(this.bot.user.id).tableCreate('playlist').run(this.conn, (e) => {
              this.conn.use(this.bot.user.id);
              if (!this.options.playlist) {
              this.r.table('playlist').insert({"urlID": "EP625xQIGzs", "name": "Tobu - Hope [NCS Release]", "length": "04:45"}).run(this.conn, (e) => {
                this.r.table('playlist').run(this.conn, (e, r) => {
                  this.connection.start([{"urlID": "EP625xQIGzs", "name": "Tobu - Hope [NCS Release]", "length": "04:45"}]);
                  this.forceUpdate();
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
          this.conn.use(this.bot.user.id);
          this.r.table('playlist').run(this.conn, (e, r) => {
            r.toArray().then(array => {
              this.connection.start(array);
              this.forceUpdate();
            });
          });
        }
      });
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
};