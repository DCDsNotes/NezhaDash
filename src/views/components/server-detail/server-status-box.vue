<template>
  <dot-dot-box
    padding="15px"
    class="server-status-and-real-time"
  >
    <div
      class="server-status-group server-status-group--ring"
      :class="'status-list--' + serverStatusList.length"
    >
      <component
        :is="componentMaps.ring"
        v-for="item in serverStatusList"
        :key="item.type"
        :type="item.type"
        :used="item.used"
        :colors="item.colors"
        :val-percent="item.valPercent"
        :val-text="item.valText"
        :label="item.label"
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
import ServerStatusRing from '@/views/components/server/server-status-ring.vue';

const props = defineProps({
  info: {
    type: Object,
    default: () => ({}),
  },
});

const componentMaps = {
  ring: ServerStatusRing,
};

const {
  serverStatusList,
} = handleServerStatus({
  props,
  statusListTpl: 'cpu,mem,swap,disk',
  statusListItemContent: false,
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
    --ring-size: 100px;
    --ring-thickness: 12px;
    justify-content: space-around;
    gap: 16px;

    @media screen and (max-width: 1024px) {
      --ring-size: 76px;
      --ring-thickness: 11px;
    }

    @media screen and (max-width: 720px) {
      --ring-size: 70px;
      --ring-thickness: 10px;
      gap: 12px;
    }
  }
}
</style>
