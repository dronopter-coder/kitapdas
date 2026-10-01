// Demo arka ucu: Firebase ayarı yokken uygulamanın tamamı bu cihazda (localStorage) çalışır.
// Firebase arka ucuyla aynı işlevleri sunar. Gerçekçi olsun diye talepler bir süre sonra
// "karşı taraf" tarafından otomatik onaylanıp kargolanır.
const ANAHTAR = 'kitapdas_demo_v1';
const BEN = 'demo-ben';

const gun = 86400000;
const KISILER = {
  u1: { ad: 'Elif Yılmaz', sehir: 'İstanbul' },
  u2: { ad: 'Mert Kaya', sehir: 'Ankara' },
  u3: { ad: 'Zeynep Aksoy', sehir: 'İzmir' },
  u4: { ad: 'Can Demir', sehir: 'Eskişehir' },
  u5: { ad: 'Ayşe Polat', sehir: 'Bursa' },
};
const TOHUM = [
  ['Kürk Mantolu Madonna', 'Sabahattin Ali', 'Türk Klasikleri', 'iyi', 'u1', 'Kenarlarında birkaç kurşun kalem notu var, sayfalar temiz. Hayatımda en çok etkilendiğim kitaplardan biri.'],
  ['Saatleri Ayarlama Enstitüsü', 'Ahmet Hamdi Tanpınar', 'Türk Klasikleri', 'yeni', 'u2', 'Bir kez okundu, neredeyse sıfır gibi.'],
  ['Suç ve Ceza', 'Fyodor Dostoyevski', 'Dünya Klasikleri', 'okunmus', 'u3', 'İş Bankası Hasan Âli Yücel Klasikler dizisi. Sırtında hafif kırık var.'],
  ['Tutunamayanlar', 'Oğuz Atay', 'Roman', 'iyi', 'u4', 'Kalın ama her sayfası ayrı bir dünya. Yeni okuruna şimdiden iyi yolculuklar.'],
  ['1984', 'George Orwell', 'Bilim Kurgu', 'yeni', 'u5', ''],
  ['Küçük Prens', 'Antoine de Saint-Exupéry', 'Çocuk', 'iyi', 'u1', 'Resimli baskı. Çocuğuma okumuştum, artık başka bir evde okunsun.'],
  ['Sapiens', 'Yuval Noah Harari', 'Tarih', 'okunmus', 'u2', 'Bazı satırların altı çizili.'],
  ['İnce Memed', 'Yaşar Kemal', 'Türk Klasikleri', 'yipranmis', 'u3', 'Eski bir baskı, kapağı yıpranmış ama içi okunaklı.'],
  ['Simyacı', 'Paulo Coelho', 'Roman', 'iyi', 'u4', ''],
  ['Çalıkuşu', 'Reşat Nuri Güntekin', 'Türk Klasikleri', 'iyi', 'u5', 'Lise yıllarımdan kalma, çok sevilerek okundu.'],
  ['Dune', 'Frank Herbert', 'Bilim Kurgu', 'yeni', 'u2', 'Filmden sonra aldım, bir solukta bitti.'],
  ['Masumiyet Müzesi', 'Orhan Pamuk', 'Roman', 'okunmus', 'u1', ''],
  ['Böyle Buyurdu Zerdüşt', 'Friedrich Nietzsche', 'Felsefe', 'iyi', 'u3', ''],
  ['Sefiller', 'Victor Hugo', 'Dünya Klasikleri', 'okunmus', 'u5', 'Kısaltılmamış tam metin.'],
];

let veri = yukle();
const dinleyiciler = { oturum: new Set(), kitap: new Set(), talep: new Set() };

function yukle() {
  try {
    const v = JSON.parse(localStorage.getItem(ANAHTAR));
    if (v?.kitaplar) return v;
  } catch {}
  return tohumla();
}
function tohumla() {
  const simdi = Date.now();
  const kitaplar = TOHUM.map(([ad, yazar, kategori, kondisyon, kisi, aciklama], i) => ({
    id: 'k' + i, ad, yazar, kategori, kondisyon, aciklama, foto: '', sahipId: kisi,
    sahipAd: KISILER[kisi].ad, sahipFoto: '', sehir: KISILER[kisi].sehir, durum: 'musait',
    olusturma: simdi - i * gun * 0.7 - 3600000,
  }));
  return { oturum: null, profiller: {}, adresler: {}, kitaplar, talepler: [], talepAdresleri: {} };
}
function kaydet() {
  try { localStorage.setItem(ANAHTAR, JSON.stringify(veri)); } catch (e) { console.warn('Demo verisi kaydedilemedi', e); }
  yayinla();
}
function yayinla() {
  const kitaplar = [...veri.kitaplar].sort((a, b) => b.olusturma - a.olusturma);
  dinleyiciler.kitap.forEach((cb) => cb(kitaplar));
  dinleyiciler.talep.forEach(({ uid, cb }) => cb({
    gelen: veri.talepler.filter((t) => t.sahipId === uid),
    giden: veri.talepler.filter((t) => t.isteyenId === uid),
  }));
}
const bekle = (ms = 350) => new Promise((r) => setTimeout(r, ms));

export function baslat() {}

export function oturumuDinle(cb) {
  dinleyiciler.oturum.add(cb);
  setTimeout(() => cb(veri.oturum), 0);
  return () => dinleyiciler.oturum.delete(cb);
}
function oturumAc(k) {
  veri.oturum = k;
  // Yeni demo kullanıcının rafında bir kitap ve ona gelmiş bir talep olsun ki akış hemen görülsün.
  if (!veri.kitaplar.some((x) => x.sahipId === BEN)) {
    veri.kitaplar.push({
      id: 'kben', ad: 'Aylak Adam', yazar: 'Yusuf Atılgan', kategori: 'Türk Klasikleri', kondisyon: 'iyi',
      aciklama: 'Tek oturuşta okunacak bir kitap. Yeni okurunu bekliyor.', foto: '', sahipId: BEN,
      sahipAd: k.ad, sahipFoto: '', sehir: '', durum: 'musait', olusturma: Date.now() - gun * 2,
    });
    veri.talepler.push({
      id: 't-hosgeldin', kitapId: 'kben', kitapAd: 'Aylak Adam', kitapYazar: 'Yusuf Atılgan', kitapFoto: '',
      sahipId: BEN, sahipAd: k.ad, sahipFoto: '', isteyenId: 'u3', isteyenAd: KISILER.u3.ad, isteyenFoto: '',
      isteyenSehir: KISILER.u3.sehir, not: 'Merhaba! Uzun zamandır okumak istiyordum, çok sevinirim 🙏',
      durum: 'bekliyor', kargo: null, olusturma: Date.now() - 3600000 * 5, guncelleme: Date.now() - 3600000 * 5,
    });
    veri.talepAdresleri['t-hosgeldin'] = {
      adSoyad: 'Zeynep Aksoy', telefon: '0555 123 45 67', il: 'İzmir', ilce: 'Karşıyaka',
      acikAdres: 'Bostanlı Mah. Cemal Gürsel Cad. No: 12 D: 4',
    };
  }
  kaydet();
  dinleyiciler.oturum.forEach((cb) => cb(k));
}

export async function googleIleGiris() {
  await bekle(600);
  oturumAc({ uid: BEN, ad: 'Kitapsever', eposta: 'demo@kitapdas.app', foto: '' });
}
export async function epostaKayit(ad, eposta, sifre) {
  if (sifre.length < 6) throw { code: 'auth/weak-password' };
  await bekle();
  const k = { uid: BEN, ad, eposta, foto: '' };
  oturumAc(k);
  return k;
}
export async function epostaGiris(eposta, sifre) {
  if (!sifre) throw { code: 'auth/missing-password' };
  await bekle();
  oturumAc({ uid: BEN, ad: veri.profiller[BEN]?.ad || eposta.split('@')[0], eposta, foto: '' });
}
export async function sifreSifirla() { await bekle(); }
export async function cikis() {
  veri.oturum = null;
  kaydet();
  dinleyiciler.oturum.forEach((cb) => cb(null));
}

export async function profilGetir(uid) { return veri.profiller[uid] || null; }
export async function profilKaydet(uid, p) {
  veri.profiller[uid] = { ...veri.profiller[uid], ...p };
  for (const k of veri.kitaplar) if (k.sahipId === uid) Object.assign(k, { sahipAd: p.ad ?? k.sahipAd, sehir: p.sehir ?? k.sehir });
  kaydet();
}
export async function adresimiGetir(uid) { return veri.adresler[uid] || null; }
export async function adresimiKaydet(uid, a) { veri.adresler[uid] = a; kaydet(); }

export function kitaplariDinle(cb) {
  dinleyiciler.kitap.add(cb);
  setTimeout(yayinla, 0);
  return () => dinleyiciler.kitap.delete(cb);
}
export async function kitapEkle(kullanici, profil, v, foto) {
  await bekle(500);
  const id = 'k' + Date.now();
  veri.kitaplar.push({
    ...v, id, foto: foto || '', sahipId: kullanici.uid, sahipAd: profil.ad, sahipFoto: profil.foto || '',
    sehir: profil.sehir, durum: 'musait', olusturma: Date.now(),
  });
  kaydet();
  return id;
}
export async function kitapSil(kitap) {
  veri.kitaplar = veri.kitaplar.filter((k) => k.id !== kitap.id);
  kaydet();
}

export function talepleriDinle(uid, cb) {
  const d = { uid, cb };
  dinleyiciler.talep.add(d);
  setTimeout(yayinla, 0);
  return () => dinleyiciler.talep.delete(d);
}
const talepBul = (id) => veri.talepler.find((t) => t.id === id);
const kitapBul = (id) => veri.kitaplar.find((k) => k.id === id);
function guncelle(id, alanlar) {
  Object.assign(talepBul(id), alanlar, { guncelleme: Date.now() });
}

export async function talepOlustur(kullanici, profil, kitap, not, adres) {
  await bekle(500);
  const id = 't' + Date.now();
  veri.talepler.push({
    id, kitapId: kitap.id, kitapAd: kitap.ad, kitapYazar: kitap.yazar, kitapFoto: kitap.foto || '',
    sahipId: kitap.sahipId, sahipAd: kitap.sahipAd, sahipFoto: kitap.sahipFoto || '',
    isteyenId: kullanici.uid, isteyenAd: profil.ad, isteyenFoto: profil.foto || '', isteyenSehir: profil.sehir || '',
    not: not || '', durum: 'bekliyor', kargo: null, olusturma: Date.now(), guncelleme: Date.now(),
  });
  veri.talepAdresleri[id] = adres;
  kaydet();
  // Karşı taraf (demo kişisi) önce kabul eder, sonra kargolar.
  setTimeout(() => {
    const t = talepBul(id);
    if (t?.durum !== 'bekliyor') return;
    guncelle(id, { durum: 'kabul' });
    kitapBul(t.kitapId).durum = 'rezerve';
    kaydet();
  }, 8000);
  setTimeout(() => {
    const t = talepBul(id);
    if (t?.durum !== 'kabul') return;
    guncelle(id, { durum: 'kargoda', kargo: { firma: 'Yurtiçi Kargo', takipNo: String(Math.floor(1e11 + Math.random() * 9e11)) } });
    kitapBul(t.kitapId).durum = 'verildi';
    kaydet();
  }, 20000);
  return id;
}
export async function talepAdresi(id) { return veri.talepAdresleri[id] || null; }

export async function talepKabul(talep, digerleri) {
  await bekle();
  guncelle(talep.id, { durum: 'kabul' });
  for (const t of digerleri) guncelle(t.id, { durum: 'red' });
  kitapBul(talep.kitapId).durum = 'rezerve';
  kaydet();
}
export async function talepReddet(talep) { await bekle(); guncelle(talep.id, { durum: 'red' }); kaydet(); }
export async function talepIptal(talep) { await bekle(); guncelle(talep.id, { durum: 'iptal' }); kaydet(); }
export async function talepGeriCek(talep) {
  await bekle();
  guncelle(talep.id, { durum: 'red' });
  kitapBul(talep.kitapId).durum = 'musait';
  kaydet();
}
export async function kargola(talep, firma, takipNo) {
  await bekle();
  guncelle(talep.id, { durum: 'kargoda', kargo: { firma, takipNo } });
  kitapBul(talep.kitapId).durum = 'verildi';
  kaydet();
  // Demo: alıcı birkaç saniye sonra teslim aldığını bildirir.
  setTimeout(() => {
    if (talepBul(talep.id)?.durum === 'kargoda') { guncelle(talep.id, { durum: 'teslim' }); kaydet(); }
  }, 15000);
}
export async function teslimAldim(talep) { await bekle(); guncelle(talep.id, { durum: 'teslim' }); kaydet(); }

export function demoyuSifirla() {
  localStorage.removeItem(ANAHTAR);
  veri = tohumla();
}
