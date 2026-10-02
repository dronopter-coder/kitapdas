// Türkiye haritası çekirdeği: il verisi, mesafe hesabı, SVG çizimi ve parmakla kaydırma/yakınlaştırma.
import { HARITA_KUTU, DONUSUM, ILLER_HARITA } from './turkiyeHaritasi.js';

export const KUTU = HARITA_KUTU; // [x, y, genişlik, yükseklik] (SVG birimi)

// ad → { plaka, ad, x, y, yol }
export const ILLER = new Map(ILLER_HARITA.map(([plaka, ad, x, y, yol]) => [ad, { plaka, ad, x, y, yol }]));

// SVG koordinatından yaklaşık enlem/boylam; şehirler arası kuş uçuşu mesafe (km)
const [ba, bb, ea, eb] = DONUSUM;
const konum = (il) => ({ enlem: ea * il.y + eb, boylam: ba * il.x + bb });
export function mesafeKm(a, b) {
  const A = ILLER.get(a);
  const B = ILLER.get(b);
  if (!A || !B) return 0;
  const p = konum(A);
  const q = konum(B);
  const r = Math.PI / 180;
  const d = Math.sin(((q.enlem - p.enlem) * r) / 2) ** 2
    + Math.cos(p.enlem * r) * Math.cos(q.enlem * r) * Math.sin(((q.boylam - p.boylam) * r) / 2) ** 2;
  return Math.round(6371 * 2 * Math.asin(Math.sqrt(d)));
}

// İller SVG'si. dolgu(ad) → renk; sinif(ad) → ek sınıf
export function haritaSvg({ dolgu = () => '', sinif = () => '', ek = '', svgSinif = '' } = {}) {
  const yollar = ILLER_HARITA.map(([, ad, , , yol]) => {
    const f = dolgu(ad);
    return `<path class="il ${sinif(ad)}" data-il="${ad}" d="${yol}"${f ? ` style="fill:${f}"` : ''}/>`;
  }).join('');
  return `<svg class="tr-harita ${svgSinif}" viewBox="${KUTU.join(' ')}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${yollar}${ek}</svg>`;
}

// İki şehir arasında yukarı doğru kavis yapan yay (SVG yol verisi)
export function yay(a, b) {
  const A = ILLER.get(a);
  const B = ILLER.get(b);
  if (!A || !B) return '';
  const mx = (A.x + B.x) / 2;
  const my = (A.y + B.y) / 2;
  const d = Math.hypot(B.x - A.x, B.y - A.y);
  const kx = mx;
  const ky = my - Math.min(140, d * 0.38);
  return `M${A.x},${A.y} Q${kx},${ky} ${B.x},${B.y}`;
}

// ——— Kaydırma / yakınlaştırma ———
// gorunum: dokunma alanı; ic: dönüştürülen katman (SVG'yi taşır). degisti(durum) her karede çağrılır.
// Ekran koordinatı = (svgX - KUTU[0]) * taban * k + tx
export function kaydirYakinlastir(gorunum, ic, degisti, { enFazla = 9 } = {}) {
  const d = { k: 1, tx: 0, ty: 0, taban: 1, g: 0, y: 0 };
  const isaretciler = new Map();
  let sonDokunma = 0;
  let hareketEtti = false;
  let animasyon = 0;

  const olc = () => {
    d.g = gorunum.clientWidth;
    d.y = gorunum.clientHeight;
    d.taban = Math.min(d.g / KUTU[2], (d.y * 0.98) / KUTU[3]);
    ic.style.width = `${KUTU[2] * d.taban}px`;
    ic.style.height = `${KUTU[3] * d.taban}px`;
  };
  const sinirla = () => {
    d.k = Math.min(enFazla, Math.max(1, d.k));
    const w = KUTU[2] * d.taban * d.k;
    const h = KUTU[3] * d.taban * d.k;
    const pay = 40;
    d.tx = w <= d.g ? (d.g - w) / 2 : Math.min(pay, Math.max(d.g - w - pay, d.tx));
    d.ty = h <= d.y ? (d.y - h) / 2 : Math.min(pay, Math.max(d.y - h - pay, d.ty));
  };
  let bekleyen = false;
  const uygula = () => {
    sinirla();
    ic.style.transform = `translate(${d.tx}px, ${d.ty}px) scale(${d.k})`;
    if (!bekleyen) {
      bekleyen = true;
      requestAnimationFrame(() => { bekleyen = false; degisti(d); });
    }
  };
  // Ekrandaki (sx, sy) noktası sabit kalacak şekilde ölçek değiştir
  const yakinlas = (yeniK, sx, sy) => {
    const eski = d.k;
    yeniK = Math.min(enFazla, Math.max(1, yeniK));
    d.tx = sx - ((sx - d.tx) * yeniK) / eski;
    d.ty = sy - ((sy - d.ty) * yeniK) / eski;
    d.k = yeniK;
    uygula();
  };

  const nokta = (e) => {
    const r = gorunum.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  gorunum.addEventListener('pointerdown', (e) => {
    cancelAnimationFrame(animasyon);
    isaretciler.set(e.pointerId, nokta(e));
    hareketEtti = false;
  });
  gorunum.addEventListener('pointermove', (e) => {
    if (!isaretciler.has(e.pointerId)) return;
    const onceki = isaretciler.get(e.pointerId);
    const simdi = nokta(e);
    if (isaretciler.size === 1) {
      const dx = simdi.x - onceki.x;
      const dy = simdi.y - onceki.y;
      if (Math.abs(dx) + Math.abs(dy) > 1) hareketEtti = true;
      d.tx += dx; d.ty += dy;
      isaretciler.set(e.pointerId, simdi);
      uygula();
    } else if (isaretciler.size === 2) {
      const [a, b] = [...isaretciler.values()];
      const eskiMesafe = Math.hypot(a.x - b.x, a.y - b.y);
      isaretciler.set(e.pointerId, simdi);
      const [c, f] = [...isaretciler.values()];
      const yeniMesafe = Math.hypot(c.x - f.x, c.y - f.y);
      hareketEtti = true;
      if (eskiMesafe > 0) yakinlas(d.k * (yeniMesafe / eskiMesafe), (c.x + f.x) / 2, (c.y + f.y) / 2);
    }
  });
  const birak = (e) => {
    isaretciler.delete(e.pointerId);
    if (!hareketEtti && e.type === 'pointerup' && isaretciler.size === 0) {
      const t = Date.now();
      if (t - sonDokunma < 300 && !e.target.closest('[data-tik]')) {
        const p = nokta(e);
        git({ k: d.k * 2.2, sx: p.x, sy: p.y });
        sonDokunma = 0;
      } else sonDokunma = t;
    }
  };
  gorunum.addEventListener('pointerup', birak);
  gorunum.addEventListener('pointercancel', birak);
  gorunum.addEventListener('pointerleave', birak);
  gorunum.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = nokta(e);
    yakinlas(d.k * (e.deltaY < 0 ? 1.18 : 1 / 1.18), p.x, p.y);
  }, { passive: false });
  // Sürüklemeden sonra gelen tıklamayı yut (yanlışlıkla balona basılmasın)
  gorunum.addEventListener('click', (e) => { if (hareketEtti) { e.stopPropagation(); e.preventDefault(); } }, true);

  // Yumuşak geçiş: { k, svgX, svgY } → o nokta ortada; ya da { k, sx, sy } → ekran noktası sabit
  function git({ k, svgX, svgY, sx, sy }, sure = 450) {
    cancelAnimationFrame(animasyon);
    const bas = { k: d.k, tx: d.tx, ty: d.ty };
    k = Math.min(enFazla, Math.max(1, k));
    let hedef;
    if (svgX !== undefined) {
      hedef = { k, tx: d.g / 2 - (svgX - KUTU[0]) * d.taban * k, ty: d.y / 2 - (svgY - KUTU[1]) * d.taban * k };
    } else {
      hedef = { k, tx: sx - ((sx - d.tx) * k) / d.k, ty: sy - ((sy - d.ty) * k) / d.k };
    }
    const t0 = performance.now();
    const adim = (t) => {
      const p = Math.min(1, (t - t0) / sure);
      const e = 1 - (1 - p) ** 3;
      d.k = bas.k + (hedef.k - bas.k) * e;
      d.tx = bas.tx + (hedef.tx - bas.tx) * e;
      d.ty = bas.ty + (hedef.ty - bas.ty) * e;
      uygula();
      if (p < 1) animasyon = requestAnimationFrame(adim);
    };
    animasyon = requestAnimationFrame(adim);
  }

  const yenidenOlc = () => { olc(); uygula(); };
  const gozlemci = new ResizeObserver(yenidenOlc);
  gozlemci.observe(gorunum);
  olc();
  uygula();

  return {
    durum: d,
    git,
    yakinlas: (oran) => git({ k: d.k * oran, sx: d.g / 2, sy: d.y / 2 }, 300),
    sifirla: () => git({ k: 1, sx: d.g / 2, sy: d.y / 2 }),
    ayarla: ({ k, tx, ty }) => { Object.assign(d, { k, tx, ty }); uygula(); },
    // SVG noktasının görünümdeki ekran konumu
    ekran: (x, y) => ({ x: (x - KUTU[0]) * d.taban * d.k + d.tx, y: (y - KUTU[1]) * d.taban * d.k + d.ty }),
    kapat: () => { gozlemci.disconnect(); cancelAnimationFrame(animasyon); },
  };
}
