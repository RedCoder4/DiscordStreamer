var EventEmitter = require("events").EventEmitter;
var Eris = require('eris');
var fs = require('fs');
var ytdl = require('ytdl-core');
var pkg = require('./package.json');
function debugMsg (string) {
  return console.log('\u001b[32mDiscordStreamer: \u001b[0m' + string);
}
/**
 * @function shuffle
 * @param array Array The array containing the items to shuffle.
 * @credit Stackoverflow "Community Wiki"
 * @return Array<>
 */
function shuffle(a) {
  for (var i = a.length; i; i--) {
    var j = Math.floor(Math.random() * i);
    [a[i - 1], a[j]] = [a[j], a[i - 1]];
  }
}
module.exports = class DiscordStreamer extends EventEmitter {
  /*
  * @function constructor
  * @param token String Your OAuth2 Discord Bot token.
  * @param options Object All definable options will be declared here.
  * @param options.channel String Voice channel ID for the stream.
  * @param options.feed String Text channel ID for the bot's feed.
  * @param [options.debug] Boolean Declares whether debug mode is enabled or not.
  * @param [options.prefix] String Prefix for the bot's commands.
  * @param [options.masterUser] Array An array containing the IDs of command-enabled users.
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
    if (options) {
      for (var key in options) {
        this.options[key] = options[key];
      }
    }
    this.list = [];
    this.listjson = {};
    this.filepath = '';
    this.token = token;
    this.bot = new Eris(this.token);
    this.session = {};
    this.index = 0;
    this.toDelete = 0;
    this.bot.on('ready', () => {
      this.emit('ready');
    });
    this.bot.on('messageCreate', (msg) => {
      if (msg.channel.id === this.options.feed) {
        var base = msg.content.substr(this.options.prefix.length).split(' ');
        if (this.options.masterUser.indexOf(msg.author.id) > -1) {
          if (msg.content.startsWith(this.options.prefix)) {
            switch (base[0]) {
              case 'skip':
                this.bot.createMessage(msg.channel.id, 'Skipped current song!');
                this.session.stopPlaying();
                break;
              case 'reshuffle':
                shuffle(this.list);
                this.index = -1;
                this.bot.createMessage(msg.channel.id, 'Reshuffled the playlist and restarting from zero index!');
                this.session.stopPlaying();
                break;
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
                    var urlID = msg.content.substr(this.options.prefix.length + base[0].length + 1 + 'https://youtube.com/watch?v='.length);
                    if (msg.content.includes('www.youtube.com')) {
                      urlID = msg.content.substr(this.options.prefix.length + base[0].length + 1 + 'https://www.youtube.com/watch?v='.length);
                    }
                    var final = {"urlID": urlID, "name": title, "length": min + ':' + sec, "requester": msg.author.id};
                    // Requester is logged for moderation purposes.
                    this.listJSON.discordstreamer.playlist.push(final);
                    fs.writeFile(this.filepath, JSON.stringify(this.listJSON, null, 4), (e) => {
                      if (e) {
                        return console.log(e);
                      }
                      this.bot.createMessage(msg.channel.id, 'Added **' + title + '** to the playlist!');
                    });
                  });
                  break;
            }
          }
        }
        if (msg.content.startsWith(this.options.prefix)) {
          switch (base[0]) {
            case 'queue':
              var a = [];
              var i = Math.floor(this.index);
              var d = 0;
              a.push(':loudspeaker: Playlist for **' + this.options.fm + '**\n\n')
              for (i; i < this.index + 10; i++) {
                d++;
                if (this.list[i]) {
                  a.push('`[' + this.list[i].length + ']` **#' + d + '** `' + this.list[i].name + '`\n');
                } else {
                  a.push('*Queue starts over. New mix.*\n');
                }
              }
              this.bot.createMessage(msg.channel.id, a.join(''));
              break;
            case 'info':
              var formatArray = [];
              formatArray.push(':radio: **' + this.options.fm + '** v' + pkg.version);
              formatArray.push('Powered by DiscordStreamer made by Team Cernodile.');
              this.bot.createMessage(msg.channel.id, formatArray.join('\n'));
              break;
          }
        }
      }
    });
  } 
  /*
  * @function connect
  * @return null
  */
  connect () {
    return this.bot.connect();
  }
  /*
  * @function startPlaying
  * @param filepath String Path to the JSON file, with following <a href="./playlistFormat.html">structure</a>.
  * @return null
  */
  startPlaying (filepath) {
    if (this.bot.ready) {
      fs.readFile(filepath, (err, data) => {
        if (err) {
          if (this.options.debug) {
            debugMsg('startPlaying(filepath), failed to open playlist file.');
          }
          return;
        }
        if (data) {
          data = JSON.parse(data);
          this.listJSON = data;
          this.filepath = filepath;
          shuffle(data.discordstreamer.playlist);
          this.list = data.discordstreamer.playlist;
          var constructor = this;
          this.bot.joinVoiceChannel(this.options.channel).then((vc) => {
            constructor.session = vc;
            constructor.index = 0;
            function play () {
              var playlist = data.discordstreamer.playlist[constructor.index];
              var link = 'https://youtube.com/watch?v=' + playlist.urlID;
              vc.play(ytdl(link), {audioonly: true});
              if (constructor.options.debug) {
                debugMsg('Now streaming: ' + playlist.name);
              }
              constructor.emit('newSong', playlist);
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
              });
            }
            play();
          }).catch((e) => {
            if (constructor.options.debug) {
              debugMsg('Whoopsie! Something bad happened, restarting function!\n\u001b[31mDiscordStreamer: \u001b[0m' + e);
            }
            constructor.emit('debug', 'Whoopsie! Something bad happened, restarting function!\n\u001b[31mDiscordStreamer: \u001b[0m' + e);
            return constructor.startPlaying(filepath);
          });
        }
      });
    } else {
      if (this.options.debug) {
        debugMsg('Please wait until the bot is ready!');
      } else {
        this.emit('debug', 'Please wait until the bot is ready!');
      }
    }
  }
};
