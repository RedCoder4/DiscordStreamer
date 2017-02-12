var ytdl = require('ytdl-core');
var fs = require('fs');
var pkg = require('../package.json');
var commands = {
  eval: {
    level: 2,
    fn: function (bot, msg, suffix, all) {
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
  },
  restore: {
    level: 2,
    fn: function (bot, msg, suffix, all) {
      if (all.rawData.connectedToDb) {
        if (all.rawData.options.playlist) {
          var d = require(all.rawData.dir + '/' + all.rawData.options.playlist);
          all.rawData.r.table('playlist').filter({urlID: "EP625xQIGzs"}).delete().run(all.rawData.conn).catch(e => all.rawData.__dbError(e));
          for (var i in d.discordstreamer.playlist) {
            console.log('Inserting ' + d.discordstreamer.playlist[i].urlID + ' to ' + bot.user.id + '.playlist');
            all.rawData.r.table('playlist').insert(d.discordstreamer.playlist[i]).run(all.rawData.conn).catch(e => all.rawData.__dbError(e));
          }
          all.rawData.forceUpdate();
        }
      } else return bot.createMessage(msg.channel.id, '**Emergency mode!** The bot is currently in emergency mode due to lost connectivity with database!').then((m) => {
        all.rawData.msgContainer.set(msg.id, m);
      });
    }
  },
  remove: {
    level: 1,
    fn: function (bot, msg, suffix, all) {
      if (all.rawData.connectedToDb) {
        all.rawData.r.table('playlist').filter({"urlID": suffix}).delete().run(all.rawData.conn).then(r => {
          if (r.deleted > 0) {
            all.rawData.connection.list.map(s => {
              if (s.urlID === suffix) {
                all.rawData.connection.list.splice(all.rawData.connection.list.indexOf(s), 1);
                if (fs.existsSync(all.rawData.dir + all.rawData.options.saveDir + suffix + '.mp3')) {
                  fs.unlinkSync(all.rawData.dir + all.rawData.options.saveDir + suffix + '.mp3');
                }
              }
            });
            all.rawData.debugMsg("Deleted a song from playlist [" + suffix + "] - requested by " + msg.author.id + " (" + msg.author.username + '#' + msg.author.discriminator + ')');
            return bot.createMessage(msg.channel.id, '**RethinkDB:** Deleted `' + suffix + '` key from database.').then((m) => {
              all.rawData.msgContainer.set(msg.id, m);
            });
          } else return bot.createMessage(msg.channel.id, '**RethinkDB:** No such key could\'ve been found!').then((m) => {
            all.rawData.msgContainer.set(msg.id, m);
          });
        }).catch(e => {
          all.rawData.__dbError(e);
        });
      } else return bot.createMessage(msg.channel.id, '**Emergency mode!** The bot is currently in emergency mode due to lost connectivity with database!').then((m) => {
        all.rawData.msgContainer.set(msg.id, m);
      });
    }
  },
  managers: {
    level: 0,
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
    level: 1,
    fn: function (bot, msg, suffix, all) {
        if (bot.voiceConnections.guilds[msg.guild.id].ready) {
          if (all.rawData.connection.list.length > 0) {
            bot.createMessage(msg.channel.id, '**Reshuffled the playlist, and restarting from the bottom!**').then((m) => {
              all.rawData.msgContainer.set(msg.id, m);
            });
            all.rawData.connection.index = 0;
            all.rawData.connection.shuffle(all.rawData.connection.list);
            all.rawData.connection.vc.stopPlaying();
          } else {
            bot.createMessage(msg.channel.id, '**Missing songs! Unable to shuffle!**').then((m) => {
              all.rawData.msgContainer.set(msg.id, m);
            });
          }
        } else {
          bot.createMessage(msg.channel.id, '**Gateway drop detected!** Please try again now').then((m) => {
            all.rawData.msgContainer.set(msg.id, m);
            bot.joinVoiceChannel(all.rawData.options.vc).then(vc => {all.rawData.connection.vc = vc;});
          });
        }
    }
  },
  skip: {
    level: 1,
    fn: function (bot, msg, suffix, all) {
      bot.createMessage(msg.channel.id, {'content': '', 'embed': {'title': 'Skip', 'color': 0xffffff, thumbnail: {'url': 'https://cdn.cernodile.com/discordstreamer.png'}, description: "Skipping song forcibly by request of <@" + msg.author.id + '>.'}})
      all.rawData.connection.vc.stopPlaying();
    }
  },
  reconnect: {
    level: 0,
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
    level: 0,
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
    level: 0,
    fn: function (bot, msg, suffix, all) {
      var index = all.rawData.connection.index;
      if (suffix) {
        var page = parseInt(suffix, 16);
        if (!isNaN(page)) {
          index += Math.floor(((page - 1) * 10));
        }
      }
      var a = [];
      var i = Math.floor(index);
      var d = 0;
      function emojiNumber (string) { // eslint-disable-line
        return string.replace('10', ':keycap_ten:').replace('1', ':one:').replace('2', ':two:').replace('3', ':three:').replace('4', ':four:').replace('5', ':five:').replace('6', ':six:').replace('7', ':seven:').replace('8', ':eight:').replace('9', ':nine:');
      }
      for (i; i < index + 10; i++) {
        d++;
        if (all.rawData.connection.list[i]) {
          a.push({"name": '\u200B', "inline": true, "value": emojiNumber(String(d)) + ' ' + all.rawData.connection.list[i].name});
        }
      }
      if (a.length === 0) {
        a.push({"name": 'Uh oh!', "inline": true, "value": "It seems as there's nothing on this page of playlist!"});
      }
      bot.createMessage(msg.channel.id, {'content': '', 'embed': {'title': 'Playlist', 'color': 0xffffff, thumbnail: {'url': 'https://cdn.cernodile.com/discordstreamer.png'}, fields: a}}).then((m) => {
        all.rawData.msgContainer.set(msg.id, m);
      });
    }
  },
  add: {
    level: 1,
    fn: function (bot, msg, suffix, all) {
        if (all.rawData.connectedToDb) {
          var link = suffix;
          all.rawData.r.table('playlist').getAll().run(all.rawData.conn).then(r => {
            all.rawData.r.table('playlist').filter({urlID: link}).run(all.rawData.conn).then(r => {
              if (r._responses.length === 0) {
                try {
                  ytdl.getInfo(suffix, (notUsed, vid) => {
                    if (!vid) {
                      return bot.createMessage(msg.channel.id, 'Unable to add song.').then((m) => {
                        all.rawData.msgContainer.set(msg.id, m);
                      });
                    }
                    var min = Math.floor(vid.length_seconds / 60);
                    var sec = Math.floor(vid.length_seconds % 60);
                    if (min < 10) min = '0' + Math.floor(vid.length_seconds / 60);
                    if (sec < 10) sec = '0' + Math.floor(vid.length_seconds % 60);
                    var title = vid.title;
                    var final = {"urlID": vid.video_id, "name": title, "length": min + ':' + sec, "requester": msg.author.id};
                    // Requester is logged for moderation purposes.
                    ytdl(vid.video_id, {audioonly: true}).on('error', (e) => {bot.createMessage(msg.channel.id, '**ERROR!** Invalid link or unable to fetch!');console.log(e);}).pipe(fs.createWriteStream(all.rawData.dir + all.rawData.options.saveDir + vid.video_id + '.mp3'));
                    all.rawData.r.table('playlist').insert(final).run(all.rawData.conn).then(r => {
                      all.rawData.debugMsg('Added [' + vid.vid + '] to the playlist - requested by ' + msg.author.id + " (" + msg.author.username + '#' + msg.author.discriminator + ')');
                      bot.createMessage(msg.channel.id, 'Added **' + title + '** to the playlist!').then((m) => {
                        all.rawData.msgContainer.set(msg.id, m);
                      });
                      all.rawData.forceUpdate();
                    }).catch(e => {
                      all.rawData.__dbError(e);
                    });
                  });
                } catch (err) {
                  if (err.message.startsWith("No video id found")) {
                    return bot.createMessage(all.rawData.options.feed, 'Not a YouTube link!').then(m => {
                      all.rawData.msgContainer.set(msg.id, m);
                    });
                  } else {
                    console.error(err);
                    return bot.createMessage(all.rawData.options.feed, 'Unknown error! Report this to my developer(s)!\n```js\n' + err + '```').then(m => {
                      all.rawData.msgContainer.set(msg.id, m);
                    });
                  }
                }
              } else {
                bot.createMessage(msg.channel.id, ':x: **Duplicate detected!** Aborting action!').then((m) => {
                  all.rawData.msgContainer.set(msg.id, m);
                });
              }
            }).catch(e => {
              all.rawData.__dbError(e);
            });
          }).catch(e => {
            all.rawData.__dbError(e);
          });
        } else return bot.createMessage(msg.channel.id, '**Emergency mode!** The bot is currently in emergency mode due to lost connectivity with database!').then((m) => {
            all.rawData.msgContainer.set(msg.id, m);
          });
    }
  },
  shutdown: {
    level: 2,
    fn: function (bot, msg, suffix, all) {
      all.rawData.debugMsg("Shutting down!");
      bot.createMessage(msg.channel.id, "Shutting down! :wave:").then(m => {
        bot.disconnect().then(() => {
          process.exit(0);
        }).catch(e => {
          all.rawData.debugMsg("!!! Unable to disconnect, possibly already disconnected !!!");
          process.exit(0);
        });
      }).catch(e => {
        all.rawData.debugMsg("No permission to send message in the channel!");
        process.exit(0);
      });
    }
  },
  help: {
    level: 0,
    fn: function (bot, msg, suffix, all) {
      var bucket = {};
      for (var key in commands) {
        bucket[key] = {"restriction": commands[key].restriction, "aliases": [], "help": commands[key].help};
      }
      for (var key in aliases) {
        bucket[aliases[key].alias].aliases.push(key);
      }
      var msgArray = [];
      for (var key in bucket) {
        var msgAliases = '';
        if (bucket[key].aliases.length > 0) {
          msgAliases = '\n  Aliases: ' + bucket[key].aliases.join(', ');
        }
        msgArray.push('**' + key + '** - ' + (bucket[key].help ? bucket[key].help : 'No help provided.') + msgAliases);
      }
      msgArray.push('\nFor technical help, check out our wiki pages on GitHub https://github.com/TeamCernodile/DiscordStreamer/wiki');
      bot.createMessage(msg.channel.id, msgArray.join('\n'));
    }
  }
};
var aliases = {
  'about': {fn: commands['info'], alias: 'info'},
  'source': {fn: commands['info'], alias: 'info'},
  'framework': {fn: commands['info'], alias: 'info'},
  'playlist': {fn: commands['queue'], alias: 'queue'},
  'list': {fn: commands['queue'], alias: 'queue'},
  'request': {fn: commands['add'], alias: 'add'},
  'enqueue': {fn: commands['add'], alias: 'add'},
  'delete': {fn: commands['remove'], alias: 'remove'},
  'undo': {fn: commands['remove'], alias: 'remove'},
  'next': {fn: commands['skip'], alias: 'skip'},
  'shuffle': {fn: commands['reshuffle'], alias: 'reshuffle'},
  'staff': {fn: commands['managers'], alias: 'managers'},
  'off': {fn: commands['shutdown'], alias: 'shutdown'},
  'killswitch': {fn: commands['shutdown'], alias: 'shutdown'}
};
module.exports = class CommandClient {
  constructor (data) {
    this.rawData = data;
    this.bot = data.bot;
    this.bot.on('messageCreate', msg => {
      if (msg.channel.id === this.rawData.options.feed && !msg.author.bot) {
        this.rawData.connection.newMsg = true;
        if (msg.content.startsWith(this.rawData.options.prefix)) {
          var base = msg.content.substr(this.rawData.options.prefix.length).split(' ');
          var suffix = msg.content.substr(this.rawData.options.prefix.length + base[0].length + 1);
          var output = base[0];
          var permValue = 0;
          if (this.rawData.options.djs.indexOf(msg.author.id) > -1) {
            permValue++;
          }
          if (this.rawData.options.masterUsers.indexOf(msg.author.id) > -1) {
            permValue++;
          }
          if (this.rawData.options.blacklist.indexOf(msg.author.id) > -1) {
            permValue = -1;
          }
          function convertLvl (lvl) {
            switch (lvl) {
              case -1:
                return "Blacklisted"
              case 0:
                return "Normal"
              case 1:
                return "DJ";
              case 2:
                return "Master";
              default:
                return "Unidentified";
            }
          }
          if (commands.hasOwnProperty(base[0])) {
            if (suffix) output += ' ' + suffix;
            this.rawData.debugMsg(msg.author.username + '#' + msg.author.discriminator + ' executed <' + output + '>');
            if (commands[base[0]].level <= permValue) {
              commands[base[0]].fn(this.bot, msg, suffix, this);
            } else {
              switch (permValue) {
                case 2:
                case 1:
                case 0:
                  return this.bot.createMessage(msg.channel.id, "**Sorry!** You need **" + (convertLvl(commands[base[0].level])) + "** permissions!\nYou've got **" + (convertLvl(permValue)) + "** permissions!");
                case -1:
                  return this.bot.createMessage(msg.channel.id, "**Sorry!** The bot owner has blacklisted you from using me!");
              }
            }
          } else if (aliases.hasOwnProperty(base[0])) {
            if (suffix) output += ' ' + suffix;
            this.rawData.debugMsg(msg.author.username + '#' + msg.author.discriminator + ' executed <' + output + '>');
            if (aliases[base[0]].fn.level <= permValue) {
              aliases[base[0]].fn.fn(this.bot, msg, suffix, this);
            } else {
              switch (permValue) {
                case 2:
                case 1:
                case 0:
                  return this.bot.createMessage(msg.channel.id, "**Sorry!** You need **" + (convertLvl(aliases[base[0]].fn.level)) + "** permissions!\nYou've got **" + (convertLvl(permValue)) + "** permissions!");
                case -1:
                  return this.bot.createMessage(msg.channel.id, "**Sorry!** The bot owner has blacklisted you from using me!");
              }
            }
          } else return;
        }
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
