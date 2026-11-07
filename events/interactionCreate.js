const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ThumbnailBuilder,
  SectionBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
} = require("discord.js");

const config = require("../config.json");
const e = require("../emoji.json");
const db = require("../utils/database");

module.exports = (client) => {
  client.on("interactionCreate", async (interaction) => {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`Komut hatası (${interaction.commandName}):`, error);
        const errorContainer = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `## ${e.carpi} Hata\n\n${e.warning} Komut çalıştırılırken bir hata oluştu.`
            )
          );
        try {
          if (interaction.replied) {
            await interaction.followUp({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
          } else if (interaction.deferred) {
            await interaction.editReply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
          } else {
            await interaction.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
          }
        } catch (replyError) {
          console.error("Error sending error response:", replyError);
        }
      }
    }

    if (interaction.isButton()) {
      const customId = interaction.customId;

      if (customId === "sorgu_open_modal") {
        if (interaction.deferred || interaction.replied) return;

        try {
          const modal = new ModalBuilder()
            .setCustomId("sorgu_search_modal")
            .setTitle("Discord ID Sorgula");

          modal.addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("discord_id")
                .setLabel("Discord ID")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("Sorgulanacak Discord ID girin")
                .setRequired(true)
                .setMinLength(17)
                .setMaxLength(20)
            )
          );

          return await interaction.showModal(modal);
        } catch (modalError) {
          if (modalError.code === 40060 || modalError.code === 10062) return;
          throw modalError;
        }
      }

      if (customId === "sorgu_open_ip_modal") {
        if (interaction.deferred || interaction.replied) return;

        try {
          const modal = new ModalBuilder()
            .setCustomId("sorgu_ip_search_modal")
            .setTitle("IP Adresi Sorgula");

          modal.addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("ip_address")
                .setLabel("IP Adresi")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("Sorgulanacak IP adresi girin (örn: 8.8.8.8)")
                .setRequired(true)
                .setMinLength(7)
                .setMaxLength(45)
            )
          );

          return await interaction.showModal(modal);
        } catch (modalError) {
          if (modalError.code === 40060 || modalError.code === 10062) return;
          throw modalError;
        }
      }

      if (customId.startsWith("sorgu_refresh_")) {
        const [, , queryType, ...queryValueParts] = customId.split("_");
        const queryValue = queryValueParts.join("_");

        let results = [];
        if (queryType === "discord_id") {
          const user = db.findUserByDiscordId(queryValue);
          if (user) results = [user];
        } else if (queryType === "email") {
          results = db.findUsersByEmail(queryValue);
        } else if (queryType === "ip") {
          results = db.findUsersByIp(queryValue);
        }

        const sorguContainer = buildResultsContainer({
          results,
          queryType,
          queryValue,
          interaction,
          e,
          config,
          db
        });

        return interaction.update({ components: [sorguContainer], flags: MessageFlags.IsComponentsV2 });
      }

      if (customId.startsWith("stats_refresh_")) {
        const stats = db.getStats();
        const statsContainer = new ContainerBuilder();

        statsContainer.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## ${e.stats} Veritabanı İstatistikleri\n\n` +
            `${e.nowdizzy} Merhaba <@${interaction.user.id}>, güncel veritabanı istatistikleri:`
          )
        );
        statsContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

        statsContainer.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `${e.stats} **Toplam Kullanıcı:** \`${stats.totalUsers}\`\n` +
            `${e.liste} **Benzersiz E-posta:** \`${stats.uniqueEmails}\`\n` +
            `${e.liste} **Benzersiz IP:** \`${stats.uniqueIps}\`\n` +
            `${e.loglar} **Toplam Sorgu:** \`${stats.totalQueries}\``
          )
        );
        statsContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

        statsContainer.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `${e.security} Veriler anlık olarak çekilmiştir.\n` +
            `${e.takvim} **Güncelleme:** <t:${Math.floor(Date.now() / 1000)}:R>`
          )
        );
        statsContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

        statsContainer.addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`stats_refresh_${interaction.user.id}`)
              .setEmoji(e.loading)
              .setLabel("Yenile")
              .setStyle(ButtonStyle.Secondary)
          )
        );

        return interaction.update({ components: [statsContainer], flags: MessageFlags.IsComponentsV2 });
      }

      if (customId === "error_dismiss") {
        return interaction.update({ components: [], flags: MessageFlags.IsComponentsV2 });
      }

      if (customId.startsWith("pkg_create_btn_")) {
        const btnOwnerId = customId.split("_")[3];
        if (interaction.user.id !== btnOwnerId) {
          return interaction.reply({ content: `${e.carpi} Bu butonu sadece komutu kullanan kişi kullanabilir!`, flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }
        if (interaction.user.id !== config.ownerId) {
          return interaction.reply({ content: `${e.carpi} Bu işlemi sadece bot sahibi yapabilir!`, flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        const modal = new ModalBuilder()
          .setCustomId(`pkg_create_modal_${interaction.user.id}`)
          .setTitle("Yeni Paket Oluştur");

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("pkg_name")
              .setLabel("Paket Adı")
              .setStyle(TextInputStyle.Short)
              .setPlaceholder("Örn: Bronz, Gümüş, Altın, Elmas")
              .setRequired(true)
              .setMaxLength(30)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("pkg_limit")
              .setLabel("Sorgu Limiti")
              .setStyle(TextInputStyle.Short)
              .setPlaceholder("Örn: 100, 500, 1000")
              .setRequired(true)
              .setMaxLength(6)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("pkg_description")
              .setLabel("Açıklama (Opsiyonel)")
              .setStyle(TextInputStyle.Paragraph)
              .setPlaceholder("Paket açıklaması...")
              .setRequired(false)
              .setMaxLength(200)
          )
        );

        return interaction.showModal(modal);
      }

      if (customId.startsWith("pkg_delete_btn_")) {
        const btnOwnerId = customId.split("_")[3];
        if (interaction.user.id !== btnOwnerId) {
          return interaction.reply({ content: `${e.carpi} Bu butonu sadece komutu kullanan kişi kullanabilir!`, flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }
        if (interaction.user.id !== config.ownerId) {
          return interaction.reply({ content: `${e.carpi} Bu işlemi sadece bot sahibi yapabilir!`, flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        const packages = db.listPackages();
        if (packages.length === 0) {
          return interaction.reply({ content: `${e.warning} Silinecek paket yok!`, flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId(`pkg_delete_select_${interaction.user.id}`)
          .setPlaceholder(`${e.liste} Silinecek paketi seçin...`)
          .addOptions(packages.map(pkg => ({
            label: pkg.name,
            description: `${pkg.limit} sorgu - ${pkg.description || 'Açıklama yok'}`,
            value: pkg.name,
            emoji: pkg.name === "Bronz" ? "🥉" : pkg.name === "Gümüş" ? "🥈" : pkg.name === "Altın" ? "🥇" : pkg.name === "Elmas" ? "💎" : "⭐"
          })));

        const row = new ActionRowBuilder().addComponents(selectMenu);
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `## ${e.carpi} Paket Sil\n\n` +
            `${e.warning} **Dikkat:** Bu işlem geri alınamaz!\n` +
            `${e.tac4} Aşağıdan silinecek paketi seçin.`
          ))
          .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

        return interaction.update({ components: [container, row], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
      }
    }

    if (interaction.isStringSelectMenu()) {
      const customId = interaction.customId;

      if (customId.startsWith("pkg_select_")) {
        const parts = customId.split("_");
        const targetUserId = parts[2];
        const ownerId = parts[3];

        if (interaction.user.id !== ownerId) {
          return interaction.reply({
            content: `${e.carpi} Bu menüyü sadece komutu kullanan kişi kullanabilir!`,
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
          });
        }

        if (interaction.user.id !== config.ownerId) {
          return interaction.reply({
            content: `${e.carpi} Bu işlemi sadece bot sahibi yapabilir!`,
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
          });
        }

        const selectedValue = interaction.values[0];
        const [pkgName, pkgLimit] = selectedValue.split(":");
        const limit = parseInt(pkgLimit);

        try {
          db.assignPackage(targetUserId, pkgName, limit, interaction.user.id);

          const thumbnailUrl = config.bannerUrl || "https://cdn.discordapp.com/emojis/1435337481821224960.gif";
          const t3 = new ThumbnailBuilder().setURL(thumbnailUrl);
          const successContainer = new ContainerBuilder()
            .addSectionComponents(new SectionBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `## ${e.tik} Paket Başarıyla Atandı!\n\n` +
                `${e.tac4} **Kullanıcı:** <@${targetUserId}>\n` +
                `${e.yildiz} **Paket:** ${pkgName}\n` +
                `${e.stats} **Limit:** ${limit} sorgu\n` +
                `${e.takvim} **Zaman:** <t:${Math.floor(Date.now() / 1000)}:F>`
              ))
              .setThumbnailAccessory(t3));

          return interaction.update({
            flags: MessageFlags.IsComponentsV2,
            components: [successContainer]
          });

        } catch (error) {
          console.error("Paket atama hatası:", error);
          return interaction.reply({
            content: `${e.carpi} Hata: ${error.message}`,
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
          });
        }
      }

      if (customId.startsWith("pkg_delete_select_")) {
        const btnOwnerId = customId.split("_")[3];
        if (interaction.user.id !== btnOwnerId) {
          return interaction.reply({ content: `${e.carpi} Bu menüyü sadece komutu kullanan kişi kullanabilir!`, flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }
        if (interaction.user.id !== config.ownerId) {
          return interaction.reply({ content: `${e.carpi} Bu işlemi sadece bot sahibi yapabilir!`, flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        const pkgName = interaction.values[0];
        const deleted = db.deletePackage(pkgName);

        if (deleted) {
          const successContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
              `## ${e.tik} Paket Silindi!\n\n` +
              `${e.yildiz} **Paket:** ${pkgName}\n` +
              `${e.takvim} **Zaman:** <t:${Math.floor(Date.now() / 1000)}:F>`
            ));
          return interaction.update({ components: [successContainer], flags: MessageFlags.IsComponentsV2 });
        } else {
          const errorContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
              `## ${e.carpi} Hata\n\n` +
              `${e.warning} Paket bulunamadı veya silinemedi.`
            ));
          return interaction.update({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
        }
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === "sorgu_search_modal") {
        const discordId = interaction.fields.getTextInputValue("discord_id").trim();

        if (!/^\d{17,20}$/.test(discordId)) {
          const errorContainer = new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `## ${e.carpi} Hata\n\n` +
                `${e.warning} Geçersiz Discord ID formatı.\n` +
                `${e.settings} Discord ID 17-20 haneli bir sayı olmalıdır.`
              )
            );
          return interaction.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        const queryType = "discord_id";
        const queryValue = discordId;
        const user = db.findUserByDiscordId(discordId);
        const results = user ? [user] : [];

        if (results.length > 0) {
          db.addLimitRecord(interaction.user.id, results[0].discord_id, queryType);
        } else {
          db.addLimitRecord(interaction.user.id, "none", queryType);
        }

        const sorguContainer = buildResultsContainer({
          results,
          queryType,
          queryValue,
          interaction,
          e,
          config,
          db
        });

        return interaction.reply({ components: [sorguContainer], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
      }

      if (interaction.customId === "sorgu_ip_search_modal") {
        const ipAddress = interaction.fields.getTextInputValue("ip_address").trim();

        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

        if (!ipv4Regex.test(ipAddress) && !ipv6Regex.test(ipAddress)) {
          const errorContainer = new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `## ${e.carpi} Hata\n\n` +
                `${e.warning} Geçersiz IP adresi formatı.\n` +
                `${e.settings} Lütfen geçerli bir IPv4 veya IPv6 adresi girin.`
              )
            );
          return interaction.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        const queryType = "ip";
        const queryValue = ipAddress;
        const results = db.findUsersByIp(ipAddress);

        if (results.length > 0) {
          db.addLimitRecord(interaction.user.id, results[0].discord_id, queryType);
        } else {
          db.addLimitRecord(interaction.user.id, "none", queryType);
        }

        let geoData = null;
        try {
          geoData = await getIPGeolocation(ipAddress);
        } catch (geoError) {
          console.warn(`IP geolocation failed for ${ipAddress}:`, geoError.message);
        }

        const sorguContainer = buildResultsContainer({
          results,
          queryType,
          queryValue,
          interaction,
          e,
          config,
          db,
          geoData
        });

        try {
          return await interaction.reply({ components: [sorguContainer], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        } catch (replyError) {
          if (replyError.code === 10062 || replyError.code === 40060) return;
          throw replyError;
        }
      }

      if (interaction.customId.startsWith("pkg_create_modal_")) {
        if (interaction.user.id !== config.ownerId) {
          const errorContainer = new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `## ${e.carpi} Yetki Hatası\n\n` +
                `${e.warning} Bu işlemi sadece bot sahibi yapabilir.`
              )
            );
          return interaction.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        const pkgName = interaction.fields.getTextInputValue("pkg_name").trim();
        const pkgLimit = parseInt(interaction.fields.getTextInputValue("pkg_limit"));
        const pkgDescription = interaction.fields.getTextInputValue("pkg_description").trim() || "Açıklama yok";

        if (isNaN(pkgLimit) || pkgLimit < 1 || pkgLimit > 999999) {
          const errorContainer = new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `## ${e.carpi} Hata\n\n` +
                `${e.warning} Geçersiz limit değeri. 1-999999 arası bir sayı girin.`
              )
            );
          return interaction.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        if (pkgName.length < 1 || pkgName.length > 30) {
          const errorContainer = new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `## ${e.carpi} Hata\n\n` +
                `${e.warning} Paket adı 1-30 karakter arası olmalıdır.`
              )
            );
          return interaction.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }

        try {
          db.addOrUpdatePackage({
            name: pkgName,
            limit: pkgLimit,
            description: pkgDescription
          });

          const successContainer = new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `## ${e.tik} Paket Oluşturuldu!\n\n` +
                `${e.yildiz} **Paket Adı:** ${pkgName}\n` +
                `${e.stats} **Limit:** ${pkgLimit} sorgu\n` +
                `${e.liste} **Açıklama:** ${pkgDescription}`
              )
            );

          return interaction.reply({ components: [successContainer], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        } catch (error) {
          console.error("Paket oluşturma hatası:", error);
          const errorContainer = new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `## ${e.carpi} Hata\n\n` +
                `${e.warning} Paket oluşturulurken bir hata oluştu: ${error.message}`
              )
            );
          return interaction.reply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }
      }
    }
  });
};

function buildResultsContainer({ results, queryType, queryValue, interaction, e, config, db, geoData }) {
  const sorguContainer = new ContainerBuilder();

  const querierTag = interaction.user.tag;
  const queriedUser = results.length > 0 ? results[0] : null;
  const queriedTag = queriedUser ? `<@${queriedUser.discord_id}>` : "Bulunamadı";

  sorguContainer.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## ${e.liste} **Sonuçlar**\n\n` +
      `${e.avatar} **Sorgulayan:** ${interaction.user}\n` +
      `${e.avatar} **Sorgulanan:** ${queriedTag}`
    )
  );
  sorguContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  if (!results || results.length === 0) {
    if (queryType === "ip" && geoData) {
      sorguContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${e.warning} **Veritabanında Kayıt Bulunamadı**\n\n` +
          `\`${queryValue}\` IP adresi veritabanında bulunamadı.`
        )
      );
      addGeoDataToContainer(sorguContainer, geoData, e);
    } else {
      sorguContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${e.warning} **Sonuç Bulunamadı**\n\n` +
          `\`${queryValue}\` ID'li kullanıcı veritabanında bulunamadı.`
        )
      );
    }
  } else {
    results.forEach((result, index) => {
      const emailDisplay = result.email || "Bulunamadı";
      const ipDisplay = result.ip || "Bulunamadı";

      sorguContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${e.liste} **Email:** \`${emailDisplay}\`\n` +
          `${e.avatar} **ID:** \`${result.discord_id}\`\n` +
          `${e.liste} **IP:** \`${ipDisplay}\``
        )
      );

      if (queryType === "ip" && geoData) {
        addGeoDataToContainer(sorguContainer, geoData, e);
      }

      if (index < results.length - 1) {
        sorguContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      }
    });
  }

  return sorguContainer;
}

function addGeoDataToContainer(container, geoData, e) {
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## ${e.stats} **IP Konum Bilgileri**\n\n`
    )
  );

  const geoFields = [
    { key: 'country', label: 'Ülke', emoji: e.target_gif },
    { key: 'region', label: 'Bölge/İl', emoji: e.settings },
    { key: 'city', label: 'Şehir', emoji: e.avatar },
    { key: 'isp', label: 'ISP', emoji: e.helpers },
    { key: 'org', label: 'Organizasyon', emoji: e.partnered },
    { key: 'as', label: 'AS Numarası', emoji: e.tac4 },
    { key: 'timezone', label: 'Zaman Dilimi', emoji: e.takvim },
  ];

  geoFields.forEach(field => {
    if (geoData[field.key]) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `${field.emoji} **${field.label}:** \`${geoData[field.key]}\``
        )
      );
    }
  });

  if (geoData.lat && geoData.lon) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${e.tac4} **Koordinatlar:** \`${geoData.lat}, ${geoData.lon}\``
      )
    );
  }

  if (geoData.country_code) {
    const flag = getCountryFlag(geoData.country_code);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${flag} **Ülke Bayrağı:** ${flag} ${geoData.country || ''}`
      )
    );
  }
}

async function getIPGeolocation(ip) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'fail') {
      console.warn(`IP geolocation failed for ${ip}: ${data.message}`);
      return null;
    }

    return {
      country: data.country,
      country_code: data.countryCode,
      region: data.regionName,
      city: data.city,
      zip: data.zip,
      lat: data.lat,
      lon: data.lon,
      timezone: data.timezone,
      isp: data.isp,
      org: data.org,
      as: data.as,
      query: data.query
    };
  } catch (error) {
    console.error(`IP geolocation error for ${ip}:`, error.message);
    return null;
  }
}

function getCountryFlag(countryCode) {
  if (!countryCode || countryCode.length !== 2) return '🏳️';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}