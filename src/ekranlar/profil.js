// Profil: kişisel kart, istatistikler, rafım, ayarlar
import { durum } from '../durum.js';
import { api, demoMu } from '../veri/index.js';
import { h, ikon, avatar, kapak, $, sayfaAc, onayla, toast, hataMetni, titret, zamanOnce } from '../ui.js';
import { kitapKarti, bosDurum, LOGO_ISARET } from './ortak.js';
import { git } from '../yon.js';

export function profilEkrani(kok) {
  let bolum = 'rafta'; // rafta | paylastim | aldim — üstteki sayılara dokununca değişir

  // Paylaştıklarım / Aldıklarım satırı: kitap, karşı taraf, durum
  const satir = (t, yon) => {
    const gelen = yon === 'gelen';
    const kisiAd = gelen ? t.isteyenAd : t.sahipAd;
    const kisiFoto = gelen ? t.isteyenFoto : t.sahipFoto;
    const ulasti = t.durum === 'teslim';
    return `<li class="${ulasti ? 'ulasti' : 'yolda'}" data-git="kitap/${h(t.kitapId)}">
      <div class="gunluk-kapak">${kapak({ ad: t.kitapAd, yazar: t.kitapYazar || '', foto: t.kitapFoto }, 'mini')}</div>
      <div class="gunluk-bilgi">
        <b>${h(t.kitapAd)}</b>
        <span class="kisi-ok">${avatar(kisiAd, kisiFoto, 20)}<span>${gelen ? 'Gönderdiğin okur:' : 'Gönderen:'} <b>${h(kisiAd)}</b>${gelen && t.isteyenSehir ? ` · ${h(t.isteyenSehir)}` : ''}</span></span>
        <span class="gunluk-meta">${zamanOnce(t.guncelleme)}</span>
      </div>
      <span class="gunluk-durum">${ulasti ? `${ikon('tik', 14, 2.6)} Ulaştı` : `${ikon('kargo', 14)} Yolda`}</span>
    </li>`;
  };

  const ciz = () => {
    const p = durum.profil;
    const benim = durum.kitaplar.filter((k) => k.sahipId === durum.kullanici.uid);
    const rafta = benim.filter((k) => k.durum !== 'verildi');
    const paylasilan = durum.gelen.filter((t) => ['kargoda', 'teslim'].includes(t.durum));
    const alinan = durum.giden.filter((t) => t.durum === 'teslim');
    const unvan = paylasilan.length >= 10 ? 'Kitap Elçisi' : paylasilan.length >= 3 ? 'Cömert Okur' : benim.length ? 'Okur' : 'Yeni Okur';
    const ist = (id, sayi, ad) => `<button class="ist ${bolum === id ? 'secili' : ''}" data-b="${id}" aria-pressed="${bolum === id}"><b>${sayi}</b><span>${ad}</span></button>`;

    const baslik = { rafta: 'Rafım', paylastim: 'Paylaştıklarım', aldim: 'Aldıklarım' }[bolum];
    const sayac = { rafta: rafta.length, paylastim: paylasilan.length, aldim: alinan.length }[bolum];
    let icerik;
    if (bolum === 'rafta') {
      icerik = rafta.length ? `<div class="izgara">${rafta.map((k) => kitapKarti(k)).join('')}</div>`
        : bosDurum('raf', 'Rafın boş', 'Okuyup bitirdiğin bir kitabı ekle; başka birinin hayatına dokunsun.', '<button class="dugme ana" data-git="ekle">İlk kitabını ekle</button>');
    } else if (bolum === 'paylastim') {
      icerik = paylasilan.length ? `<ol class="gunluk duz">${paylasilan.map((t) => satir(t, 'gelen')).join('')}</ol>`
        : bosDurum('el', 'Henüz paylaşım yok', 'Kargoya verdiğin kitaplar, kime gittikleriyle burada birikir.');
    } else {
      icerik = alinan.length ? `<ol class="gunluk duz">${alinan.map((t) => satir(t, 'giden')).join('')}</ol>`
        : bosDurum('kitap', 'Henüz kitap almadın', 'Teslim aldığın kitaplar, kimden geldikleriyle burada görünür.', '<button class="dugme ana" data-git="kesfet">Kitap keşfet</button>');
    }

    kok.innerHTML = `
    <section class="profil-kahraman">
      <div class="profil-desen" aria-hidden="true">${LOGO_ISARET}</div>
      <button class="profil-avatar" data-git="profil-duzenle" aria-label="Profil fotoğrafını değiştir">${avatar(p.ad, p.foto, 88)}<i class="foto-rozet">${ikon('kamera', 15, 2.2)}</i></button>
      <h1>${h(p.ad)}</h1>
      <p class="profil-alt">${ikon('konum', 15)} ${h(p.sehir)} · <span class="unvan">${unvan}</span></p>
      ${p.hakkinda ? `<p class="profil-hakkinda">${h(p.hakkinda)}</p>` : ''}
      <div class="istatistik">
        ${ist('rafta', rafta.length, 'Rafımda')}
        ${ist('paylastim', paylasilan.length, 'Paylaştım')}
        ${ist('aldim', alinan.length, 'Aldım')}
      </div>
    </section>

    <section class="bolum">
      <div class="bolum-bas"><h2>${baslik}</h2><span class="sayac">${sayac} kitap</span></div>
      ${icerik}
    </section>

    <section class="ayar-liste">
      <button data-git="yildizlar">${ikon('kupa', 20)}<span>Ayın yıldızları</span>${ikon('sag', 18)}</button>
      <button data-git="profil-duzenle">${ikon('kalem', 20)}<span>Profili düzenle</span>${ikon('sag', 18)}</button>
      <button id="p-nasil">${ikon('soru', 20)}<span>Okudum nasıl çalışır?</span>${ikon('sag', 18)}</button>
      <button id="p-kurallar">${ikon('kalkan', 20)}<span>Topluluk kuralları</span>${ikon('sag', 18)}</button>
      <a href="https://dronopter-coder.github.io/okudum/gizlilik.html" target="_blank" rel="noopener">${ikon('kilit', 20)}<span>Gizlilik politikası</span>${ikon('sag', 18)}</a>
      <button id="p-cikis" class="tehlike">${ikon('cikis', 20)}<span>Çıkış yap</span></button>
    </section>
    <p class="surum">Okudum 1.0${demoMu ? ' · demo modu' : ''}<br/>${h(durum.kullanici.eposta || '')}</p>`;

    kok.querySelectorAll('[data-b]').forEach((b) => b.addEventListener('click', () => { bolum = b.dataset.b; titret(); ciz(); }));
    $('#p-nasil', kok).addEventListener('click', nasilCalisir);
    $('#p-kurallar', kok).addEventListener('click', kurallar);
    $('#p-cikis', kok).addEventListener('click', async () => {
      if (!(await onayla('Çıkış yapılsın mı?', 'Rafın ve takasların hesabında güvende kalır.', { evet: 'Çıkış yap' }))) return;
      try { await api.cikis(); git('giris', { degistir: true }); } catch (e) { toast(hataMetni(e), 'hata'); }
    });
  };
  ciz();
  return { guncelle: () => { const y = kok.scrollTop; ciz(); kok.scrollTop = y; } };
}

export function nasilCalisir() {
  const adim = (i, ik, b, m) => `<li><i class="nc-ikon">${ikon(ik, 22)}</i><div><b>${i}. ${b}</b><p>${m}</p></div></li>`;
  sayfaAc(`
    <h3 class="sheet-baslik">Okudum nasıl çalışır?</h3>
    <ol class="nasil-liste">
      ${adim(1, 'kamera', 'Rafını paylaş', 'Okuyup bitirdiğin kitabın fotoğrafını çek, adını ve yazarını yaz. Kitabın artık herkesin rafında.')}
      ${adim(2, 'kitap', 'İste', 'Okumak istediğin bir kitap gördüğünde teslimat adresinle birlikte talep gönder.')}
      ${adim(3, 'tik', 'Onayla', 'Kitabın sahibi talebi kabul eder; adresin yalnızca bu adımdan sonra ona görünür.')}
      ${adim(4, 'kargo', 'Karşı ödemeli kargo', 'Sahibi kitabı karşı ödemeli kargoya verir ve takip numarasını girer. Kitap ücretsizdir; alıcı yalnızca kargo ücretini öder.')}
      ${adim(5, 'el', 'Zinciri sürdür', 'Kitabı bitirdiğinde sen de rafına ekle, yolculuğu devam etsin.')}
    </ol>
    <button class="dugme ana genis" data-kapat>Anladım</button>`, { sinif: 'uzun' });
}

function kurallar() {
  sayfaAc(`
    <h3 class="sheet-baslik">Topluluk kuralları</h3>
    <ul class="kural-liste">
      <li>${ikon('tik', 18)}<span>Kitaplar <b>ücretsiz</b> paylaşılır; kitap için ücret istenmez. Alıcı yalnızca kargo ücretini öder.</span></li>
      <li>${ikon('tik', 18)}<span>Kitabın durumunu dürüstçe belirt; eksik sayfa ya da hasar varsa notta yaz.</span></li>
      <li>${ikon('tik', 18)}<span>Kabul ettiğin talebi birkaç gün içinde kargoya ver.</span></li>
      <li>${ikon('tik', 18)}<span>Karşı ödemeli gönderiyi teslim almamak göndereni mağdur eder; istediğin kitabı mutlaka teslim al.</span></li>
      <li>${ikon('tik', 18)}<span>Paylaştığın adres ve telefon bilgisini başka amaçla kullanma.</span></li>
    </ul>
    <button class="dugme ana genis" data-kapat>Tamam</button>`, { sinif: 'uzun' });
}
