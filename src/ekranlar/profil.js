// Profil: kişisel kart, istatistikler, rafım, ayarlar
import { durum } from '../durum.js';
import { api, demoMu } from '../veri/index.js';
import { h, ikon, avatar, $, sayfaAc, onayla, toast, hataMetni } from '../ui.js';
import { kitapKarti, bosDurum, LOGO_ISARET } from './ortak.js';
import { git } from '../yon.js';

export function profilEkrani(kok) {
  let filtre = 'rafta';

  const ciz = () => {
    const p = durum.profil;
    const benim = durum.kitaplar.filter((k) => k.sahipId === durum.kullanici.uid);
    const rafta = benim.filter((k) => k.durum !== 'verildi');
    const verdim = benim.filter((k) => k.durum === 'verildi');
    const aldim = durum.giden.filter((t) => t.durum === 'teslim').length;
    const liste = filtre === 'rafta' ? rafta : verdim;
    const unvan = verdim.length >= 10 ? 'Kitap Elçisi' : verdim.length >= 3 ? 'Cömert Okur' : benim.length ? 'Kitapdaş' : 'Yeni Kitapdaş';

    kok.innerHTML = `
    <section class="profil-kahraman">
      <div class="profil-desen" aria-hidden="true">${LOGO_ISARET}</div>
      <div class="profil-avatar">${avatar(p.ad, p.foto, 88)}</div>
      <h1>${h(p.ad)}</h1>
      <p class="profil-alt">${ikon('konum', 15)} ${h(p.sehir)} · <span class="unvan">${unvan}</span></p>
      ${p.hakkinda ? `<p class="profil-hakkinda">${h(p.hakkinda)}</p>` : ''}
      <div class="istatistik">
        <div><b>${rafta.length}</b><span>Rafımda</span></div>
        <div><b>${verdim.length}</b><span>Paylaştım</span></div>
        <div><b>${aldim}</b><span>Aldım</span></div>
      </div>
    </section>

    <section class="bolum">
      <div class="bolum-bas">
        <h2>Rafım</h2>
        <div class="mini-anahtar">
          <button data-f="rafta" class="${filtre === 'rafta' ? 'secili' : ''}">Rafta</button>
          <button data-f="verdim" class="${filtre === 'verdim' ? 'secili' : ''}">Paylaştıklarım</button>
        </div>
      </div>
      ${liste.length ? `<div class="izgara">${liste.map((k) => kitapKarti(k)).join('')}</div>`
    : filtre === 'rafta'
      ? bosDurum('raf', 'Rafın boş', 'Okuyup bitirdiğin bir kitabı ekle; başka birinin hayatına dokunsun.', '<button class="dugme ana" data-git="ekle">İlk kitabını ekle</button>')
      : bosDurum('el', 'Henüz paylaşım yok', 'Kargoya verdiğin kitaplar burada birikir.')}
    </section>

    <section class="ayar-liste">
      <button data-git="profil-duzenle">${ikon('kalem', 20)}<span>Profili düzenle</span>${ikon('sag', 18)}</button>
      <button id="p-nasil">${ikon('soru', 20)}<span>Kitapdaş nasıl çalışır?</span>${ikon('sag', 18)}</button>
      <button id="p-kurallar">${ikon('kalkan', 20)}<span>Topluluk kuralları</span>${ikon('sag', 18)}</button>
      <a href="https://dronopter-coder.github.io/kitapdas/gizlilik.html" target="_blank" rel="noopener">${ikon('kilit', 20)}<span>Gizlilik politikası</span>${ikon('sag', 18)}</a>
      <button id="p-cikis" class="tehlike">${ikon('cikis', 20)}<span>Çıkış yap</span></button>
    </section>
    <p class="surum">Kitapdaş 1.0${demoMu ? ' · demo modu' : ''}<br/>${h(durum.kullanici.eposta || '')}</p>`;

    kok.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => { filtre = b.dataset.f; ciz(); }));
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
    <h3 class="sheet-baslik">Kitapdaş nasıl çalışır?</h3>
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
