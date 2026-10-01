// Firebase arka ucu: Authentication (Google + e-posta), Firestore (veri), Storage (kitap fotoğrafları).
// Kurallar: ../../firebase/firestore.rules ve storage.rules
import { initializeApp } from 'firebase/app';
import {
  initializeAuth, getAuth, indexedDBLocalPersistence, onAuthStateChanged, GoogleAuthProvider,
  signInWithCredential, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendPasswordResetEmail, updateProfile, signOut,
} from 'firebase/auth';
import {
  initializeFirestore, persistentLocalCache, collection, doc, getDoc, setDoc, deleteDoc,
  onSnapshot, query, where, orderBy, limit, writeBatch,
} from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

let auth, db, depo;

export function baslat(ayar) {
  const app = initializeApp(ayar);
  auth = Capacitor.isNativePlatform()
    ? initializeAuth(app, { persistence: indexedDBLocalPersistence })
    : getAuth(app);
  db = initializeFirestore(app, { localCache: persistentLocalCache() });
  depo = getStorage(app);
}

const kullaniciDonustur = (u) => u && { uid: u.uid, ad: u.displayName || '', eposta: u.email || '', foto: u.photoURL || '' };

export function oturumuDinle(cb) {
  return onAuthStateChanged(auth, (u) => cb(kullaniciDonustur(u)));
}

export async function googleIleGiris() {
  if (Capacitor.isNativePlatform()) {
    // Yerel Google hesap seçici → kimlik jetonu → web SDK oturumu
    const s = await FirebaseAuthentication.signInWithGoogle();
    const kimlik = GoogleAuthProvider.credential(s.credential?.idToken, s.credential?.accessToken);
    await signInWithCredential(auth, kimlik);
  } else {
    await signInWithPopup(auth, new GoogleAuthProvider());
  }
}

export async function epostaKayit(ad, eposta, sifre) {
  const s = await createUserWithEmailAndPassword(auth, eposta, sifre);
  await updateProfile(s.user, { displayName: ad });
  return kullaniciDonustur({ ...s.user, displayName: ad });
}
export const epostaGiris = (eposta, sifre) => signInWithEmailAndPassword(auth, eposta, sifre);
export const sifreSifirla = (eposta) => sendPasswordResetEmail(auth, eposta);
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
  const q = query(collection(db, 'kitaplar'), orderBy('olusturma', 'desc'), limit(400));
  return onSnapshot(q, (s) => cb(listele(s)), hata);
}

export async function kitapEkle(kullanici, profil, veri, fotoDataUrl) {
  const kitapRef = doc(collection(db, 'kitaplar'));
  let foto = '';
  let fotoYol = '';
  if (fotoDataUrl) {
    fotoYol = `kitaplar/${kullanici.uid}/${kitapRef.id}.jpg`;
    const r = ref(depo, fotoYol);
    await uploadString(r, fotoDataUrl, 'data_url', { contentType: 'image/jpeg' });
    foto = await getDownloadURL(r);
  }
  await setDoc(kitapRef, {
    ...veri,
    foto,
    fotoYol,
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
  if (kitap.fotoYol) await deleteObject(ref(depo, kitap.fotoYol)).catch(() => {});
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

export async function kargola(talep, firma, takipNo) {
  const b = writeBatch(db);
  b.update(talepRef(talep.id), { durum: 'kargoda', kargo: { firma, takipNo }, guncelleme: Date.now() });
  b.update(kitapRef(talep.kitapId), { durum: 'verildi' });
  await b.commit();
}
export const teslimAldim = (talep) => writeBatch(db).update(talepRef(talep.id), { durum: 'teslim', guncelleme: Date.now() }).commit();
