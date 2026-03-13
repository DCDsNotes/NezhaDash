<template>
  <div
    class="server-status-ring"
    :class="'server-status--' + type"
    :style="ringStyle"
    :title="tooltip"
  >
    <div class="ring">
      <div class="ring-center">
        <div class="ring-percent">{{ displayPercent }}</div>
        <div
          v-if="displayValText"
          class="ring-val"
        >
          {{ displayValText }}
        </div>
      </div>
    </div>
    <div
      v-if="label"
      class="ring-label"
    >
      {{ label }}
    </div>
  </div>
</template>

<script setup>
import {
  computed,
} from 'vue';

const props = defineProps({
  type: {
    type: String,
    default: '',
  },
  used: {
    type: [Number, String],
    default: 0,
  },
  colors: {
    type: Object,
    default: () => ({}),
  },
  valText: {
    type: String,
    default: '',
  },
  valPercent: {
    type: String,
    default: '',
  },
  label: {
    type: String,
    default: '',
  },
});

const usedPercent = computed(() => {
  const n = Number(props.used);
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(n, 0), 100);
});

const displayPercent = computed(() => props.valPercent || `${usedPercent.value.toFixed(1) * 1}%`);

const displayValText = computed(() => {
  if (!props.valText) return '';
  if (props.valText === displayPercent.value) return '';
  return props.valText;
});

const tooltip = computed(() => {
  if (!props.label) return '';
  return `${props.label}使用${usedPercent.value.toFixed(1) * 1}%`;
});

const ringStyle = computed(() => {
  const style = {};
  style['--ring-used'] = `${usedPercent.value}%`;

  const usedColor = typeof props.colors === 'string' ? props.colors : props.colors?.used;
  const trackColor = props.colors?.total || 'rgba(255, 255, 255, 0.18)';

  if (Array.isArray(usedColor)) {
    const [ringColor] = usedColor;
    if (ringColor) {
      style['--ring-color'] = ringColor;
    }
  } else if (usedColor) {
    style['--ring-color'] = usedColor;
  }
  style['--ring-track'] = trackColor;
  return style;
});
</script>

<style lang="scss" scoped>
.server-status-ring {
  --ring-color: #08f;
  --ring-track: rgba(255, 255, 255, 0.18);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: default;

  .ring {
    width: var(--ring-size, 72px);
    height: var(--ring-size, 72px);
    border-radius: 50%;
    background:
      conic-gradient(
        var(--ring-color) 0 var(--ring-used),
        var(--ring-track) 0 100%
      );
    position: relative;
  }

  .ring::before {
    content: '';
    position: absolute;
    inset: var(--ring-thickness, 11px);
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.25);
    box-shadow: inset 0 1px 0 rgba(#fff, 0.06);
  }

  .ring-center {
    position: absolute;
    inset: var(--ring-thickness, 11px);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    text-shadow: 1px 1px 2px rgba(#000, 0.8), 0 0 1px rgba(#fff, 0.2);
    z-index: 1;
  }

  .ring-percent {
    line-height: 1;
    font-size: 14px;
    font-weight: 700;
    color: #fff;
  }

  .ring-val {
    margin-top: 2px;
    line-height: 1;
    font-size: 11px;
    color: rgba(#fff, 0.85);
  }

  .ring-label {
    line-height: 1;
    font-size: 12px;
    color: #ddd;
  }
}
</style>
