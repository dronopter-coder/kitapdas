// Profil kurulumu (ilk girişte) ve düzenleme
import { durum, degisti } from '../durum.js';
import { api } from '../veri/index.js';
import { h, ikon, avatar, $, toast, hataMetni, yukleniyor, titret, fotoKare } from '../ui.js';
import { fotoAl } from '../foto.js';
import { ILLER } from '../sabitler.js';
import { ustBar, logo } from './ortak.js';
import { git, geri } from '../yon.js';
import { nasilCalisir } from './profil.js';

export function profilDuzenleEkrani(kok, { sorgu }) {
  const ilk = sorgu.ilk === '1';
  const p = durum.profil;
  kok.innerHTML = `
    ${ilk ? `<header class="hosgeldin-bas">${logo()}<h1>Hoş geldin${p.ad ? `, ${h(p.ad.split(' ')[0])}` : ''}!</h1><p>Son bir adım: seni tanıyalım. Şehrin, sana yakın kitapları göstermemize yardım eder.</p></header>` : ustBar('Profili düzenle')}
    <form class="form" id="p-form" novalidate>
      <div class="profil-foto-alan">
        <button type="button" class="profil-foto-dugme" id="p-foto" aria-label="Profil fotoğrafını değiştir">
          <span id="p-avatar">${avatar(p.ad, p.foto, 104)}</span>
          <i class="foto-rozet">${ikon('kamera', 18, 2.2)}</i>
        </button>
        <div class="foto-secenek">
          <button type="button" class="baglanti" id="p-cek">Fotoğraf çek</button>
          <span>·</span>
          <button type="button" class="baglanti" id="p-galeri">Galeriden seç</button>
          <span id="p-kaldir-kap" ${p.foto ? '' : 'hidden'}>·</span>
          <button type="button" class="baglanti koyu" id="p-kaldir" ${p.foto ? '' : 'hidden'}>Kaldır</button>
        </div>
        <input type="file" accept="image/*" id="p-dosya" hidden/>
      </div>
      <label class="alan"><span>Adın</span><input name="ad" maxlength="40" value="${h(p.ad || '')}" autocomplete="name" required/></label>
      <label class="alan"><span>Şehrin</span><select name="sehir" required><option value="">Şehrini seç</option>${ILLER.map((i) => `<option ${i === p.sehir ? 'selected' : ''}>${i}</option>`).join('')}</select></label>
      <label class="alan"><span>Okur olarak sen <em>(isteğe bağlı)</em></span><textarea name="hakkinda" rows="3" maxlength="160" placeholder="Ör. Distopya ve Türk klasikleri tutkunu. Kedili bir evden kitap gönderiyorum 🐈">${h(p.hakkinda || '')}</textarea></label>
      <button class="dugme ana genis buyuk" type="submit">${ilk ? `${ikon('parilti', 20)}<span>Başlayalım</span>` : 'Kaydet'}</button>
    </form>`;

  const f = $('#p-form', kok);
  let foto = p.foto || '';
  let fotoDegisti = false;
  const avatarCiz = () => {
    $('#p-avatar', kok).innerHTML = avatar(f.ad.value.trim() || p.ad, foto, 104);
    for (const id of ['#p-kaldir', '#p-kaldir-kap']) $(id, kok).hidden = !foto;
  };
  const fotoSec = async (kaynak) => {
    try {
      const yol = await fotoAl(kaynak, $('#p-dosya', kok));
      if (!yol) return;
      foto = await fotoKare(yol, 144, 0.75);
      fotoDegisti = true;
      avatarCiz();
      titret();
    } catch (e) {
      toast('Fotoğraf alınamadı: ' + (e?.message || ''), 'hata');
    }
  };
  $('#p-foto', kok).addEventListener('click', () => fotoSec('galeri'));
  $('#p-galeri', kok).addEventListener('click', () => fotoSec('galeri'));
  $('#p-cek', kok).addEventListener('click', () => fotoSec('kamera'));
  $('#p-kaldir', kok).addEventListener('click', () => { foto = ''; fotoDegisti = true; avatarCiz(); });
  f.ad.addEventListener('input', () => { if (!foto) avatarCiz(); }); // fotoğraf yokken baş harf adla birlikte değişsin
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const yeni = { ad: f.ad.value.trim(), sehir: f.sehir.value, hakkinda: f.hakkinda.value.trim(), foto };
    // Google fotoğrafı yerine kendi fotoğrafını ya da "fotoğrafsız" tercihini hatırla
    if (fotoDegisti) yeni.fotoKaldirildi = !foto;
    if (yeni.ad.length < 2) return toast('Adını yazmalısın.', 'hata');
    if (!yeni.sehir) return toast('Şehrini seç.', 'hata');
    const b = $('button[type=submit]', f);
    yukleniyor(b, true);
    try {
      await api.profilKaydet(durum.kullanici.uid, ilk ? { ...yeni, olusturma: Date.now() } : yeni, durum.kitaplar.filter((k) => k.sahipId === durum.kullanici.uid));
      durum.profil = { ...p, ...yeni };
      degisti('profil');
      titret('orta');
      if (ilk) {
        git('kesfet', { degistir: true });
        setTimeout(nasilCalisir, 500);
      } else {
        toast('Profilin güncellendi.', 'basari');
        geri('profil');
      }
    } catch (err) {
      toast(hataMetni(err), 'hata');
      yukleniyor(b, false);
    }
  });
}
