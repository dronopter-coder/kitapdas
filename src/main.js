import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { api } from './veri/index.js';
import { durum, degisti, abone } from './durum.js';
import { ikon, $, titret, toast, hataMetni } from './ui.js';
import { git, geri, geriSayildi, rotalayiciAyarla } from './yon.js';
import { reklamlariBaslat, bannerGoster } from './reklam.js';
import { girisEkrani } from './ekranlar/giris.js';
import { kesfetEkrani } from './ekranlar/kesfet.js';
import { araEkrani } from './ekranlar/ara.js';
import { kitapEkrani } from './ekranlar/kitap.js';
import { ekleEkrani } from './ekranlar/ekle.js';
import { takasEkrani } from './ekranlar/takas.js';
import { profilEkrani } from './ekranlar/profil.js';
import { profilDuzenleEkrani } from './ekranlar/profilDuzenle.js';
import { kisiEkrani } from './ekranlar/kisi.js';
import { dogrulaEkrani } from './ekranlar/dogrula.js';

const ROTALAR = {
  giris: { ekran: girisEkrani, acik: true, koyu: true },
  dogrula: { ekran: dogrulaEkrani },
  kesfet: { ekran: kesfetEkrani, sekme: 'kesfet' },
  ara: { ekran: araEkrani, sekme: 'ara' },
  takas: { ekran: takasEkrani, sekme: 'takas' },
  profil: { ekran: profilEkrani, sekme: 'profil' },
  kitap: { ekran: kitapEkrani },
  ekle: { ekran: ekleEkrani },
  kisi: { ekran: kisiEkrani },
  'profil-duzenle': { ekran: profilDuzenleEkrani },
};

let aktif = null; // { ad, ekran örneği }
let kitapAboneligi = null;
let talepAboneligi = null;

function cozumle() {
  const [yol, sorgu = ''] = location.hash.replace(/^#\/?/, '').split('?');
  const [ad, ...parca] = yol.split('/');
  return { ad: ad || 'kesfet', parca, sorgu: Object.fromEntries(new URLSearchParams(sorgu)) };
}

function rotala() {
  if (durum.kullanici === undefined) return; // oturum henüz bilinmiyor
  let { ad, parca, sorgu } = cozumle();
  if (!ROTALAR[ad]) ad = 'kesfet';
  if (!durum.kullanici && !ROTALAR[ad].acik) { ad = 'giris'; history.replaceState(null, '', '#/giris'); }
  if (durum.kullanici && !durum.kullanici.dogrulandi) {
    if (ad !== 'dogrula') { ad = 'dogrula'; history.replaceState(null, '', '#/dogrula'); }
  } else if (ad === 'dogrula') { ad = durum.kullanici ? 'kesfet' : 'giris'; history.replaceState(null, '', `#/${ad}`); }
  if (durum.kullanici && ad === 'giris') { ad = 'kesfet'; history.replaceState(null, '', '#/kesfet'); }
  if (durum.kullanici?.dogrulandi && !durum.profil?.sehir && ad !== 'profil-duzenle') {
    ad = 'profil-duzenle';
    sorgu = { ilk: '1' };
    history.replaceState(null, '', '#/profil-duzenle?ilk=1');
  }

  const rota = ROTALAR[ad];
  aktif?.ornek?.temizle?.();
  const sahne = $('#sahne');
  sahne.className = 'sahne giris-anim' + (rota.sekme ? ' sekmeli' : '');
  sahne.scrollTop = 0;
  sahne.innerHTML = '';
  aktif = { ad, ornek: rota.ekran(sahne, { parca, sorgu }) || {} };
  void sahne.offsetWidth;
  sekmeCiz(rota.sekme);
  durumCubugu(rota.koyu);
  bannerGoster(!!rota.sekme);
}

function sekmeCiz(secili) {
  const nav = $('#sekme');
  nav.hidden = !secili;
  if (!secili) return;
  const bekleyen = durum.gelen.filter((t) => t.durum === 'bekliyor').length
    + durum.giden.filter((t) => t.durum === 'kargoda').length;
  const s = (id, ik, ad, rozet = 0) => `<button class="sekme-d ${secili === id ? 'secili' : ''}" data-git="${id}" aria-label="${ad}">
      <span class="sekme-ikon">${ikon(ik, 22, secili === id ? 2.4 : 1.9)}${rozet ? `<i class="rozet">${rozet}</i>` : ''}</span><span>${ad}</span></button>`;
  nav.innerHTML = `
    ${s('kesfet', 'ev', 'Keşfet')}
    ${s('ara', 'ara', 'Ara')}
    <button class="sekme-fab" data-git="ekle" aria-label="Kitap ekle">${ikon('arti', 28, 2.6)}</button>
    ${s('takas', 'takas', 'Takas', bekleyen)}
    ${s('profil', 'kisi', 'Profil')}`;
}

function durumCubugu(koyu) {
  if (!Capacitor.isNativePlatform()) return;
  StatusBar.setStyle({ style: koyu ? Style.Dark : Style.Light }).catch(() => {});
}

function abonelikleriKapat() {
  kitapAboneligi?.(); kitapAboneligi = null;
  talepAboneligi?.(); talepAboneligi = null;
}

function verileriDinle(uid) {
  const hata = (e) => toast(hataMetni(e), 'hata');
  kitapAboneligi = api.kitaplariDinle((liste) => {
    durum.kitaplar = liste;
    durum.kitaplarHazir = true;
    degisti('kitaplar');
  }, hata);
  talepAboneligi = api.talepleriDinle(uid, ({ gelen, giden }) => {
    const sirala = (a, b) => b.guncelleme - a.guncelleme;
    durum.gelen = gelen.sort(sirala);
    durum.giden = giden.sort(sirala);
    degisti('talepler');
  }, hata);
}

abone((neler) => {
  aktif?.ornek?.guncelle?.(neler);
  if (neler === 'talepler' && aktif && ROTALAR[aktif.ad].sekme) sekmeCiz(ROTALAR[aktif.ad].sekme);
});

function baslat() {
  durum.kullanici = undefined;
  rotalayiciAyarla(rotala);
  if (Capacitor.isNativePlatform()) document.documentElement.classList.add('yerel');

  document.addEventListener('click', (e) => {
    const g = e.target.closest('[data-git]');
    if (g) { e.preventDefault(); titret(); git(g.dataset.git); }
    if (e.target.closest('[data-geri]')) { e.preventDefault(); titret(); geri(); }
  });
  window.addEventListener('popstate', () => {
    if ($('.sheet-kap')) return; // açık alt sayfayı kapatan geri hareketi
    geriSayildi();
    rotala();
  });

  let onceki = null;
  api.oturumuDinle(async (k) => {
    // Jeton yenilemeleri de haber verir; kullanıcı ve doğrulama durumu değişmediyse bir şey yapma.
    const imza = k ? `${k.uid}|${k.dogrulandi}` : '';
    if (imza === onceki) return;
    onceki = imza;
    abonelikleriKapat();
    durum.kullanici = k;
    durum.kitaplar = []; durum.gelen = []; durum.giden = []; durum.kitaplarHazir = false;
    if (k && !k.dogrulandi) {
      durum.profil = null; // doğrulanana kadar veriye erişim yok
    } else if (k) {
      try {
        durum.profil = (await api.profilGetir(k.uid)) || { ad: k.ad || k.eposta.split('@')[0], foto: k.foto || '', sehir: '' };
        if (!durum.profil.foto && k.foto) durum.profil.foto = k.foto;
      } catch (e) {
        durum.profil = { ad: k.ad, foto: k.foto, sehir: '' };
        toast(hataMetni(e), 'hata');
      }
      verileriDinle(k.uid);
      reklamlariBaslat();
    } else {
      durum.profil = null;
    }
    $('#acilis')?.classList.add('gizli');
    setTimeout(() => $('#acilis')?.remove(), 500);
    rotala();
  });
}

baslat();
