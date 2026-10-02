// Firebase arka ucu: Authentication (Google + e-posta) ve Firestore (veri + küçültülmüş kitap fotoğrafları).
// Ücretsiz Spark paketinde kalmak için Cloud Storage kullanılmaz. Kurallar: ../../firebase/firestore.rules
import { initializeApp } from 'firebase/app';
import {
  initializeAuth, getAuth, indexedDBLocalPersistence, onIdTokenChanged, GoogleAuthProvider,
  signInWithCredential, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendPasswordResetEmail, sendEmailVerification, updateProfile, signOut, reload,
} from 'firebase/auth';
import {
  initializeFirestore, persistentLocalCache, collection, doc, getDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy, limit, writeBatch,
} from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

let auth, db;

export function baslat(ayar) {
  const app = initializeApp(ayar);
  auth = Capacitor.isNativePlatform()
    ? initializeAuth(app, { persistence: indexedDBLocalPersistence })
    : getAuth(app);
  db = initializeFirestore(app, { localCache: persistentLocalCache() });
  auth.languageCode = 'tr'; // doğrulama ve şifre sıfırlama e-postaları Türkçe gelsin
}

// Google ile girenlerin e-postası Google tarafından doğrulanmıştır; e-posta ile kaydolanlar bağlantıya tıklamalıdır.
const kullaniciDonustur = (u) => u && {
  uid: u.uid, ad: u.displayName || '', eposta: u.email || '', foto: u.photoURL || '',
  dogrulandi: u.emailVerified || u.providerData.some((p) => p.providerId === 'google.com'),
};

export function oturumuDinle(cb) {
  // onIdTokenChanged: e-posta doğrulandıktan sonra jeton yenilenince de haber verir.
  return onIdTokenChanged(auth, (u) => cb(kullaniciDonustur(u)));
}

export async function googleIleGiris() {
  if (Capacitor.isNativePlatform()) {
    // Yerel Google hesap seçici → kimlik jetonu → web SDK oturumu
    // Klasik Google hesap seçici: telefondaki hesaplar listelenir, kullanıcı hangisiyle gireceğini seçer.
    await FirebaseAuthentication.signOut().catch(() => {});
    const s = await FirebaseAuthentication.signInWithGoogle({
      useCredentialManager: false,
      customParameters: [{ key: 'prompt', value: 'select_account' }],
    });
    const kimlik = GoogleAuthProvider.credential(s.credential?.idToken, s.credential?.accessToken);
    await signInWithCredential(auth, kimlik);
  } else {
    const saglayici = new GoogleAuthProvider();
    saglayici.setCustomParameters({ prompt: 'select_account' }); // her seferinde hesap seçtir
    await signInWithPopup(auth, saglayici);
  }
}

export async function epostaKayit(ad, eposta, sifre) {
  const s = await createUserWithEmailAndPassword(auth, eposta, sifre);
  await updateProfile(s.user, { displayName: ad });
  await sendEmailVerification(s.user);
  return kullaniciDonustur(s.user);
}
export const epostaGiris = (eposta, sifre) => signInWithEmailAndPassword(auth, eposta, sifre);
export const sifreSifirla = (eposta) => sendPasswordResetEmail(auth, eposta);
export const dogrulamaGonder = () => sendEmailVerification(auth.currentUser);

// Bağlantıya tıklanıp tıklanmadığını sunucudan sorar; doğrulandıysa jetonu yeniler (kurallar email_verified ister).
export async function dogrulamaKontrol() {
  const u = auth.currentUser;
  if (!u) return null;
  await reload(u);
  if (u.emailVerified) await u.getIdToken(true);
  return kullaniciDonustur(u);
}

export async function cikis() {
  if (Capacitor.isNativePlatform()) await FirebaseAuthentication.signOut().catch(() => {});
  await signOut(auth);
}

// ——— Profil ———
export async function profilGetir(uid) {
  const s = await getDoc(doc(db, 'kullanicilar', uid));
  return s.exists() ? s.data() : null;
}
export const profilKaydet = (uid, veri) => setDoc(doc(db, 'kullanicilar', uid), veri, { merge: true });

// Kayıtlı teslimat adresi yalnızca sahibinin okuyabildiği alt belgede durur.
export async function adresimiGetir(uid) {
  const s = await getDoc(doc(db, 'kullanicilar', uid, 'ozel', 'adres'));
  return s.exists() ? s.data() : null;
}
export const adresimiKaydet = (uid, adres) => setDoc(doc(db, 'kullanicilar', uid, 'ozel', 'adres'), adres);

// ——— Kitaplar ———
const listele = (s) => s.docs.map((d) => ({ id: d.id, ...d.data() }));

export function kitaplariDinle(cb, hata) {
  const q = query(collection(db, 'kitaplar'), orderBy('olusturma', 'desc'), limit(250));
  return onSnapshot(q, (s) => cb(listele(s)), hata);
}

export async function kitapEkle(kullanici, profil, veri, fotoDataUrl) {
  const kitapRef = doc(collection(db, 'kitaplar'));
  // Fotoğraf, ekleme ekranında ~560 px JPEG'e küçültülür (≈40-80 KB) ve doğrudan belgeye yazılır.
  await setDoc(kitapRef, {
    ...veri,
    foto: fotoDataUrl || '',
    sahipId: kullanici.uid,
    sahipAd: profil.ad,
    sahipFoto: profil.foto || '',
    sehir: profil.sehir,
    durum: 'musait',
    olusturma: Date.now(),
  });
  return kitapRef.id;
}

export async function kitapSil(kitap) {
  await deleteDoc(doc(db, 'kitaplar', kitap.id));
}

// ——— Talepler ———
export function talepleriDinle(uid, cb, hata) {
  let gelen = [];
  let giden = [];
  const yay = () => cb({ gelen, giden });
  const c = collection(db, 'talepler');
  const k1 = onSnapshot(query(c, where('sahipId', '==', uid)), (s) => { gelen = listele(s); yay(); }, hata);
  const k2 = onSnapshot(query(c, where('isteyenId', '==', uid)), (s) => { giden = listele(s); yay(); }, hata);
  return () => { k1(); k2(); };
}

export async function talepOlustur(kullanici, profil, kitap, not, adres) {
  const talepRef = doc(collection(db, 'talepler'));
  const b = writeBatch(db);
  b.set(talepRef, {
    kitapId: kitap.id,
    kitapAd: kitap.ad,
    kitapYazar: kitap.yazar,
    kitapFoto: kitap.foto || '',
    sahipId: kitap.sahipId,
    sahipAd: kitap.sahipAd,
    sahipFoto: kitap.sahipFoto || '',
    isteyenId: kullanici.uid,
    isteyenAd: profil.ad,
    isteyenFoto: profil.foto || '',
    isteyenSehir: profil.sehir || '',
    not: not || '',
    durum: 'bekliyor',
    kargo: null,
    olusturma: Date.now(),
    guncelleme: Date.now(),
  });
  // Adres ayrı belgede: kitap sahibi bunu yalnızca talebi kabul ettikten sonra okuyabilir.
  b.set(doc(db, 'talepler', talepRef.id, 'gizli', 'adres'), adres);
  await b.commit();
  return talepRef.id;
}

export async function talepAdresi(talepId) {
  const s = await getDoc(doc(db, 'talepler', talepId, 'gizli', 'adres'));
  return s.exists() ? s.data() : null;
}

const talepRef = (id) => doc(db, 'talepler', id);
const kitapRef = (id) => doc(db, 'kitaplar', id);

export async function talepKabul(talep, digerBekleyenler) {
  const b = writeBatch(db);
  b.update(talepRef(talep.id), { durum: 'kabul', guncelleme: Date.now() });
  b.update(kitapRef(talep.kitapId), { durum: 'rezerve' });
  for (const t of digerBekleyenler) b.update(talepRef(t.id), { durum: 'red', guncelleme: Date.now() });
  await b.commit();
}
export const talepReddet = (talep) => writeBatch(db).update(talepRef(talep.id), { durum: 'red', guncelleme: Date.now() }).commit();
export const talepIptal = (talep) => writeBatch(db).update(talepRef(talep.id), { durum: 'iptal', guncelleme: Date.now() }).commit();

export async function talepGeriCek(talep) {
  const b = writeBatch(db);
  b.update(talepRef(talep.id), { durum: 'red', guncelleme: Date.now() });
  b.update(kitapRef(talep.kitapId), { durum: 'musait' });
  await b.commit();
}

// nereden: kitap sahibinin şehri. Kargoya verilince herkese açık, kişi bilgisi içermeyen bir "yolculuk" kaydı açılır
// (Haftanın yolculukları bölümü bunları gösterir).
export async function kargola(talep, firma, takipNo, nereden) {
  const b = writeBatch(db);
  b.update(talepRef(talep.id), { durum: 'kargoda', kargo: { firma, takipNo }, guncelleme: Date.now() });
  b.update(kitapRef(talep.kitapId), { durum: 'verildi' });
  if (nereden && talep.isteyenSehir) {
    b.set(doc(db, 'yolculuklar', talep.id), {
      kitapId: talep.kitapId, kitapAd: talep.kitapAd, kitapYazar: talep.kitapYazar || '', kitapFoto: talep.kitapFoto || '',
      nereden, nereye: talep.isteyenSehir, sahipId: talep.sahipId, isteyenId: talep.isteyenId,
      tarih: Date.now(), teslim: false,
    });
  }
  await b.commit();
}
export async function teslimAldim(talep) {
  await writeBatch(db).update(talepRef(talep.id), { durum: 'teslim', guncelleme: Date.now() }).commit();
  // Eski talepler için yolculuk kaydı olmayabilir; yoksa sessizce geç.
  await updateDoc(doc(db, 'yolculuklar', talep.id), { teslim: true, teslimTarih: Date.now() }).catch(() => {});
}

export function yolculuklariDinle(cb, hata) {
  const q = query(collection(db, 'yolculuklar'), orderBy('tarih', 'desc'), limit(80));
  return onSnapshot(q, (s) => cb(listele(s)), hata);
}
