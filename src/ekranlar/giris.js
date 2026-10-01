// Karşılama + giriş/kayıt ekranı
import { api, demoMu } from '../veri/index.js';
import { ikon, $, kapak, GOOGLE_LOGO, sayfaAc, toast, hataMetni, yukleniyor, titret } from '../ui.js';
import { logo } from './ortak.js';

const VITRIN = [
  { ad: 'Kürk Mantolu Madonna', yazar: 'Sabahattin Ali' },
  { ad: 'Tutunamayanlar', yazar: 'Oğuz Atay' },
  { ad: 'Dune', yazar: 'Frank Herbert' },
  { ad: 'Küçük Prens', yazar: 'Saint-Exupéry' },
  { ad: 'Çalıkuşu', yazar: 'Reşat Nuri' },
  { ad: '1984', yazar: 'George Orwell' },
  { ad: 'Sapiens', yazar: 'Y. N. Harari' },
];

export function girisEkrani(kok) {
  kok.innerHTML = `
  <section class="karsilama">
    <div class="karsilama-raf" aria-hidden="true">
      ${VITRIN.map((k, i) => `<div class="ucan-kitap u${i}">${kapak(k)}</div>`).join('')}
    </div>
    <div class="karsilama-alt">
      ${logo('acik')}
      <h1 class="karsilama-baslik">Okuduğun kitap,<br/><em>yeni okuruna</em> yol alsın.</h1>
      <p class="karsilama-metin">Rafında bekleyen kitapları paylaş, merak ettiklerini iste. Kitap ücretsiz — kargo karşı ödemeli.</p>
      <button class="dugme google" id="g-google">${GOOGLE_LOGO}<span>Google ile devam et</span></button>
      <button class="dugme cam" id="g-eposta">${ikon('posta', 20)}<span>E-posta ile devam et</span></button>
      ${demoMu ? `<p class="demo-not">${ikon('parilti', 14)} Demo modu: veriler yalnızca bu cihazda tutulur.</p>` : ''}
      <p class="yasal">Devam ederek <a href="https://dronopter-coder.github.io/kitapdas/gizlilik.html" target="_blank" rel="noopener">gizlilik politikasını</a> kabul etmiş olursun.</p>
    </div>
  </section>`;

  $('#g-google', kok).addEventListener('click', async (e) => {
    const b = e.currentTarget;
    titret('orta');
    yukleniyor(b, true);
    try {
      await api.googleIleGiris();
    } catch (err) {
      toast(hataMetni(err), 'hata');
    } finally {
      if (b.isConnected) yukleniyor(b, false);
    }
  });
  $('#g-eposta', kok).addEventListener('click', () => epostaSayfasi('giris'));
}

function epostaSayfasi(mod) {
  const kayit = mod === 'kayit';
  const s = sayfaAc(`
    <h3 class="sheet-baslik">${kayit ? 'Aramıza katıl' : 'Tekrar hoş geldin'}</h3>
    <p class="sheet-metin">${kayit ? 'Bir dakikada hesabını oluştur, rafını paylaşmaya başla.' : 'E-posta adresin ve şifrenle giriş yap.'}</p>
    <form class="form" id="f-eposta" novalidate>
      ${kayit ? `<label class="alan"><span>Adın</span><input name="ad" autocomplete="name" placeholder="Ör. Elif Yılmaz" required/></label>` : ''}
      <label class="alan"><span>E-posta</span><input name="eposta" type="email" autocomplete="email" inputmode="email" placeholder="ornek@posta.com" required/></label>
      <label class="alan sifre"><span>Şifre</span><input name="sifre" type="password" autocomplete="${kayit ? 'new-password' : 'current-password'}" placeholder="${kayit ? 'En az 6 karakter' : '••••••'}" required/>
        <button type="button" class="goz" aria-label="Şifreyi göster">${ikon('goz', 18)}</button></label>
      ${kayit ? '' : '<button type="button" class="baglanti sag" id="f-unuttum">Şifremi unuttum</button>'}
      <button class="dugme ana genis" type="submit">${kayit ? 'Hesabımı oluştur' : 'Giriş yap'}</button>
    </form>
    <p class="sheet-alt">${kayit ? 'Zaten hesabın var mı?' : 'Hesabın yok mu?'} <button class="baglanti" id="f-degis">${kayit ? 'Giriş yap' : 'Kayıt ol'}</button></p>
  `);
  const f = $('#f-eposta', s.el);
  $('.goz', f).addEventListener('click', (e) => {
    const i = f.sifre;
    i.type = i.type === 'password' ? 'text' : 'password';
    e.currentTarget.innerHTML = ikon(i.type === 'password' ? 'goz' : 'gozKapali', 18);
  });
  $('#f-degis', s.el).addEventListener('click', async () => { await s.kapat(); epostaSayfasi(kayit ? 'giris' : 'kayit'); });
  $('#f-unuttum', s.el)?.addEventListener('click', async () => {
    const eposta = f.eposta.value.trim();
    if (!eposta) return toast('Önce e-posta adresini yaz.', 'hata');
    try {
      await api.sifreSifirla(eposta);
      toast('Şifre sıfırlama bağlantısı gönderildi.', 'basari');
    } catch (err) { toast(hataMetni(err), 'hata'); }
  });
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const b = $('button[type=submit]', f);
    const ad = f.ad?.value.trim();
    const eposta = f.eposta.value.trim();
    const sifre = f.sifre.value;
    if (kayit && ad.length < 2) return toast('Adını yazmalısın.', 'hata');
    if (!/^\S+@\S+\.\S+$/.test(eposta)) return toast('Geçerli bir e-posta yaz.', 'hata');
    yukleniyor(b, true);
    try {
      if (kayit) await api.epostaKayit(ad, eposta, sifre);
      else await api.epostaGiris(eposta, sifre);
      s.kapat();
    } catch (err) {
      toast(hataMetni(err), 'hata');
      yukleniyor(b, false);
    }
  });
}
