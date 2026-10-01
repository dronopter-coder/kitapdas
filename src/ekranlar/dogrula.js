// E-posta doğrulama: e-posta ile kaydolan kullanıcı, bağlantıya tıklayana kadar uygulamaya giremez.
import { api, demoMu } from '../veri/index.js';
import { durum } from '../durum.js';
import { h, ikon, $, toast, hataMetni, yukleniyor, onayla } from '../ui.js';
import { logo } from './ortak.js';

const BEKLEME = 60; // tekrar gönderme aralığı (sn)

export function dogrulaEkrani(kok) {
  const eposta = durum.kullanici?.eposta || '';
  let kalan = BEKLEME;
  kok.innerHTML = `
    <header class="hosgeldin-bas">${logo()}</header>
    <section class="dogrula">
      <div class="dogrula-ikon">${ikon('posta', 38, 1.8)}</div>
      <h1>E-postanı doğrula</h1>
      <p><b>${h(eposta)}</b> adresine bir doğrulama bağlantısı gönderdik. Bağlantıya tıkla, sonra buraya dönüp aşağıdaki düğmeye bas.</p>
      ${demoMu
    ? `<div class="uyari-kutu yumusak">${ikon('parilti', 20)}<p><b>Demo modu:</b> gerçek e-posta gönderilmez. "Doğruladım" düğmesi bağlantıya tıklanmış gibi davranır.</p></div>`
    : `<div class="uyari-kutu">${ikon('bilgi', 20)}<p>E-posta birkaç dakika içinde gelmezse <b>Spam / Gereksiz</b> klasörüne bak.</p></div>`}
      <button class="dugme ana genis buyuk" id="d-kontrol">${ikon('tik', 20)}<span>Doğruladım, devam et</span></button>
      <button class="dugme ikincil genis" id="d-tekrar" disabled>Tekrar gönder (${kalan})</button>
      <button class="dugme hayalet genis" id="d-cikis">Farklı bir hesapla giriş yap</button>
    </section>`;

  const tekrar = $('#d-tekrar', kok);
  const say = setInterval(() => {
    kalan--;
    if (!tekrar.isConnected) return clearInterval(say);
    if (kalan > 0) tekrar.textContent = `Tekrar gönder (${kalan})`;
    else { tekrar.textContent = 'Tekrar gönder'; tekrar.disabled = false; }
  }, 1000);

  const kontrol = async (sessiz) => {
    const b = $('#d-kontrol', kok);
    if (!b) return;
    if (!sessiz) yukleniyor(b, true);
    try {
      const k = await api.dogrulamaKontrol();
      // Doğrulandıysa oturum dinleyicisi uygulamayı açar; değilse bilgi ver.
      if (!k?.dogrulandi && !sessiz) toast('E-postan henüz doğrulanmamış. Bağlantıya tıkladığından emin ol.', 'hata');
    } catch (e) {
      if (!sessiz) toast(hataMetni(e), 'hata');
    } finally {
      if (!sessiz && b.isConnected) yukleniyor(b, false);
    }
  };

  $('#d-kontrol', kok).addEventListener('click', () => kontrol(false));
  tekrar.addEventListener('click', async () => {
    yukleniyor(tekrar, true);
    try {
      await api.dogrulamaGonder();
      toast('Doğrulama bağlantısı yeniden gönderildi.', 'basari');
      kalan = BEKLEME;
      yukleniyor(tekrar, false);
      tekrar.disabled = true;
    } catch (e) {
      toast(hataMetni(e), 'hata');
      yukleniyor(tekrar, false);
    }
  });
  $('#d-cikis', kok).addEventListener('click', async () => {
    if (await onayla('Çıkış yapılsın mı?', 'Başka bir hesapla giriş yapabilir ya da yeniden kaydolabilirsin.', { evet: 'Çıkış yap' })) api.cikis();
  });

  // Kullanıcı e-posta uygulamasından geri döndüğünde kendiliğinden kontrol et.
  const donus = () => { if (document.visibilityState === 'visible' && !demoMu) kontrol(true); };
  document.addEventListener('visibilitychange', donus);
  return { temizle: () => { clearInterval(say); document.removeEventListener('visibilitychange', donus); } };
}
