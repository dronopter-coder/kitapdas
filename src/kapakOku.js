// Kapaktan kitap adı ve yazarını okuma.
// 1) ML Kit (telefonda, internetsiz) kapaktaki yazıları satır satır ve boyutlarıyla okur.
// 2) Okunan yazı Google Books'ta aranır; kapaktaki kelimelerle örtüşen kayıt varsa onun adı/yazarı kullanılır.
// 3) Bulunamazsa: en büyük punto(lar) kitap adı, kişi adına benzeyen satır yazar sayılır.
import { Capacitor } from '@capacitor/core';
import { TextRecognition } from '@capacitor-mlkit/text-recognition';

/* global __FIREBASE__ */
const API_ANAHTARI = typeof __FIREBASE__ !== 'undefined' && __FIREBASE__ ? __FIREBASE__.apiKey : '';

export const kapakOkunabilir = () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('TextRecognition');

// Yayınevi, dizi, çeviri vb. satırlar kitap adı ya da yazar olamaz.
const GURULTU = /(yay[ıi]n|kitap(lar[ıi])?\b|dizi|klasik|bas[ıi]m|[çc]eviren|[çc]eviri|haz[ıi]rlayan|resimleyen|isbn|roman\b|öyk[üu]|şiir|kültür|k[üu]lt[üu]r|bankas[ıi]|edisyon|cilt|sayfa|best ?seller|milyon|sat[ıi][şs]|ödül|\bpress\b|books?\b|publishing|edition|translated|novel\b|www\.|\.com)/i;

const sade = (s) => s.toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const kelimeler = (s) => sade(s).split(' ').filter((k) => k.length > 1);

// "ANNA KARENİNA" → "Anna Karenina", "L. N. TOLSTOY" → "L. N. Tolstoy" (karışık yazılmışsa dokunma)
export function duzgunYaz(s) {
  s = s.replace(/\s+/g, ' ').trim();
  const harfler = s.replace(/[^A-Za-zÇĞİÖŞÜçğıöşüÂâÎîÛû]/g, '');
  if (!harfler || harfler !== harfler.toLocaleUpperCase('tr')) return s;
  const kucukKalsin = new Set(['ve', 'ile', 'de', 'da', 'ki', 'mi', 'bir', 'of', 'the', 'and']);
  // Türkçe harf (İ, Ç, Ğ, Ö, Ş, Ü) varsa Türkçe kurallarla (I→ı), yoksa yabancı ad sayılır (SAPIENS → Sapiens).
  const dil = /[İÇĞÖŞÜ]/.test(s) ? 'tr' : 'en';
  return s.toLocaleLowerCase(dil).split(' ').map((k, i) => (i > 0 && kucukKalsin.has(k) ? k : k.charAt(0).toLocaleUpperCase(dil) + k.slice(1))).join(' ');
}

const kisiAdiMi = (s) => {
  const p = s.replace(/[^A-Za-zÇĞİÖŞÜçğıöşüÂâÎîÛû. '-]/g, '').trim().split(/\s+/);
  return p.length >= 2 && p.length <= 4 && p.every((k) => /^[A-ZÇĞİÖŞÜÂÎÛ]/.test(k)) && !GURULTU.test(s);
};

// Kapaklarda sık görülen yazar ön adları: bu adla ya da baş harfle (L. N.) başlayan satır kesin yazardır.
const ON_ADLAR = new Set(sade(`
  ahmet mehmet mustafa ali hasan huseyin ibrahim ismail osman omer yusuf murat mert can cem emre burak kemal orhan
  oguz yasar sabahattin sait nazim attila cemal cahit necip peyami resat halide refik halit sevgi tomris adalet sait
  elif ayse fatma zeynep emine hatice leyla selim sezai tezer furuzan latife nezihe aziz rifat cevat necati ilhan
  hakan ece buket ahmed hamdi tanpinar yahya kemalettin nurettin bilge karasu sunay akin vedat turkali zulfu livaneli
  iskender pala ayfer tunc canan tan gulseren budayicioglu ozdemir asaf behcet ataol ugur hilmi mithat namik ziya
  fyodor lev leo anton nikolay ivan maksim mihail boris aleksandr george franz albert victor honore emile gustave
  jules charles jane emily virginia ernest william mark jack john stephen paulo gabriel jose franz hermann thomas
  stefan friedrich johann antoine alexandre jean simone milan italo umberto haruki agatha arthur edgar oscar james
  herman jules dan yuval robert michael rainer jorge julio isabel carlos khaled ken lewis j r k j
`).split(' '));
const gucluKisi = (s) => {
  const p = s.trim().split(/\s+/);
  if (p.length < 2 || p.length > 4 || GURULTU.test(s)) return false;
  return /^[A-ZÇĞİÖŞÜ]\.$/.test(p[0]) || ON_ADLAR.has(sade(p[0]));
};

// ML Kit satırlarından tahmin (internet yoksa ya da Google Books bulamazsa)
export function satirlardanTahmin(satirlar) {
  const temiz = satirlar
    .filter((l) => l.metin.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, '').length >= 2 && !GURULTU.test(l.metin))
    .sort((a, b) => a.y - b.y);
  if (!temiz.length) return null;
  // Yazar: önce kesin kişi adı (bilinen ön ad ya da baş harf), yoksa kişi adına benzeyen satır
  const kesinYazar = temiz.filter((l) => gucluKisi(l.metin)).sort((a, b) => b.h - a.h)[0];
  // Kitap adı: yazar dışındaki en büyük puntolu satırlar (iki satıra bölünmüş adlar birleşir)
  const adAdaylari = temiz.filter((l) => l !== kesinYazar);
  if (!adAdaylari.length) return null;
  const enBuyuk = Math.max(...adAdaylari.map((l) => l.h));
  const buyukler = adAdaylari.filter((l) => l.h >= enBuyuk * 0.8);
  const adlar = kesinYazar ? buyukler : (buyukler.filter((l) => !kisiAdiMi(l.metin)).length ? buyukler.filter((l) => !kisiAdiMi(l.metin)) : buyukler);
  const ad = duzgunYaz(adlar.slice(0, 3).map((l) => l.metin).join(' '));
  const yazarAday = kesinYazar || temiz.filter((l) => !adlar.includes(l) && kisiAdiMi(l.metin)).sort((a, b) => b.h - a.h)[0];
  return { ad, yazar: yazarAday ? duzgunYaz(yazarAday.metin) : '' };
}

async function googleBooksAra(sorgu) {
  const url = (anahtar) => `https://www.googleapis.com/books/v1/volumes?maxResults=8&printType=books&q=${encodeURIComponent(sorgu)}${anahtar ? `&key=${anahtar}` : ''}`;
  for (const anahtar of ['', API_ANAHTARI]) {
    try {
      const c = await fetch(url(anahtar), { signal: AbortSignal.timeout(7000) });
      if (c.ok) return (await c.json()).items || [];
    } catch {}
  }
  return [];
}

// Kapakta gerçekten yazan kelimelerle en çok örtüşen Google Books kaydı
export function enIyiEslesme(kayitlar, kapakMetni) {
  const kapak = new Set(kelimeler(kapakMetni));
  let enIyi = null;
  for (const k of kayitlar) {
    const v = k.volumeInfo || {};
    if (!v.title) continue;
    const ad = kelimeler(v.title);
    const yazar = kelimeler((v.authors || [])[0] || '');
    if (!ad.length) continue;
    const adOrani = ad.filter((x) => kapak.has(x)).length / ad.length;
    const yazarOrani = yazar.length ? yazar.filter((x) => kapak.has(x)).length / yazar.length : 0;
    const puan = adOrani * 2 + yazarOrani + (v.language === 'tr' ? 0.15 : 0);
    if (adOrani >= 0.6 && (!enIyi || puan > enIyi.puan)) enIyi = { puan, ad: v.title, yazar: (v.authors || [])[0] || '' };
  }
  return enIyi;
}

// path: Camera eklentisinin verdiği dosya adresi (uri)
export async function kapaktanOku(path) {
  // Kamera eklentisi düz dosya yolu (/data/...) verir; ML Kit ise file:// ya da content:// adresi bekler.
  if (path.startsWith('/')) path = 'file://' + path;
  const sonuc = await TextRecognition.processImage({ path });
  const satirlar = [];
  for (const b of sonuc.blocks || []) {
    for (const l of b.lines || []) {
      const r = l.boundingBox;
      if (!l.text?.trim() || !r) continue;
      satirlar.push({ metin: l.text.trim(), h: Math.abs(r.bottom - r.top), y: r.top });
    }
  }
  if (!satirlar.length) return null;
  const tahmin = satirlardanTahmin(satirlar);
  // Google Books sorgusu: en büyük puntolu birkaç satır (yayınevi gürültüsü hariç)
  const sorgu = [...satirlar].filter((l) => !GURULTU.test(l.metin)).sort((a, b) => b.h - a.h).slice(0, 4).map((l) => l.metin).join(' ');
  const eslesme = sorgu ? enIyiEslesme(await googleBooksAra(sorgu), sonuc.text || sorgu) : null;
  if (eslesme) return { ad: eslesme.ad, yazar: eslesme.yazar || tahmin?.yazar || '', kaynak: 'katalog' };
  return tahmin ? { ...tahmin, kaynak: 'tahmin' } : null;
}
