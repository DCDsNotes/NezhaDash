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
      customData: { slogan: "稳定连接每一处服务" },
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
          config: { debug: false, language: "zh-CN", site_name: "哪吒运行中心", user_template: "", admin_template: "", custom_code: "" },
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

async function screenshot(page: Page, testInfo: TestInfo, name: string) {
  await page.screenshot({ path: testInfo.outputPath(name), fullPage: true, animations: "disabled" })
}

test("dashboard interactions remain usable on desktop and mobile", async ({ page }, testInfo) => {
  await mockBackend(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto("/")

  await expect(page).toHaveTitle("哪吒运行中心")
  await expect(page.locator(".probe-node-item")).toHaveCount(2)
  await expect(page.getByText("上海边缘节点", { exact: true })).toBeVisible()
  await assertNoHorizontalOverflow(page)

  await page.getByRole("button", { name: /离线节点 1/ }).click()
  await expect(page.locator(".probe-node-item")).toHaveCount(1)
  await page.getByRole("button", { name: /全部状态 2/ }).click()

  await page.getByRole("searchbox", { name: "搜索节点" }).fill("上海")
  await expect(page.locator(".probe-node-item")).toHaveCount(1)
  await page.getByRole("searchbox", { name: "搜索节点" }).fill("")

  await page.getByRole("button", { name: "节点分组：全部节点" }).click()
  await page.getByRole("menuitemradio", { name: "核心节点 1" }).click()
  await expect(page.locator(".probe-node-item")).toHaveCount(1)
  await page.getByRole("button", { name: "节点分组：核心节点" }).click()
  await page.getByRole("menuitemradio", { name: "全部节点 2" }).click()

  await page.getByLabel("查看节点地图").click()
  await expect(page.getByRole("dialog", { name: "节点地图" })).toBeVisible()
  await page.getByRole("button", { name: "关闭" }).click()

  await page.getByLabel(/排序字段/).click()
  await expect(page.getByRole("menuitemradio", { name: "主机名称" })).toBeVisible()
  await page.getByRole("menuitemradio", { name: "主机名称" }).click()

  await page.keyboard.press("Control+K")
  await expect(page.getByRole("dialog", { name: "搜索服务器" })).toBeVisible()
  await page.getByRole("searchbox", { name: "搜索服务器" }).fill("上海")
  await expect(page.locator(".dashboard-search-result")).toHaveCount(1)
  await page.getByLabel("关闭搜索").click()

  await page.getByTitle("查看今日流量").click()
  await expect(page.getByRole("dialog", { name: "今日流量" })).toBeVisible()
  await expect(page.locator(".dashboard-transfer-row")).toHaveCount(2)
  await page.getByRole("button", { name: "关闭" }).click()
  await screenshot(page, testInfo, "dashboard-desktop.png")

  await page.getByLabel("查看 上海边缘节点 详情").click()
  await expect(page).toHaveURL(/\/server\/25ce76bd$/)
  await expect(page.getByText("网络速度", { exact: true })).toBeVisible()
  await expect(page.getByRole("switch")).toHaveCount(3)
  await assertNoHorizontalOverflow(page)
  await screenshot(page, testInfo, "server-detail-desktop.png")

  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto("/")
  await expect(page.locator(".probe-node-item")).toHaveCount(2)
  await assertNoHorizontalOverflow(page)
  await screenshot(page, testInfo, "dashboard-tablet.png")

  await page.goto("/server/25ce76bd")
  await expect(page.getByText("网络速度", { exact: true })).toBeVisible()
  await assertNoHorizontalOverflow(page)
  await screenshot(page, testInfo, "server-detail-tablet.png")

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/")
  await expect(page.locator(".probe-node-item")).toHaveCount(2)
  await assertNoHorizontalOverflow(page)
  await screenshot(page, testInfo, "dashboard-mobile.png")

  await page.getByRole("button", { name: "打开节点地图" }).click()
  await expect(page.getByRole("dialog", { name: "节点地图" })).toBeVisible()
  await assertNoHorizontalOverflow(page)
  await screenshot(page, testInfo, "map-mobile.png")
  await page.getByRole("button", { name: "关闭" }).click()

  await page.goto("/server/25ce76bd")
  await expect(page.getByText("网络速度", { exact: true })).toBeVisible()
  await expect(page.getByRole("switch")).toHaveCount(3)
  await assertNoHorizontalOverflow(page)
  await screenshot(page, testInfo, "server-detail-mobile.png")
})
