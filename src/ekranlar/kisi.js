// Bir kitapdaşın rafı
import { durum } from '../durum.js';
import { h, ikon, avatar } from '../ui.js';
import { kitapKarti, bosDurum, ustBar } from './ortak.js';

export function kisiEkrani(kok, { parca }) {
  const uid = parca[0];
  const ciz = () => {
    const kitaplar = durum.kitaplar.filter((k) => k.sahipId === uid);
    const ornek = kitaplar[0];
    const rafta = kitaplar.filter((k) => k.durum === 'musait');
    const paylasti = kitaplar.filter((k) => k.durum === 'verildi').length;
    kok.innerHTML = `
      ${ustBar('')}
      ${ornek ? `<section class="kisi-bas">
        ${avatar(ornek.sahipAd, ornek.sahipFoto, 76)}
        <h1>${h(ornek.sahipAd)}</h1>
        <p>${ikon('konum', 15)} ${h(ornek.sehir || '')}</p>
        <div class="istatistik kucuk"><div><b>${rafta.length}</b><span>Rafında</span></div><div><b>${paylasti}</b><span>Paylaştı</span></div></div>
      </section>
      <section class="bolum"><div class="bolum-bas"><h2>Rafındaki kitaplar</h2></div>
        ${rafta.length ? `<div class="izgara">${rafta.map((k) => kitapKarti(k)).join('')}</div>` : bosDurum('raf', 'Rafı şu an boş', 'Bu kitapdaşın paylaşacak kitabı kalmamış.')}
      </section>` : bosDurum('kisi', 'Kitapdaş bulunamadı', '')}`;
  };
  ciz();
  return { guncelle: (n) => n === 'kitaplar' && ciz() };
}
