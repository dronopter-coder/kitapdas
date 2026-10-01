// Basit hash yönlendirici yardımcıları (ekranlar main.js'i içe aktarmadan gezinebilsin diye ayrı).
let rotala = () => {};
let derinlik = 0;

export function rotalayiciAyarla(f) { rotala = f; }

export function git(yol, { degistir = false } = {}) {
  const hedef = '#/' + yol.replace(/^#?\/?/, '');
  if (location.hash === hedef && !degistir) return rotala();
  if (degistir) history.replaceState(null, '', hedef);
  else { history.pushState(null, '', hedef); derinlik++; }
  rotala();
}

export function geri(yedek = 'kesfet') {
  if (derinlik > 0) history.back(); // derinlik popstate'te azaltılır
  else git(yedek, { degistir: true });
}

export function geriSayildi() { if (derinlik > 0) derinlik--; }
