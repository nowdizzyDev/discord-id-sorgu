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
    .setName("paket-olustur")
    .setDescription("Yeni paket oluştur veya paketleri yönet"),

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

    try {
      const packages = db.listPackages();

      const thumbnailUrl = config.bannerUrl || "https://cdn.discordapp.com/emojis/1435337481821224960.gif";
      const t1 = new ThumbnailBuilder().setURL(thumbnailUrl);
      const sep = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large);

      const packageList = packages.length > 0
        ? packages.map(p => `${e.yildiz} **${p.name}** — \`${p.limit}\` sorgu (${p.description || 'Açıklama yok'})`).join("\n")
        : `${e.warning} Henüz paket tanımlanmamış`;

      const container = new ContainerBuilder()
        .addSectionComponents(new SectionBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `## ${e.yildiz} Paket Yönetimi\n\n` +
            `# ${e.stats} Mevcut Paketler\n${packageList}`
          ))
          .setThumbnailAccessory(t1))
        .addSeparatorComponents(sep)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `## ${e.tik} Yeni Paket Oluştur\n` +
          `${e.tac4} Aşağıdaki butondan yeni paket ekleyin`
        ))
        .addSeparatorComponents(sep)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `## ${e.carpi} Paket Sil\n` +
          `${e.tac4} "Paket Sil" butonuna basarak silinecek paketi seçin`
        ));

      const createBtn = new ButtonBuilder()
        .setCustomId(`pkg_create_btn_${interaction.user.id}`)
        .setLabel("Paket Oluştur")
        .setStyle(ButtonStyle.Success)
        .setEmoji(e.tik);

      const deleteBtn = new ButtonBuilder()
        .setCustomId(`pkg_delete_btn_${interaction.user.id}`)
        .setLabel("Paket Sil")
        .setStyle(ButtonStyle.Danger)
        .setEmoji(e.carpi);

      container.addActionRowComponents(new ActionRowBuilder().addComponents(createBtn, deleteBtn));

      await interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [container]
      });

    } catch (error) {
      console.error("Paket oluşturma hatası:", error);
      const errorContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## ${e.carpi} Hata\n\n` +
            `${e.warning} Paket yönetimi açılırken bir hata oluştu: ${error.message}`
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