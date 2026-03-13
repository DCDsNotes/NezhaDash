<template>
  <layout-main>
    <router-view v-slot="{ Component }">
      <keep-alive>
        <component :is="Component" />
      </keep-alive>
    </router-view>
  </layout-main>
</template>

<script setup>
import {
  ref,
  computed,
  watch,
  provide,
  onMounted,
  onUnmounted,
} from 'vue';
import { useStore } from 'vuex';
import { useRoute } from 'vue-router';
import config, {
  init as initConfig,
} from '@/config';
import LayoutMain from './layout/main.vue';

import { WS_CONNECTION_STATUS } from './ws/service';
import activeWebsocketService, {
  wsService,
  restart,
  msg,
} from './ws';

const store = useStore();
const route = useRoute();

const currentTime = ref(0);

provide('currentTime', currentTime);

/**
 * 刷新当前时间
 */
let currentTimeTimer = null;
function startCurrentTime() {
  currentTime.value = Date.now();
  if (currentTimeTimer) {
    clearInterval(currentTimeTimer);
  }
  currentTimeTimer = setInterval(() => {
    currentTime.value = Date.now();
  }, 1000);
}

// 是否为Windows系统
const isWindows = /windows|win32/i.test(navigator.userAgent);
if (isWindows) {
  document.body.classList.add('windows');
}
// 是否加载Sarasa Term SC字体
const loadSarasaTermSC = computed(() => config.nazhua.disableSarasaTermSC !== true);
watch(loadSarasaTermSC, (value) => {
  if (value) {
    document.body.classList.add('sarasa-term-sc');
  } else {
    document.body.classList.remove('sarasa-term-sc');
  }
}, {
  immediate: true,
});

/**
 * websocket断连的自动重连
 */
let isReconnectLocked = false;
const delay = (ms) => new Promise((resolve) => {
  const wait = Math.max(30, Number(ms) || 0);
  setTimeout(resolve, wait);
});
async function scheduleWebSocketReconnect() {
  if (isReconnectLocked) {
    return;
  }
  isReconnectLocked = true;
  await delay(1000);
  activeWebsocketService();
  isReconnectLocked = false;
}

onMounted(async () => {
  startCurrentTime();

  await initConfig();

  /**
   * 初始化服务器信息
   */
  await store.dispatch('initServerInfo', {
    route,
  });

  /**
   * 初始化WS重连维护
   */
  msg.on('close', () => {
    scheduleWebSocketReconnect();
  });
  msg.on('error', () => {
    isReconnectLocked = true;
  });
  msg.on('connect', () => {
    store.dispatch('watchWsMsg');
  });
  const handleFocus = () => {
    // ws在离开焦点后出现断连，尝试重新连接
    // 仅针对已关闭状态进行重连
    if (wsService.connected === WS_CONNECTION_STATUS.CLOSED) {
      restart();
    }
  };
  window.addEventListener('focus', handleFocus);
  /**
   * 激活websocket服务
   */
  activeWebsocketService();

  onUnmounted(() => {
    if (currentTimeTimer) {
      clearInterval(currentTimeTimer);
      currentTimeTimer = null;
    }
    window.removeEventListener('focus', handleFocus);
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('未处理的rejection:', event.reason);
  event.preventDefault();
});
</script>
