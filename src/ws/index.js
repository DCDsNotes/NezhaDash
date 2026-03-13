import config from '@/config';
import MessageSubscribe from '@/utils/subscribe';

import WSService, { WS_CONNECTION_STATUS } from './service';

/**
 * 获取 WebSocket 路径（v1 only）
 */
function getWsApiPath() {
  const url = config?.nazhua?.v1WsPath;
  const a = document.createElement('a');
  a.href = url;
  return a.href.replace(/^http/, 'ws');
}

const msg = new MessageSubscribe();
const wsService = new WSService({
  wsUrl: getWsApiPath(),
  onConnect: () => {
    msg.emit('connect');
  },
  onClose: () => {
    msg.emit('close');
  },
  onError: (error) => {
    msg.emit('error', error);
  },
  onMessage: (data) => {
    // 消息体包含.now和.servers 粗暴的判定为服务器列表项信息
    if (data?.now && data?.servers) {
      msg.emit('servers', data);
    } else {
      msg.emit('message', data);
    }
  },
});

function restart() {
  if (wsService.connected !== WS_CONNECTION_STATUS.DISCONNECTED) {
    wsService.close();
  }
  wsService.active();
}

export {
  wsService,
  msg,
  restart,
};

export default (actived) => {
  if (wsService.connected === WS_CONNECTION_STATUS.CONNECTED) {
    if (actived) {
      actived();
    }
    return;
  }
  msg.once('connect', () => {
    if (actived) {
      actived();
    }
  });
  // 如果已经连接中，则不再连接
  if (wsService.connected === WS_CONNECTION_STATUS.CONNECTING) {
    return;
  }
  wsService.active();
};
