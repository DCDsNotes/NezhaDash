<template>
  <div class="layout-footer">
    <div class="copyright-text">
      <span class="text">© {{ currentYear }} 哪吒监控</span>
    </div>
  </div>
</template>

<script setup>
/**
 * Footer
 */

import {
  computed,
} from 'vue';

const currentYear = computed(() => new Date().getFullYear());
</script>

<style lang="scss" scoped>
.layout-footer {
  padding: 20px 20px 40px;
  font-size: 12px;
  color: #ccc;

  .copyright-text {
    display: flex;
    justify-content: center;
  }
}
</style>
