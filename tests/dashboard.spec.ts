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

async function mockBackend(page: Page) {
  await page.routeWebSocket("**/api/v1/ws/server", (webSocket) => {
    webSocket.send(JSON.stringify(wsPayload))
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

async function screenshot(page: Page, testInfo: TestInfo, name: string) {
  await page.screenshot({ path: testInfo.outputPath(name), fullPage: true, animations: "disabled" })
}

test("dashboard interactions remain usable on desktop and mobile", async ({ page }, testInfo) => {
  let worldMapRequestCount = 0
  let serverSpeedRequestCount = 0
  let monitorRequestCount = 0
  page.on("request", (request) => {
    const pathname = new URL(request.url()).pathname
    if (request.resourceType() === "image" && pathname.endsWith("/world-map.svg")) worldMapRequestCount += 1
    if (pathname.endsWith("/server-speed/1")) serverSpeedRequestCount += 1
    if (pathname.endsWith("/service/1")) monitorRequestCount += 1
  })

  await mockBackend(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto("/")

  await expect(page).toHaveTitle("节点监控")
  await expect(page.locator(".probe-site-brand strong")).toHaveText("节点监控")
  await expect(page.locator(".probe-node-item")).toHaveCount(2)
  await expect(page.locator(".probe-node-item__identity").first()).toHaveCSS("width", "260px")
  await expect(page.locator(".probe-node-item__speeds").first()).toHaveCSS("width", "150px")
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
  await expect(page.locator(".world-map-img")).toHaveCSS("background-image", /blob:/)
  await screenshot(page, testInfo, "map-desktop.png")
  await page.getByRole("button", { name: "关闭" }).click()
  await page.getByLabel("查看节点地图").click()
  await expect(page.getByRole("dialog", { name: "节点地图" })).toBeVisible()
  await page.getByRole("button", { name: "关闭" }).click()
  expect(worldMapRequestCount).toBe(0)

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

  await page.getByLabel("查看 上海边缘节点 详情").click()
  await expect(page).toHaveURL(/\/server\/25ce76bd$/)
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
})
