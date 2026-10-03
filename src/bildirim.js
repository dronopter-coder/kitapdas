// Takas bildirimleri: talep listesindeki değişiklikleri izler.
// Uygulama açıkken: kısa tını + bildirim balonu. Arka plandayken: telefonun bildirim çubuğuna sesli bildirim.
// Uygulama kapalıyken olanlar, uygulama bir sonraki açılışta toplu olarak bildirilir.
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { sesCal } from './ses.js';
import { toast } from './ui.js';

const KANAL = 'okudum_takas';
const YEREL = Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('LocalNotifications');
let onPlanda = !document.hidden;
let hazir = false;
let gecmis = null; // talepId → bilinen son durum
let anahtar = '';
let tiklaninca = () => {};

const kisa = (s, n = 60) => (String(s || '').length > n ? `${String(s).slice(0, n - 1)}…` : String(s || ''));

// Başkasının yaptığı değişiklikler (kendi işlemlerimiz bildirim üretmez)
function olaylar(gelen, giden) {
  const liste = [];
  for (const t of gelen) {
    const once = gecmis[t.id];
    if (once === t.durum) continue;
    if (!once && t.durum === 'bekliyor') {
      liste.push({ ses: 'gelen', baslik: 'Yeni kitap talebi 📚', metin: `${kisa(t.isteyenAd, 30) || 'Bir okur'}, “${kisa(t.kitapAd)}” kitabını istiyor.`, sekme: 'gelen' });
    } else if (once && t.durum === 'teslim') {
      liste.push({ ses: 'teslim', baslik: 'Kitabın yeni okuruna ulaştı 🎉', metin: `${kisa(t.isteyenAd, 30) || 'Okur'}, “${kisa(t.kitapAd)}” kitabını teslim aldı. Teşekkürler!`, sekme: 'gelen' });
    } else if (once === 'bekliyor' && t.durum === 'iptal') {
      liste.push({ ses: 'yumusak', baslik: 'Talep geri çekildi', metin: `${kisa(t.isteyenAd, 30) || 'Okur'}, “${kisa(t.kitapAd)}” talebinden vazgeçti.`, sekme: 'gelen' });
    }
  }
  for (const t of giden) {
    const once = gecmis[t.id];
    if (!once || once === t.durum) continue;
    if (t.durum === 'kabul') {
      liste.push({ ses: 'kabul', baslik: 'Talebin kabul edildi! 🎉', metin: `${kisa(t.sahipAd, 30) || 'Kitabın sahibi'}, “${kisa(t.kitapAd)}” kitabını sana gönderecek.`, sekme: 'giden' });
    } else if (t.durum === 'kargoda') {
      const k = t.kargo || {};
      liste.push({ ses: 'kargo', baslik: 'Kitabınız kargolandı 📦', metin: `“${kisa(t.kitapAd)}” yola çıktı.${k.firma ? ` ${k.firma}` : ''}${k.takipNo ? ` · Takip no: ${k.takipNo}` : ''}`, sekme: 'giden' });
    } else if (t.durum === 'red') {
      liste.push({ ses: 'yumusak', baslik: 'Talebin bu sefer olmadı', metin: `“${kisa(t.kitapAd)}” başka bir okura gidiyor. Raflarda seni bekleyen çok kitap var!`, sekme: 'giden' });
    }
  }
  return liste;
}

function kaydet() {
  try { localStorage.setItem(anahtar, JSON.stringify(gecmis)); } catch {}
}

async function sistemBildirimi(o, sira) {
  if (!YEREL) return;
  try {
    await LocalNotifications.schedule({
      notifications: [{
        id: (Date.now() % 2000000000) + sira,
        title: o.baslik,
        body: o.metin,
        largeBody: o.metin,
        channelId: KANAL,
        smallIcon: 'ic_stat_okudum',
        iconColor: '#E8643A',
        sound: 'okudum_bildirim.wav',
        extra: { sekme: o.sekme },
      }],
    });
  } catch {}
}

// Oturum açıldığında bir kez: izin, kanal ve dokunma dinleyicisi
export async function bildirimleriBaslat(uid, { dokununca } = {}) {
  anahtar = `okudum_bildirim_${uid}`;
  try { gecmis = JSON.parse(localStorage.getItem(anahtar) || 'null'); } catch { gecmis = null; }
  if (dokununca) tiklaninca = dokununca;
  if (hazir) return;
  hazir = true;
  document.addEventListener('visibilitychange', () => { onPlanda = !document.hidden; });
  if (!YEREL) return;
  App.addListener('appStateChange', ({ isActive }) => { onPlanda = isActive; });
  try {
    await LocalNotifications.createChannel({
      id: KANAL, name: 'Takas bildirimleri', description: 'Kitap talepleri, onaylar ve kargo haberleri',
      importance: 4, visibility: 1, sound: 'okudum_bildirim.wav', vibration: true, lights: true, lightColor: '#E8643A',
    });
  } catch {}
  try {
    const izin = await LocalNotifications.checkPermissions();
    if (izin.display === 'prompt' || izin.display === 'prompt-with-rationale') await LocalNotifications.requestPermissions();
  } catch {}
  LocalNotifications.addListener('localNotificationActionPerformed', (e) => {
    tiklaninca(e?.notification?.extra?.sekme || '');
  });
}

export function bildirimleriSifirla() {
  gecmis = null;
  anahtar = '';
}

// Her talep güncellemesinde çağrılır
export function talepDegisti(gelen, giden) {
  if (!anahtar) return;
  if (!gecmis) {
    // İlk kurulum: mevcut talepler bilinen kabul edilir (eski olaylar için bildirim yağmuru olmasın)
    gecmis = {};
    for (const t of [...gelen, ...giden]) gecmis[t.id] = t.durum;
    return kaydet();
  }
  const yeni = olaylar(gelen, giden);
  for (const t of [...gelen, ...giden]) gecmis[t.id] = t.durum;
  kaydet();
  if (!yeni.length) return;

  if (onPlanda) {
    sesCal(yeni[yeni.length - 1].ses);
    const o = yeni[yeni.length - 1];
    toast(yeni.length > 1 ? `${o.baslik} (+${yeni.length - 1} gelişme daha)` : `${o.baslik} ${o.metin}`, 'basari');
  } else {
    yeni.slice(-5).forEach((o, i) => sistemBildirimi(o, i));
  }
}
