var ytdl = require('ytdl-core');
var fs = require('fs');
module.exports = class VoiceManager {
  constructor (data) {
    this.data = data;
    this.options = data.options;
    this.bot = data.bot;
    this.newMsg = false;
  }
  update (data) {
    this.data = data;
    this.options = data.options;
    this.bot = data.bot;
    this.data.r.table('playlist').run(this.data.conn, (e, r) => {
      r.toArray().then(array => {
       this.list = this.shuffle(array);
      });
    });
  }
  shuffle (a) {
    for (var i = a.length; i; i--) {
      var j = Math.floor(Math.random() * i);
      [a[i - 1], a[j]] = [a[j], a[i - 1]];
    }
    return a;
  }
  start (list) {
    var formatArray = [];
    this.list = list;
    if (!fs.existsSync(this.data.dir + this.data.options.saveDir)) {
      fs.mkdirSync(this.data.dir + this.data.options.saveDir);
    }
    this.bot.joinVoiceChannel(this.options.vc).then((vc) => {
      this.vc = vc;
      this.index = 0;
      if (this.list.length > 0) {
        if (!fs.existsSync(this.data.dir + this.data.options.saveDir + this.list[this.index].urlID + '.mp3')) {
          ytdl(this.list[this.index].urlID).on('error', (e) => {this.bot.createMessage(this.data.options.feed, '**ERROR!** Invalid link or unable to fetch!');console.log(e);}).pipe(fs.createWriteStream(this.data.dir + this.data.options.saveDir + this.list[this.index].urlID + '.mp3'));
          try {
            this.vc.play(ytdl(this.list[this.index].urlID));
          } catch (e) {
            console.error(e);
          }
        } else {
          this.vc.play(this.data.dir + this.data.options.saveDir + this.list[this.index].urlID + '.mp3');
        }
        formatArray = [];
        formatArray.push(':musical_note: **' + this.list[this.index].name + '** :musical_note:');
        formatArray.push('00:00 :arrow_forward:▬▬' + '▬'.repeat(Math.floor(this.list[this.index].name.length / 3)) + ' ' + this.list[this.index].length);
        this.bot.createMessage(this.options.feed, formatArray.join('\n')).then(m => {
          this.toEdit = m;
        });
        this.data.debugMsg('Streaming ' + this.list[this.index].name);
        this.bot.editStatus({name: this.list[this.index].name, type: 1, url: 'https://twitch.tv//'});
      }
      this.vc.on('error', (e) => {
        if (e.message.startsWith("Command failed: [mp3 @")) {
          this.bot.createMessage(this.data.options.feed, 'Deleting **' + this.list[this.index].name + '** from database, as it doesn\'t appear to have mp3 packed in it!');
          this.data.r.table('playlist').filter({"urlID": this.list[this.index].urlID}).delete().run(this.data.conn, () => {});
          this.list.shift(this.index, 1);
        } else {
          this.bot.createMessage(this.data.options.feed, '**Uh oh!** I\'ve encountered an error, please send this to my owner!\n\n' + e).catch((e) => {
            return;
          });
        }
        console.error(e.message);
      });
      this.vc.on('end', () => {
        this.index++;
        if (!this.list[this.index]) {
          this.index = 0;
          this.shuffle(this.list);
        }
        if (!fs.existsSync(this.data.dir + this.data.options.saveDir + this.list[this.index].urlID + '.mp3')) {
          ytdl(this.list[this.index].urlID).on('error', (e) => {this.bot.createMessage(this.data.options.feed, '**ERROR!** Invalid link or unable to fetch!');console.log(e);}).pipe(fs.createWriteStream(this.data.dir + this.data.options.saveDir + this.list[this.index].urlID + '.mp3'));
          try {
            this.vc.play(ytdl(this.list[this.index].urlID));
          } catch (e) {
            console.error(e);
          }
        } else {
          this.vc.play(this.data.dir + this.data.options.saveDir + this.list[this.index].urlID + '.mp3');
        }
        if (this.newMsg) {
          this.newMsg = false;
          this.toEdit.delete().catch((e) => {return;});
          formatArray = [];
          formatArray.push(':musical_note: **' + this.list[this.index].name + '** :musical_note:');
          formatArray.push('00:00 :arrow_forward:▬▬' + '▬'.repeat(Math.floor(this.list[this.index].name.length / 3)) + ' ' + this.list[this.index].length);
          this.bot.createMessage(this.options.feed, formatArray.join('\n')).then(m => {
            this.toEdit = m;
          });
        } else {
          formatArray = [];
          formatArray.push(':musical_note: **' + this.list[this.index].name + '** :musical_note:');
          formatArray.push('00:00 :arrow_forward:▬▬' + '▬'.repeat(Math.floor(this.list[this.index].name.length / 3)) + ' ' + this.list[this.index].length);
          this.toEdit.edit(formatArray.join('\n'));
        }
        this.data.debugMsg('Streaming ' + this.list[this.index].name);
        this.bot.editStatus({name: this.list[this.index].name, type: 1, url: 'https://twitch.tv//'});
      });
    });
   }
};
