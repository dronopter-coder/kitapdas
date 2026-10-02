// Fotoğraf alma (kamera / galeri) — kitap ve profil fotoğrafı için ortak.
import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';

// kaynak: 'kamera' | 'galeri' → gösterilebilir adres (webPath / blob) ya da iptal edilirse null
export async function fotoAl(kaynak, dosyaGirisi) {
  try {
    if (Capacitor.isNativePlatform()) {
      if (kaynak === 'kamera') return (await Camera.takePhoto({ quality: 85, targetWidth: 1400, targetHeight: 1400, correctOrientation: true })).webPath || null;
      return (await Camera.chooseFromGallery({ limit: 1 })).results?.[0]?.webPath || null;
    }
    // Tarayıcı: gizli dosya girişini kullan
    return await new Promise((coz) => {
      if (kaynak === 'kamera') dosyaGirisi.setAttribute('capture', 'user'); else dosyaGirisi.removeAttribute('capture');
      dosyaGirisi.value = '';
      dosyaGirisi.onchange = () => coz(dosyaGirisi.files[0] ? URL.createObjectURL(dosyaGirisi.files[0]) : null);
      dosyaGirisi.click();
    });
  } catch (e) {
    if (/cancel/i.test(e?.message || '')) return null;
    throw e;
  }
}
