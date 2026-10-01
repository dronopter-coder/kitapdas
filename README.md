# Okudum 📚

> **Sen de oku.**

Okudum, ikinci el kitap paylaşım uygulamasıdır. Kullanıcı rafındaki okunmuş kitabın fotoğrafını çekip adını ve yazarını girer; okumak isteyen bir başka kullanıcı kitabı ister; kitabın sahibi talebi onaylar ve kitabı **karşı ödemeli** kargoyla gönderir. Kitap ücretsizdir, alıcı yalnızca kargo ücretini öder.

## Akış

```
Rafına ekle  →  İste (adres + not)  →  Kabul  →  Kargoya ver (firma + takip no)  →  Teslim aldım
                         ↘ geri çek          ↘ reddet / vazgeç
```

- **Keşfet:** yeni gelenler, şehrindeki kitaplar, tüm raf, kategoriler.
- **Ara:** kitap/yazar/tür araması, şehir ve kategori filtresi.
- **+ (Kitap ekle):** fotoğraf çek / galeriden seç (kapaktaki **ad ve yazar otomatik okunur**: ML Kit ile telefonda yazı tanıma + Google Books'ta doğrulama; bulunamazsa en büyük punto ad, kişi adına benzeyen satır yazar sayılır), ad, yazar, tür, durum (Yeni gibi / İyi / Okunmuş / Yıpranmış), not. Fotoğrafsız kitaplara otomatik özel kapak tasarlanır.
- **Takas:** gelen talepler (kabul et, reddet, kargoya verdim) ve isteklerim (takip numarası, teslim aldım), 4 adımlı ilerleme çubuğu.
- **Profil:** rafım, paylaştıklarım, istatistikler, unvan (Yeni Okur → Okur → Cömert Okur → Kitap Elçisi).
- **Giriş:** Google (her girişte telefondaki hesaplardan biri seçilir) veya e-posta/şifre. E-posta ile kaydolanlara **doğrulama bağlantısı** gönderilir; bağlantıya tıklamadan uygulamaya girilemez, sunucu kuralları da doğrulanmamış hesaplara veri vermez.
- **Reklam:** AdMob banner ve geçiş reklamı (aşağıya bak).
- **Gizlilik:** teslimat adresi, kitap sahibi talebi **kabul edene kadar** ona gösterilmez (sunucu kuralıyla korunur).

## Teknoloji

- Capacitor 8 (Android + iOS), sade JavaScript, esbuild
- Firebase: Authentication (Google + e-posta) ve Cloud Firestore — ücretsiz Spark paketi yeter, kredi kartı gerekmez. Kitap fotoğrafları küçültülüp (≈560 px JPEG) doğrudan veritabanında saklanır.
- Yazı tipleri: Fraunces + Plus Jakarta Sans (OFL, uygulamaya gömülü), ikonlar: Lucide

```
./
  src/            uygulama kodu (main.js, ekranlar/, veri/, stil.css)
  www/index.html  kabuk — app.js / app.css derlemeyle üretilir
  firebase/       Firestore güvenlik kuralları
  kaynak/         uygulama simgesi ve mağaza tanıtım görseli
  yayin/          mağaza ekran görüntüleri
  docs/           gizlilik politikası (GitHub Pages)
  keystore/       sabit debug imza anahtarı (herkese açık, yalnızca test için)
```

## Demo modu

Firebase ayarı yapılmadan derlenen APK **demo modunda** çalışır: bütün veriler telefonda tutulur, raflar örnek kitaplarla dolu gelir. Bir kitap istediğinde karşı taraf birkaç saniye sonra talebi kabul edip kargolar; böylece akışın tamamını hemen deneyebilirsin. Gerçek kullanıcılarla çalışması için aşağıdaki Firebase kurulumu gerekir.

## APK alma

1. Değişiklikler `main`e gönderilince **Actions > "Okudum APK derle"** iş akışı çalışır (~6-8 dk).
2. Çalıştırmanın altındaki **Okudum-APK** çıktısını indir, zip içindeki `app-debug.apk`yı telefona kur.

## Firebase kurulumu (gerçek kullanım için, ~15 dk)

1. [console.firebase.google.com](https://console.firebase.google.com) → **Proje ekle** → ad: `okudum`.
2. **Authentication → Sign-in method:** *Google* ve *E-posta/Şifre* sağlayıcılarını etkinleştir. *Templates* sekmesinden doğrulama e-postasının gönderen adını `Okudum` yap (şablon dili uygulamada Türkçe seçilir).
3. **Firestore Database → Veritabanı oluştur** (konum: `eur3` ya da `europe-west`), ardından **Kurallar** sekmesine `firebase/firestore.rules` içeriğini yapıştırıp **Yayınla**.
4. **Proje ayarları → Uygulamalarınız → Android uygulaması ekle**
   - Paket adı: `com.okudum.app`
   - SHA-1 (depodaki sabit debug anahtarı): `F7:4E:76:A7:C3:62:64:B6:72:5A:CD:19:BB:3D:60:59:32:47:B9:8F`
   - İndirilen `google-services.json` dosyasının **tüm içeriğini** GitHub'da *Settings → Secrets and variables → Actions → New repository secret* ile `OKUDUM_GOOGLE_SERVICES_JSON` adıyla ekle.
5. **Proje ayarları → Uygulamalarınız → Web uygulaması ekle** (`</>`), çıkan `firebaseConfig` nesnesini JSON olarak `OKUDUM_FIREBASE_CONFIG` sırrına ekle. Örnek:
   ```json
   {"apiKey":"AIza...","authDomain":"okudum.firebaseapp.com","projectId":"okudum","storageBucket":"okudum.firebasestorage.app","messagingSenderId":"123","appId":"1:123:web:abc"}
   ```
   (Bu bilgiler gizli değildir; istersen `firebase-ayar.json` dosyası olarak da ekleyebilirsin.)
6. Actions'tan iş akışını yeniden çalıştır. Yeni APK artık gerçek Firebase ile çalışır.

> Play Store sürümü için Play Console'daki **uygulama imzalama anahtarının SHA-1**'ini de Firebase'deki Android uygulamasına eklemelisin; yoksa Google girişi mağaza sürümünde çalışmaz.

## AdMob reklamları

- Ana sekmelerin (Keşfet, Ara, Takas, Profil) altında **banner**; kitap ekleme, talep gönderme ve kargoya verme sonrasında **geçiş reklamı** (her 3 işlemde bir, en sık 3 dakikada bir). Giriş, form ve kitap detay ekranlarında reklam yoktur.
- AB/BK kullanıcıları için Google UMP onay penceresi gösterilir (*AdMob → Gizlilik ve mesajlaşma* bölümünde GDPR mesajı oluşturulmalı).
- Android'de gerçek reklam birimleri kullanılır (`src/reklam.js`); uygulama kimliği `ca-app-pub-3204109869365538~4707571112` derleme sırasında manifest'e yazılır. iOS için AdMob'da ayrı bir iOS uygulaması açılana kadar test birimleri gösterilir.
- Kendi telefonunda test ederken reklamlara **tıklama**; AdMob hesabı geçersiz tıklama nedeniyle kısıtlanabilir. Telefonunu AdMob'da *Ayarlar → Test cihazları* bölümüne eklemen en güvenlisi.

## Yerelde geliştirme

```bash

npm install
npm run dev          # src/ değiştikçe www/'yi yeniden derler
npx serve www        # ya da: python3 -m http.server -d www
```

Tarayıcıda Google girişi açılır pencereyle (popup) çalışır; Firebase konsolunda *Authentication → Settings → Authorized domains* listesine `localhost` ekli olmalıdır.

## Yol haritası (öneriler)

- Talep geldiğinde / kargo çıktığında **anlık bildirim** (Firebase Cloud Messaging + Cloud Functions)
- Takas sonrası karşılıklı **değerlendirme** ve güven puanı
- Barkoddan (ISBN) kitap bilgisini otomatik doldurma
- Uygulama içi mesajlaşma

## Gizlilik politikası sayfası

*Settings → Pages → Source: Deploy from a branch → `main` / `docs`* seçilince sayfa
`https://dronopter-coder.github.io/okudum/gizlilik.html` adresinde yayınlanır.
