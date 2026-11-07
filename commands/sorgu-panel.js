const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SectionBuilder,
  ThumbnailBuilder,
} = require("discord.js");

const config = require("../config.json");
const e = require("../emoji.json");
const db = require("../utils/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sorgu-panel")
    .setDescription("Sorgu panelini kanala gönderir (Sadece Owner)"),

  async execute(interaction) {
    if (interaction.user.id !== config.ownerId) {
      const errorContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## ${e.carpi} Yetki Hatası\n\n` +
            `${e.warning} Bu komutu sadece bot sahibi kullanabilir.`
          )
        );
      return interaction.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
    }

    if (interaction.deferred || interaction.replied) return;

    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    } catch (deferError) {
      if (deferError.code === 40060 || deferError.code === 10062) return;
      throw deferError;
    }

    const container = new ContainerBuilder();

    if (config.bannerUrl) {
      container.addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `# ${e.loading} **Sorgu Paneli**\n\n` +
              `${e.settings} Discord ID sorgulamak için aşağıdaki butonu kullanın.`
            )
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(config.bannerUrl)
          )
      );
    } else {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ${e.loading} **Sorgu Paneli**\n\n` +
          `${e.settings} Discord ID sorgulamak için aşağıdaki butonu kullanın.`
        )
      );
    }
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## ${e.warning} **Sistem Kuralları**\n\n` +
        `${e.nowdizzy} **Sorgu Türleri:** **Discord ID** ve **IP Adresi** sorgulama desteklenmektedir.\n` +
        `${e.security} **Etki:** Sorgular gizlidir, sadece sizinle paylaşılır.`
      )
    );
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

    const stats = db.getStats();
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## ${e.stats} **Veritabanı İstatistikleri**\n\n` +
        `${e.avatar} **Toplam Kayıt:** \`${stats.totalUsers}\`\n` +
        `${e.liste} **E-posta:** \`${stats.uniqueEmails}\`\n` +
        `${e.liste} **IP:** \`${stats.uniqueIps}\``
      )
    );
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("sorgu_open_modal")
          .setEmoji(e.tik)
          .setLabel("ID Sorgula")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("sorgu_open_ip_modal")
          .setEmoji(e.liste)
          .setLabel("IP Sorgula")
          .setStyle(ButtonStyle.Primary)
      )
    );

    try {
      await interaction.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
      await interaction.deleteReply();
    } catch (error) {
      if (error.code === 10062 || error.code === 40060) return;
      throw error;
    }
  },
};