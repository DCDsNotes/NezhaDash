import { type Page, type TestInfo, expect, test } from "@playwright/test"

const now = Date.now()

const servers = [
  {
    id: 1,
    name: "上海边缘节点",
    public_note: JSON.stringify({
      billingDataMod: {
        startDate: "2026-01-01",
        endDate: "2027-01-01",
        autoRenewal: "1",
        cycle: "Year",
        amount: "99",
      },
      planDataMod: {
        bandwidth: "1000Mbps",
        trafficVol: "2TB",
        trafficType: "1",
        IPv4: "1",
        IPv6: "1",
        networkRoute: "CN2 GIA",
        extra: "边缘计算",
      },
      customData: {},
    }),
    last_active: new Date(now - 5_000).toISOString(),
    country_code: "CN",
    host: {
      platform: "ubuntu",
      platform_version: "24.04 LTS",
      cpu: ["Intel(R) Xeon(R) Gold 6338 CPU @ 2.00GHz"],
      gpu: [],
      mem_total: 8 * 1024 ** 3,
      disk_total: 160 * 1024 ** 3,
      swap_total: 2 * 1024 ** 3,
      arch: "x86_64",
      boot_time: Math.floor((now - 14 * 86400_000) / 1000),
      version: "1.12.0",
    },
    state: {
      cpu: 28.4,
      mem_used: 3.2 * 1024 ** 3,
      swap_used: 0.2 * 1024 ** 3,
      disk_used: 64 * 1024 ** 3,
      net_in_transfer: 320 * 1024 ** 3,
      net_out_transfer: 180 * 1024 ** 3,
      net_in_speed: 18 * 1024 ** 2,
      net_out_speed: 7 * 1024 ** 2,
      uptime: 14 * 86400,
      load_1: 0.52,
      load_5: 0.44,
      load_15: 0.38,
      tcp_conn_count: 142,
      udp_conn_count: 28,
      process_count: 186,
      temperatures: [{ Name: "CPU", Temperature: 54.2 }],
      gpu: [],
    },
    transfer_stats: {
      today: { in: 12 * 1024 ** 3, out: 8 * 1024 ** 3 },
      billing: { in: 320 * 1024 ** 3, out: 180 * 1024 ** 3 },
    },
  },
  {
    id: 2,
    name: "法兰克福备份节点",
    public_note: "",
    last_active: new Date(now - 120_000).toISOString(),
    country_code: "DE",
    host: {
      platform: "debian",
      platform_version: "12",
      cpu: ["AMD EPYC 7543P 32-Core Processor"],
      gpu: [],
      mem_total: 4 * 1024 ** 3,
      disk_total: 80 * 1024 ** 3,
      swap_total: 0,
      arch: "x86_64",
      boot_time: Math.floor((now - 7 * 86400_000) / 1000),
      version: "1.12.0",
    },
    state: {
      cpu: 0,
      mem_used: 0,
      swap_used: 0,
      disk_used: 22 * 1024 ** 3,
      net_in_transfer: 90 * 1024 ** 3,
      net_out_transfer: 45 * 1024 ** 3,
      net_in_speed: 0,
      net_out_speed: 0,
      uptime: 7 * 86400,
      load_1: 0,
      load_5: 0,
      load_15: 0,
      tcp_conn_count: 0,
      udp_conn_count: 0,
      process_count: 0,
      temperatures: [],
      gpu: [],
    },
    transfer_stats: {
      today: { in: 0, out: 0 },
      billing: { in: 90 * 1024 ** 3, out: 45 * 1024 ** 3 },
    },
  },
]

const wsPayload = { now, servers }

async function mockBackend(
  page: Page,
  getWebSocketPayload: () => unknown = () => wsPayload,
  historyDelayMs = 0,
) {
  await page.routeWebSocket("**/api/v1/ws/server", (webSocket) => {
    webSocket.send(JSON.stringify(getWebSocketPayload()))
  })

  await page.route("**/api/v1/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) })

    if (pathname.endsWith("/setting")) {
      await json({
        success: true,
        data: {
          config: { debug: false, language: "zh-CN", site_name: "哪吒监控", user_template: "", admin_template: "", custom_code: "" },
          version: "1.0.0",
        },
      })
      return
    }

    if (pathname.endsWith("/server-group")) {
      await json({
        success: true,
        data: [
          { group: { id: 1, created_at: "", updated_at: "", name: "核心节点" }, servers: [1] },
          { group: { id: 2, created_at: "", updated_at: "", name: "备份节点" }, servers: [2] },
        ],
      })
      return
    }

    if (pathname.endsWith("/profile")) {
      await json({ error: "unauthorized" }, 401)
      return
    }

    if (pathname.endsWith("/server-speed/1")) {
      if (historyDelayMs) await new Promise((resolve) => setTimeout(resolve, historyDelayMs))
      await json({
        success: true,
        data: {
          server_id: 1,
          server_name: servers[0].name,
          created_at: [now / 1000 - 3600, now / 1000 - 1800, now / 1000 - 600],
          net_in_speed: [4 * 1024 ** 2, 9 * 1024 ** 2, 12 * 1024 ** 2],
          net_out_speed: [2 * 1024 ** 2, 5 * 1024 ** 2, 4 * 1024 ** 2],
        },
      })
      return
    }

    if (pathname.endsWith("/service/1")) {
      if (historyDelayMs) await new Promise((resolve) => setTimeout(resolve, historyDelayMs))
      await json({
        success: true,
        data: [
          {
            monitor_id: 11,
            monitor_name: "上海 TCP",
            server_id: 1,
            server_name: servers[0].name,
            created_at: [now / 1000 - 3600, now / 1000 - 1800, now / 1000 - 600],
            avg_delay: [24, 29, 22],
            packet_loss: [0, 0.5, 0],
          },
          {
            monitor_id: 12,
            monitor_name: "东京 ICMP",
            server_id: 1,
            server_name: servers[0].name,
            created_at: [now / 1000 - 3600, now / 1000 - 1800, now / 1000 - 600],
            avg_delay: [48, 51, 45],
            packet_loss: [0, 1, 0],
          },
        ],
      })
      return
    }

    await json({ error: `unhandled mock: ${pathname}` }, 404)
  })
}

async function assertNoHorizontalOverflow(page: Page) {
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  expect(hasOverflow).toBe(false)
}

async function assertCenteredStatusColumn(page: Page) {
  const layout = await page.locator(".status-page").evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return { width: rect.width, left: rect.left, viewport: window.innerWidth }
  })
  expect(layout.width).toBeLessThanOrEqual(761)
  expect(Math.abs(layout.left - (layout.viewport - layout.width) / 2)).toBeLessThanOrEqual(1)
}

async function assertPageScrollControls(page: Page, bottomOffset: number) {
  const controls = page.locator(".probe-page-scroll-controls")
  await expect(controls).toBeVisible()
  await expect(page.getByRole("button", { name: "滚动到底部" })).toBeVisible()
  const controlsBox = await controls.boundingBox()
  expect(controlsBox).not.toBeNull()
  expect(Math.abs(page.viewportSize()!.height - controlsBox!.y - controlsBox!.height - bottomOffset)).toBeLessThanOrEqual(1)
}

async function screenshot(page: Page, testInfo: TestInfo, name: string) {
  await page.screenshot({ path: testInfo.outputPath(name), fullPage: true, animations: "disabled" })
}

test("dashboard interactions remain usable on desktop and mobile", async ({ page }, testInfo) => {
  test.setTimeout(90_000)
  let worldMapRequestCount = 0
  let serverSpeedRequestCount = 0
  let monitorRequestCount = 0
  page.on("request", (request) => {
    const pathname = new URL(request.url()).pathname
    if (request.resourceType() === "image" && pathname.endsWith("/world-map.svg")) worldMapRequestCount += 1
    if (pathname.endsWith("/server-speed/1")) serverSpeedRequestCount += 1
    if (pathname.endsWith("/service/1")) monitorRequestCount += 1
  })

  await mockBackend(page, () => wsPayload, 800)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto("/")

  await assertPageScrollControls(page, 56)
  await expect(page.getByRole("button", { name: "滚动到顶部" })).toHaveCount(0)
  await page.getByRole("button", { name: "滚动到底部" }).click()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(240)
  await expect(page.getByRole("button", { name: "滚动到顶部" })).toBeVisible()
  await page.getByRole("button", { name: "滚动到顶部" }).click()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(1)
  await expect(page.getByRole("button", { name: "滚动到顶部" })).toHaveCount(0)
  await expect(page).toHaveTitle("节点监控")
  await expect(page.locator(".probe-site-brand strong")).toHaveText("节点监控")
  await expect(page.locator(".probe-node-item")).toHaveCount(2)
  await expect(page.locator(".probe-node-item__identity").first()).toHaveCSS("width", "260px")
  await expect(page.locator(".probe-node-item__speeds").first()).toHaveCSS("width", "200px")
  await expect(page.locator(".status-hero > p")).toHaveText(/^最后更新：\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  const primaryNode = page.locator(".probe-node-item").filter({ hasText: "上海边缘节点" })
  await expect(primaryNode).toBeVisible()
  await expect(primaryNode).not.toContainText("运行正常")
  await expect(primaryNode).toContainText(/已运行\s*14天/)
  await expect(primaryNode).toContainText("18M/s")
  await expect(primaryNode).toContainText("7M/s")
  await expect(primaryNode).toContainText("CPU28.4%")
  await expect(primaryNode).toContainText("内存40%")
  await expect(primaryNode).toContainText("硬盘40%")
  await expect(primaryNode).toContainText("2027-01-01")
  await expect(primaryNode).toContainText(/剩余\s*\d+\s*天/)
  await expect(page.locator(".probe-site-header")).toBeVisible()
  await expect(page.locator(".probe-site-action--dashboard")).toHaveCSS("width", "34px")
  await expect(page.locator(".probe-site-action--dashboard span")).toHaveCount(0)
  const probeRadius = await page.evaluate(() => window.getComputedStyle(document.documentElement).getPropertyValue("--probe-radius").trim())
  expect(probeRadius).toBe("5px")
  await page.context().setOffline(true)
  const networkNotice = page.locator(".network-status-notice")
  await expect(networkNotice).toBeVisible()
  await expect(networkNotice).toContainText("网络连接已断开")
  await expect(networkNotice).toContainText("恢复连接后将自动更新")
  await screenshot(page, testInfo, "network-offline-desktop.png")
  await page.context().setOffline(false)
  await expect(networkNotice).toHaveCount(0)
  await expect(page.locator(".status-network")).toContainText("18M/s")
  await expect(page.locator(".status-network")).toContainText("7M/s")
  await expect(page.locator(".status-current .status-panel__header")).toContainText(/\d+\/\d+/)
  await expect(page.locator(".probe-site-footer")).toHaveCount(0)
  await page.locator(".status-facts__action").click()
  await expect(page.locator(".status-renewal-dialog")).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(page.locator(".status-renewal-dialog")).toHaveCount(0)
  await expect(page.locator(".probe-sidebar, .probe-browser, .probe-mobile-nav")).toHaveCount(0)
  await assertCenteredStatusColumn(page)
  await assertNoHorizontalOverflow(page)

  await page.getByRole("button", { name: /离线节点 1/ }).click()
  await expect(page.locator(".probe-node-item")).toHaveCount(1)
  await expect(page.locator(".status-current .status-panel__header")).toContainText("1/2")
  await expect(page.locator(".status-network")).toContainText("18M/s")
  await expect(page.locator(".status-network")).toContainText("7M/s")
  await page.getByRole("button", { name: /全部状态 2/ }).click()

  await page.getByRole("searchbox", { name: "搜索节点" }).fill("上海")
  await expect(page.locator(".probe-node-item")).toHaveCount(1)
  await page.getByRole("searchbox", { name: "搜索节点" }).fill("")

  const groupTrigger = page.getByRole("button", { name: "节点分组：全部节点" })
  await expect(groupTrigger).toHaveCSS("font-weight", "400")
  await groupTrigger.click()
  const groupMenu = page.locator(".server-sort-dropdown:visible")
  await expect(groupMenu).toHaveCSS("background-color", "rgb(255, 255, 255)")
  await expect(groupMenu.locator(".server-sort-dropdown__label").first()).toHaveCSS("font-weight", "600")
  await expect(page.getByRole("menuitemradio", { name: "全部节点 2" })).toHaveCSS("color", "rgb(8, 127, 79)")
  await screenshot(page, testInfo, "group-menu-desktop.png")
  await page.getByRole("menuitemradio", { name: "核心节点 1" }).click()
  await expect(page.locator(".probe-node-item")).toHaveCount(1)
  await page.getByRole("button", { name: "节点分组：核心节点" }).click()
  await page.getByRole("menuitemradio", { name: "全部节点 2" }).click()

  await expect.poll(() => worldMapRequestCount).toBe(0)
  await page.getByLabel("查看节点地图").click()
  await expect(page.getByRole("dialog", { name: "节点地图" })).toBeVisible()
  await expect(page.locator(".world-map-img")).toHaveCSS("background-image", /world-map[^"]*\.svg/)
  await screenshot(page, testInfo, "map-desktop.png")
  await page.getByRole("button", { name: "关闭" }).click()
  await page.getByLabel("查看节点地图").click()
  await expect(page.getByRole("dialog", { name: "节点地图" })).toBeVisible()
  await page.getByRole("button", { name: "关闭" }).click()
  expect(worldMapRequestCount).toBe(1)

  const sortTrigger = page.getByLabel(/排序字段/)
  const initialSortWidth = (await sortTrigger.boundingBox())?.width
  await expect(sortTrigger).toHaveCSS("width", "112px")
  await expect(sortTrigger).toHaveCSS("font-weight", "400")
  await expect(sortTrigger.locator(".server-sort__selected-value")).toHaveCSS("text-align", "left")
  await expect(sortTrigger.locator(".server-sort__selected-value")).toHaveCSS("font-weight", "400")
  await sortTrigger.click()
  const sortMenu = page.locator(".server-sort-dropdown:visible")
  await expect(sortMenu).toHaveCSS("background-color", "rgb(255, 255, 255)")
  await expect(sortMenu.locator(".server-sort-dropdown__label").first()).toHaveCSS("font-weight", "600")
  const [sortMenuBox, statusPanelBox] = await Promise.all([sortMenu.boundingBox(), page.locator(".status-current").boundingBox()])
  expect(sortMenuBox).not.toBeNull()
  expect(statusPanelBox).not.toBeNull()
  expect(sortMenuBox!.x + sortMenuBox!.width).toBeLessThanOrEqual(statusPanelBox!.x + statusPanelBox!.width + 1)
  await expect(page.getByRole("menuitemradio", { name: "1分钟负载" })).toBeVisible()
  await screenshot(page, testInfo, "sort-menu-desktop.png")
  await page.getByRole("menuitemradio", { name: "1分钟负载" }).click()
  const selectedSortWidth = (await sortTrigger.boundingBox())?.width
  await expect(sortTrigger).toHaveCSS("width", "112px")
  expect(initialSortWidth).toBeDefined()
  expect(selectedSortWidth).toBeDefined()
  expect(Math.abs(selectedSortWidth! - initialSortWidth!)).toBeLessThanOrEqual(1)

  await page.keyboard.press("Control+K")
  await expect(page.getByRole("dialog", { name: "搜索服务器" })).toBeVisible()
  await page.getByRole("searchbox", { name: "搜索服务器" }).fill("上海")
  await expect(page.locator(".dashboard-search-result")).toHaveCount(1)
  await page.getByLabel("关闭搜索").click()

  await page.getByTitle("查看今日流量").click()
  await expect(page.getByRole("dialog", { name: "今日流量" })).toBeVisible()
  await expect(page.locator(".dashboard-transfer-row")).toHaveCount(2)
  const transferValuePositions = await page.locator(".dashboard-transfer-row__values").evaluateAll((rows) =>
    rows.map((row) =>
      Array.from(row.children).map((value) => {
        const rect = value.getBoundingClientRect()
        return { left: rect.left, top: rect.top }
      }),
    ),
  )
  for (let column = 0; column < 3; column += 1) {
    const leftPositions = transferValuePositions.map((row) => row[column].left)
    expect(Math.max(...leftPositions) - Math.min(...leftPositions)).toBeLessThanOrEqual(1)
  }
  for (const row of transferValuePositions) {
    expect(Math.max(...row.map((value) => value.top)) - Math.min(...row.map((value) => value.top))).toBeLessThanOrEqual(1)
  }
  await page.getByRole("button", { name: "关闭" }).click()
  await screenshot(page, testInfo, "dashboard-desktop.png")

  await page.goto("/missing-node-page")
  await expect(page.getByRole("heading", { name: "页面不存在" })).toBeVisible()
  await expect(page).toHaveTitle("页面不存在 - 节点监控")
  await expect(page.locator(".not-found-page__path")).toContainText("/missing-node-page")
  await expect(page.locator(".not-found-page__visual")).toBeVisible()
  await expect(page.locator(".probe-page-scroll-controls")).toHaveCount(0)
  await assertNoHorizontalOverflow(page)
  await screenshot(page, testInfo, "not-found-desktop.png")
  await Promise.all([page.waitForURL(/\/$/), page.getByRole("link", { name: "回到主页" }).click()])

  await Promise.all([page.waitForURL(/\/server\/25ce76bd$/), page.getByLabel("查看 上海边缘节点 详情").click()])
  const speedLoadingIndicator = page.locator(".server-speed .server-monitor__loading-indicator")
  await expect(speedLoadingIndicator).toBeVisible()
  const monitorPanel = page.locator(".server-monitor:not(.server-speed)")
  await monitorPanel.scrollIntoViewIfNeeded()
  await expect(monitorPanel.locator(".server-monitor__loading-indicator")).toBeVisible()
  await expect(speedLoadingIndicator).toHaveCount(0)
  await expect(monitorPanel.locator(".server-monitor__loading-indicator")).toHaveCount(0)
  await page.getByRole("button", { name: "滚动到顶部" }).click()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(1)
  await expect(page).toHaveTitle("上海边缘节点 - 节点监控")
  await expect(page.getByText("网络速度", { exact: true })).toBeVisible()
  await expect(page.locator(".probe-detail-priority")).toContainText("18M/s")
  await expect(page.locator(".probe-detail-priority")).toContainText("7M/s")
  await expect(page.locator(".probe-detail-priority")).toContainText("2027-01-01")
  await expect(page.locator(".probe-detail-priority")).toContainText(/\d+\s*天/)
  await expect(page.locator(".server-detail-header__cpu-model")).toHaveCSS("color", "rgb(82, 102, 124)")
  await expect(page.locator(".probe-detail-priority strong").first()).toHaveCSS("align-items", "center")
  const priorityRows = await page.locator(".probe-detail-priority > div").evaluateAll((items) =>
    items.map((item) => {
      const label = item.querySelector("span")!.getBoundingClientRect()
      const value = item.querySelector("strong")!.getBoundingClientRect()
      return { labelTop: label.top, valueTop: value.top }
    }),
  )
  expect(Math.max(...priorityRows.map((row) => row.labelTop)) - Math.min(...priorityRows.map((row) => row.labelTop))).toBeLessThanOrEqual(1)
  expect(Math.max(...priorityRows.map((row) => row.valueTop)) - Math.min(...priorityRows.map((row) => row.valueTop))).toBeLessThanOrEqual(1)
  await expect(page.getByRole("switch")).toHaveCount(3)
  await expect(page.getByRole("switch").nth(0)).toBeChecked()
  await expect(page.getByRole("switch").nth(1)).toBeChecked()
  await expect(page.getByRole("switch").nth(2)).not.toBeChecked()
  await expect(page.getByRole("switch").nth(2)).toHaveCSS("background-color", "rgb(227, 230, 232)")
  const ringThickness = await page
    .locator(".ring-circle")
    .first()
    .evaluate((element) => {
      return window.getComputedStyle(element).getPropertyValue("--ring-thickness").trim()
    })
  expect(ringThickness).toBe("5px")
  const activeMinuteOptions = page.locator(".server-monitor__minute--active")
  await expect(activeMinuteOptions).toHaveCount(2)
  await expect(activeMinuteOptions.first()).toHaveCSS("text-shadow", "none")
  await expect(activeMinuteOptions.last()).toHaveCSS("text-shadow", "none")
  const axisLabels = page.locator(".server-detail-page .chart-axis-labels text")
  await expect(axisLabels.first()).toHaveAttribute("font-size", "10")
  await expect(axisLabels.first()).toHaveAttribute("font-weight", "600")
  expect(await axisLabels.evaluateAll((labels) => labels.every((label) => label.getAttribute("font-size") === "10" && label.getAttribute("font-weight") === "600"))).toBe(true)
  const [detailPageBox, scrollControlsBox] = await Promise.all([
    page.locator(".server-detail-page").boundingBox(),
    page.locator(".probe-page-scroll-controls").boundingBox(),
  ])
  expect(detailPageBox).not.toBeNull()
  expect(scrollControlsBox).not.toBeNull()
  expect(scrollControlsBox!.x - (detailPageBox!.x + detailPageBox!.width)).toBeGreaterThanOrEqual(9)
  expect(scrollControlsBox!.x - (detailPageBox!.x + detailPageBox!.width)).toBeLessThanOrEqual(11)
  expect(Math.abs(page.viewportSize()!.height - scrollControlsBox!.y - scrollControlsBox!.height - 56)).toBeLessThanOrEqual(1)
  await page.getByRole("button", { name: "滚动到底部" }).click()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100)
  await page.getByRole("button", { name: "滚动到顶部" }).click()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(1)
  const speedChart = page.locator(".server-speed .line-box")
  await speedChart.hover()
  const speedTooltip = speedChart.locator(".chart-tooltip")
  await expect(speedTooltip).toBeVisible()
  await expect(speedTooltip).toHaveCSS("background-color", "rgba(239, 243, 247, 0.98)")
  await expect(speedTooltip).toHaveCSS("color", "rgb(36, 50, 72)")
  const monitorChart = page.locator(".server-monitor:not(.server-speed) .line-box").first()
  await monitorChart.hover()
  const monitorTooltip = monitorChart.locator(".chart-tooltip")
  await expect(monitorTooltip).toBeVisible()
  await expect(monitorTooltip).toHaveCSS("background-color", "rgba(239, 243, 247, 0.98)")
  await expect(monitorTooltip).toHaveCSS("color", "rgb(36, 50, 72)")
  await assertNoHorizontalOverflow(page)
  await screenshot(page, testInfo, "server-detail-desktop.png")

  await expect.poll(() => serverSpeedRequestCount).toBe(1)
  await expect.poll(() => monitorRequestCount).toBe(1)
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" })
    document.dispatchEvent(new Event("visibilitychange"))
  })
  await expect(page.locator(".server-detail-header")).toBeVisible()
  await expect(page.locator(".server-detail-skeleton")).toHaveCount(0)
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" })
    document.dispatchEvent(new Event("visibilitychange"))
  })
  await expect(page.locator(".server-detail-header")).toBeVisible()
  await expect(page.locator(".server-detail-skeleton")).toHaveCount(0)
  await expect.poll(() => serverSpeedRequestCount).toBe(1)
  await expect.poll(() => monitorRequestCount).toBe(1)

  await page.reload()
  await expect(page).toHaveURL(/\/server\/25ce76bd$/)
  await expect(page).toHaveTitle("上海边缘节点 - 节点监控")
  await expect(page.getByText("网络速度", { exact: true })).toBeVisible()
  await expect(page.locator(".probe-detail-priority")).toContainText("18M/s")

  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto("/")
  await expect(page.locator(".probe-node-item")).toHaveCount(2)
  await assertCenteredStatusColumn(page)
  await assertNoHorizontalOverflow(page)
  await screenshot(page, testInfo, "dashboard-tablet.png")

  await page.goto("/server/25ce76bd")
  await expect(page.getByText("网络速度", { exact: true })).toBeVisible()
  await assertNoHorizontalOverflow(page)
  await screenshot(page, testInfo, "server-detail-tablet.png")

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/")
  await expect(page.locator(".probe-node-item")).toHaveCount(2)
  const resourceCells = page.locator(".status-resources__grid > div")
  await expect(resourceCells).toHaveCount(3)
  await expect(resourceCells.nth(0)).toHaveCSS("border-bottom-width", "0px")
  await expect(resourceCells.nth(1)).toHaveCSS("border-bottom-width", "0px")
  await expect(resourceCells.nth(1)).toHaveCSS("border-right-width", "1px")
  await expect(resourceCells.nth(2)).toHaveCSS("border-right-width", "0px")
  await assertCenteredStatusColumn(page)
  await assertNoHorizontalOverflow(page)
  await screenshot(page, testInfo, "dashboard-mobile.png")

  await page.getByRole("button", { name: "查看节点地图" }).click()
  await expect(page.getByRole("dialog", { name: "节点地图" })).toBeVisible()
  await assertNoHorizontalOverflow(page)
  await screenshot(page, testInfo, "map-mobile.png")
  await page.getByRole("button", { name: "关闭" }).click()

  await page.goto("/server/25ce76bd")
  await expect(page.getByText("网络速度", { exact: true })).toBeVisible()
  await expect(page.getByRole("switch")).toHaveCount(3)
  await assertPageScrollControls(page, 40)
  await expect(page.getByRole("button", { name: "滚动到顶部" })).toHaveCount(0)
  const [mobileDetailPageBox, mobileScrollButtonBox] = await Promise.all([
    page.locator(".server-detail-page").boundingBox(),
    page.getByRole("button", { name: "滚动到底部" }).boundingBox(),
  ])
  expect(mobileDetailPageBox).not.toBeNull()
  expect(mobileScrollButtonBox).not.toBeNull()
  expect(Math.abs(mobileDetailPageBox!.x + mobileDetailPageBox!.width - (mobileScrollButtonBox!.x + mobileScrollButtonBox!.width))).toBeLessThanOrEqual(1)
  await page.locator(".probe-site-action:has(.ri-exchange-2-line)").click()
  const mobileTransferRows = page.locator(".dashboard-transfer-row")
  await expect(mobileTransferRows).toHaveCount(2)
  await expect(mobileTransferRows.first()).toHaveCSS("flex-direction", "row")
  const mobileTransferRowBox = await mobileTransferRows.first().boundingBox()
  expect(mobileTransferRowBox).not.toBeNull()
  expect(mobileTransferRowBox!.height).toBeLessThan(80)
  await assertNoHorizontalOverflow(page)
  await screenshot(page, testInfo, "server-detail-transfer-mobile.png")
  await page.getByRole("button", { name: "关闭" }).click()
  await screenshot(page, testInfo, "server-detail-mobile.png")

  await page.goto("/missing-node-page")
  await expect(page.getByRole("heading", { name: "页面不存在" })).toBeVisible()
  await expect(page).toHaveTitle("页面不存在 - 节点监控")
  await expect(page.locator(".probe-page-scroll-controls")).toHaveCount(0)
  await assertNoHorizontalOverflow(page)
  await screenshot(page, testInfo, "not-found-mobile.png")
})

test("server billing survives a restored mobile browser session with an incomplete websocket frame", async ({ page }) => {
  let omitPublicNotes = false
  await mockBackend(page, () => ({
    ...wsPayload,
    servers: omitPublicNotes ? servers.map((server) => ({ ...server, public_note: "" })) : servers,
  }))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/server/25ce76bd")

  const priority = page.locator(".probe-detail-priority")
  await expect(priority).toContainText("2027-01-01")
  await expect
    .poll(() => page.evaluate(() => Boolean(localStorage.getItem("nezha_public_notes_v1"))))
    .toBe(true)

  omitPublicNotes = true
  await page.evaluate(() => sessionStorage.clear())
  await page.reload()

  await expect(priority).toContainText("2027-01-01")
})

test("network diagnostics keeps expensive checks manual and switches grouped test cards", async ({ page }, testInfo) => {
  test.setTimeout(90_000)
  await mockBackend(page)
  let publicIpRequests = 0
  let fallbackIpRequests = 0
  let traceRequests = 0
  let headerRequests = 0
  let googleDnsRequests = 0
  let dnsRequests = 0
  let geographyRequests = 0
  let aiRiskRequests = 0
  let cloudflareTraceFailures = 0

  await page.route("https://my.ip.cn/", async (route) => {
    publicIpRequests += 1
    await route.fulfill({
      status: 200,
      contentType: "text/plain; charset=utf-8",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: "ip：198.51.100.88 归属地：美国 加利福尼亚 TestNet",
    })
  })

  await page.route("https://2026.ip138.com/", async (route) => {
    fallbackIpRequests += 1
    await route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: "<p>您的IP是：198.51.100.88 来自：美国</p>" })
  })

  await page.route(/https:\/\/(?:necaptcha\.nosdn\.127\.net|perfops\.byte-test\.com)\/.+/, async (route) => {
    headerRequests += 1
    const isNetease = new URL(route.request().url()).hostname.startsWith("necaptcha")
    await route.fulfill({
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Expose-Headers": "*",
        [isNetease ? "cdn-user-ip" : "x-request-ip"]: "198.51.100.10",
      },
      body: "",
    })
  })

  await page.route("**/cdn-cgi/trace", async (route) => {
    traceRequests += 1
    const hostname = new URL(route.request().url()).hostname
    const isChinaTarget = hostname.endsWith(".cn")
    if (["claude.ai", "anthropic.com", "chatgpt.com", "api.openai.com"].includes(hostname)) {
      await new Promise((resolve) => setTimeout(resolve, 30))
    }
    await route.fulfill({
      status: 200,
      contentType: "text/plain; charset=utf-8",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: `ip=${isChinaTarget ? "198.51.100.10" : "203.0.113.20"}\nloc=${isChinaTarget ? "CN" : "SG"}\n`,
    })
  })

  await page.route(/https:\/\/(?:www\.cloudflare\.com|cdnjs\.cloudflare\.com)\/cdn-cgi\/trace/, async (route) => {
    cloudflareTraceFailures += 1
    await route.abort("failed")
  })

  await page.route("https://dns.google/resolve?**", async (route) => {
    googleDnsRequests += 1
    await route.fulfill({
      status: 200,
      contentType: "application/json; charset=utf-8",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        Status: 0,
        Answer: [
          { name: "o-o.myaddr.l.google.com.", type: 16, TTL: 60, data: "172.253.244.1" },
          { name: "o-o.myaddr.l.google.com.", type: 16, TTL: 60, data: "edns0-client-subnet 198.51.100.0/24" },
        ],
      }),
    })
  })

  await page.route(/https:\/\/ipwho\.is\/.+/, async (route) => {
    geographyRequests += 1
    const ip = new URL(route.request().url()).pathname.slice(1)
    const location =
      ip === "203.0.113.20"
        ? { country: "United States", country_code: "US", region: "California", city: "Danville", connection: { isp: "AT&T Internet" } }
        : { country: "China", country_code: "CN", region: "Sichuan", city: "Chengdu", connection: { isp: "China Telecom" } }
    await route.fulfill({
      status: 200,
      contentType: "application/json; charset=utf-8",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        success: true,
        ...location,
        connection:
          ip === "203.0.113.20"
            ? { asn: 7018, org: "AT&T Internet", isp: "AT&T Internet" }
            : { asn: 4134, org: "China Telecom", isp: "China Telecom" },
        timezone:
          ip === "203.0.113.20"
            ? { id: "America/Los_Angeles", utc: "-07:00" }
            : { id: "Asia/Shanghai", utc: "+08:00" },
      }),
    })
  })

  await page.route(/https:\/\/whatismyip\.ai\/api\/lookup\/.+/, async (route) => {
    aiRiskRequests += 1
    const ip = new URL(route.request().url()).pathname.split("/").pop()
    await new Promise((resolve) => setTimeout(resolve, 750))
    await route.fulfill({
      status: 200,
      contentType: "application/json; charset=utf-8",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        success: true,
        data: {
          ip,
          location: { country: "United States", countryCode: "US", region: "California", city: "Danville", timezone: "America/Los_Angeles" },
          network: { isp: "AT&T Internet", org: "AT&T Internet", asn: "AS7018", connectionType: "residential" },
          security: { score: 0, isVpn: false, isProxy: false, isTor: false, isHosting: false, isBlacklisted: false },
        },
      }),
    })
  })

  await page.route("https://icons.duckduckgo.com/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/gif",
      body: Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64"),
    })
  })

  await page.route(/https:\/\/[a-f0-9]+\.edns\.ip-api\.com\/json/, async (route) => {
    dnsRequests += 1
    const isChinaResolver = dnsRequests % 2 === 1
    await route.fulfill({
      status: 200,
      contentType: "application/json; charset=utf-8",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        dns: isChinaResolver ? { ip: "125.64.134.133", geo: "China - China Telecom" } : { ip: "203.0.113.53", geo: "Singapore - Example Resolver" },
      }),
    })
  })

  await page.goto("/")
  const networkLink = page.getByRole("link", { name: "IP 分流与泄露检测" })
  await expect(networkLink).toBeVisible()
  await expect(page.locator(".probe-site-actions__search + a[aria-label='IP 分流与泄露检测']")).toHaveCount(1)

  await Promise.all([page.waitForURL(/\/network$/), networkLink.click()])
  await assertPageScrollControls(page, 56)
  await expect(page.getByRole("button", { name: "滚动到顶部" })).toHaveCount(0)
  await expect(page).toHaveTitle("分流查询 - 节点监控")
  await expect(page.getByRole("heading", { name: "网络与 IP 分流检测" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "我的 IP" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "网站分流测试" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "网络连通性测试" })).toHaveCount(0)
  await expect(page.getByRole("heading", { name: "DNS 泄露测试" })).toHaveCount(0)
  await expect(page.getByRole("heading", { name: "WebRTC 泄露测试" })).toHaveCount(0)
  await expect(page.getByRole("tab", { name: "分流检测" })).toHaveAttribute("aria-selected", "true")
  await expect(page.getByRole("tab", { name: "联通检测" }).locator(".ri-wifi-line")).toBeVisible()
  await expect(page.getByRole("tab", { name: "泄露检测" }).locator(".ri-shield-keyhole-line")).toBeVisible()
  await expect(page.getByRole("tab", { name: "AI 检测" }).locator(".ri-sparkling-2-line")).toBeVisible()
  await expect(page.locator(".network-diagnostics__table--split .network-diagnostics__table-row")).toHaveCount(36)
  await expect(page.getByText("未检测", { exact: true })).toHaveCount(36)
  await expect(page.locator(".network-diagnostics__card:visible")).toHaveCount(2)
  await expect(page.locator(".network-diagnostics__section-footer")).toHaveCount(0)
  await expect(page.getByText(/完整检测包含参考站的/)).toHaveCount(0)
  await expect(page.getByText("198.51.100.88", { exact: true })).toBeVisible()
  const headingMaskToggle = page.locator(".network-diagnostics__heading > .network-diagnostics__mask-toggle")
  await expect(headingMaskToggle).toHaveCount(1)
  const [headingBox, headingMaskBox] = await Promise.all([
    page.locator(".network-diagnostics__heading").boundingBox(),
    headingMaskToggle.boundingBox(),
  ])
  expect(headingBox).not.toBeNull()
  expect(headingMaskBox).not.toBeNull()
  expect(Math.abs(headingBox!.x + headingBox!.width - headingMaskBox!.x - headingMaskBox!.width)).toBeLessThanOrEqual(2)
  expect(Math.abs(headingBox!.y + headingBox!.height - headingMaskBox!.y - headingMaskBox!.height)).toBeLessThanOrEqual(3)
  await expect(page.locator(".network-diagnostics__intro > .network-diagnostics__privacy")).toBeVisible()
  await expect(page.locator(".network-diagnostics > .network-diagnostics__privacy")).toHaveCount(0)
  const maskIpToggle = page.getByRole("switch", { name: "隐藏 IP" })
  await expect(maskIpToggle).not.toBeChecked()
  await expect(maskIpToggle).toHaveCSS("width", "26px")
  await expect(maskIpToggle).toHaveCSS("height", "14px")
  await maskIpToggle.click()
  await expect(page.getByText("198.51.*.*", { exact: true })).toBeVisible()
  await maskIpToggle.click()
  await expect(maskIpToggle).not.toBeChecked()
  await expect(page.getByText("查询服务")).toHaveCount(0)
  await expect(page.getByText(/数据来源/)).toHaveCount(0)
  await expect(page.getByText("共 36 个站点，点击开始检测")).toBeVisible()
  await expect(page.getByRole("button", { name: "核心检测" })).toHaveCount(0)
  expect(publicIpRequests).toBe(1)
  expect(fallbackIpRequests).toBe(0)
  expect(traceRequests).toBe(0)
  expect(headerRequests).toBe(0)
  expect(googleDnsRequests).toBe(0)
  expect(dnsRequests).toBe(0)

  await page.getByRole("tab", { name: "AI 检测" }).click()
  await expect(page.getByRole("heading", { name: "Claude 与 ChatGPT 检测" })).toBeVisible()
  await expect(page.locator(".network-diagnostics__ai-panel-card")).toHaveCount(7)
  await expect(page.getByText("尚未检测", { exact: true })).toHaveCount(3)
  await expect(page.getByText("未检测", { exact: true }).first()).toBeVisible()
  await page.getByRole("tab", { name: "分流检测" }).click()

  await page.getByRole("button", { name: "开始检测" }).evaluate((button) => {
    button.click()
    button.click()
  })
  await expect(page.getByText("连接中", { exact: true }).first()).toBeVisible()
  await expect(page.getByText("检测到 2 个出口 IP")).toBeVisible({ timeout: 20_000 })
  await expect(page.locator(".network-diagnostics__table--split .network-diagnostics__table-row")).toHaveCount(36)
  await expect(page.getByRole("columnheader", { name: "Geolocation" })).toBeVisible()
  await expect(page.locator(".network-diagnostics__table--split [data-label='Geolocation']")).toHaveCount(36)
  await expect(page.locator(".network-diagnostics__table--split .network-diagnostics__site-logo img")).toHaveCount(36)
  await expect(page.locator(".network-diagnostics__table--split .network-diagnostics__country-flag")).toHaveCount(36)
  await expect(page.getByText("United States California Danville AT&T Internet", { exact: true }).first()).toBeVisible()
  await expect(page.getByText("China Sichuan Chengdu China Telecom", { exact: true }).first()).toBeVisible()
  const cloudflareResult = page
    .locator(".network-diagnostics__table--split .network-diagnostics__table-row")
    .filter({ has: page.getByText("Cloudflare", { exact: true }) })
  await expect(cloudflareResult.getByText("United States California Danville AT&T Internet", { exact: true })).toBeVisible()
  const googleResult = page.locator(".network-diagnostics__table--split .network-diagnostics__table-row").filter({ hasText: "Google" })
  await expect(googleResult.getByText("198.51.100.0/24", { exact: true })).toBeVisible()
  await expect(googleResult.getByText("定位中国", { exact: true })).toBeVisible()
  await maskIpToggle.click()
  await expect(googleResult.getByText("198.51.*.*/24", { exact: true })).toBeVisible()
  await maskIpToggle.click()
  await page.getByRole("tab", { name: "AI 检测" }).click()
  await page.getByRole("button", { name: "开始检测" }).click()
  await expect(page.locator(".network-diagnostics__ai-panel-card")).toHaveCount(7)
  await expect(page.getByText("正在查询出口风险", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "重新检测" })).toBeEnabled()
  await expect(page.getByRole("tab", { name: "Claude", exact: true })).toHaveAttribute("aria-selected", "true")
  await expect(page.locator(".network-diagnostics__ai-panel-card")).toHaveCount(7)
  await expect(page.getByText("极度纯净", { exact: true })).toBeVisible()
  await expect(page.getByText("AT&T Internet", { exact: true })).toBeVisible()
  await expect(page.getByText("住宅网络", { exact: true })).toBeVisible()
  await expect(page.getByText("未检测到", { exact: true })).toHaveCount(3)
  await page.getByRole("tab", { name: "ChatGPT", exact: true }).click()
  await expect(page.getByRole("tab", { name: "ChatGPT", exact: true })).toHaveAttribute("aria-selected", "true")
  await expect(page.getByText("ChatGPT AI 信任评分", { exact: true })).toBeVisible()
  expect(aiRiskRequests).toBe(1)
  await assertNoHorizontalOverflow(page)
  await screenshot(page, testInfo, "network-ai-desktop.png")
  await page.getByRole("tab", { name: "分流检测" }).click()
  expect(traceRequests).toBe(33)
  expect(headerRequests).toBe(2)
  expect(googleDnsRequests).toBe(1)
  expect(geographyRequests).toBe(3)
  expect(cloudflareTraceFailures).toBe(2)

  await page.evaluate(() => {
    const nativeFetch = window.fetch.bind(window)
    const stats = { requests: 0, active: 0, peak: 0, urls: [] as string[] }
    Object.assign(window, { __connectivityProbeStats: stats })
    window.fetch = async (input, init) => {
      if (init?.mode !== "no-cors") return nativeFetch(input, init)
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
      stats.requests += 1
      stats.active += 1
      stats.peak = Math.max(stats.peak, stats.active)
      stats.urls.push(url)
      try {
        await new Promise((resolve) => window.setTimeout(resolve, 15))
        if (url === "https://www.noon.com/favicon.ico") throw new TypeError("Failed to fetch")
        return new Response(null, { status: 204 })
      } finally {
        stats.active -= 1
      }
    }
  })
  await page.getByRole("tab", { name: "分流检测" }).focus()
  await page.keyboard.press("ArrowRight")
  await expect(page.getByRole("tab", { name: "联通检测" })).toHaveAttribute("aria-selected", "true")
  await expect(page.getByRole("heading", { name: "我的 IP" })).toBeVisible()
  await expect(page.getByText("198.51.100.88", { exact: true })).toBeVisible()
  await expect(page.getByRole("heading", { name: "网络连通性测试" })).toBeVisible()
  await expect(page.getByText("3 个区域，36 个站点，5 轮中位数")).toBeVisible()
  await expect(page.locator(".network-diagnostics__connectivity-item")).toHaveCount(36)
  await expect(page.locator(".network-diagnostics__connectivity-item .network-diagnostics__site-logo img")).toHaveCount(0)
  const globalRegion = page
    .locator(".network-diagnostics__connectivity-region")
    .filter({ has: page.getByRole("heading", { name: "全球", exact: true }) })
  await expect(globalRegion.locator(".ri-global-line")).toBeVisible()
  await expect(globalRegion.getByRole("button", { name: "重新测试全球连通性" }).locator(".ri-refresh-line")).toBeVisible()
  await page.getByRole("button", { name: "开始测试" }).click()
  await expect(page.getByText("已测试 36/36，可达 36")).toBeVisible({ timeout: 15_000 })
  await expect(page.locator(".network-diagnostics__connectivity-sample")).toHaveCount(184)
  const connectivityStats = await page.evaluate(
    () =>
      (
        window as typeof window & {
          __connectivityProbeStats: { requests: number; active: number; peak: number; urls: string[] }
        }
      ).__connectivityProbeStats,
  )
  expect(connectivityStats.requests).toBe(36 * 6 + 1)
  expect(connectivityStats.peak).toBe(10)
  expect(connectivityStats.urls.some((url) => url.endsWith("/robots.txt"))).toBe(false)
  expect(connectivityStats.urls).toContain("https://api.anthropic.com/favicon.ico")
  expect(connectivityStats.urls).toContain("https://static.cdninstagram.com/rsrc.php/yb/r/hLRJ1GG_y0J.ico")
  expect(connectivityStats.urls).toContain("https://http2.mlstatic.com/favicon.ico")
  expect(connectivityStats.urls.filter((url) => url === "https://www.noon.com/favicon.ico")).toHaveLength(1)
  expect(connectivityStats.urls.filter((url) => url === "https://f.nooncdn.com/")).toHaveLength(6)
  await assertNoHorizontalOverflow(page)
  await screenshot(page, testInfo, "network-connectivity-desktop.png")
  await page.getByRole("tab", { name: "泄露检测" }).click()
  await expect(page.getByRole("heading", { name: "我的 IP" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "DNS 泄露测试" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "WebRTC 泄露测试" })).toBeVisible()
  await expect(page.locator(".network-diagnostics__card:visible")).toHaveCount(2)
  await page.getByRole("button", { name: "快速测试" }).click()
  await expect(page.getByText("网页出口位于境外，但检测到了中国大陆 DNS 解析器，请核对代理规则。")).toBeVisible()
  await expect(page.locator(".network-diagnostics__table--dns .network-diagnostics__table-row")).toHaveCount(2)
  expect(dnsRequests).toBe(5)
  await assertNoHorizontalOverflow(page)
  await screenshot(page, testInfo, "network-diagnostics-desktop.png")

  await page.setViewportSize({ width: 390, height: 844 })
  const mobileHeading = page.locator(".network-diagnostics__heading")
  const mobileHeadingDescription = mobileHeading.locator("p")
  await expect(mobileHeadingDescription).toBeHidden()
  const [mobileMarkBox, mobileTitleBox, mobileMaskBox] = await Promise.all([
    mobileHeading.locator(".network-diagnostics__mark").boundingBox(),
    mobileHeading.getByRole("heading", { name: "网络与 IP 分流检测" }).boundingBox(),
    headingMaskToggle.boundingBox(),
  ])
  expect(mobileMarkBox).not.toBeNull()
  expect(mobileTitleBox).not.toBeNull()
  expect(mobileMaskBox).not.toBeNull()
  const mobileHeadingCenters = [mobileMarkBox!, mobileTitleBox!, mobileMaskBox!].map((box) => box.y + box.height / 2)
  expect(Math.max(...mobileHeadingCenters) - Math.min(...mobileHeadingCenters)).toBeLessThanOrEqual(1)
  await assertNoHorizontalOverflow(page)
  await screenshot(page, testInfo, "network-diagnostics-mobile.png")

  await page.getByRole("tab", { name: "AI 检测" }).click()
  await assertNoHorizontalOverflow(page)
  await screenshot(page, testInfo, "network-ai-mobile.png")

  await page.getByRole("tab", { name: "联通检测" }).click()
  await assertNoHorizontalOverflow(page)
  await screenshot(page, testInfo, "network-connectivity-mobile.png")

  await page.getByRole("tab", { name: "分流检测" }).click()
  await page.getByRole("button", { name: "重新检测" }).click()
  await expect(page.getByRole("button", { name: "重新检测" })).toBeEnabled()
  await expect(page.locator(".network-diagnostics__table--split .network-diagnostics__table-row")).toHaveCount(36)
  const cdnjsResult = page
    .locator(".network-diagnostics__table--split .network-diagnostics__table-row")
    .filter({ has: page.getByText("cdnjs", { exact: true }) })
  await expect(cdnjsResult.getByText("United States California Danville AT&T Internet", { exact: true })).toBeVisible()
  expect(cloudflareTraceFailures).toBe(4)
  expect(traceRequests).toBe(66)
  expect(headerRequests).toBe(4)
  expect(googleDnsRequests).toBe(2)
})
