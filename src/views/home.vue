<template>
  <div
    class="index-container"
    :class="indexContainerClass"
  >
    <div class="scroll-container">
      <div
        v-if="worldMapPosition === 'top' && showWorldMap"
        class="world-map-box top-world-map"
      >
        <world-map
          :locations="serverLocations || []"
          :width="worldMapWidth"
        />
      </div>
      <div
        v-if="showFilter"
        class="filter-group"
      >
        <div class="left-box">
          <server-option-box
            v-if="showTag && serverGroupOptions.length"
            v-model="filterFormData.tag"
            :options="serverGroupOptions"
          />
        </div>
        <div class="right-box">
          <server-option-box
            v-if="onlineOptions.length"
            v-model="filterFormData.online"
            :options="onlineOptions"
          />
          <server-sort-box
            v-if="showSort"
            v-model="sortData"
            :options="sortOptions"
          />
        </div>
      </div>
      <!-- 卡片模式 -->
      <server-list-wrap
        :show-transition="showTransition"
      >
        <server-card-item
          v-for="item in filterServerList.list"
          :key="item.ID"
          :info="item"
        />
      </server-list-wrap>
      <div
        v-if="worldMapPosition === 'bottom' && showWorldMap"
        class="world-map-box bottom-world-map"
      >
        <world-map
          :locations="serverLocations || []"
          :width="worldMapWidth"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 首页
 */

import {
  ref,
  provide,
  computed,
  onMounted,
  onUnmounted,
  onActivated,
  onDeactivated,
  nextTick,
  watch,
} from 'vue';
import {
  useStore,
} from 'vuex';

import config from '@/config';
import {
  alias2code,
  locationCode2Info,
  count2size,
} from '@/utils/world-map';
import uuid from '@/utils/uuid';
import validate from '@/utils/validate';

import WorldMap from '@/components/world-map/world-map.vue';
import ServerOptionBox from './components/server-list/server-option-box.vue';
import ServerSortBox from './components/server-list/server-sort-box.vue';
import ServerListWrap from './components/server-list/server-list-wrap.vue';
import ServerCardItem from './components/server-list/card/server-list-item.vue';

import {
  serverSortOptions,
  serverSortHandler,
} from './composable/server-sort';

const store = useStore();
function computeListContainerWidth() {
  const w = window.innerWidth;
  if (w <= 720) return w;
  if (w <= 800) return 720;
  if (w <= 1024) return 800;
  if (w <= 1280) return 1024;
  if (w <= 1440) return 1120;
  return 1300;
}
const worldMapWidth = ref(Math.max(computeListContainerWidth() - 40, 300));

const showTransition = computed(() => {
  // 安卓设备不开启 -> 部分安卓浏览器渲染动画会卡顿
  if (window.navigator.userAgent.includes('Android')) {
    return false;
  }
  // 服务器数量小于7时，不开启
  return store.state.serverList.length < 7;
});

const indexContainerClass = computed(() => ({
  'list-is--card': true,
}));

const showFilter = computed(() => true);
const filterFormData = ref({
  tag: '',
  online: '',
});
// 是否显示标签
const showTag = computed(() => true);

// 服务器列表
const serverList = computed(() => store.state.serverList);
// 服务器总数
const serverCount = computed(() => store.state.serverCount);
// 分组标签
const serverGroupOptions = computed(() => {
  const options = [];
  store.state.serverGroup.forEach((i) => {
    if (i.servers && i.servers.length > 0) {
      options.push({
        key: uuid(),
        label: i.name,
        value: i.name,
        title: `${i.servers.length}台`,
      });
    }
  });
  return options;
});

const onlineOptions = computed(() => {
  if (serverCount.value?.total !== serverCount.value?.online) {
    return [{
      key: 'online',
      label: '在线',
      value: '1',
      title: `${serverCount.value.online}台`,
    }, {
      key: 'offline',
      label: '离线',
      value: '-1',
      title: `${serverCount.value.offline}台`,
    }];
  }
  return [];
});

/**
 * 筛选离线时，离线数量变为0时，自动清空在线筛选
 */
watch(() => serverCount.value, () => {
  if (filterFormData.value.online === '-1' && serverCount.value.offline === 0) {
    filterFormData.value.online = '';
  }
  if (filterFormData.value.online === '1' && serverCount.value.online === 0) {
    filterFormData.value.online = '';
  }
}, {
  immediate: true,
});

/**
 * 排序处理
 */
const showSort = computed(() => true);
const sortData = ref({
  prop: 'DisplayIndex',
  order: 'desc',
});
const sortOptions = computed(() => serverSortOptions());

const filterServerList = computed(() => {
  const fields = {};
  const locationMap = {};

  const list = serverList.value.filter((i) => {
    const isFilterArr = [];
    if (filterFormData.value.tag) {
      const group = store.state.serverGroup.find((o) => o.name === filterFormData.value.tag);
      isFilterArr.push((group?.servers || []).includes(i.ID));
    }
    if (filterFormData.value.online) {
      isFilterArr.push(i.online === (filterFormData.value.online * 1));
    }
    const status = isFilterArr.length ? isFilterArr.every((o) => o) : true;
    if (!status) {
      return false;
    }

    // 判断是否有字段
    if (i.PublicNote) {
      const {
        billingDataMod,
        planDataMod,
        customData,
      } = i.PublicNote;
      if (validate.isSet(billingDataMod?.amount)) {
        fields.billing = true;
      }
      if (validate.isSet(billingDataMod?.endDate)) {
        fields.remainingTime = true;
      }
      if (validate.isSet(planDataMod?.bandwidth)) {
        fields.bandwidth = true;
      }
      if (validate.isSet(customData?.orderLink) && config.nazhua.hideListItemLink !== true) {
        fields.orderLink = true;
      }
    }

    // 位置
    if (i.online === 1) {
      let aliasCode;
      let locationCode;
      if (i?.PublicNote?.customData?.location) {
        aliasCode = i.PublicNote.customData.location;
        locationCode = i.PublicNote.customData.location;
      } else if (i?.Host?.CountryCode) {
        aliasCode = i.Host.CountryCode.toUpperCase();
      }
      const code = alias2code(aliasCode) || locationCode;
      if (code) {
        if (!locationMap[code]) {
          locationMap[code] = [];
        }
        locationMap[code].push(i);
      }
    }

    return true;
  });
  list.sort((a, b) => serverSortHandler(a, b, sortData.value.prop, sortData.value.order));
  return {
    fields,
    list,
    locationMap,
  };
});
provide('filterServerList', filterServerList);

/**
 * 解构服务器列表的位置数据
 */
const serverLocations = computed(() => {
  const locations = [];
  Object.entries(filterServerList.value.locationMap).forEach(([code, servers]) => {
    const {
      x,
      y,
      name,
    } = locationCode2Info(code) || {};
    if (x && y) {
      locations.push({
        key: code,
        x,
        y,
        code,
        size: count2size(servers.length),
        label: `${name},${servers.length}台`,
        servers,
      });
    }
  });
  return locations;
});

const showWorldMap = computed(() => {
  if (config.nazhua?.hideWorldMap) {
    return false;
  }
  if (config.nazhua?.hideHomeWorldMap) {
    return false;
  }
  if (serverList.value.length > 0 && serverLocations.value.length === 0) {
    return false;
  }
  return true;
});

const worldMapPosition = computed(() => {
  if (Object.keys(config.nazhua).includes('homeWorldMapPosition')) {
    return config.nazhua.homeWorldMapPosition;
  }
  return 'top';
});

/**
 * 处理窗口大小变化
 */
function handleResize() {
  const serverListContainer = document.querySelector('.server-list-container');
  if (serverListContainer) {
    worldMapWidth.value = serverListContainer.clientWidth - 40;
  }
}

onMounted(() => {
  handleResize();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

const scrollPosition = ref(0);

onDeactivated(() => {
  // 保存滚动位置
  scrollPosition.value = document.documentElement.scrollTop || document.body.scrollTop;
});

onActivated(() => {
  // 如果有保存的位置，则恢复到该位置
  if (scrollPosition.value > 0) {
    nextTick(() => {
      window.scrollTo({
        top: scrollPosition.value,
        behavior: 'instant',
      });
    });
  }
});
</script>

<style lang="scss" scoped>
.index-container {
  width: 100%;
  height: 100%;
  overflow: hidden;

  .scroll-container {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 20px 0;
  }

  .world-map-box {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .bottom-world-map {
    margin-top: 30px;
  }
}

.filter-group {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 10px 20px;
  width: var(--list-container-width);
  padding: 0 20px;
  margin: auto;

  .left-box {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .right-box {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }
}
</style>
