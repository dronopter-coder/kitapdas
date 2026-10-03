// Android bildirim sesini üretir: kaynak/okudum_bildirim.wav (uygulama içi "gelen" tınısının aynısı).
// Çalıştır: node kaynak/bildirim-sesi.mjs
import { writeFileSync } from 'node:fs';

const HZ = 44100;
const SURE = 1.9;
const notalar = [[1318.51, 0, 0.6, 0.45], [1567.98, 0.12, 0.6, 0.4], [2093, 0.24, 1.1, 0.35]];
const n = Math.round(HZ * SURE);
const kuru = new Float32Array(n);
for (const [f, bas, sure, duzey] of notalar) {
  const i0 = Math.round(bas * HZ);
  for (let i = 0; i < sure * HZ && i0 + i < n; i++) {
    const t = i / HZ;
    const atak = Math.min(1, t / 0.012);
    const zarf = duzey * atak * Math.exp((Math.log(0.0001 / duzey) * t) / sure);
    const s = Math.sin(2 * Math.PI * f * t) + 0.28 * Math.sin(4 * Math.PI * f * t) + 0.08 * Math.sin(6 * Math.PI * f * t);
    kuru[i0 + i] += zarf * s;
  }
}
// Yankı (0,13 sn gecikme, 0,22 geri besleme)
const d = Math.round(0.13 * HZ);
const yankili = new Float32Array(n);
for (let i = 0; i < n; i++) yankili[i] = kuru[i] + (i >= d ? 0.22 * (yankili[i - d]) + 0 : 0);
let tepe = 0;
for (const v of yankili) tepe = Math.max(tepe, Math.abs(v));
const pcm = Buffer.alloc(n * 2);
for (let i = 0; i < n; i++) {
  const son = i > n - 2000 ? (n - i) / 2000 : 1; // sonda yumuşak kapanış
  pcm.writeInt16LE(Math.round((yankili[i] / tepe) * 0.8 * son * 32767), i * 2);
}
const bas = Buffer.alloc(44);
bas.write('RIFF', 0); bas.writeUInt32LE(36 + pcm.length, 4); bas.write('WAVE', 8);
bas.write('fmt ', 12); bas.writeUInt32LE(16, 16); bas.writeUInt16LE(1, 20); bas.writeUInt16LE(1, 22);
bas.writeUInt32LE(HZ, 24); bas.writeUInt32LE(HZ * 2, 28); bas.writeUInt16LE(2, 32); bas.writeUInt16LE(16, 34);
bas.write('data', 36); bas.writeUInt32LE(pcm.length, 40);
writeFileSync(new URL('./okudum_bildirim.wav', import.meta.url), Buffer.concat([bas, pcm]));
console.log('okudum_bildirim.wav yazıldı');
