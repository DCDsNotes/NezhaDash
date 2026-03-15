export function GetOsName(platform: string): string {
  if (
    [
      "almalinux",
      "alpine",
      "aosc",
      "apple",
      "archlinux",
      "archlabs",
      "artix",
      "budgie",
      "centos",
      "coreos",
      "debian",
      "deepin",
      "devuan",
      "docker",
      "fedora",
      "ferris",
      "flathub",
      "freebsd",
      "gentoo",
      "gnu-guix",
      "illumos",
      "linuxmint",
      "mageia",
      "mandriva",
      "manjaro",
      "nixos",
      "openbsd",
      "opensuse",
      "pop-os",
      "redhat",
      "sabayon",
      "slackware",
      "snappy",
      "solus",
      "tux",
      "ubuntu",
      "void",
      "zorin",
    ].indexOf(platform) > -1
  ) {
    return platform.charAt(0).toUpperCase() + platform.slice(1)
  }
  if (platform == "darwin") {
    return "macOS"
  }
  if (["openwrt", "linux", "immortalwrt"].indexOf(platform) > -1) {
    return "Linux"
  }
  if (platform == "amazon") {
    return "Redhat"
  }
  if (platform == "arch") {
    return "Archlinux"
  }
  if (platform.toLowerCase().includes("opensuse")) {
    return "Opensuse"
  }
  return "Linux"
}

export function getPlatformLogoIconClassName(platform: string) {
  const platformStr = String(platform || "").toLowerCase()
  if (platformStr.includes("windows") || platformStr.includes("microsoft")) {
    return "ri-microsoft-fill"
  }
  if (platformStr === "darwin" || platformStr === "macos") {
    return "fl-apple"
  }
  if (platformStr) {
    return `fl-${platformStr}`
  }
  return "ri-server-line"
}

