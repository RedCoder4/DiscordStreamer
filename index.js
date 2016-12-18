var EventEmitter = require("events").EventEmitter;
var Eris = require('eris');
var fs = require('fs');
var ytdl = require('ytdl-core');
var pkg = require('./package.json');
/**
 * @private
 * @function shuffle
 * @param {Array} The array containing the items to shuffle.
 * @credit Stackoverflow "Community Wiki"
 * @returns {Array} Shuffled array
 */
function shuffle(a) {
  for (var i = a.length; i; i--) {
    var j = Math.floor(Math.random() * i);
    [a[i - 1], a[j]] = [a[j], a[i - 1]];
  }
}
module.exports = class DiscordStreamer extends EventEmitter {
  /**
  * @function constructor
  * @param {String} token Your OAuth2 Discord Bot token.
  * @param {Object} options All definable options will be declared here.
  * @param {String} options.channel Voice channel ID for the stream.
  * @param {String} options.feed Text channel ID for the bot's feed.
  * @param {Boolean} [options.debug=false] Declares whether debug mode is enabled or not.
  * @param {String} [options.prefix=->] Prefix for the bot's commands.
  * @param {Array} [options.masterUser=[]] An array containing the IDs of command-enabled users.
  * @param {String} [options.fm=DiscordStreamer FM] Your "radio-station" name.
  * @param {String} [options.icon=https://cdn.cernodile.com/discordstreamer.png] Your embed image URL.
  * @param {Number} [options.embedColor=0x62f762] Sets the embed color, must be hexademical.
  * @param {Boolean} [options.http=false] Wheter to enable a http webserver or not.
  * @param {Number} [options.port=8888] Your HTTP port to host web interface at.
  * NOTE! Incomplete ^^, coming in 0.0.4
  */
  constructor (token, options) {
    super();
    this.options = {};
    this.options.debug = false;
    this.options.channel = '0';
    this.options.feed = '0';
    this.options.prefix = '->';
    this.options.masterUser = [];
    this.options.fm = 'DiscordStreamer FM';
    this.options.icon = 'https://cdn.cernodile.com/discordstreamer.png';
    this.options.embedColor = 0x62f762;
    this.options.playlist = 'playlist.json';
    this.options.http = false;
    this.options.port = 8888;
    if (options) {
      for (var key in options) {
        this.options[key] = options[key];
      }
    }
    this.list = [];
    this.listjson = {};
    this.path = '';
    this.filepath = '';
    this.token = token;
    this.bot = new Eris(this.token);
    this.repliedMsgs = new Map();
    this.session = {};
    this.index = 0;
    this.toDelete = 0;
    this.bot.on('ready', () => {
      this.emit('ready');
    });
    this.bot.on('disconnect', () => {
      this.bot.on('connect', () => {
        if (this.path !== '') {
          this.startPlaying(this.path);
        }
      });
    });
    this.bot.on('messageDelete', (msg) => {
      if (this.repliedMsgs.has(msg.id)) {
        var m = this.repliedMsgs.get(msg.id);
        this.repliedMsgs.delete(msg.id);
        this.bot.deleteMessage(m.channel.id, m.id);
      }
    });
    this.bot.on('messageCreate', (msg) => {
      if (msg.channel.id === this.options.feed && !msg.author.bot && msg.guild) {
        var base = msg.content.substr(this.options.prefix.length).split(' ');
        if (this.options.masterUser.indexOf(msg.author.id) > -1) {
          if (msg.content.startsWith(this.options.prefix)) {
            switch (base[0]) {
              case 'reshuffle':
              case 'shuffle':
                shuffle(this.list);
                this.index = -1;
                this.bot.createMessage(msg.channel.id, 'Reshuffled the playlist and restarting from zero index!').then((m) => {
                  this.repliedMsgs.set(msg.id, m);
                });
                this.session.stopPlaying();
                break;
              case 'request':
              case 'enqueue':
              case 'add':
                  ytdl.getInfo(msg.content.substr(this.options.prefix.length + base[0].length + 1), (err, vid) => {
                    if (err) {
                      return console.log(err);
                    }
                    var min = Math.floor(vid.length_seconds / 60);
                    var sec = Math.floor(vid.length_seconds % 60);
                    if (min < 10) min = '0' + Math.floor(vid.length_seconds / 60);
                    if (sec < 10) sec = '0' + Math.floor(vid.length_seconds % 60);
                    var title = vid.title;
                    var protocol = 'https://';
                    if (msg.content.startsWith('http://')) {
                      protocol = 'http://';
                    }
                    var urlID = msg.content.substr(this.options.prefix.length + base[0].length + 1 + protocol.length + 'youtube.com/watch?v='.length);
                    if (msg.content.includes('www.youtube.com')) {
                      urlID = msg.content.substr(this.options.prefix.length + base[0].length + 1 + protocol.length + 'www.youtube.com/watch?v='.length);
                    } else if (msg.content.includes('www.youtu.be')) {
                      urlID = msg.content.substr(this.options.prefix.length + base[0].length + 1 + protocol.length + 'www.youtu.be'.length);
                    } else if (msg.content.includes('youtu.be')) {
                      urlID = msg.content.substr(this.options.prefix.length + base[0].length + 1 + protocol.length + 'youtu.be'.length);
                    }
                    var final = {"urlID": urlID, "name": title, "length": min + ':' + sec, "requester": msg.author.id};
                    // Requester is logged for moderation purposes.
                    ytdl(msg.content.substr(this.options.prefix.length + base[0].length + 1), {audioonly: true}).pipe(fs.createWriteStream(this.path + '/discordstreamer/' + title + '.mp3'));
                    this.listjson.discordstreamer.playlist.push(final);
                    fs.writeFile(this.filepath, JSON.stringify(this.listjson, null, 4), (e) => {
                      if (e) {
                        return console.log(e);
                      }
                      this.bot.createMessage(msg.channel.id, 'Added **' + title + '** to the playlist!').then((m) => {
                        this.repliedMsgs.set(msg.id, m);
                      });
                    });
                  });
                  break;
            }
          }
        }
        if (msg.content.startsWith(this.options.prefix)) {
          switch (base[0]) {
            case 'playlist':
            case 'list':
            case 'queue':
              var a = [];
              var i = Math.floor(this.index);
              var d = 0;
              function emojiNumber (string) { // eslint-disable-line
                return string.replace('10', ':keycap_ten:').replace('1', ':one:').replace('2', ':two:').replace('3', ':three:').replace('4', ':four:').replace('5', ':five:').replace('6', ':six:').replace('7', ':seven:').replace('8', ':eight:').replace('9', ':nine:');
              }
              for (i; i < this.index + 10; i++) {
                d++;
                if (this.list[i]) {
                  a.push({"name": '\u200B', "inline": true, "value": emojiNumber(String(d)) + ' ' + this.list[i].name});
                }
              }
              this.bot.createMessage(msg.channel.id, {'content': '', 'embed': {'title': 'Playlist', 'color': this.options.embedColor, thumbnail: {'url': this.options.icon}, fields: a}}).then((m) => {
                this.repliedMsgs.set(msg.id, m);
              });
              break;
            case 'skip':
            case 'next':
            case 'voteskip':
              if (this.options.masterUser.indexOf(msg.author.id) > -1 && base[1] !== 'vote') {
                this.bot.createMessage(msg.channel.id, {'content': '', 'embed': {'title': 'Voteskip', 'color': this.options.embedColor, thumbnail: {'url': this.options.icon}, fields: [{'inline': true, 'name': '\u200B', 'value': 'Since you are a master user, I\'ve skipped this song without voteskip for you.'}]}});
                this.session.stopPlaying();
              } else {
                if (!this.voteSkip) {
                  this.bot.createMessage(msg.channel.id, {'content': '', 'embed': {'title': 'Voteskip', 'color': this.options.embedColor, thumbnail: {'url': this.options.icon}, fields: [{'inline': true, 'name': '\u200B', 'value': 'React using :thumbsup: or :thumbsdown: to voice your opinion!'}]}}).then((m) => {
                    this.voteSkip = true;
                    m.addReaction(encodeURIComponent('\u{1F44D}'));
                    m.addReaction(encodeURIComponent('\u{1F44E}'));
                    setTimeout(() => {
                      this.bot.getMessage(msg.channel.id, m.id).then((r) => {
                        if (r.reactions['\u{1F44D}'].count > r.reactions['\u{1F44E}'].count) {
                          r.edit({'content': '', 'embed': {'title': 'Voteskip', 'color': 0x62f762, thumbnail: {'url': this.options.icon}, fields: [{'inline': true, 'name': '\u200B', 'value': 'Vote is over! Skipping song!'}]}});
                          this.session.stopPlaying();
                        } else {
                          r.edit({'content': '', 'embed': {'title': 'Voteskip', 'color': 0xf76262, thumbnail: {'url': this.options.icon}, fields: [{'inline': true, 'name': '\u200B', 'value': 'Vote has FAILED! Not skipping!'}]}});
                        }
                        this.voteSkip = false;
                      });
                    }, 10000);
                  });
                } else {
                  this.bot.createMessage(msg.channel.id, 'Please wait until I have decided from my last voteskip!');
                }
              }
              break;
            case 'framework':
            case 'source':
            case 'info':
              var formatArray = [];
              formatArray.push(':radio: **' + this.options.fm + '** v' + pkg.version);
              formatArray.push('Powered by DiscordStreamer made by Team Cernodile.\nhttps://www.npmjs.com/package/discordstreamer\nhttps://github.com/TeamCernodile/DiscordStreamer');
              this.bot.createMessage(msg.channel.id, formatArray.join('\n')).then((m) => {
                this.repliedMsgs.set(msg.id, m);
              });
              break;
            case 'reconnect':
              var formatArray = [];
              if (msg.guild.members.get(this.bot.user.id).voiceState) {
                formatArray.push('The bot does not require reconnecting! It is already in the voice channel!');
                this.bot.createMessage(msg.channel.id, {'content': '', 'embed': {'title': this.options.fm + ' Commands', 'color': this.options.embedColor, thumbnail: {'url': this.options.icon}, fields: [{'inline': true, 'name': '\u200B', 'value': formatArray.join('\n')}]}});
              } else {
                var c = this;
                this.bot.joinVoiceChannel(this.options.channel).then((v) => {
                  c = v;
                  formatArray.push('Reconnected to the voice channel!');
                  this.bot.createMessage(msg.channel.id, {'content': '', 'embed': {'title': this.options.fm + ' Commands', 'color': this.options.embedColor, thumbnail: {'url': this.options.icon}, fields: [{'inline': true, 'name': '\u200B', 'value': formatArray.join('\n')}]}});
                }).catch((e) => {
                  formatArray.push('Failed to reconnect to the voice channel!');
                  this.bot.createMessage(msg.channel.id, {'content': '', 'embed': {'title': this.options.fm + ' Commands', 'color': this.options.embedColor, thumbnail: {'url': this.options.icon}, fields: [{'inline': true, 'name': '\u200B', 'value': formatArray.join('\n')}]}});
                });
              }
              break;
            case 'help':
              var formatArray = [];
              formatArray.push('`' + this.options.prefix + 'queue` **Shows you the current playlist**\n   `' + this.options.prefix + 'list, ' + this.options.prefix + 'playlist`');
              formatArray.push('`' + this.options.prefix + 'skip` **Requests a voteskip to begin**\n   `' + this.options.prefix + 'voteskip, ' + this.options.prefix + 'next`');
              formatArray.push('`' + this.options.prefix + 'info` **Shows the information about my streaming module**\n   `' + this.options.prefix + 'framework, ' + this.options.prefix + 'source`');
              formatArray.push('`' + this.options.prefix + 'reconnect` **Reconnects the bot back to voice channel in case of Discord disconnecting bot.**');
              this.bot.createMessage(msg.channel.id, {'content': '', 'embed': {'title': this.options.fm + ' Commands', 'color': this.options.embedColor, thumbnail: {'url': this.options.icon}, fields: [{'inline': true, 'name': '\u200B', 'value': formatArray.join('\n')}]}});
              break;
          }
        }
      }
    });
  } 
  /**
  * @function connect
  * @returns {Promise}
  */
  connect () {
    return this.bot.connect();
  }
  debugMsg (string) {
    return console.log('\u001b[32m' + this.options.fm + ': \u001b[0m' + string);
  }
  /**
  * @function startPlaying
  * @param {String} filepath Path to the JSON file, with following <a href="./playlistFormat.html">structure</a>.
  * @returns {VoiceChannelStream}
  */
  startPlaying (path) {
    if (this.bot.ready) {
      fs.readFile(path + '/' + this.options.playlist, (err, data) => {
        if (err) {
          if (this.options.debug) {
            this.debugMsg('startPlaying(filepath), failed to open playlist file.');
          }
          return;
        }
        if (data) {
          if (!fs.existsSync(path + '/discordstreamer/')){
            fs.mkdirSync(path + '/discordstreamer/');
          }
          data = JSON.parse(data);
          this.listjson = data;
          this.path = path;
          this.filepath = path + '/' + this.options.playlist;
          shuffle(data.discordstreamer.playlist);
          this.list = data.discordstreamer.playlist;
          var constructor = this;
          this.bot.joinVoiceChannel(this.options.channel).then((vc) => {
            constructor.session = vc;
            constructor.index = 0;
            function play () {
              var playlist = data.discordstreamer.playlist[constructor.index];
              var link = 'https://youtube.com/watch?v=' + playlist.urlID;
              if (!fs.existsSync(path + '/discordstreamer/' + playlist.name + '.mp3')) {
                vc.play(ytdl(link, {audioonly: true}));
                ytdl(link, {audioonly: true}).pipe(fs.createWriteStream(path + '/discordstreamer/' + playlist.name + '.mp3'));
              } else {
                vc.play(path + '/discordstreamer/' + playlist.name + '.mp3');
              }
              if (constructor.options.debug) {
                constructor.debugMsg('Now streaming: ' + playlist.name);
              }
              constructor.emit('newSong', playlist);
              constructor.bot.editStatus({name: playlist.name, type: 1, url: 'https://twitch.tv//'});
              var formatArray = [];
              formatArray.push(':musical_note: **' + playlist.name + '** :musical_note:');
              formatArray.push('00:00 :arrow_forward:▬▬' + '▬'.repeat(Math.floor(playlist.name.length / 3)) + ' ' + playlist.length);
              var msgToEdit;
              constructor.bot.createMessage(constructor.options.feed, formatArray.join('\n')).then((m) => {
                msgToEdit = m.id;
              });
              vc.once('end', () => {
                if (!vc.playing) {
                  if (constructor.toDelete !== 0) {
                    constructor.bot.deleteMessage(constructor.options.feed, constructor.toDelete);
                  }
                  constructor.index++;
                  if (constructor.index === (data.discordstreamer.playlist.length)) {
                    constructor.index = 0;
                    shuffle(constructor.list);
                  }
                  formatArray = [];
                  formatArray.push(':musical_note: **' + playlist.name + '** :musical_note:');
                  formatArray.push(playlist.length + ' ▬▬' + '▬'.repeat(Math.floor(playlist.name.length / 3)) + ':stop_button: ' + playlist.length);
                  formatArray.push('**Song finished, check below for what\'s next!**');
                  constructor.bot.editMessage(constructor.options.feed, msgToEdit, formatArray.join('\n'));
                  constructor.toDelete = msgToEdit;
                  play();
                }
                vc.on('error', (e) => {
                  constructor.debugMsg('VC ERROR! ' + e);
                });
              });
            }
            play();
          }).catch((e) => {
            if (e.message.includes('Already encoding')) return;
            if (constructor.options.debug) {
              this.debugMsg('Whoopsie! Something bad happened, restarting function!\n\u001b[31m' + this.options.fm + ': \u001b[0m' + e);
            }
            constructor.emit('debug', 'Whoopsie! Something bad happened, restarting function!\n\u001b[31m' + this.options.fm + ': \u001b[0m' + e);
            return constructor.startPlaying(path);
          });
        }
      });
    } else {
      if (this.options.debug) {
        this.debugMsg('Please wait until the bot is ready!');
      } else {
        this.emit('debug', 'Please wait until the bot is ready!');
      }
    }
  }
};
