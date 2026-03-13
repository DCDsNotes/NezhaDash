<template>
  <div
    class="server-list-item-status"
    :class="statusClassNames"
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
</template>

<script setup>
/**
 * 服务器状态盒子
 */

import {
  computed,
} from 'vue';

import handleServerStatus from '@/views/composable/server-status';
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
  statusListTpl: 'cpu,mem,disk',
  statusListItemContent: false,
});

const statusClassNames = computed(() => {
  const names = {};
  names['type--ring'] = true;
  names[`len--${serverStatusList.value?.length}`] = true;
  return names;
});
</script>

<style lang="scss" scoped>
.server-list-item-status {
  display: flex;
  justify-content: space-between;
  padding: 6px 0 0;

  &.type--ring {
    gap: 8px;
    width: 100%;
    justify-content: space-around;

    @media screen and (max-width: 400px) {
      padding: 10px 6px 0;
    }
  }
}
</style>
