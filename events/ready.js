const config = require("../config.json");
const e = require("../emoji.json");
const { ActivityType } = require("discord.js");

module.exports = (client) => {
  client.once("clientReady", () => {
    console.log(`[OK] ${client.user.tag} aktif!`);
    console.log(`[INFO] ${config.serverName} başlatıldı.`);

    const statusConfig = config.status || {};

    const activityTypeMap = {
      PLAYING: ActivityType.Playing,
      STREAMING: ActivityType.Streaming,
      LISTENING: ActivityType.Listening,
      WATCHING: ActivityType.Watching,
      COMPETING: ActivityType.Competing,
    };

    const activityType = activityTypeMap[statusConfig.type] || ActivityType.Playing;
    const activityText = statusConfig.text ? statusConfig.text.replace("{serverName}", config.serverName) : `${config.serverName} | /sorgu-panel`;
    const presenceStatus = statusConfig.status || "online";

    const activityData = { name: activityText, type: activityType };
    if (activityType === ActivityType.Streaming && statusConfig.url) {
      activityData.url = statusConfig.url;
    }

    try {
      client.user.setPresence({
        activities: [activityData],
        status: presenceStatus,
      });
    } catch (err) {
      console.error("Presence ayarlanırken hata:", err);
    }
  });
};