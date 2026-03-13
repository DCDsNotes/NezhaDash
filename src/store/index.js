import {
  createStore,
} from 'vuex';
import dayjs from 'dayjs';
import config from '@/config';
import {
  loadServerGroup as loadNezhaV1ServerGroup,
  loadSetting as loadNezhaV1Setting,
  loadProfile as loadNezhaV1Profile,
} from '@/utils/load-nezha-v1-config';
import normalizeV1Server from '@/utils/normalize-v1-server';

import {
  msg,
} from '@/ws';

const defaultState = () => ({
  init: false,
  serverTime: 0,
  serverGroup: [],
  serverGroupNameById: {},
  serverList: [],
  serverMapById: {},
  serverMapByKey: {},
  serverListColumnWidths: {},
  serverCount: {
    total: 0,
    online: 0,
    offline: 0,
  },
  profile: {},
  setting: {},
});

function computeOnlineStatus(lastActive, currentTime = Date.now()) {
  const lastActiveTime = dayjs(lastActive)?.valueOf?.() || 0;
  if (currentTime - lastActiveTime > 10 * 1000) {
    return -1;
  }
  return 1;
}

function computeServerCounts(servers) {
  return {
    total: servers.length,
    online: servers.filter((i) => i.online === 1).length,
    offline: servers.filter((i) => i.online === -1).length,
  };
}

function createServerLookups(servers) {
  const serverById = {};
  const serverByKey = {};
  servers.forEach((server) => {
    if (server?.ID != null) {
      serverById[server.ID] = server;
    }
    if (server?.ServerKey) {
      serverByKey[server.ServerKey] = server;
    }
  });
  return {
    serverById,
    serverByKey,
  };
}

let isFirstWsSnapshot = true;
const store = createStore({
  state: defaultState(),
  mutations: {
    SET_SERVER_TIME(state, time) {
      state.serverTime = time;
    },
    SET_SERVER_GROUP(state, serverGroup) {
      state.serverGroup = serverGroup;
      const serverGroupNameById = {};
      serverGroup?.forEach?.((group) => {
        group?.servers?.forEach?.((serverId) => {
          serverGroupNameById[serverId] = group?.name;
        });
      });
      state.serverGroupNameById = serverGroupNameById;
    },
    SET_SERVERS(state, servers) {
      const newServers = [...servers];
      newServers.sort((a, b) => b.DisplayIndex - a.DisplayIndex);
      state.serverList = newServers;
      const lookups = createServerLookups(newServers);
      state.serverMapById = lookups.serverById;
      state.serverMapByKey = lookups.serverByKey;
      state.serverCount = computeServerCounts(newServers);
      state.init = true;
    },
    UPDATE_SERVERS(state, servers) {
      // 遍历新的servers 处理新的内容
      const oldServersMap = {};
      state.serverList.forEach((server) => {
        oldServersMap[server.ID] = server;
      });
      let newServers = servers.map((server) => {
        const oldItem = oldServersMap[server.ID];
        const serverItem = {
          ...server,
        };
        if (!serverItem.ServerKey && oldItem?.ServerKey) {
          serverItem.ServerKey = oldItem.ServerKey;
        }
        if (!serverItem.PublicNote && oldItem?.PublicNote) {
          serverItem.PublicNote = oldItem.PublicNote;
        }
        return serverItem;
      });
      newServers = newServers.filter((server) => server);
      newServers.sort((a, b) => b.DisplayIndex - a.DisplayIndex);
      state.serverList = newServers;
      const lookups = createServerLookups(newServers);
      state.serverMapById = lookups.serverById;
      state.serverMapByKey = lookups.serverByKey;
      state.serverCount = computeServerCounts(newServers);
      state.init = true;
    },
    SET_PROFILE(state, profile) {
      state.profile = profile;
    },
    SET_SETTING(state, setting) {
      state.setting = setting;
    },
    SET_SERVER_LIST_COLUMN_WIDTHS(state, widths) {
      state.serverListColumnWidths = widths;
    },
  },
  actions: {
    /**
     * 加载服务器列表
     */
    async initServerInfo({ commit }, params) {
      isFirstWsSnapshot = true;
      const {
        route,
      } = params || {};
      loadNezhaV1ServerGroup().then((res) => {
        if (res) {
          commit('SET_SERVER_GROUP', res);
        }
      });
      loadNezhaV1Setting().then((res) => {
        if (res) {
          commit('SET_SETTING', res);
          const title = res.config?.site_name || res.site_name;
          if (title) {
            config.nazhua.title = title;
            if (route?.name === 'Home' || !route) {
              document.title = config.nazhua.title;
            }
          }
        }
      });
      loadNezhaV1Profile().then((res) => {
        if (res) {
          commit('SET_PROFILE', res);
        }
      });
    },
    /**
     * 开始监听ws消息
     */
    watchWsMsg({
      commit,
      state,
    }) {
      msg.on('servers', (res) => {
        if (res) {
          if (res.now) {
            commit('SET_SERVER_TIME', res.now);
          }

          const servers = res.servers?.map?.((v1Server) => {
            const normalized = normalizeV1Server(v1Server, state.serverGroupNameById?.[v1Server?.id]);
            normalized.online = computeOnlineStatus(normalized.LastActive, res.now);
            return normalized;
          }) || [];
          if (isFirstWsSnapshot) {
            isFirstWsSnapshot = false;
            commit('SET_SERVERS', servers);
          } else {
            commit('UPDATE_SERVERS', servers);
          }
        }
      });
    },
    /**
     * 设置服务器列表行宽度
     */
    setServerListColumnWidths({
      commit,
      state,
    }, data) {
      const newWidths = {
        ...state.serverListColumnWidths,
        ...data,
      };
      commit('SET_SERVER_LIST_COLUMN_WIDTHS', newWidths);
    },
    setServerListColumnWidth({
      commit,
      state,
    }, data) {
      const newWidths = {
        ...state.serverListColumnWidths,
      };
      if (newWidths[data.prop]) {
        newWidths[data.prop] = Math.max(newWidths[data.prop], data.width);
      } else {
        newWidths[data.prop] = data.width;
      }
      commit('SET_SERVER_LIST_COLUMN_WIDTHS', newWidths);
    },
  },
});

export default store;
