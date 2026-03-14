import { use } from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';
import { LineChart } from 'echarts/charts';
import {
  TooltipComponent,
  GridComponent,
  DataZoomComponent,
} from 'echarts/components';
import dayjs from 'dayjs';

import config from '@/config';

use([
  SVGRenderer,
  LineChart,
  TooltipComponent,
  GridComponent,
  DataZoomComponent,
]);

export default (options) => {
  const {
    dateList,
    valueList,
    mode = 'dark',
    connectNulls = true,
  } = options || {};
  const fontFamily = config.nazhua.disableSarasaTermSC === true ? undefined : 'Sarasa Term SC';
  const hasPercentAxis = Array.isArray(valueList) && valueList.some((i) => i?.yAxisIndex === 1);

  function getValueUnit(seriesName) {
    if (typeof seriesName === 'string' && seriesName.includes('丢包')) {
      return '%';
    }
    return 'ms';
  }

  function formatValueWithUnit(value, unit) {
    if (value === null || value === undefined) return '';
    if (unit === '%') return `${value}%`;
    return `${value}ms`;
  }

  function getTooltipRow(param) {
    const value = Array.isArray(param.value) ? param.value[1] : param.value;
    if (value === null || value === undefined) return null;
    const unit = getValueUnit(param.seriesName);
    return `${param.marker} ${param.seriesName}: ${formatValueWithUnit(value, unit)}`;
  }

  const yAxis = hasPercentAxis
    ? [{
      type: 'value',
      splitLine: {
        lineStyle: {
          color: mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.4)',
        },
      },
      axisLabel: {
        fontFamily,
        color: mode === 'dark' ? '#ddd' : '#222',
        fontSize: 12,
        margin: 6,
      },
      axisTick: {
        show: false,
      },
      axisLine: {
        show: false,
      },
    }, {
      type: 'value',
      min: 0,
      max: 100,
      interval: 25,
      splitLine: {
        show: false,
      },
      axisLabel: {
        fontFamily,
        color: mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
        fontSize: 12,
        formatter: '{value}%',
        margin: 6,
      },
      axisTick: {
        show: false,
      },
      axisLine: {
        show: false,
      },
    }]
    : {
      type: 'value',
      splitLine: {
        lineStyle: {
          color: mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.4)',
        },
      },
      axisLabel: {
        fontFamily,
        color: mode === 'dark' ? '#ddd' : '#222',
        fontSize: 12,
        margin: 6,
      },
      axisTick: {
        show: false,
      },
      axisLine: {
        show: false,
      },
    };

  const option = {
    darkMode: mode === 'dark',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      formatter: (params) => {
        const time = dayjs(parseInt(params[0].axisValue, 10)).format('YYYY.MM.DD HH:mm');
        let res = `<p style="font-weight: bold; color: #ff6;">${time}</p>`;
        if (params.length < 10) {
          params.forEach((i) => {
            const row = getTooltipRow(i);
            res += row ? `${row}<br>` : '';
          });
        } else {
          res += '<table>';
          let trEnd = false;
          params.forEach((i, index) => {
            if (index % 2 === 0) {
              res += '<tr>';
            }
            const row = getTooltipRow(i);
            res += row
              ? `<td style="padding: 0 4px;">${row}</td>`
              : '<td style="padding: 0 4px;"></td>';
            if (index % 2 === 1) {
              res += '</tr>';
              trEnd = true;
            }
          });
          if (!trEnd) {
            res += '</tr>';
          }
          res += '</table>';
        }
        return res;
      },
      backgroundColor: mode === 'dark' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)',
      borderColor: mode === 'dark' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)',
      textStyle: {
        color: mode === 'dark' ? '#ddd' : '#222',
        fontFamily,
        fontSize: 14,
      },
    },
    grid: {
      top: 10,
      left: 6,
      right: 6,
      bottom: 50,
      containLabel: true,
    },
    dataZoom: [{
      id: 'dataZoomX',
      type: 'slider',
      xAxisIndex: [0],
      filterMode: 'filter',
    }],
    yAxis,
    xAxis: {
      type: 'time',
      data: dateList,
      boundaryGap: false,
      axisLabel: {
        hideOverlap: true,
        nameTextStyle: {
          fontSize: 12,
        },
        fontFamily,
        color: mode === 'dark' ? '#eee' : '#222',
      },
      axisTick: {
        show: false,
      },
      axisLine: {
        show: false,
      },
    },
    series: valueList.map((i) => ({
      ...i,
      type: 'line',
      smooth: typeof i?.smooth === 'boolean' ? i.smooth : true,
      connectNulls: typeof i?.connectNulls === 'boolean' ? i.connectNulls : connectNulls,
      legendHoverLink: false,
      symbol: 'none',
    })),
  };
  return option;
};
