import { createApp } from 'vue';
import App from './App.vue';
import customUse from './use';

const app = createApp(App);
customUse(app);
app.mount('#app');

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('Service worker registration failed:', err);
    });
  });
}
