// Profil kurulumu (ilk girişte) ve düzenleme
import { durum, degisti } from '../durum.js';
import { api } from '../veri/index.js';
import { h, ikon, avatar, $, toast, hataMetni, yukleniyor, titret } from '../ui.js';
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
      <div class="profil-duzen-avatar">${avatar(p.ad, p.foto, 84)}</div>
      <label class="alan"><span>Adın</span><input name="ad" maxlength="40" value="${h(p.ad || '')}" autocomplete="name" required/></label>
      <label class="alan"><span>Şehrin</span><select name="sehir" required><option value="">Şehrini seç</option>${ILLER.map((i) => `<option ${i === p.sehir ? 'selected' : ''}>${i}</option>`).join('')}</select></label>
      <label class="alan"><span>Okur olarak sen <em>(isteğe bağlı)</em></span><textarea name="hakkinda" rows="3" maxlength="160" placeholder="Ör. Distopya ve Türk klasikleri tutkunu. Kedili bir evden kitap gönderiyorum 🐈">${h(p.hakkinda || '')}</textarea></label>
      <button class="dugme ana genis buyuk" type="submit">${ilk ? `${ikon('parilti', 20)}<span>Başlayalım</span>` : 'Kaydet'}</button>
    </form>`;

  const f = $('#p-form', kok);
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const yeni = { ad: f.ad.value.trim(), sehir: f.sehir.value, hakkinda: f.hakkinda.value.trim(), foto: p.foto || '' };
    if (yeni.ad.length < 2) return toast('Adını yazmalısın.', 'hata');
    if (!yeni.sehir) return toast('Şehrini seç.', 'hata');
    const b = $('button[type=submit]', f);
    yukleniyor(b, true);
    try {
      await api.profilKaydet(durum.kullanici.uid, ilk ? { ...yeni, olusturma: Date.now() } : yeni);
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
