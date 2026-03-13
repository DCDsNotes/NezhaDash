<template>
  <dot-dot-box
    padding="15px"
    class="server-status-and-real-time"
    :class="{
      'status-type--progress': componentName === 'progress',
    }"
  >
    <div
      class="server-status-group"
      :class="'type--' + componentName + ' status-list--' + serverStatusList.length"
    >
      <component
        :is="componentMaps[componentName]"
        v-for="item in serverStatusList"
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

import handleServerStatus from '@/views/composable/server-status';

import ServerListItemRealTime from '@/views/components/server/server-real-time.vue';
import ServerStatusProgress from '@/views/components/server/server-status-progress.vue';

const props = defineProps({
  info: {
    type: Object,
    default: () => ({}),
  },
});

const componentMaps = {
  progress: ServerStatusProgress,
};

const componentName = 'progress';

const {
  serverStatusList,
} = handleServerStatus({
  props,
  statusListTpl: 'cpu,mem,swap,disk',
  statusListItemContent: true,
});
</script>

<style lang="scss" scoped>
.server-status-and-real-time {
  display: flex;
  flex-direction: column;
  gap: 20px;

  --real-time-value-font-size: 36px;
  --real-time-text-font-size: 16px;
  --real-time-label-font-size: 16px;

  &.status-type--progress {
    --real-time-value-font-size: 24px;
    --real-time-text-font-size: 14px;
    --real-time-label-font-size: 14px;

    @media screen and (max-width: 1024px) {
      --real-time-value-font-size: 24px;
    }
  }

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

  &.type--progress {
    padding: 0 5px;
    gap: 10px;

    --progress-bar-height: 24px;

    @media screen and (max-width: 350px) {
      --progress-bar-height: 16px;
    }
  }
}
</style>
