<template>
  <div
    class="server-list-item-status"
    :class="statusClassNames"
  >
    <component
      :is="componentMaps.progress"
      v-for="item in serverStatusList"
      :key="item.type"
      :type="item.type"
      :used="item.used"
      :colors="item.colors"
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

const {
  serverStatusList,
} = handleServerStatus({
  props,
  statusListTpl: 'cpu,mem,disk',
  statusListItemContent: false,
});

const statusClassNames = computed(() => {
  const names = {};
  names['type--progress'] = true;
  names[`len--${serverStatusList.value?.length}`] = true;
  return names;
});
</script>

<style lang="scss" scoped>
.server-list-item-status {
  display: flex;
  justify-content: space-between;
  padding: 0 5px;

  &.type--progress {
    flex-wrap: wrap;
    gap: 10px;

    --progress-bar-width: calc(50% - 5px);
    --progress-bar-height: 20px;

    @media screen and (max-width: 400px) {
      --progress-bar-height: 16px;
      padding: 0 10px;
    }

    &.len--3 {
      --progress-bar-width: calc((100% - 20px) / 3);
    }
  }
}
</style>
