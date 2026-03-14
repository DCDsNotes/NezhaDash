<template>
  <dot-dot-box
    class="server-monitor-group"
    :class="{
      'chart-type--multi': monitorChartType === 'multi',
      'chart-type--single': monitorChartType === 'single',
    }"
    padding="16px 20px"
  >
    <div class="module-head-group">
      <div class="left-box">
        <span class="module-title">
          网络监控
        </span>
      </div>
      <div class="right-box">
        <div
          v-if="config.nazhua.monitorChartTypeToggle"
          class="chart-type-switch-group"
          title="监控折线图是否聚合"
          @click="toggleChartType"
        >
          <span class="label-text">聚合</span>
          <div
            class="switch-box"
            :class="{
              active: monitorChartType === 'multi',
            }"
          >
            <span class="switch-dot" />
          </div>
        </div>
        <div
          class="refresh-data-group"
          title="是否自动刷新"
          @click="toggleAutoRefresh"
        >
          <span class="label-text">刷新</span>
          <div
            class="switch-box"
            :class="{
              active: refreshData,
            }"
          >
            <span class="switch-dot" />
          </div>
        </div>
        <div
          class="peak-shaving-group"
          title="过滤太高或太低的数据"
          @click="togglePeakShaving"
        >
          <span class="label-text">削峰</span>
          <div
            class="switch-box"
            :class="{
              active: peakShaving,
            }"
          >
            <span class="switch-dot" />
          </div>
        </div>
        <div class="last-update-time-group">
          <span class="last-update-time-label">
            最近
          </span>
          <div class="minutes">
            <div
              v-for="minuteItem in minutes"
              :key="minuteItem.value"
              class="minute-item"
              :class="{
                active: minuteItem.value === minute,
              }"
              @click="toggleMinute(minuteItem.value)"
            >
              <span>{{ minuteItem.label }}</span>
            </div>
            <div
              class="active-arrow"
              :style="minuteActiveArrowStyle"
            />
          </div>
        </div>
      </div>
    </div>

    <template v-if="hasMonitorData && monitorChartType === 'single'">
      <div
        class="monitor-chart-group"
        :class="'monitor-chart-len--' + monitorChartData.cateList.length"
      >
        <div
          v-for="(cateItem, index) in monitorChartData.cateList"
          :key="cateItem.id"
          class="monitor-chart-item"
        >
          <div class="cate-name-box">
            <popover :title="cateItem.title">
              <template #trigger>
                <div
                  class="monitor-cate-item"
                  :class="{
                    disabled: showCates[cateItem.id] === false,
                  }"
                  :style="{
                    '--cate-color': cateItem.color,
                  }"
                >
                  <span class="cate-legend" />
                  <span
                    class="cate-name"
                    :title="cateItem.name"
                  >
                    {{ cateItem.name }}
                  </span>
                  <div class="cate-metrics-row">
                    <span
                      class="cate-avg-ms cate-metric"
                    >
                      <span class="metric-label">延时</span>
                      <span class="metric-value">{{ formatLatency(cateItem.avg) }}</span>
                    </span>
                    <span
                      class="cate-loss-rate cate-metric"
                    >
                      <span class="metric-label">丢包</span>
                      <span class="metric-value">{{ formatPercent(cateItem.loss) }}</span>
                    </span>
                  </div>
                </div>
              </template>
            </popover>
          </div>
          <line-chart
            :date-list="monitorChartData.dateList"
            :value-list="monitorChartData.seriesByCate[index]"
            :size="240"
            :connect-nulls="false"
          />
        </div>
      </div>
    </template>
    <template v-else-if="hasMonitorData">
      <div class="monitor-cate-group">
        <template
          v-for="cateItem in monitorChartData.cateList"
          :key="cateItem.id"
        >
          <popover :title="cateItem.title">
            <template #trigger>
              <div
                class="monitor-cate-item"
                :class="{
                  disabled: showCates[cateItem.id] === false,
                }"
                :style="{
                  '--cate-color': cateItem.color,
                }"
                @click="toggleShowCate(cateItem.id)"
                @touchstart="handleTouchStart(cateItem.id)"
                @touchend="handleTouchEnd(cateItem.id)"
                @touchmove="handleTouchMove(cateItem.id)"
              >
                <span class="cate-legend" />
                <span
                  class="cate-name"
                  :title="cateItem.name"
                >
                  {{ cateItem.name }}
                </span>
                <div class="cate-metrics-row">
                  <span
                    class="cate-avg-ms cate-metric"
                  >
                    <span class="metric-label">延时</span>
                    <span class="metric-value">{{ formatLatency(cateItem.avg) }}</span>
                  </span>
                  <span
                    class="cate-loss-rate cate-metric"
                  >
                    <span class="metric-label">丢包</span>
                    <span class="metric-value">{{ formatPercent(cateItem.loss) }}</span>
                  </span>
                </div>
              </div>
            </template>
          </popover>
        </template>
      </div>

      <line-chart
        :date-list="monitorChartData.dateList"
        :value-list="monitorChartData.seriesList"
        :connect-nulls="false"
      />
    </template>
    <template v-else-if="isLoading">
      <div class="monitor-placeholder">
        <div class="placeholder-line placeholder-line--w60" />
        <div class="placeholder-line placeholder-line--w40" />
        <div class="placeholder-chart" />
      </div>
    </template>
    <template v-else>
      <div class="monitor-empty">
        <span>暂无监控数据</span>
      </div>
    </template>
  </dot-dot-box>
</template>

<script setup>
/**
 * 服务器监控
 */
import {
  ref,
  computed,
  onMounted,
  onUnmounted,
} from 'vue';
import { useStore } from 'vuex';
import config from '@/config';
import request from '@/utils/request';
import validate from '@/utils/validate';

import LineChart from '@/components/charts/line.vue';

import {
  getThreshold,
  getLineColor,
} from '@/views/composable/server-monitor';

function hasTsdbEnabledField(vuexStore) {
  if (!vuexStore?.state?.setting) {
    return false;
  }
  const { setting } = vuexStore.state;
  return 'tsdb_enabled' in (setting?.config ?? {}) || 'tsdb_enabled' in (setting ?? {});
}

function isTsdbEnabled(vuexStore) {
  if (!vuexStore?.state?.setting) {
    return false;
  }
  const { setting } = vuexStore.state;
  return setting?.config?.tsdb_enabled === true || setting?.tsdb_enabled === true;
}

const props = defineProps({
  info: {
    type: Object,
    default: () => ({}),
  },
});

const store = useStore();

const userLogin = computed(() => store.state.profile?.username);
const minute = ref(1440);
const baseMinutes = [{
  label: '30分钟',
  value: 30,
}, {
  label: '1小时',
  value: 60,
}, {
  label: '3小时',
  value: 180,
}, {
  label: '6小时',
  value: 360,
}, {
  label: '12小时',
  value: 720,
}, {
  label: '24小时',
  value: 1440,
}];
const minutes = computed(() => {
  if (!userLogin.value || !hasTsdbEnabledField(store)) {
    return baseMinutes;
  }
  return [
    ...baseMinutes,
    {
      label: '7天',
      value: 10080,
    },
    {
      label: '30天',
      value: 43200,
    },
  ];
});
const localData = {
  peakShaving: window.localStorage.getItem('nazhua_monitor_peak_shaving'),
  refreshData: window.localStorage.getItem('nazhua_monitor_refresh_data'),
  chartType: window.localStorage.getItem('nazhua_monitor_chart_type'),
};
localData.peakShaving = validate.isSet(localData.peakShaving) ? localData.peakShaving === 'true' : false;
localData.refreshData = validate.isSet(localData.refreshData) ? localData.refreshData === 'true' : true;

const peakShaving = ref(localData.peakShaving);
const refreshData = ref(localData.refreshData);
const showCates = ref({});
const monitorData = ref([]);
const isLoading = ref(true);
const longPressTimer = ref(null);

const chartType = validate.isSet(localData.chartType)
  ? ref(localData.chartType)
  : ref(config.nazhua.monitorChartType === 'single' ? 'single' : 'multi');
const monitorChartType = computed(() => {
  if (config.nazhua.monitorChartTypeToggle) {
    return chartType.value;
  }
  return config.nazhua.monitorChartType;
});

// 服务器时间（后面来自接口）
const nowServerTime = computed(() => store.state.serverTime || Date.now());
// const nowServerTime = computed(() => Date.now());
// console.log(store.state.serverTime);
const acceptShowTime = computed(() => (Math.floor(nowServerTime.value / 60000) - minute.value) * 60000);

const minuteActiveArrowStyle = computed(() => {
  const index = minutes.value.findIndex((i) => i.value === minute.value);
  return {
    left: `calc(${index} * var(--minute-item-width))`,
  };
});

const monitorChartData = computed(() => {
  /**
   * 处理监控数据以生成分类的平均延迟随时间变化的列表。
   *
   * @returns {Object} 返回一个对象，包含：
   * - cateList {Array}: 唯一监控名称的列表。
   * - dateList {Array}: 排序后的唯一时间戳列表。
   * - seriesList {Array}: 折线图数据（含丢包曲线）。
   * - seriesByCate {Array}: 单图模式下按分类分组的折线图数据。
   */
  const cateList = [];
  const cateMap = {};
  const dateSet = new Set();
  let seriesList = [];
  const seriesByCate = [];
  monitorData.value.forEach((i) => {
    const dateMap = new Map();
    const {
      monitor_name,
      monitor_id,
      created_at,
      avg_delay,
    } = i;
    if (!cateMap[monitor_name]) {
      cateMap[monitor_name] = {
        id: monitor_id,
      };
    }
    const cateDelayMap = new Map();
    const cateAcceptTimeMap = new Map();
    const cateCreateTime = new Set();

    const isPeriodRange = minute.value === 10080 || minute.value === 43200;

    // 实际数据的最早时间戳
    let earliestTimestamp = nowServerTime.value;
    created_at.forEach((time, index) => {
      if (time < earliestTimestamp) {
        earliestTimestamp = time;
      }
      const status = isPeriodRange || time >= acceptShowTime.value;

      // 允许显示的数据，记录到cateAcceptTime
      if (status) {
        if (import.meta.env.VITE_MONITOR_DEBUG === '1' && cateAcceptTimeMap.has(time)) {
          console.log(`${monitor_name} ${time} 重复，值对比： ${avg_delay[index]} vs ${cateAcceptTimeMap.get(time)}`);
        }
        cateAcceptTimeMap.set(time, avg_delay[index]);
      }
    });
    if (import.meta.env.VITE_MONITOR_DEBUG === '1') {
      console.log(`${monitor_name} created_at`, earliestTimestamp);
      console.log(`${monitor_name} created_at`, JSON.parse(JSON.stringify(created_at)));
      console.log(`${monitor_name} avg_delay`, JSON.parse(JSON.stringify(avg_delay)));
    }

    // 允许显示的最早时间戳，用于生成显示时间范围内的数据；7d/30d 仅用数据边界
    const actualStartTime = isPeriodRange
      ? earliestTimestamp
      : Math.max(acceptShowTime.value, earliestTimestamp);

    // 显示时间范围内的分钟数
    const allMintues = Math.floor((Date.now() - actualStartTime) / 60000);

    // 合成分钟数据
    for (let j = 0; j < allMintues; j += 1) {
      const time = actualStartTime + j * 60000;
      // 记录创建时间
      cateCreateTime.add(time);
      // 记录延迟数据
      const timeProp = cateAcceptTimeMap.get(time);
      cateDelayMap.set(time, timeProp ?? undefined);
    }

    // 计算削峰阈值
    const {
      median,
      tolerancePercent,
    } = peakShaving.value ? getThreshold(Array.from(cateDelayMap.values())) : {};

    // 合成分钟数据
    cateCreateTime.values().forEach((time) => {
      const avgDelay = cateDelayMap.get(time) * 1;

      // 只对有效的延迟值进行削峰判断
      if (peakShaving.value) {
        // 削峰过滤：根据中位数和动态容差百分比判断异常值
        const threshold = median * tolerancePercent;
        // 当偏离中位数超过阈值时，视为异常值
        if (Math.abs(avgDelay - median) > threshold) {
          dateMap.set(time, null);
          return;
        }
      }
      // 无数据或无效数据的情况，设置为undefined
      if (Number.isNaN(avgDelay)) {
        dateMap.set(time, undefined);
      } else {
        dateMap.set(time, (avgDelay).toFixed(2) * 1);
      }
    });

    const lineData = [];
    const lossLineData = [];
    const validatedData = [];
    const overValidatedData = [];
    let delayTotal = 0;
    dateMap.forEach((val, key) => {
      const time = parseInt(key, 10); // 时间戳
      lineData.push([time, val ?? null]);
      lossLineData.push([time, val === undefined ? 100 : 0]);
      if (typeof val === 'number' && Number.isFinite(val)) {
        dateSet.add(time);
        validatedData.push([time, val]);
        delayTotal += val;
      }
      if (val !== undefined) {
        overValidatedData.push([time, val]);
      }
    });

    if (import.meta.env.VITE_MONITOR_DEBUG === '1') {
      cateMap[monitor_name].origin = {
        cateCreateTime,
        cateDelayMap,
        cateAcceptTimeMap,
        dateMap,
        lineData,
        validatedData,
        overValidatedData,
        delayTotal,
      };
    }

    const id = monitor_id;
    // 计算平均延迟
    const avgDelay = delayTotal / validatedData.length || 0;

    if (lineData && lineData.length) {
      if (!validate.hasOwn(showCates.value, id)) {
        showCates.value[id] = true;
      }
      const color = getLineColor(id);
      // 成功率 = 有效数据点 / 所有数据点
      const over = overValidatedData.length > 0 ? overValidatedData.length / lineData.length : 0;
      const validRate = 1 - ((validatedData.length > 0 && overValidatedData.length > 0)
        ? validatedData.length / overValidatedData.length : 0);
      const cateItem = {
        id,
        name: monitor_name,
        color,
        avg: avgDelay.toFixed(2) * 1,
        over: (over * 100).toFixed(2) * 1,
        loss: (100 - (over * 100)).toFixed(2) * 1,
        validRate: (validRate * 100).toFixed(2) * 1,
      };
      const titles = [
        cateItem.name,
        cateItem.avg === 0 ? '' : `平均延迟：${cateItem.avg}ms`,
        `成功率：${cateItem.over}%`,
        `丢包率：${cateItem.loss}%`,
      ];
      if (peakShaving.value) {
        titles.push(`削峰率: ${cateItem.validRate}%`);
      }
      cateItem.title = titles.filter((s) => s).join('\n');
      cateList.push(cateItem);
      const cateId = id;
      const delaySeries = {
        id: `${cateId}-delay`,
        cateId,
        name: monitor_name,
        data: lineData,
        itemStyle: {
          color,
        },
        lineStyle: {
          color,
        },
      };

      const lossSeries = {
        id: `${cateId}-loss`,
        cateId,
        name: `${monitor_name} 丢包`,
        data: lossLineData,
        yAxisIndex: 1,
        smooth: false,
        itemStyle: {
          color,
          opacity: 0.35,
        },
        lineStyle: {
          color,
          opacity: 0.55,
          type: 'dashed',
        },
      };

      seriesByCate.push([delaySeries, lossSeries]);
      seriesList.push(delaySeries, lossSeries);
    }
  });

  const dateList = Array.from(dateSet).sort((a, b) => a - b);
  seriesList = seriesList.filter((i) => showCates.value[i.cateId]);

  if (import.meta.env.VITE_MONITOR_DEBUG === '1') {
    window._cateMap = cateMap;
    console.log(window._cateMap);
    console.log(dateList, cateList, seriesList);
  }
  return {
    dateList,
    cateList,
    seriesList,
    seriesByCate,
  };
});

const hasMonitorData = computed(() => monitorData.value.length > 0);

function formatLatency(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return '-';
  }
  return `${value}ms`;
}

function formatPercent(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '-';
  }
  return `${value}%`;
}

function togglePeakShaving() {
  peakShaving.value = !peakShaving.value;
  window.localStorage.setItem('nazhua_monitor_peak_shaving', peakShaving.value);
}

function toggleAutoRefresh() {
  refreshData.value = !refreshData.value;
  window.localStorage.setItem('nazhua_monitor_refresh_data', refreshData.value);
}

function toggleChartType() {
  chartType.value = chartType.value === 'single' ? 'multi' : 'single';
  window.localStorage.setItem('nazhua_monitor_chart_type', chartType.value);
}

function getTsdbPeriod() {
  if (minute.value === 10080) return '7d';
  if (minute.value === 43200) return '30d';
  return '1d';
}

async function loadMonitor() {
  isLoading.value = true;
  let url;
  if (hasTsdbEnabledField(store)) {
    url = config.nazhua.v1ApiMonitorPath.replace('{id}', props.info.ID);
    if (isTsdbEnabled(store)) {
      const period = getTsdbPeriod();
      url += url.includes('?') ? `&period=${period}` : `?period=${period}`;
    }
  } else {
    url = config.nazhua.v1ApiMonitorPathFallback.replace('{id}', props.info.ID);
  }
  try {
    const res = await request({ url });
    const list = res?.data?.data;
    if (Array.isArray(list)) {
      monitorData.value = list;
    }
  } catch (err) {
    console.error(err);
  } finally {
    isLoading.value = false;
  }
}

async function toggleMinute(value) {
  minute.value = value;
  if (value === 10080 || value === 43200) {
    await loadMonitor();
  }
}

function toggleShowCate(id) {
  if (window.innerWidth < 768) {
    return;
  }
  showCates.value[id] = !showCates.value[id];
}

function handleTouchStart(id) {
  longPressTimer.value = setTimeout(() => {
    showCates.value[id] = !showCates.value[id];
  }, 500);
}

function handleTouchEnd() {
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value);
    longPressTimer.value = null;
  }
}

function handleTouchMove() {
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value);
    longPressTimer.value = null;
  }
}

let loadMonitorTimer = null;
async function setTimeLoadMonitor(force = false) {
  if (loadMonitorTimer) {
    clearTimeout(loadMonitorTimer);
  }
  if (refreshData.value || force) {
    await loadMonitor();
  }
  let monitorRefreshTime = parseInt(config.nazhua.monitorRefreshTime, 10);
  // 0 为不刷新
  if (monitorRefreshTime === 0) {
    return;
  }
  // 非数字 强制为30
  if (Number.isNaN(monitorRefreshTime)) {
    monitorRefreshTime = 30;
  }
  // 最小 10 秒
  const sTime = Math.min(monitorRefreshTime, 10);
  loadMonitorTimer = setTimeout(() => {
    setTimeLoadMonitor();
  }, sTime * 1000);
}

onMounted(() => {
  setTimeLoadMonitor(true);
});

onUnmounted(() => {
  if (loadMonitorTimer) {
    clearTimeout(loadMonitorTimer);
  }
});
</script>

<style lang="scss" scoped>
.server-monitor-group {
  --line-chart-size: 300px;
  min-height: calc(var(--line-chart-size) + 170px);

  &.chart-type--single {
    --line-chart-size: 240px;
    min-height: calc(var(--line-chart-size) + 150px);
  }

  .monitor-cate-item {
    --cate-item-height: 40px;
    --cate-item-font-size: 14px;
    --cate-color: #fff;

    --cate-avg-width: 96px;
    --cate-loss-width: 96px;

    display: grid;
    grid-template-columns: 0.5em 1fr var(--cate-avg-width) var(--cate-loss-width);
    align-items: center;
    width: 100%;
    min-height: var(--cate-item-height);
    gap: 6px;
    padding: 0 6px;
    font-size: var(--cate-item-font-size);
    border-radius: 4px;
    cursor: pointer;

    @media screen and (max-width: 768px) {
      cursor: default;
      width: 100%;
      --cate-item-font-size: 12px;
      --cate-item-height: 64px;
      --cate-metric-width: 70px;
      grid-template-columns: 0.5em 1fr;
      grid-template-rows: auto auto;
      align-items: center;
      justify-items: start;
      column-gap: 5px;
      row-gap: 5px;
    }

    .cate-legend {
      width: 0.5em;
      height: 0.5em;
      background: var(--cate-color);

      @media screen and (max-width: 768px) {
        grid-column: 1;
        grid-row: 1;
        align-self: center;
      }
    }

    .cate-name {
      padding: 2px 0;
      line-height: 1.2;
      color: #eee;
      white-space: nowrap;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;

      @media screen and (max-width: 768px) {
        grid-column: 2;
        grid-row: 1;
        align-self: center;
      }
    }

    .cate-metrics-row {
      display: contents;

      @media screen and (max-width: 768px) {
        display: flex;
        grid-column: 2;
        grid-row: 2;
        align-items: baseline;
        justify-content: flex-start;
        gap: 3px;
        width: 100%;
      }
    }

    .cate-metric {
      display: flex;
      align-items: baseline;
      justify-content: flex-end;
      gap: 4px;
      min-width: 0;

      @media screen and (max-width: 768px) {
        font-size: 10px;
        flex-direction: row;
        align-items: baseline;
        justify-content: flex-start;
        gap: 4px;
        line-height: 1.2;
        flex: 0 0 var(--cate-metric-width);
      }
    }

    .metric-label {
      font-size: 12px;
      color: rgba(#fff, 0.75);
      white-space: nowrap;
      flex: 0 0 auto;

      @media screen and (max-width: 768px) {
        font-size: 10px;
        color: rgba(#fff, 0.65);
      }
    }

    .metric-value {
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
      min-width: 0;
      flex: 1 1 auto;

      @media screen and (max-width: 768px) {
        font-size: 10px;
      }
    }

    .cate-avg-ms {
      text-align: right;
      color: #fff;

      @media screen and (max-width: 768px) {
        text-align: left;
      }
    }

    .cate-loss-rate {
      text-align: right;
      color: #f5b199;

      @media screen and (max-width: 768px) {
        text-align: left;
      }
    }

    &.disabled {
      filter: grayscale(1) brightness(0.8);
      opacity: 0.5;
    }
  }

  &.chart-type--single {
    @media screen and (max-width: 768px) {
      --line-chart-size: 100%;
      min-height: 390px;

      .monitor-cate-item {
        display: flex;
        align-items: center;
        flex-wrap: nowrap;
        column-gap: 5px;
        row-gap: 0;
      }

      .cate-legend {
        flex: 0 0 auto;
      }

      .cate-name {
        flex: 1 1 auto;
        min-width: 0;
        padding: 0;
      }

      .cate-metrics-row {
        display: flex;
        flex: 0 0 auto;
        align-items: baseline;
        justify-content: flex-end;
        gap: 3px;
        width: auto;
      }

      .cate-metric {
        flex: 0 0 var(--cate-metric-width);
      }

      .placeholder-chart,
      .monitor-empty {
        height: 240px;
      }
    }
  }
}

.monitor-placeholder {
  padding: 10px 0 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.placeholder-line {
  height: 12px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.12);
}
.placeholder-line--w60 {
  width: 60%;
}
.placeholder-line--w40 {
  width: 40%;
}
.placeholder-chart {
  height: var(--line-chart-size);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
}

.monitor-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: var(--line-chart-size);
  margin-top: 10px;
  color: rgba(255, 255, 255, 0.7);
}

.module-head-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  @media screen and (min-width: 768px) {
    position: sticky;
    top: var(--layout-header-height);
    z-index: 1000;
  }

  .module-title {
    width: max-content;
    height: 30px;
    line-height: 30px;
    font-size: 16px;
    color: #eee;
  }

  .right-box {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
  }

  .peak-shaving-group,
  .refresh-data-group,
  .chart-type-switch-group {
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;

    @media screen and (max-width: 1024px) {
      cursor: default;
    }

    .switch-box {
      position: relative;
      width: 30px;
      height: 16px;
      background: #999;
      border-radius: 10px;
      transition: backgroundColor 0.3s;

      .switch-dot {
        position: absolute;
        top: 2px;
        left: 2px;
        width: 12px;
        height: 12px;
        background: #fff;
        border-radius: 50%;
        transition: left 0.3s;
      }

      &.active {
        background-color: #4caf50;

        .switch-dot {
          left: 16px;
          box-shadow: 1px 1px 2px rgba(#000, 0.4);
        }
      }
    }

    .label-text {
      color: #ddd;
      font-size: 12px;
    }
  }

  .last-update-time-group {
    --minute-item-width: 50px;
    --minute-item-height: 20px;
    display: flex;
    align-items: center;
    gap: 4px;

    .last-update-time-label {
      color: #ddd;
      height: var(--minute-item-height);
      line-height: var(--minute-item-height);
      font-size: 12px;
    }

    @media screen and (max-width: 660px) {
      --minute-item-width: 46px;
    }

    @media screen and (max-width: 600px) {
      --minute-item-width: 46px;
    }

    @media screen and (max-width: 400px) {
      .last-update-time-label {
        display: none;
      }
    }

    @media screen and (max-width: 330px) {
      margin-left: -12px;
    }

    @media screen and (max-width: 320px) {
      margin-left: -18px;
    }
  }
  .minutes {
    position: relative;
    display: flex;
    align-items: center;
    // padding: 0 10px;
    height: var(--minute-item-height);
    background: rgba(#fff, 0.2);
    border-radius: calc(var(--minute-item-height) / 2);

    .minute-item {
      position: relative;
      z-index: 10;
      width: var(--minute-item-width);
      height: var(--minute-item-height);
      line-height: var(--minute-item-height);
      font-size: 12px;
      text-align: center;
      cursor: pointer;
      color: #aaa;
      transition: color 0.3s;

      &.active {
        color: #fff;
        text-shadow: 1px 1px 2px rgba(#000, 0.6);
      }
    }

    .active-arrow {
      position: absolute;
      top: 0;
      left: 0;
      width: var(--minute-item-width);
      height: var(--minute-item-height);
      border-radius: calc(var(--minute-item-height) / 2);
      background: #4caf50;
      // opacity: 0.5;
      transition: left 0.3s;
      z-index: 1;
    }
  }
}

.monitor-cate-group {
  --gap-size: 8px;
  --cate-trigger-width: 320px;
  margin: 10px 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, var(--cate-trigger-width));
  justify-content: space-between;
  gap: var(--gap-size);

  @media screen and (max-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    justify-content: stretch;
  }
}

.monitor-chart-group {
  --monitor-chart-gap: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--monitor-chart-gap);

  .monitor-chart-item {
    height: calc(var(--line-chart-size) + 28px);
  }

  @media screen and (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 10px;

    .monitor-chart-item {
      height: auto;
    }
  }

  .cate-name-box {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &.monitor-chart-len--1 {
    grid-template-columns: 1fr;
  }
}
</style>
