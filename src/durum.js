// Uygulama durumu (tek kaynak) ve basit abonelik sistemi.
export const durum = {
  kullanici: null, // { uid, ad, eposta, foto }
  profil: null, // { ad, sehir, foto, hakkinda }
  kitaplar: [],
  kitaplarHazir: false,
  gelen: [],
  giden: [],
  yolculuklar: [], // herkese açık kargo rotaları (Haftanın yolculukları)
  ozetHazirlaniyor: new Set(), // yapay zekâ özeti üretilen kitap kimlikleri
};

const aboneler = new Set();
export function abone(cb) {
  aboneler.add(cb);
  return () => aboneler.delete(cb);
}
export function degisti(neler) {
  aboneler.forEach((cb) => cb(neler));
}

export const benimMi = (kitap) => kitap.sahipId === durum.kullanici?.uid;
export const kitapBul = (id) => durum.kitaplar.find((k) => k.id === id);
