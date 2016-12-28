var ytdl = require('ytdl-core');
var fs = require('fs');
module.exports = class VoiceManager {
  constructor (data) {
    this.data = data;
    this.options = data.options;
    this.bot = data.bot;
  }
  update (data) {
    this.data = data;
    this.options = data.options;
    this.bot = data.bot;
    this.data.r.table('playlist').run(this.data.conn, (e, r) => {
      r.toArray().then(array => {
       this.list = array;
      });
    });
  }
  shuffle (a) {
    for (var i = a.length; i; i--) {
      var j = Math.floor(Math.random() * i);
      [a[i - 1], a[j]] = [a[j], a[i - 1]];
    }
  }
  start (list) {
    var formatArray = [];
    this.shuffle(list);
    this.list = list;
    if (!fs.existsSync(this.data.dir + this.data.saveDir)) {
      fs.mkdirSync(this.data.dir + this.data.saveDir);
    }
    this.bot.joinVoiceChannel(this.options.vc).then((vc) => {
      this.vc = vc;
      this.index = 0;
      if (this.list.length > 0) {
        if (!fs.existsSync(this.data.dir + this.data.options.saveDir + this.list[this.index].urlID + '.mp3')) {
          ytdl(this.list[this.index].urlID).pipe(fs.createWriteStream(this.data.dir + this.data.options.saveDir + this.list[this.index].urlID + '.mp3'));
          this.vc.play(ytdl(this.list[this.index].urlID));
        } else {
          this.vc.play(this.data.dir + this.data.options.saveDir + this.list[this.index].urlID + '.mp3');
        }
        formatArray = [];
        formatArray.push(':musical_note: **' + this.list[this.index].name + '** :musical_note:');
        formatArray.push(this.list[this.index].length + ' ▬▬' + '▬'.repeat(Math.floor(this.list[this.index].name.length / 3)) + ':stop_button: ' + this.list[this.index].length);
        this.bot.createMessage(this.options.feed, formatArray.join('\n')).then(m => {
          this.toEdit = m;
        });
        this.data.debugMsg('Streaming ' + this.list[this.index].name);
        this.bot.editStatus({name: this.list[this.index].name, type: 1, url: 'https://twitch.tv//'});
      }
      this.vc.on('end', () => {
        if (this.toDelete) {
          this.toDelete.delete();
        }
        formatArray = [];
        formatArray.push('~~:musical_note: **' + this.list[this.index].name + '** :musical_note:~~');
        formatArray.push('~~' + this.list[this.index].length + ' ▬▬' + '▬'.repeat(Math.floor(this.list[this.index].name.length / 3)) + ':stop_button: ' + this.list[this.index].length + '~~');
        formatArray.push('**Song ended, check below for any new song.**');
        this.toEdit.edit(formatArray.join('\n')).then(m => {
          this.toDelete = m;
        });
        this.index++;
        if (!this.list[this.index]) {
          this.index = 0;
          this.shuffle(this.list);
        }
        if (!fs.existsSync(this.data.dir + this.data.options.saveDir + this.list[this.index].urlID + '.mp3')) {
          ytdl('https://www.youtube.com/watch?v=' + this.list[this.index].urlID).pipe(fs.createWriteStream(this.data.dir + this.data.options.saveDir + this.list[this.index].urlID + '.mp3'));
          this.vc.play(ytdl('https://www.youtube.com/watch?v=' + this.list[this.index].urlID));
        } else {
          this.vc.play(this.data.dir + this.data.options.saveDir + this.list[this.index].urlID + '.mp3');
        }
        formatArray = [];
        formatArray.push(':musical_note: **' + this.list[this.index].name + '** :musical_note:');
        formatArray.push(this.list[this.index].length + ' ▬▬' + '▬'.repeat(Math.floor(this.list[this.index].name.length / 3)) + ':stop_button: ' + this.list[this.index].length);
        this.bot.createMessage(this.options.feed, formatArray.join('\n')).then(m => {
          this.toEdit = m;
        });
        this.data.debugMsg('Streaming ' + this.list[this.index].name);
        this.bot.editStatus({name: this.list[this.index].name, type: 1, url: 'https://twitch.tv//'});
      });
    });
   }
};