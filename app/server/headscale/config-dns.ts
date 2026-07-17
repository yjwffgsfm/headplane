import { access, constants, readFile, writeFile } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";

import log from "~/utils/log";

export interface DNSRecord {
  type: "A" | "AAAA" | (string & {});
  name: string;
  value: string;
}

// This class is solely for DNS records that are out of tree in the main
// Headscale config file. If you are using dns.extra_records_path, it will
// be managed here and not in the main config file.
//
// All DNS insertions and deletions are handled by the main config manager,
// but are passed through to here if the extra file is being used.
export class HeadscaleDNSConfig {
  private records: DNSRecord[];
  private access: "rw" | "ro" | "no";
  private path?: string;
  private writeLock = false;

  constructor(access: "rw" | "ro" | "no", records?: DNSRecord[], path?: string) {
    this.access = access;
    this.records = records ?? [];
    this.path = path;
  }

  readable() {
    return this.access !== "no";
  }

  writable() {
    return this.access === "rw";
  }

  get r() {
    return this.records;
  }

  async patch(records: DNSRecord[]) {
    if (!this.path || !this.readable() || !this.writable()) {
      return;
    }

    this.records = records;
    log.debug("config", "正在更新 DNS 记录（%d -> %d）", this.records.length, records.length);

    return this.write();
  }

  private async write() {
    if (!this.path || !this.writable()) {
      return;
    }

    while (this.writeLock) {
      await setTimeout(100);
    }

    this.writeLock = true;
    log.debug("config", "正在将更新后的 DNS 配置写入 %s", this.path);
    const data = JSON.stringify(this.records, null, 4);
    await writeFile(this.path, data);
    this.writeLock = false;
  }
}

export async function loadHeadscaleDNS(path?: string) {
  if (!path) {
    return;
  }

  log.debug("config", "正在加载 Headscale DNS 配置文件：%s", path);
  const { w, r } = await validateConfigPath(path);
  if (!r) {
    return new HeadscaleDNSConfig("no");
  }

  const records = await loadConfigFile(path);
  if (!records) {
    return new HeadscaleDNSConfig("no");
  }

  return new HeadscaleDNSConfig(w ? "rw" : "ro", records, path);
}

async function validateConfigPath(path: string) {
  try {
    await access(path, constants.F_OK | constants.R_OK);
    log.info("config", "在 %s 找到有效的 Headscale DNS 文件", path);
  } catch (error) {
    log.error("config", "无法读取 %s 处的 Headscale DNS 文件", path);
    log.error("config", "%s", error);
    return { w: false, r: false };
  }

  try {
    await access(path, constants.F_OK | constants.W_OK);
    return { w: true, r: true };
  } catch {
    log.warn("config", "%s 处的 Headscale DNS 文件不可写", path);
    return { w: false, r: true };
  }
}

async function loadConfigFile(path: string) {
  log.debug("config", "正在读取 %s 处的 Headscale DNS 文件", path);
  try {
    const data = await readFile(path, "utf8");
    const records = JSON.parse(data) as DNSRecord[];
    return records;
  } catch (e) {
    log.error("config", "读取 %s 处的 Headscale DNS 文件时出错", path);
    log.error("config", "%s", e);
    return false;
  }
}