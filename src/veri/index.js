// Arka uç seçimi: Firebase ayarı derlemeye gömülmüşse Firebase, değilse cihaz içi demo.
import * as firebase from './firebase.js';
import * as demo from './demo.js';

/* global __FIREBASE__ */
const AYAR = typeof __FIREBASE__ !== 'undefined' ? __FIREBASE__ : null;

export const demoMu = !AYAR;
export const api = AYAR ? firebase : demo;
api.baslat(AYAR);
