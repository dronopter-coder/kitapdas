// Rafa kitap ekleme: fotoğraf, ad, yazar, tür, durum, not
import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { durum } from '../durum.js';
import { api } from '../veri/index.js';
import { h, ikon, $, $$, kapak, toast, hataMetni, yukleniyor, fotoKucult, titret, onayla } from '../ui.js';
import { KATEGORILER, KONDISYONLAR } from '../sabitler.js';
import { ustBar } from './ortak.js';
import { git } from '../yon.js';
import { gecisReklami } from '../reklam.js';
import { kapakOkunabilir, kapaktanOku } from '../kapakOku.js';

export function ekleEkrani(kok) {
  let foto = '';

  kok.innerHTML = `
    ${ustBar('Rafına kitap ekle')}
    <form class="form ekle-form" id="e-form" novalidate>
      <div class="foto-alan" id="e-foto">
        <div class="foto-onizleme" id="e-onizleme">
          <div class="foto-bos">
            <div class="foto-bos-ikon">${ikon('kamera', 30, 1.8)}</div>
            <b>Kitabın fotoğrafını ekle</b>
            <span>Kapağı net görünsün; okurlar kitabı görmeyi sever.</span>
          </div>
        </div>
        <div class="foto-dugmeler">
          <button type="button" class="dugme ikincil" id="e-cek">${ikon('kamera', 18)}<span>Fotoğraf çek</span></button>
          <button type="button" class="dugme ikincil" id="e-galeri">${ikon('resim', 18)}<span>Galeriden seç</span></button>
        </div>
        <input type="file" accept="image/*" id="e-dosya" hidden/>
        <div id="e-okuma" class="okuma-durum" hidden></div>
      </div>

      <label class="alan"><span>Kitabın adı</span><input name="ad" maxlength="120" placeholder="Ör. Kürk Mantolu Madonna" required/></label>
      <label class="alan"><span>Yazar</span><input name="yazar" maxlength="80" placeholder="Ör. Sabahattin Ali" required/></label>

      <div class="alan"><span>Tür</span>
        <div class="cip-bulutu" id="e-kat">${KATEGORILER.map((k) => `<button type="button" class="cip" data-v="${h(k)}">${h(k)}</button>`).join('')}</div>
      </div>

      <div class="alan"><span>Kitabın durumu</span>
        <div class="segment" id="e-kon">${KONDISYONLAR.map((k) => `<button type="button" data-v="${k.id}" style="--s:${k.renk}" class="${k.id === 'iyi' ? 'secili' : ''}">${h(k.ad)}</button>`).join('')}</div>
      </div>

      <label class="alan"><span>Okura notun <em>(isteğe bağlı)</em></span>
        <textarea name="aciklama" rows="3" maxlength="500" placeholder="Kitabın durumu, baskısı ya da sende bıraktığı iz…"></textarea></label>

      <div class="uyari-kutu yumusak">${ikon('kargo', 20)}<p>Kitabın istendiğinde talebi sen onaylarsın, sonra kitabı <b>karşı ödemeli</b> kargoya verirsin. Sana hiçbir masraf çıkmaz.</p></div>
      <button class="dugme ana genis buyuk" type="submit">${ikon('raf', 20)}<span>Rafa koy</span></button>
    </form>`;

  const f = $('#e-form', kok);
  const secim = { kategori: '', kondisyon: 'iyi' };

  const bosHal = $('#e-onizleme', kok).innerHTML;
  const onizle = () => {
    const ad = f.ad.value.trim() || 'Kitabın adı';
    const yazar = f.yazar.value.trim() || 'Yazar';
    $('#e-foto', kok).classList.toggle('dolu', !!foto);
    $('#e-onizleme', kok).innerHTML = foto
      ? `${kapak({ ad, yazar, foto }, 'onizleme')}<button type="button" class="foto-kaldir" aria-label="Fotoğrafı kaldır">${ikon('x', 18, 2.6)}</button>`
      : bosHal;
    $('.foto-kaldir', kok)?.addEventListener('click', () => { foto = ''; onizle(); });
  };

  const fotoAl = async (kaynak) => {
    try {
      let yol;
      let dosya;
      if (Capacitor.isNativePlatform()) {
        if (kaynak === 'kamera') {
          const r = await Camera.takePhoto({ quality: 85, targetWidth: 1400, targetHeight: 1400, correctOrientation: true });
          yol = r.webPath;
          dosya = r.uri;
        } else {
          const r = await Camera.chooseFromGallery({ limit: 1 });
          yol = r.results?.[0]?.webPath;
          dosya = r.results?.[0]?.uri;
        }
      } else {
        yol = await new Promise((coz) => {
          const d = $('#e-dosya', kok);
          if (kaynak === 'kamera') d.setAttribute('capture', 'environment'); else d.removeAttribute('capture');
          d.onchange = () => coz(d.files[0] ? URL.createObjectURL(d.files[0]) : null);
          d.click();
        });
      }
      if (!yol) return;
      foto = await fotoKucult(yol, 560, 0.75); // veritabanına sığacak boyut
      onizle();
      titret();
      if (dosya && kapakOkunabilir()) kapagiOku(dosya);
    } catch (e) {
      if (!/cancel/i.test(e?.message || '')) toast('Fotoğraf alınamadı: ' + (e?.message || ''), 'hata');
    }
  };

  // Kapaktaki yazıdan adı ve yazarı doldur; kullanıcının kendi yazdığı alanlara dokunma.
  const otomatik = { ad: '', yazar: '' };
  const kapagiOku = async (dosya) => {
    const durumEl = $('#e-okuma', kok);
    durumEl.hidden = false;
    durumEl.className = 'okuma-durum';
    durumEl.innerHTML = `<span class="donen koyu"></span><span>Kapak okunuyor…</span>`;
    try {
      const sonuc = await kapaktanOku(dosya);
      if (!durumEl.isConnected) return;
      if (!sonuc?.ad) {
        durumEl.innerHTML = `${ikon('bilgi', 18)}<span>Kapaktaki yazı okunamadı; adı ve yazarı elle yazabilirsin.</span>`;
        return;
      }
      for (const alan of ['ad', 'yazar']) {
        const giris = f[alan];
        const deger = sonuc[alan];
        if (deger && (!giris.value.trim() || giris.value === otomatik[alan])) {
          giris.value = deger;
          otomatik[alan] = deger;
          giris.classList.remove('vurgu'); void giris.offsetWidth; giris.classList.add('vurgu');
        }
      }
      onizle();
      titret('orta');
      durumEl.className = 'okuma-durum tamam';
      durumEl.innerHTML = `${ikon('parilti', 18)}<span>${sonuc.kaynak === 'katalog' ? 'Kapaktan okundu ve kitap kataloğunda bulundu.' : 'Kapaktan okundu.'} Doğru olduğunu kontrol et.</span>`;
    } catch (e) {
      if (durumEl.isConnected) durumEl.innerHTML = `${ikon('bilgi', 18)}<span>Kapak okunamadı; adı ve yazarı elle yazabilirsin.</span>`;
    }
  };

  $('#e-cek', kok).addEventListener('click', () => fotoAl('kamera'));
  $('#e-galeri', kok).addEventListener('click', () => fotoAl('galeri'));
  $('#e-onizleme', kok).addEventListener('click', (e) => { if (!foto && !e.target.closest('button')) fotoAl('galeri'); });
  f.ad.addEventListener('input', () => { if (foto) onizle(); });
  f.yazar.addEventListener('input', () => { if (foto) onizle(); });

  $('#e-kat', kok).addEventListener('click', (e) => {
    const c = e.target.closest('[data-v]');
    if (!c) return;
    secim.kategori = c.dataset.v;
    $$('#e-kat .cip', kok).forEach((x) => x.classList.toggle('secili', x === c));
    titret();
  });
  $('#e-kon', kok).addEventListener('click', (e) => {
    const c = e.target.closest('[data-v]');
    if (!c) return;
    secim.kondisyon = c.dataset.v;
    $$('#e-kon button', kok).forEach((x) => x.classList.toggle('secili', x === c));
    titret();
  });

  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ad = f.ad.value.trim();
    const yazar = f.yazar.value.trim();
    if (!ad) return toast('Kitabın adını yazmalısın.', 'hata');
    if (!yazar) return toast('Yazarın adını yazmalısın.', 'hata');
    if (!secim.kategori) return toast('Bir tür seç.', 'hata');
    if (!foto && !(await onayla('Fotoğrafsız eklensin mi?', 'Fotoğraflı kitaplar çok daha hızlı yeni okurunu buluyor. Fotoğrafsız eklersen kitaba özel bir kapak tasarlarız.', { evet: 'Fotoğrafsız ekle', hayir: 'Fotoğraf ekleyeceğim' }))) return;
    const b = $('button[type=submit]', f);
    yukleniyor(b, true);
    try {
      const id = await api.kitapEkle(durum.kullanici, durum.profil, {
        ad, yazar, kategori: secim.kategori, kondisyon: secim.kondisyon, aciklama: f.aciklama.value.trim(),
      }, foto);
      titret('guclu');
      toast('Kitabın rafta! Yeni okurunu bekliyor.', 'basari');
      git(`kitap/${id}`, { degistir: true });
      gecisReklami();
    } catch (err) {
      toast(hataMetni(err), 'hata');
      yukleniyor(b, false);
    }
  });

}
