<template>
  <div class="server-list-item-skeleton" />
</template>

<script setup>
</script>

<style lang="scss" scoped>
.server-list-item-skeleton {
  --list-item-border-radius: 12px;
  width: var(--list-item-width);
  height: 270px;
  border-radius: var(--list-item-border-radius);
  background: rgba(255, 255, 255, 0.06);
  box-shadow: 0 2px 6px rgba(#000, 0.35);
  overflow: hidden;
  position: relative;
}

.server-list-item-skeleton::before {
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

@keyframes shimmer {
  0% { transform: translateX(-60%); }
  100% { transform: translateX(60%); }
}
</style>
