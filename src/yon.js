// Basit hash yönlendirici + uygulamanın kendi sayfa yığını.
// Telefonun geri tuşu da, ekrandaki geri düğmesi de aynı yığını kullanır (WebView geçmişine güvenilmez).
let rotala = () => {};
const yigin = []; // önceki sayfaların adresleri

export function rotalayiciAyarla(f) { rotala = f; }

export function git(yol, { degistir = false } = {}) {
  const hedef = '#/' + yol.replace(/^#?\/?/, '');
  if (location.hash === hedef && !degistir) return rotala();
  if (degistir) history.replaceState(null, '', hedef);
  else {
    yigin.push(location.hash || '#/kesfet');
    history.pushState(null, '', hedef);
  }
  rotala();
}

// Bir önceki sayfaya dön; yığın boşsa yedek sayfaya git.
export function geri(yedek = 'kesfet') {
  const onceki = yigin.pop();
  if (onceki) {
    history.replaceState(null, '', onceki);
    rotala();
  } else git(yedek, { degistir: true });
}

export const yiginiSifirla = () => { yigin.length = 0; };
// Tarayıcının geri düğmesi (web) kullanıldığında yığın da aynı adımı atsın.
export const tarayiciGeriGitti = () => { yigin.pop(); };
