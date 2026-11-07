# Sorgu Bot

Discord sorgu botu - Component V2 UI ile modern panel sistemi.

## Özellikler

- **Slash Komutlar**: `/sorgu-panel`, `/paket-olustur`, `/paket-tanimla`
- **Paket Sistemi**: Kullanıcı başına sorgu limiti paketleri
- **IP Sorgulama**: IP adresi sorgulama
- **Discord ID Sorgulama**: Kullanıcı veritabanı sorgulama
- **Owner Koruması**: Yönetim komutları sadece bot sahibi

## Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Komutları deploy et
node deploy-commands.js

# Botu başlat
node .
```

## Config Ayarları (config.json)

```json
{
  "token": "BOT_TOKEN",
  "clientId": "APPLICATION_ID",
  "guildId": "SUNUCU_ID",
  "serverName": "SUNUCU_ADI",
  "bannerUrl": "BANNER_URL",
  "logChannelId": "LOG_KANAL_ID",
  "ownerId": "SAHIP_ID",
  "status": {
    "type": "PLAYING|STREAMING|LISTENING|WATCHING|COMPETING",
    "text": "DURUM_YAZISI",
    "status": "online|idle|dnd|invisible",
    "url": "TWITCH_URL_STREAMING_ICIN"
  }
}
```

## Komutlar

| Komut | Açıklama | Yetki |
|-------|----------|-------|
| `/sorgu-panel` | Sorgu panelini kanala gönderir | Owner |
| `/paket-olustur` | Paket oluştur/sil/ listele | Owner |
| `/paket-tanimla` | Kullanıcıya paket ata | Owner |

## Veritabanı Yapısı

JSON dosyaları `dbs/` klasöründe:
- `data.json` - Kullanıcı verileri (discord_id, email, ip)
- `limits.json` - Sorgu limit kayıtları
- `packages.json` - Tanımlı paketler
- `user_packages.json` - Kullanıcı-paket atamaları

## Gereksinimler

- Node.js 18+
- discord.js v14

## Lisans

MIT
