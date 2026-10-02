// Özet üretimini başlatan ortak akış (kitap ekleme ve detay ekranı kullanır).
import { durum, degisti } from './durum.js';
import { api } from './veri/index.js';
import { toast } from './ui.js';

// Dönüş: özet metni ya da null. sessiz: hata/boş sonuçta bildirim gösterme (kitap eklerken arka planda çalışır).
export async function ozetiHazirla(kitap, { sessiz = false } = {}) {
  if (durum.ozetHazirlaniyor.has(kitap.id)) return null;
  durum.ozetHazirlaniyor.add(kitap.id);
  degisti('kitaplar');
  try {
    const ozet = await api.ozetHazirla(kitap.id, kitap.ad, kitap.yazar);
    if (!ozet && !sessiz) toast('Bu kitabı yeterince tanımıyorum; özet yazmadım.', 'bilgi');
    return ozet;
  } catch (e) {
    console.warn('Özet hazırlanamadı', e);
    if (!sessiz) toast('Özet şu an hazırlanamadı. Biraz sonra tekrar dene.', 'hata');
    return null;
  } finally {
    durum.ozetHazirlaniyor.delete(kitap.id);
    degisti('kitaplar');
  }
}
