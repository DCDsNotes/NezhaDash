type ServerDetailModule = typeof import("@/pages/ServerDetail")
type NetworkDiagnosticsModule = typeof import("@/pages/NetworkDiagnostics")

let serverDetailPromise: Promise<ServerDetailModule> | null = null
let networkDiagnosticsPromise: Promise<NetworkDiagnosticsModule> | null = null

function importServerDetail() {
  return import("@/pages/ServerDetail")
}

function importNetworkDiagnostics() {
  return import("@/pages/NetworkDiagnostics")
}

export function preloadServerDetail() {
  serverDetailPromise ||= importServerDetail()
  return serverDetailPromise
}

export function preloadNetworkDiagnostics() {
  networkDiagnosticsPromise ||= importNetworkDiagnostics()
  return networkDiagnosticsPromise
}
