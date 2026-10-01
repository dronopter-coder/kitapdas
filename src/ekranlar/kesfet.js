// Ana ekran: selamlama, arama, kategoriler, yeni gelenler, şehrindekiler ve tüm raf
import { durum } from '../durum.js';
import { demoMu } from '../veri/index.js';
import { h, ikon, avatar, kapak, $ } from '../ui.js';
import { KATEGORILER } from '../sabitler.js';
import { kitapKarti, bosDurum, iskelet, logo, bulunma } from './ortak.js';

function selam() {
  const s = new Date().getHours();
  if (s < 6) return 'İyi geceler';
  if (s < 12) return 'Günaydın';
  if (s < 18) return 'İyi günler';
  return 'İyi akşamlar';
}

export function kesfetEkrani(kok) {
  const ciz = () => {
    const p = durum.profil;
    const ilkAd = (p?.ad || '').split(' ')[0];
    const musait = durum.kitaplar.filter((k) => k.durum === 'musait' && k.sahipId !== durum.kullanici.uid);
    const yeni = musait.slice(0, 8);
    const sehrim = musait.filter((k) => k.sehir && k.sehir === p?.sehir).slice(0, 10);
    const yolda = durum.kitaplar.filter((k) => k.durum === 'verildi').length;

    kok.innerHTML = `
    <header class="kesfet-ust">
      ${logo()}
      <button class="avatar-dugme" data-git="profil" aria-label="Profil">${avatar(p?.ad, p?.foto, 40)}</button>
    </header>
    <section class="selam">
      <p>${selam()}${ilkAd ? `, ${h(ilkAd)}` : ''} ✨</p>
      <h1>Bugün hangi kitap <em>seni</em> bekliyor?</h1>
    </section>
    <button class="arama-hap" data-git="ara">${ikon('ara', 20)}<span>Kitap, yazar ya da tür ara…</span></button>
    ${demoMu ? `<div class="demo-serit">${ikon('parilti', 16)}<span><b>Demo modu</b> — tüm veriler bu cihazda. Bir kitap iste, akışı canlı izle!</span></div>` : ''}

    <div class="kategori-serit yatay-kaydir">
      ${KATEGORILER.slice(0, 10).map((k) => `<button class="cip" data-git="ara?kategori=${encodeURIComponent(k)}">${h(k)}</button>`).join('')}
    </div>

    ${!durum.kitaplarHazir ? `<div class="izgara">${iskelet(4)}</div>` : musait.length === 0
    ? bosDurum('kitap', 'Raflar şimdilik boş', 'İlk kitabı sen paylaş, kitapdaşlık zinciri senden başlasın!', '<button class="dugme ana" data-git="ekle">Kitap ekle</button>')
    : `
    <section class="bolum">
      <div class="bolum-bas"><h2>Rafa yeni gelenler</h2><button class="baglanti" data-git="ara">Tümü</button></div>
      <div class="vitrin yatay-kaydir">
        ${yeni.map((k) => `<a class="vitrin-kitap" data-git="kitap/${h(k.id)}">
          ${kapak(k)}
          <b>${h(k.ad)}</b><span>${h(k.yazar)}</span>
        </a>`).join('')}
      </div>
    </section>

    ${sehrim.length ? `<section class="bolum">
      <div class="bolum-bas"><h2>${ikon('konum', 18)} ${h(bulunma(p.sehir))} seni bekleyenler</h2></div>
      <div class="liste-yatay yatay-kaydir">${sehrim.map((k) => kitapKarti(k, { genis: true })).join('')}</div>
    </section>` : ''}

    <section class="bilgi-kart">
      <div>
        <b>${yolda > 0 ? `${yolda} kitap yeni okuruna yol aldı` : 'Nasıl çalışır?'}</b>
        <p>Kitap ücretsiz, kargo karşı ödemeli: kitabı isteyen, teslim alırken yalnızca kargo ücretini öder.</p>
      </div>
      <div class="bilgi-kart-ikon">${ikon('el', 30, 1.8)}</div>
    </section>

    <section class="bolum">
      <div class="bolum-bas"><h2>Tüm raf</h2><span class="sayac">${musait.length} kitap</span></div>
      <div class="izgara">${musait.map((k) => kitapKarti(k)).join('')}</div>
    </section>`}
    `;
  };
  ciz();
  return {
    guncelle(neler) {
      if (neler !== 'kitaplar') return;
      const y = kok.scrollTop;
      const vitrin = $('.vitrin', kok)?.scrollLeft;
      ciz();
      kok.scrollTop = y;
      if ($('.vitrin', kok) && vitrin) $('.vitrin', kok).scrollLeft = vitrin;
    },
  };
}
