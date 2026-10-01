// Takas merkezi: gelen talepler (kitabımı isteyenler) ve giden talepler (benim isteklerim)
import { durum } from '../durum.js';
import { api } from '../veri/index.js';
import { h, ikon, avatar, kapak, $, sayfaAc, toast, hataMetni, yukleniyor, onayla, titret, zamanOnce } from '../ui.js';
import { TALEP_DURUM, KARGO_FIRMALARI } from '../sabitler.js';
import { bosDurum, durumRozeti } from './ortak.js';
import { gecisReklami } from '../reklam.js';

const ADIMLAR = ['Talep', 'Onay', 'Kargo', 'Teslim'];

function ilerleme(d) {
  const adim = TALEP_DURUM[d].adim;
  if (!adim) return '';
  return `<div class="ilerleme" style="--oran:${(adim - 1) / 3}">
    <div class="ilerleme-hat"><i></i></div>
    ${ADIMLAR.map((a, i) => `<div class="ilerleme-adim ${i < adim ? 'tamam' : ''} ${i === adim - 1 ? 'simdi' : ''}"><span></span><em>${a}</em></div>`).join('')}
  </div>`;
}

function kart(t, yon) {
  const gelen = yon === 'gelen';
  const kisiAd = gelen ? t.isteyenAd : t.sahipAd;
  const kisiFoto = gelen ? t.isteyenFoto : t.sahipFoto;
  let eylem = '';
  let bilgi = '';

  if (gelen) {
    if (t.durum === 'bekliyor') {
      eylem = `<button class="dugme ikincil" data-e="reddet">Reddet</button><button class="dugme ana" data-e="kabul">${ikon('tik', 18)}<span>Kabul et</span></button>`;
    } else if (t.durum === 'kabul') {
      bilgi = `<div class="ipucu">${ikon('paket', 18)}<span>Kitabı paketle ve <b>karşı ödemeli</b> olarak kargoya ver. Ardından takip numarasını gir.</span></div>`;
      eylem = `<button class="dugme ikincil" data-e="vazgec">Vazgeç</button><button class="dugme ana" data-e="kargola">${ikon('kargo', 18)}<span>Kargoya verdim</span></button>`;
    } else if (t.durum === 'kargoda') {
      bilgi = kargoBilgi(t);
    } else if (t.durum === 'teslim') {
      bilgi = `<div class="ipucu yesil">${ikon('el', 18)}<span>Kitabın yeni okuruna ulaştı. Paylaştığın için teşekkürler!</span></div>`;
    }
  } else {
    if (t.durum === 'bekliyor') {
      bilgi = `<div class="ipucu">${ikon('saat', 18)}<span>${h(t.sahipAd.split(' ')[0])} talebini henüz görmedi ya da değerlendiriyor.</span></div>`;
      eylem = `<button class="dugme hayalet" data-e="iptal">Talebi geri çek</button>`;
    } else if (t.durum === 'kabul') {
      bilgi = `<div class="ipucu">${ikon('tik', 18)}<span>Harika! Kitabın paketleniyor. Kargoya verilince takip numarası burada görünecek.</span></div>`;
    } else if (t.durum === 'kargoda') {
      bilgi = kargoBilgi(t);
      eylem = `<button class="dugme ana genis" data-e="teslim">${ikon('teslim', 18)}<span>Teslim aldım</span></button>`;
    } else if (t.durum === 'teslim') {
      bilgi = `<div class="ipucu yesil">${ikon('kitap', 18)}<span>İyi okumalar! Bitirince sen de rafına ekleyip zinciri sürdürebilirsin.</span></div>`;
    }
  }

  return `<article class="talep-kart durum-${t.durum}" data-id="${h(t.id)}">
    <div class="talep-ust">
      <a class="talep-kapak" data-git="kitap/${h(t.kitapId)}">${kapak({ ad: t.kitapAd, yazar: t.kitapYazar, foto: t.kitapFoto }, 'mini')}</a>
      <div class="talep-bilgi">
        ${durumRozeti(t.durum)}
        <b>${h(t.kitapAd)}</b>
        <div class="talep-kisi">${avatar(kisiAd, kisiFoto, 22)}<span>${gelen ? `<b>${h(kisiAd)}</b> istiyor` : `<b>${h(kisiAd)}</b> rafından`}${gelen && t.isteyenSehir ? ` · ${h(t.isteyenSehir)}` : ''}</span></div>
        <span class="talep-zaman">${zamanOnce(t.guncelleme)}</span>
      </div>
    </div>
    ${t.not && gelen ? `<p class="talep-not">“${h(t.not)}”</p>` : ''}
    ${ilerleme(t.durum)}
    ${bilgi}
    ${eylem ? `<div class="talep-eylem">${eylem}</div>` : ''}
  </article>`;
}

function kargoBilgi(t) {
  if (!t.kargo) return '';
  return `<div class="kargo-kutu">
    <div>${ikon('kargo', 22)}</div>
    <div><span>${h(t.kargo.firma)}</span><b>${h(t.kargo.takipNo)}</b></div>
    <button class="yuvarlak kucuk" data-e="kopyala" aria-label="Takip numarasını kopyala">${ikon('kopya', 16)}</button>
  </div>`;
}

export function takasEkrani(kok, { sorgu }) {
  let sekme = sorgu.sekme === 'giden' ? 'giden' : (durum.gelen.some((t) => t.durum === 'bekliyor') || !durum.giden.length ? 'gelen' : 'giden');
  let arsiv = false;

  const ciz = () => {
    const liste = sekme === 'gelen' ? durum.gelen : durum.giden;
    const aktif = liste.filter((t) => TALEP_DURUM[t.durum].adim && t.durum !== 'teslim');
    const biten = liste.filter((t) => !aktif.includes(t));
    const bekleyenGelen = durum.gelen.filter((t) => t.durum === 'bekliyor').length;
    const kargodaGiden = durum.giden.filter((t) => t.durum === 'kargoda').length;

    kok.innerHTML = `
      <header class="sayfa-bas"><h1>Takas</h1><p>Kitapların yolculuğunu buradan yönet.</p></header>
      <div class="sekme-anahtar" style="--i:${sekme === 'gelen' ? 0 : 1}">
        <i class="sekme-anahtar-kaydirici"></i>
        <button data-s="gelen" class="${sekme === 'gelen' ? 'secili' : ''}">${ikon('gelen', 18)}<span>Gelen</span>${bekleyenGelen ? `<em>${bekleyenGelen}</em>` : ''}</button>
        <button data-s="giden" class="${sekme === 'giden' ? 'secili' : ''}">${ikon('gonder', 18)}<span>İsteklerim</span>${kargodaGiden ? `<em>${kargodaGiden}</em>` : ''}</button>
      </div>
      <div class="talep-liste">
        ${aktif.length ? aktif.map((t) => kart(t, sekme)).join('') : sekme === 'gelen'
    ? bosDurum('gelen', 'Henüz talep yok', 'Rafına kitap ekledikçe okurlar seni bulacak. Ne kadar çok kitap, o kadar çok kitapdaş!', '<button class="dugme ana" data-git="ekle">Kitap ekle</button>')
    : bosDurum('kitap', 'Henüz bir kitap istemedin', 'Rafları gez, gözüne kestirdiğin kitabı iste. Kitap ücretsiz, kargo karşı ödemeli.', '<button class="dugme ana" data-git="kesfet">Keşfet</button>')}
      </div>
      ${biten.length ? `<button class="arsiv-dugme" id="t-arsiv">${arsiv ? 'Geçmişi gizle' : `Geçmiş takaslar (${biten.length})`} ${ikon('sag', 16)}</button>
        ${arsiv ? `<div class="talep-liste soluk">${biten.map((t) => kart(t, sekme)).join('')}</div>` : ''}` : ''}
    `;
  };

  kok.addEventListener('click', async (e) => {
    const s = e.target.closest('[data-s]');
    if (s) {
      sekme = s.dataset.s;
      history.replaceState(null, '', `#/takas?sekme=${sekme}`);
      titret();
      return ciz();
    }
    if (e.target.closest('#t-arsiv')) { arsiv = !arsiv; return ciz(); }
    const b = e.target.closest('[data-e]');
    if (!b) return;
    const id = b.closest('[data-id]').dataset.id;
    const t = [...durum.gelen, ...durum.giden].find((x) => x.id === id);
    if (t) eylemYap(b, b.dataset.e, t);
  });

  ciz();
  return { guncelle: (n) => { if (n === 'talepler') { const y = kok.scrollTop; ciz(); kok.scrollTop = y; } } };
}

async function eylemYap(b, eylem, t) {
  const calistir = async (is, basari) => {
    yukleniyor(b, true);
    try {
      await is();
      if (basari) toast(basari, 'basari');
      titret('orta');
      return true;
    } catch (err) {
      toast(hataMetni(err), 'hata');
      if (b.isConnected) yukleniyor(b, false);
      return false;
    }
  };
  switch (eylem) {
    case 'kabul': {
      const digerleri = durum.gelen.filter((x) => x.kitapId === t.kitapId && x.id !== t.id && x.durum === 'bekliyor');
      const ek = digerleri.length ? ` Bu kitap için gelen diğer ${digerleri.length} talep otomatik olarak reddedilecek.` : '';
      if (!(await onayla('Talebi kabul et', `"${t.kitapAd}" kitabını ${t.isteyenAd} adlı okura karşı ödemeli kargoyla göndereceksin.${ek}`, { evet: 'Kabul et' }))) return;
      if (await calistir(() => api.talepKabul(t, digerleri), 'Talep kabul edildi. Adres bilgisi açıldı.')) adresSayfasi(t);
      return;
    }
    case 'reddet':
      if (!(await onayla('Talep reddedilsin mi?', `${t.isteyenAd} adlı okurun talebi reddedilecek.`, { evet: 'Reddet', tehlike: true }))) return;
      return calistir(() => api.talepReddet(t), 'Talep reddedildi.');
    case 'vazgec':
      if (!(await onayla('Takastan vazgeç', 'Kitap yeniden rafta herkese açık olacak ve talep reddedilmiş sayılacak.', { evet: 'Vazgeç', hayir: 'Kapat', tehlike: true }))) return;
      return calistir(() => api.talepGeriCek(t), 'Kitap yeniden rafta.');
    case 'iptal':
      if (!(await onayla('Talep geri çekilsin mi?', 'Kitabın sahibine talebinin iptal edildiği görünecek.', { evet: 'Geri çek', tehlike: true }))) return;
      return calistir(() => api.talepIptal(t), 'Talebin geri çekildi.');
    case 'kargola':
      return kargoSayfasi(t);
    case 'teslim':
      if (!(await onayla('Kitabı teslim aldın mı?', 'Kargo ücretini ödeyip kitabı teslim aldıysan onayla.', { evet: 'Evet, aldım' }))) return;
      return calistir(() => api.teslimAldim(t), 'İyi okumalar! 📖');
    case 'kopyala':
      try { await navigator.clipboard.writeText(t.kargo.takipNo); toast('Takip numarası kopyalandı.', 'basari'); } catch { toast(t.kargo.takipNo); }
  }
}

async function adresGoster(t) {
  try {
    return await api.talepAdresi(t.id);
  } catch (e) {
    toast(hataMetni(e), 'hata');
    return null;
  }
}

function adresKutusu(a) {
  if (!a) return '<p class="sheet-metin">Adres bilgisi alınamadı.</p>';
  return `<div class="adres-kutu">
    <div class="adres-ust">${ikon('konum', 18)}<b>${h(a.adSoyad)}</b></div>
    <p>${h(a.acikAdres)}<br/>${h(a.ilce)} / ${h(a.il)}</p>
    <p class="adres-tel">${h(a.telefon)}</p>
    <button type="button" class="dugme ikincil kucuk" id="adres-kopya">${ikon('kopya', 16)}<span>Adresi kopyala</span></button>
  </div>`;
}
function adresKopyaBagla(kok, a) {
  $('#adres-kopya', kok)?.addEventListener('click', async () => {
    const metin = `${a.adSoyad}\n${a.acikAdres}\n${a.ilce} / ${a.il}\nTel: ${a.telefon}`;
    try { await navigator.clipboard.writeText(metin); toast('Adres kopyalandı.', 'basari'); } catch {}
  });
}

async function adresSayfasi(t) {
  const a = await adresGoster(t);
  const s = sayfaAc(`
    <h3 class="sheet-baslik">Gönderim adresi</h3>
    <p class="sheet-metin">"${h(t.kitapAd)}" kitabını bu adrese <b>karşı ödemeli</b> olarak gönder. Kargo ücretini alıcı öder.</p>
    ${adresKutusu(a)}
    <button class="dugme ana genis" data-kapat>Tamam</button>`);
  if (a) adresKopyaBagla(s.el, a);
}

async function kargoSayfasi(t) {
  const a = await adresGoster(t);
  const s = sayfaAc(`
    <h3 class="sheet-baslik">Kargoya verdim</h3>
    <p class="sheet-metin">Gönderiyi <b>karşı ödemeli</b> olarak oluşturduğundan emin ol. Takip numarası alıcıya iletilecek.</p>
    ${adresKutusu(a)}
    <form class="form" id="k-form" novalidate>
      <label class="alan"><span>Kargo firması</span><select name="firma" required><option value="">Seç</option>${KARGO_FIRMALARI.map((k) => `<option>${k}</option>`).join('')}</select></label>
      <label class="alan"><span>Takip / gönderi numarası</span><input name="takip" inputmode="text" autocomplete="off" placeholder="Ör. 1234567890" required/></label>
      <button class="dugme ana genis buyuk" type="submit">${ikon('kargo', 20)}<span>Gönderildi olarak işaretle</span></button>
    </form>`, { sinif: 'uzun' });
  if (a) adresKopyaBagla(s.el, a);
  const f = $('#k-form', s.el);
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const firma = f.firma.value;
    const takip = f.takip.value.trim();
    if (!firma) return toast('Kargo firmasını seç.', 'hata');
    if (takip.length < 4) return toast('Takip numarasını yaz.', 'hata');
    const b = $('button[type=submit]', f);
    yukleniyor(b, true);
    try {
      await api.kargola(t, firma, takip);
      titret('guclu');
      await s.kapat();
      toast('Kitap yola çıktı! 🚚', 'basari');
      gecisReklami();
    } catch (err) {
      toast(hataMetni(err), 'hata');
      yukleniyor(b, false);
    }
  });
}

