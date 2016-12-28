var ytdl = require('ytdl-core');
var fs = require('fs');
var pkg = require('../package.json');
var commands = {
  eval: {
    fn: function (bot, msg, suffix, all) {
      if (all.rawData.options.masterUsers.indexOf(msg.author.id) > -1) {
        try {
          var result = eval(suffix); //eslint-disable-line
          if (typeof result !== 'object') {
            bot.createMessage(msg.channel.id, '**Result:**\n ```js\n' + result + '```').then((m) => {
              all.rawData.msgContainer.set(msg.id, m);
            });
          } else {
            bot.createMessage(msg.channel.id, 'Currently unavailable.').then((m) => {
              all.rawData.msgContainer.set(msg.id, m);
            });
          }
        } catch (e) {
          bot.createMessage(msg.channel.id, '**Encountered an error!**\n```js\n' + e + '```').then((m) => {
            all.rawData.msgContainer.set(msg.id, m);
          });
        }
      }
    }
  },
  restore: {
    fn: function (bot, msg, suffix, all) {
      if (all.rawData.options.masterUsers.indexOf(msg.author.id) > -1) {
        if (all.rawData.options.playlist) {
          var d = require(all.rawData.dir + '/' + all.rawData.options.playlist);
          all.rawData.r.table('playlist').filter({urlID: "EP625xQIGzs"}).delete().run(all.rawData.conn, () => {});
          for (var i in d.discordstreamer.playlist) {
            console.log('Inserting ' + d.discordstreamer.playlist[i].urlID + ' to ' + bot.user.id + '.playlist');
            all.rawData.r.table('playlist').insert(d.discordstreamer.playlist[i]).run(all.rawData.conn, () => {});
          }
          all.rawData.forceUpdate();
        }
      }
    }
  },
 /* exec: {
    fn: function (bot, msg, suffix, all) {
      if (all.rawData.options.masterUsers.indexOf(msg.author.id) > -1) {
        var exec = require('child_process').exec;
        try {
          var result = exec(suffix);
          bot.createMessage(msg.channel.id, result).then((m) => {
            all.rawData.msgContainer.set(msg.id, m);
          }); // Hope it works rofl.
        } catch (e) {
          bot.createMessage(msg.channel.id, '**Unexpected error!**\n```xl\n' + e + '```').then((m) => {
            all.rawData.msgContainer.set(msg.id, m);
          });
        }
      }
    } // will figure out bit later.
  },*/
  remove: {
    fn: function (bot, msg, suffix, all) {
      if (all.rawData.options.djs.indexOf(msg.author.id) > -1 || all.rawData.options.masterUsers.indexOf(msg.author.id) > -1) {
        all.rawData.r.table('playlist').filter({"urlID": suffix}).delete().run(all.rawData.conn, (e, r) => {
          if (e) return bot.createMessage(msg.channel.id, '**RethinkDB:** No such key could\'ve been found!').then((m) => {
            all.rawData.msgContainer.set(msg.id, m);
          });
          if (r.deleted > 0) {
            all.rawData.connection.list.map(s => {
              if (s.urlID === suffix) {
                all.rawData.connection.list.splice(all.rawData.connection.list.indexOf(s), 1);
                if (fs.existsSync(all.rawData.dir + all.rawData.options.saveDir + suffix + '.mp3')) {
                  fs.unlinkSync(all.rawData.dir + all.rawData.options.saveDir + suffix + '.mp3');
                }
              }
            });
            return bot.createMessage(msg.channel.id, '**RethinkDB:** Deleted `' + suffix + '` key from database.').then((m) => {
              all.rawData.msgContainer.set(msg.id, m);
            });
          } else return bot.createMessage(msg.channel.id, '**RethinkDB:** No such key could\'ve been found!').then((m) => {
            all.rawData.msgContainer.set(msg.id, m);
          });
        });
      }
    }
  },
  managers: {
    fn: function (bot, msg, suffix, all) {
      var content = [];
      var mUsers = [];
      var djs = [];
      for (var i in all.rawData.options.djs) {
        djs.push(bot.users.get(all.rawData.options.djs[i]).username);
      }
      for (var i in all.rawData.options.masterUsers) {
        mUsers.push(bot.users.get(all.rawData.options.masterUsers[i]).username);
      }
      if (djs.length === 0) {
        djs.push('*Nobody, only masterusers at moment.*');
      }
      content.push('**This radio is managed by the following DJs**\n' + djs.join(', ') + '\n**and controlled/owned by**\n' + mUsers.join(', '));
      return bot.createMessage(msg.channel.id, content.join('\n')).then((m) => {
        all.rawData.msgContainer.set(msg.id, m);
      });
    }
  },
  reshuffle: {
    fn: function (bot, msg, suffix, all) {
      if (all.rawData.options.djs.indexOf(msg.author.id) > -1 || all.rawData.options.masterUsers.indexOf(msg.author.id) > -1) {
        bot.createMessage(msg.channel.id, '**Reshuffled the playlist, and restarting from the bottom!**').then((m) => {
          all.rawData.msgContainer.set(msg.id, m);
        });
        all.rawData.connection.index = 0;
        all.rawData.connection.shuffle(all.rawData.connection.list);
        all.rawData.connection.vc.stopPlaying();
      }
    }
  },
  skip: {
    fn: function (bot, msg, suffix, all) {
      if (all.rawData.options.djs.indexOf(msg.author.id) > -1 || all.rawData.options.masterUsers.indexOf(msg.author.id) > -1) {
        bot.createMessage(msg.channel.id, 'Skipping!').then((m) => {
          all.rawData.msgContainer.set(msg.id, m);
        });
        all.rawData.connection.vc.stopPlaying();
      }
    }
  },
  reconnect: {
    fn: function (bot, msg, suffix, all) {
      bot.joinVoiceChannel(all.rawData.options.vc).then((vc) => {
        all.rawData.connection.vc = vc;
        bot.createMessage(msg.channel.id, 'If my stream was down before, it should be back up now!').then((m) => {
          all.rawData.msgContainer.set(msg.id, m);
        });
      });
    }
  },
  info: {
    fn: function (bot, msg, suffix, all) {
      var array = [];
      array.push(':radio: **DiscordStreamer v' + pkg.version + '**');
      array.push('Open-source server-radio system developed by Team Cernodile.');
      array.push('https://www.npmjs.com/package/discordstreamer');
      array.push('https://github.com/TeamCernodile/DiscordStreamer');
      if (all.rawData.options.supportDevs) {
        array.push('\nHowever if you\'d wish to support the development, join DiscordStreamer\'s official server at discord.gg/NQcgJzR');
      }
      bot.createMessage(msg.channel.id, array.join('\n')).then((m) => {
       all.rawData.msgContainer.set(msg.id, m);
      });
    }
  },
  queue: {
    fn: function (bot, msg, suffix, all) {
      var a = [];
      var i = Math.floor(all.rawData.connection.index);
      var d = 0;
      function emojiNumber (string) { // eslint-disable-line
        return string.replace('10', ':keycap_ten:').replace('1', ':one:').replace('2', ':two:').replace('3', ':three:').replace('4', ':four:').replace('5', ':five:').replace('6', ':six:').replace('7', ':seven:').replace('8', ':eight:').replace('9', ':nine:');
      }
      for (i; i < all.rawData.connection.index + 10; i++) {
        d++;
        if (all.rawData.connection.list[i]) {
          a.push({"name": '\u200B', "inline": true, "value": emojiNumber(String(d)) + ' ' + all.rawData.connection.list[i].name});
        }
      }
      bot.createMessage(msg.channel.id, {'content': '', 'embed': {'title': 'Playlist', 'color': 0xffffff, thumbnail: {'url': 'https://cdn.cernodile.com/discordstreamer.png'}, fields: a}}).then((m) => {
        all.rawData.msgContainer.set(msg.id, m);
      });
    }
  },
  add: {
    fn: function (bot, msg, suffix, all) {
      if (all.rawData.options.djs.indexOf(msg.author.id) > -1 || all.rawData.options.masterUsers.indexOf(msg.author.id) > -1) {
        var protocol = 'https://';
        if (suffix.startsWith('http://')) {
          protocol = 'http://';
        }
        var link = suffix;
        if (msg.content.includes('www.youtube.com')) {
          link = suffix.substr(protocol.length + 'www.youtube.com/watch?v='.length);
        } else if (msg.content.includes('youtube.com')) {
          link = suffix.substr(protocol.length + 'youtube.com/watch?v='.length);
        } else if (msg.content.includes('www.youtu.be')) {
          link = suffix.substr(protocol.length + 'www.youtu.be'.length);
        } else if (msg.content.includes('youtu.be')) {
          link = suffix.substr(protocol.length + 'youtu.be'.length);
        }
        all.rawData.r.table('playlist').getAll().run(all.rawData.conn, (e, r) => {
          all.rawData.r.table('playlist').filter({urlID: link}).run(all.rawData.conn, (e, r) => {
            if (r._responses.length === 0) {
              ytdl.getInfo((suffix), (err, vid) => {
                if (err) {
                  return console.log(err);
                }
                var min = Math.floor(vid.length_seconds / 60);
                var sec = Math.floor(vid.length_seconds % 60);
                if (min < 10) min = '0' + Math.floor(vid.length_seconds / 60);
                if (sec < 10) sec = '0' + Math.floor(vid.length_seconds % 60);
                var title = vid.title;
                var final = {"urlID": link, "name": title, "length": min + ':' + sec, "requester": msg.author.id};
                // Requester is logged for moderation purposes.
                ytdl(suffix, {audioonly: true}).pipe(fs.createWriteStream(all.rawData.dir + all.rawData.options.saveDir + link + '.mp3'));
                all.rawData.r.table('playlist').insert(final).run(all.rawData.conn, (e, r) => {
                  if (e) console.log(e);
                  bot.createMessage(msg.channel.id, 'Added **' + title + '** to the playlist!').then((m) => {
                    all.rawData.msgContainer.set(msg.id, m);
                  });
                  all.rawData.forceUpdate();
                });
              });
            } else {
              bot.createMessage(msg.channel.id, ':x: **Duplicate detected!** Aborting action!').then((m) => {
                all.rawData.msgContainer.set(msg.id, m);
              });
            }
          });
        });
      }
    }
  }
};
module.exports = class CommandClient {
  constructor (data) {
    this.rawData = data;
    this.bot = data.bot;
    this.bot.on('messageCreate', msg => {
      if (msg.content.startsWith(this.rawData.options.prefix) && msg.channel.id === this.rawData.options.feed) {
        var base = msg.content.substr(this.rawData.options.prefix.length).split(' ');
        var suffix = msg.content.substr(this.rawData.options.prefix.length + base[0].length + 1);
        if (commands.hasOwnProperty(base[0])) {
          var output = base[0];
          if (suffix) output += ' ' + suffix;
          this.rawData.debugMsg(msg.author.username + '#' + msg.author.discriminator + ' executed <' + output + '>');
          commands[base[0]].fn(this.bot, msg, suffix, this);
        } else return;
      }
    });
    this.bot.on('messageDelete', (m) => {
      if (this.rawData.msgContainer.has(m.id)) {
        this.rawData.msgContainer.get(m.id).delete();
      }
    });
  }
  update (data) {
    this.rawData = data;
  }
};