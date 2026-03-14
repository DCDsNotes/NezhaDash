<template>
  <div
    ref="detailContainerRef"
    class="detail-container"
    :class="{
      'server--offline': info?.online !== 1,
      'is-loading': !info,
    }"
  >
    <div
      v-if="worldMapPosition === 'top' && allowWorldMap"
      class="world-map-box top-world-map"
    >
      <world-map
        v-if="info && showWorldMap"
        :width="worldMapWidth"
        :locations="locations"
      />
      <div
        v-else
        class="world-map-skeleton"
        :style="{
          width: worldMapWidth + 'px',
          height: worldMapHeight + 'px',
        }"
      />
    </div>

    <template v-if="info">
      <server-name
        :key="`${info.ID}_name`"
        :info="info"
      />
      <server-status-box
        :key="`${info.ID}_status`"
        :info="info"
      />
      <server-info-box
        :key="`${info.ID}_info`"
        :info="info"
      />
      <server-monitor
        :key="`${info.ID}_monitor`"
        :info="info"
      />
    </template>
    <template v-else>
      <div class="detail-skeleton-block detail-skeleton-block--name" />
      <div class="detail-skeleton-block detail-skeleton-block--status" />
      <div class="detail-skeleton-block detail-skeleton-block--info" />
      <div class="detail-skeleton-block detail-skeleton-block--monitor" />
    </template>
    <div
      v-if="worldMapPosition === 'bottom' && allowWorldMap"
      class="world-map-box bottom-world-map"
    >
      <world-map
        v-if="info && showWorldMap"
        :width="worldMapWidth"
        :locations="locations"
      />
      <div
        v-else
        class="world-map-skeleton"
        :style="{
          width: worldMapWidth + 'px',
          height: worldMapHeight + 'px',
        }"
      />
    </div>
  </div>
</template>

<script setup>
/**
 * 单节点详情
 */

import {
  ref,
  computed,
  onMounted,
  onUnmounted,
  nextTick,
  watch,
} from 'vue';
import {
  useStore,
} from 'vuex';
import {
  useRouter,
} from 'vue-router';

import config from '@/config';
import {
  alias2code,
  locationCode2Info,
} from '@/utils/world-map';
import pageTitle from '@/utils/page-title';

import WorldMap from '@/components/world-map/world-map.vue';
import ServerName from './components/server-detail/server-name.vue';
import ServerStatusBox from './components/server-detail/server-status-box.vue';
import ServerInfoBox from './components/server-detail/server-info-box.vue';
import ServerMonitor from './components/server-detail/server-monitor.vue';

const props = defineProps({
  serverKey: {
    type: String,
    default: null,
  },
});

const store = useStore();
const router = useRouter();

const detailContainerRef = ref(null);
function computeDetailContainerWidth() {
  const w = window.innerWidth;
  if (w <= 720) return w;
  if (w <= 800) return 720;
  if (w <= 1024) return 800;
  return 900;
}
const worldMapWidth = ref(Math.max(computeDetailContainerWidth() - 40, 300));
const info = computed(() => store.state?.serverMapByKey?.[props.serverKey]);
const dataInit = computed(() => store.state.init);

const locations = computed(() => {
  const arr = [];
  let aliasCode;
  let locationCode;
  if (info?.value?.PublicNote?.customData?.location) {
    aliasCode = info?.value?.PublicNote?.customData?.location;
    locationCode = info?.value?.PublicNote?.customData?.location;
  } else if (info?.value?.Host?.CountryCode) {
    aliasCode = info.value.Host.CountryCode.toUpperCase();
  }
  const code = alias2code(aliasCode) || locationCode;
  if (code) {
    const {
      x,
      y,
      name,
    } = locationCode2Info(code) || {};
    const xx = Number(x);
    const yy = Number(y);
    if (Number.isFinite(xx) && Number.isFinite(yy)) {
      arr.push({
        key: code,
        x: xx,
        y: yy,
        code,
        size: 4,
        label: `${name}`,
        servers: [info.value],
      });
    }
  }
  return arr;
});

const showWorldMap = computed(() => {
  if (config.nazhua?.hideWorldMap) {
    return false;
  }
  if (config.nazhua?.hideDetailWorldMap) {
    return false;
  }
  return true;
});

const allowWorldMap = computed(() => !(config.nazhua?.hideWorldMap || config.nazhua?.hideDetailWorldMap));

const worldMapPosition = computed(() => {
  if (Object.keys(config.nazhua).includes('detailWorldMapPosition')) {
    return config.nazhua.detailWorldMapPosition;
  }
  return 'top';
});

const worldMapHeight = computed(() => Math.ceil((621 / 1280) * (Number(worldMapWidth.value) || 0)));

function handleWorldMapWidth() {
  const containerWidth = detailContainerRef.value?.clientWidth;
  const width = Number(containerWidth);
  if (!Number.isFinite(width) || width <= 0) {
    worldMapWidth.value = 900;
    return;
  }
  worldMapWidth.value = Math.max(
    Math.min(
      width - 40,
      window.innerWidth - 40,
      1280,
    ),
    300, // 防止奇葩情况
  );
}

watch(() => info.value, async (newValue, oldValue) => {
  if (!oldValue && newValue && router.currentRoute.value.name === 'ServerDetail') {
    pageTitle(newValue?.Name);
    await nextTick();
    handleWorldMapWidth();
  }
});

watch(() => dataInit.value, () => {
  if (dataInit.value && !info.value) {
    router.replace({
      name: 'Home',
    });
  }
});

onMounted(() => {
  if (info.value) {
    pageTitle(info.value?.Name);
    nextTick(() => {
      handleWorldMapWidth();
    });
  }
  window.addEventListener('resize', handleWorldMapWidth);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleWorldMapWidth);
});
</script>

<style lang="scss" scoped>
.detail-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: var(--detail-container-width);
  padding: 20px;
  margin: auto;
  min-height: calc(100vh - var(--layout-header-height) - 80px);

  &.server--offline {
    filter: grayscale(1);
  }
}

.world-map-box {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.world-map-skeleton {
  background: transparent;
  border: none;
  box-shadow: none;
}

@keyframes shimmer {
  0% { transform: translateX(-60%); }
  100% { transform: translateX(60%); }
}

.detail-skeleton-block {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  box-shadow: 0 2px 6px rgba(#000, 0.25);
  overflow: hidden;
  position: relative;
}

.detail-skeleton-block::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.10) 45%,
    rgba(255, 255, 255, 0.14) 50%,
    rgba(255, 255, 255, 0.10) 55%,
    transparent 100%
  );
  transform: translateX(-60%);
  animation: shimmer 1.2s ease-in-out infinite;
}

.detail-skeleton-block--name {
  height: 56px;
}

.detail-skeleton-block--status {
  height: 170px;
}

.detail-skeleton-block--info {
  height: 320px;
}

.detail-skeleton-block--monitor {
  height: 420px;
}
</style>
