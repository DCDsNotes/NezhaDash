<template>
  <dot-dot-box
    padding="15px"
    class="server-status-and-real-time"
  >
    <div
      class="server-status-group server-status-group--ring"
      :class="'status-list--' + ringStatusList.length"
    >
      <component
        :is="componentMaps.ring"
        v-for="item in ringStatusList"
        :key="item.type"
        :type="item.type"
        :used="item.used"
        :colors="item.colors"
        :val-percent="item.valPercent"
        :val-text="item.valText"
        :label="item.label"
      />
    </div>
    <div
      v-if="progressStatusList.length"
      class="server-status-group server-status-group--progress"
      :class="'status-list--' + progressStatusList.length"
    >
      <component
        :is="componentMaps.progress"
        v-for="item in progressStatusList"
        :key="item.type"
        :type="item.type"
        :used="item.used"
        :colors="item.colors"
        :val-text="item.valText"
        :label="item.label"
        :content="item.content"
      />
    </div>
    <server-list-item-real-time :info="info" />
  </dot-dot-box>
</template>

<script setup>
/**
 * 服务器状态组
 */

import {
  computed,
} from 'vue';

import handleServerStatus from '@/views/composable/server-status';

import ServerListItemRealTime from '@/views/components/server/server-real-time.vue';
import ServerStatusProgress from '@/views/components/server/server-status-progress.vue';
import ServerStatusRing from '@/views/components/server/server-status-ring.vue';

const props = defineProps({
  info: {
    type: Object,
    default: () => ({}),
  },
});

const componentMaps = {
  progress: ServerStatusProgress,
  ring: ServerStatusRing,
};

const {
  serverStatusList,
} = handleServerStatus({
  props,
  statusListTpl: 'cpu,mem,swap,disk',
  statusListItemContent: true,
});

const ringTypes = new Set(['cpu', 'mem', 'disk']);
const ringStatusList = computed(() => (serverStatusList.value || []).filter((i) => ringTypes.has(i.type)));
const progressStatusList = computed(() => (serverStatusList.value || []).filter((i) => !ringTypes.has(i.type)));
</script>

<style lang="scss" scoped>
.server-status-and-real-time {
  display: flex;
  flex-direction: column;
  gap: 20px;

  --real-time-value-font-size: 36px;
  --real-time-text-font-size: 16px;
  --real-time-label-font-size: 16px;

  @media screen and (max-width: 1024px) {
    --real-time-value-font-size: 30px;
  }

  @media screen and (max-width: 720px) {
    --real-time-value-font-size: 24px;
    --real-time-text-font-size: 14px;
    --real-time-label-font-size: 14px;
  }

  @media screen and (max-width: 320px) {
    --real-time-value-font-size: 20px;
    --real-time-text-font-size: 12px;
    --real-time-label-font-size: 12px;
  }
}

.server-status-group {
  display: flex;
  flex-wrap: wrap;

  &--ring {
    justify-content: space-around;
    gap: 12px;
  }

  &--progress {
    padding: 0 5px;
    gap: 10px;
    --progress-bar-height: 24px;

    @media screen and (max-width: 350px) {
      --progress-bar-height: 16px;
    }
  }
}
</style>
