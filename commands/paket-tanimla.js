const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  MessageFlags,
  SectionBuilder,
  ThumbnailBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");

const config = require("../config.json");
const e = require("../emoji.json");
const db = require("../utils/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("paket-tanimla")
    .setDescription("Kullanıcıya paket atar")
    .addUserOption(option =>
      option.setName("kullanici")
        .setDescription("Paket atanacak kullanıcı")
        .setRequired(true)
    ),

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

    const targetUser = interaction.options.getUser("kullanici");
    if (!targetUser) {
      const errorContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## ${e.carpi} Hata\n\n` +
            `${e.warning} Kullanıcı bulunamadı.`
          )
        );
      return interaction.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
    }

    try {
      const packages = db.listPackages();

      if (packages.length === 0) {
        const errorContainer = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `## ${e.carpi} Hata\n\n` +
              `${e.warning} Henüz hiç paket tanımlanmamış.\n` +
              `${e.settings} Önce \`/paket-olustur\` ile paket oluşturun.`
            )
          );
        return interaction.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
      }

      const existingPackage = db.getUserPackage(targetUser.id);
      const currentInfo = existingPackage
        ? `${e.tik} **${existingPackage.package_name}** — ${existingPackage.package_limit} sorgu (Kullanılmış: ${existingPackage.used})`
        : `${e.carpi} Paket yok`;

      const thumbnailUrl = config.bannerUrl || "https://cdn.discordapp.com/emojis/1435337481821224960.gif";
      const t1 = new ThumbnailBuilder().setURL(thumbnailUrl);
      const t2 = new ThumbnailBuilder().setURL(thumbnailUrl);
      const sep = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large);

      const container = new ContainerBuilder()
        .addSectionComponents(new SectionBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `## ${e.yildiz} Paket Yönetimi\n\n` +
            `# ${e.tac4} Paket Atama\n` +
            `${e.tac4} Aşağıdaki menüden paketi seçin\n` +
            `${e.tac4} Seçilen paket kullanıcıya atanacak\n` +
            `${e.tac4} Eski paket (varsa) pasif yapılacak`
          ))
          .setThumbnailAccessory(t1))
        .addSeparatorComponents(sep)
        .addSectionComponents(new SectionBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `# ${e.stats} Kullanıcı Bilgisi\n` +
            `${e.tac4} **Hedef:** ${targetUser}\n` +
            `${e.tac4} **ID:** \`${targetUser.id}\`\n` +
            `${e.tac4} **Mevcut Paket:** ${currentInfo}`
          ))
          .setThumbnailAccessory(t2))
        .addSeparatorComponents(sep);

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`pkg_select_${targetUser.id}_${interaction.user.id}`)
        .setPlaceholder("Paket seçiniz...")
        .addOptions(packages.map(pkg => ({
          label: `${pkg.name} (${pkg.limit} sorgu)`,
          description: pkg.description || `${pkg.name} paketi - ${pkg.limit} sorgu limiti`,
          value: `${pkg.name}:${pkg.limit}`,
          emoji: pkg.name === "Bronz" ? "🥉" : pkg.name === "Gümüş" ? "🥈" : pkg.name === "Altın" ? "🥇" : pkg.name === "Elmas" ? "💎" : "⭐"
        })));

      container.addActionRowComponents(new ActionRowBuilder().addComponents(selectMenu));

      await interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [container]
      });

    } catch (error) {
      console.error("Paket tanımlama hatası:", error);
      const errorContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## ${e.carpi} Hata\n\n` +
            `${e.warning} Paket atanırken bir hata oluştu: ${error.message}`
          )
        );
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        } else {
          await interaction.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }
      } catch {}
    }
  },
};