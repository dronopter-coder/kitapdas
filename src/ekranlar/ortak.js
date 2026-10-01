// Ekranlar arasında paylaşılan parçalar
import { h, ikon, kapak, avatar } from '../ui.js';
import { kondisyon, KITAP_DURUM, TALEP_DURUM } from '../sabitler.js';

export const LOGO_ISARET = `<svg class="logo-isaret" viewBox="0 0 48 48" aria-hidden="true">
  <path d="M6 12.5c6-2.6 12-2.6 18 1.6v25.4c-6-4.2-12-4.2-18-1.6z" fill="currentColor" opacity=".92"/>
  <path d="M42 12.5c-6-2.6-12-2.6-18 1.6v25.4c6-4.2 12-4.2 18-1.6z" fill="var(--mercan)"/>
  <circle cx="24" cy="7.5" r="3.6" fill="var(--hardal)"/>
</svg>`;

export function logo(ton = '') {
  return `<div class="logo ${ton}">${LOGO_ISARET}<span>okudu<b>m</b></span></div>`;
}

export function kitapKarti(k, { genis = false } = {}) {
  const kd = kondisyon(k.kondisyon);
  return `<a class="kitap-kart ${genis ? 'genis' : ''}" data-git="kitap/${h(k.id)}">
    <div class="kitap-kart-kapak">${kapak(k)}${k.durum !== 'musait' ? `<span class="serit-durum ${h(k.durum)}">${h(KITAP_DURUM[k.durum])}</span>` : ''}</div>
    <div class="kitap-kart-bilgi">
      <b>${h(k.ad)}</b>
      <span class="yazar">${h(k.yazar)}</span>
      <span class="meta"><i class="nokta" style="background:${kd.renk}"></i>${h(kd.ad)}${k.sehir ? ` · ${h(k.sehir)}` : ''}</span>
    </div>
  </a>`;
}

export function bosDurum(ikonAd, baslik, metin, dugme = '') {
  return `<div class="bos">
    <div class="bos-ikon">${ikon(ikonAd, 30, 1.8)}</div>
    <b>${h(baslik)}</b>
    <p>${h(metin)}</p>
    ${dugme}
  </div>`;
}

export function ustBar(baslik, sag = '') {
  return `<header class="ust-bar">
    <button class="yuvarlak" data-geri aria-label="Geri">${ikon('geri', 22)}</button>
    <h2>${h(baslik)}</h2>
    <div class="ust-bar-sag">${sag}</div>
  </header>`;
}

export function iskelet(adet = 4) {
  return Array.from({ length: adet }, () => `<div class="kitap-kart iskelet"><div class="kitap-kart-kapak"><div class="kapak"></div></div><div class="kitap-kart-bilgi"><b></b><span></span></div></div>`).join('');
}

export function durumRozeti(d) {
  const t = TALEP_DURUM[d];
  return `<span class="durum-rozet" style="--r:${t.renk}">${h(t.ad)}</span>`;
}

export function kisiSatiri(ad, foto, alt) {
  return `<div class="kisi-satir">${avatar(ad, foto, 40)}<div><b>${h(ad)}</b><span>${alt}</span></div></div>`;
}

// Türkçe bulunma eki: İstanbul'da, İzmir'de, Muş'ta, Tokat'ta…
export function bulunma(ad) {
  const sesli = [...ad.toLocaleLowerCase('tr')].reverse().find((c) => 'aıoueiöü'.includes(c)) || 'a';
  const ince = 'eiöü'.includes(sesli);
  const sert = 'çfhkpsşt'.includes(ad.slice(-1).toLocaleLowerCase('tr'));
  return `${ad}'${sert ? 't' : 'd'}${ince ? 'e' : 'a'}`;
}
