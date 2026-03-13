import {
  reactive,
} from 'vue';

const config = reactive({
  init: true,
  nazhua: {
    title: '哪吒探针',
    disableSarasaTermSC: import.meta.env.VITE_DISABLE_SARASA_TERM_SC === '1',

    v1ApiMonitorPath: '/api/v1/server/{id}/service',
    v1ApiMonitorPathFallback: '/api/v1/service/{id}',
    v1WsPath: '/api/v1/ws/server',
    v1GroupPath: '/api/v1/server-group',
    v1ApiSettingPath: '/api/v1/setting',
    v1ApiProfilePath: '/api/v1/profile',
    v1DashboardUrl: '/dashboard',

    enableInnerSearch: true,

    hideWorldMap: false,
    hideHomeWorldMap: false,
    hideDetailWorldMap: false,
    homeWorldMapPosition: 'top',
    detailWorldMapPosition: 'top',

    hideListItemLink: true,

    monitorRefreshTime: 30,
    monitorChartType: 'multi',
    monitorChartTypeToggle: true,

    filterGPUKeywords: ['Virtual Display'],
  },
});

export default config;

export const init = async () => {};
