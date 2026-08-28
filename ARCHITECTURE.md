# 前端架构与功能说明

## 技术栈

- 构建：Vite 6、TypeScript、React 19
- 路由：React Router 7 Data Router
- 服务端状态：TanStack Query 5
- 实时状态：原生 WebSocket + React Context
- 样式：Tailwind CSS 3、shadcn 风格本地组件、Radix UI Primitives
- 国际化：基于 `useSyncExternalStore` 的轻量本地词典

## 运行时结构

```text
main.tsx
└─ AppProviders
   ├─ QueryClientProvider
   └─ WebSocketProvider
      ├─ RouterProvider
      │  └─ App
      │     ├─ RefreshToast
      │     └─ ProbeWorkspace
      │        ├─ SiteHeader
      │        ├─ Outlet
      │        ├─ TransferDialog
      │        └─ MapDialog（按需加载）
```

`src/providers.tsx` 只负责跨路由 Provider。`src/router.tsx` 只负责路由表。`src/App.tsx` 负责站点设置、自定义代码注入、背景和错误边界，`ProbeWorkspace` 负责页首、单列内容容器、页尾以及地图和流量弹层。首页与详情页均使用约 720px 的居中内容列；节点筛选、分组和排序位于首页“当前状态”区。视觉语言参考 SimpleStatus 的窄幅状态流、低装饰卡片和清晰状态层级，但业务语义与数据契约仍属于哪吒探针。

## 路由与页面

| 路径                 | 页面                     | 功能                                                     |
| -------------------- | ------------------------ | -------------------------------------------------------- |
| `/`                  | `pages/Server.tsx`       | 系统状态、实时上下行、节点状态、到期续费和资源概览       |
| `/server/:serverKey` | `pages/ServerDetail.tsx` | 单服务器状态、系统信息、实时速度、速度历史、网络监控历史 |
| `/network`            | `pages/NetworkDiagnostics.tsx` | IP、网站分流、连通性、泄露与 AI 出口检测              |
| `/error`             | `pages/ErrorPage.tsx`    | 通用错误展示                                             |
| `*`                  | `pages/NotFound.tsx`     | 404 与返回首页                                           |

`serverKey` 由服务器 ID 的 MD5 前 8 位生成。原始 ID 不出现在详情页 URL 中。

## 数据流

### HTTP 与 TanStack Query

`src/lib/nezha-api.ts` 是唯一 HTTP 访问层，统一处理 URL、HTTP 状态、JSON 解析和后端 `error` 字段。`src/lib/query-options.ts` 集中维护 Query Key 与默认刷新策略。

| Query Key          | 接口                       | 消费位置             |
| ------------------ | -------------------------- | -------------------- |
| `setting`          | `/api/v1/setting`          | App、ProbeWorkspace  |
| `login-user`       | `/api/v1/profile`          | 工作台管理后台入口   |
| `server-group`     | `/api/v1/server-group`     | 工作台节点浏览与筛选 |
| `server-speed/:id` | `/api/v1/server-speed/:id` | 详情页速度图         |
| `monitor/:id`      | `/api/v1/service/:id`      | 详情页监控图         |

### WebSocket 实时状态

`WebSocketProvider` 连接 `/api/v1/ws/server`，负责带随机抖动的断线指数退避、30 秒单次消息陈旧检测以及在线/可见性恢复。页面进入后台或浏览器离线时主动断开，恢复可见后自动取得最新快照，避免后台标签持续消耗服务器和浏览器资源。实时消息会在动画帧内合并，只渲染最新快照。

实时消息包含服务端时间和完整服务器数组。`useServerWorkspace` 将节点分组、状态、搜索、排序、统计、流量和位置聚合为同一份路由上下文；工作台、总览和搜索复用这份数据，详情页继续从同一个 WebSocket Context 读取，避免为高频消息建立多个连接。

### 视图模型

`src/lib/server-normalizer.ts` 负责原始服务器数据归一化。`src/lib/server-view-model.ts` 将归一化结果转换为卡片、Header、详情信息和环形图所需的显示模型。组件不应再次复制流量、在线状态、账单周期或单位换算逻辑。

### UI 状态与浏览器存储

- React Context：WebSocket 数据与连接控制（拆分上下文，避免无关广播）
- 组件 state：在线筛选、排序、弹层开关、图表范围、监控曲线选择
- `sessionStorage`：分组、滚动位置、公共备注缓存、自定义背景
- `localStorage`：语言、监控聚合/刷新/削峰偏好

服务端数据进入 TanStack Query 或 WebSocket Context。短期交互状态保留在组件中，不写入 Query Cache。

## 组件层

`src/components/ui` 是本地拥有的 shadcn 风格组件代码。Dialog、DropdownMenu、Switch 和 ToggleGroup 由 Radix UI 提供焦点管理、键盘交互、ARIA 与 Portal 行为，Button 使用 Radix Slot 支持 `asChild`。

业务组件中的数据逻辑与图表契约保持稳定。详情页图表统一复用 `ServerMonitorTimeRange`、`ServerMonitorCategoryContent` 和 `ServerMonitorPlaceholder`，时间与数值边界处理集中在 `src/lib`，避免速度和监控视图分别维护相同契约。`src/styles/probe.css` 定义工作台的网格、色彩、间距和响应式覆盖，`workspace.css` 只保留首屏和弹层样式，详情样式随详情路由按需加载。Tailwind 用于基础组件状态、可访问焦点和尺寸；领域图表继续由独立 CSS 和 SVG 组件绘制。

## 核心功能

- 实时显示服务器在线状态，并优先呈现上下行速度、到期时间与剩余天数
- 总览聚合实时网络、当前可用率、节点状态、到期续费和资源占用
- 按后端分组、在线状态和资源字段筛选排序
- 世界地图聚合在线服务器位置并显示位置提示
- `Ctrl/Cmd+K` 打开服务器搜索
- 解析 `public_note` 中的账单、套餐、标签和自定义标语
- 详情页展示硬件、系统、温度、连接、启动与活跃时间
- 延迟与丢包监控支持聚合/拆分、自动刷新、削峰和时间范围切换
- 网络速度历史支持 30 分钟到 24 小时范围
- PWA Service Worker 缓存静态资源，API 请求不进入缓存
- 后端 `custom_code` 可注入脚本、样式、Meta 和页面节点

## 扩展约束

- 生产构建默认部署在站点根路径 `/`，静态资源使用根路径绝对地址，确保详情页直接刷新时仍能加载 CSS、脚本和 manifest。部署到子路径时使用 `VITE_BASE_PATH=/子路径/` 构建，并让 Web 服务器将该路径下的前端路由回退到 `index.html`。
- 保持 `/api/v1` 与 WebSocket 消息结构兼容哪吒监控 V1。
- 新 HTTP 查询应先加入 `nezha-api.ts`，再在 `query-options.ts` 声明 Query Key。
- 新弹层、菜单、开关和分段选择应优先复用 `components/ui`，不要在业务组件中重新实现焦点或 Portal。
- URL、主导航、`public_note` 格式和自定义代码全局变量属于兼容接口，修改前需要同步后端。
- `custom_code` 会执行后端返回的脚本，只能连接可信的哪吒面板实例。
- 网络诊断只在用户点击后执行分流、连通性、泄露和 AI 检测。AI 风险信息默认由 `whatismyip.ai` 查询，每个唯一出口 IP 在内存中缓存 24 小时；可通过 `window.NetworkDiagnosticsConfig.aiRiskEndpoint = "/api/ip-risk/{ip}"` 替换为自有同源接口。
