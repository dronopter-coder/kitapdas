// Uygulama içi kısa, yumuşak uyarı sesleri (WebAudio ile üretilir; ses dosyası gerekmez).
// Her tını çan/marimba benzeri: temel ton + hafif üst ton, hızlı yükselip yavaşça sönen zarf.

const ANAHTAR = 'okudum_ses';
let baglam = null;

export const sesAcikMi = () => {
  try { return localStorage.getItem(ANAHTAR) !== '0'; } catch { return true; }
};
export const sesAyarla = (acik) => {
  try { localStorage.setItem(ANAHTAR, acik ? '1' : '0'); } catch {}
};

// Nota → frekans (A4 = 440)
const N = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5, D6: 1174.66, E6: 1318.51, G6: 1567.98, A4: 440, F5: 698.46, C7: 2093 };

// [nota, başlangıç (sn), süre (sn), ses düzeyi]
const TINILAR = {
  gonder: [['G5', 0, 0.5, 0.5], ['D6', 0.09, 0.8, 0.45]], // talep gönderildi: yukarı süzülen iki nota
  gelen: [['E6', 0, 0.6, 0.45], ['G6', 0.12, 0.6, 0.4], ['C7', 0.24, 1.1, 0.35]], // yeni talep geldi: üç notalı çan
  kabul: [['C6', 0, 0.5, 0.4], ['E6', 0.08, 0.5, 0.38], ['G6', 0.16, 0.5, 0.36], ['C7', 0.26, 1.2, 0.34]], // kabul: neşeli arpej
  kargo: [['A5', 0, 0.35, 0.4], ['D6', 0.1, 0.35, 0.4], ['A5', 0.2, 0.35, 0.3], ['E6', 0.3, 1, 0.38]], // kargoya verildi: yola çıkış
  teslim: [['C6', 0, 1.4, 0.3], ['E6', 0.02, 1.4, 0.26], ['G6', 0.04, 1.4, 0.24], ['C7', 0.18, 1.5, 0.22]], // teslim: sıcak akor
  yumusak: [['E5', 0, 0.7, 0.35], ['C5', 0.14, 0.9, 0.3]], // red/iptal: alçak, nazik iki nota
};

function notaCal(ctx, cikis, frekans, bas, sure, duzey) {
  const t = ctx.currentTime + bas;
  const zarf = ctx.createGain();
  zarf.gain.setValueAtTime(0.0001, t);
  zarf.gain.exponentialRampToValueAtTime(duzey, t + 0.012);
  zarf.gain.exponentialRampToValueAtTime(0.0001, t + sure);
  zarf.connect(cikis);
  // Temel ton + oktav üstü (hafif) + 3. harmonik (çok hafif): çan tınısı
  [[1, 1], [2, 0.28], [3, 0.08]].forEach(([kat, oran]) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(frekans * kat, t);
    g.gain.value = oran;
    o.connect(g).connect(zarf);
    o.start(t);
    o.stop(t + sure + 0.05);
  });
}

export function sesCal(ad) {
  if (!sesAcikMi()) return;
  const tini = TINILAR[ad];
  if (!tini) return;
  try {
    baglam ||= new (window.AudioContext || window.webkitAudioContext)();
    if (baglam.state === 'suspended') baglam.resume();
    const ana = baglam.createGain();
    ana.gain.value = 0.32;
    // Kısa yankı: sese derinlik katar
    const gecikme = baglam.createDelay();
    gecikme.delayTime.value = 0.13;
    const geri = baglam.createGain();
    geri.gain.value = 0.22;
    ana.connect(baglam.destination);
    ana.connect(gecikme);
    gecikme.connect(geri);
    geri.connect(gecikme);
    geri.connect(baglam.destination);
    for (const [nota, bas, sure, duzey] of tini) notaCal(baglam, ana, N[nota], bas, sure, duzey);
    setTimeout(() => { try { ana.disconnect(); geri.disconnect(); gecikme.disconnect(); } catch {} }, 4000);
  } catch { /* ses çalınamadı: sessiz devam */ }
}
