<template>
  <div
    v-if="serverCount?.total"
    class="server-count-group"
  >
    <span
      class="server-count server-count--online"
      title="在线"
    >
      <span class="icon ri-checkbox-circle-line" />
      <span class="value">{{ serverCount.online }}</span>
    </span>
    <span
      class="server-count server-count--offline"
      title="离线"
    >
      <span class="icon ri-close-circle-line" />
      <span class="value">{{ serverCount.offline }}</span>
    </span>
  </div>
</template>

<script setup>
/**
 * 服务器数量
 */
import {
  computed,
} from 'vue';
import {
  useStore,
} from 'vuex';

const store = useStore();

const serverCount = computed(() => store.state.serverCount);
</script>

<style lang="scss" scoped>
.server-count-group {
  display: flex;
  gap: 10px;

  .server-count {
    display: flex;
    align-items: center;
    gap: 3px;
    color: #ddd;
    line-height: 30px;

    .icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      line-height: 1;
      font-size: 18px;
    }

    .value {
      font-weight: bold;
    }

    &.server-count--online {
      color: var(--server-online-color);
    }

    &.server-count--offline {
      color: var(--server-offline-color);
    }
  }
}
</style>
