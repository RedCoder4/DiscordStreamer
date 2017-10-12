var DiscordStreamer = require("discordstreamer");
var stream = new DiscordStreamer("MzY2ODM4ODAyNjY2MjI1NjY1.DLzYQA.NAvhXUcRXzsOPJ0u6Qvuunkcv1Y", __dirname, {"vc": "Voice channel ID", "feed": "Feed text channel ID", "djs": ["Someone's Discord user ID"], "masterUsers": ["Your Discord user ID"]});
stream.init();
module.exports = require('./lib/Worker.js');
