import { constants, access, readFile, writeFile } from "node:fs/promises";
import { exit } from "node:process";

import * as v from "valibot";
import { Document, parseDocument } from "yaml";

import log from "~/utils/log";

import { DNSRecord, HeadscaleDNSConfig, loadHeadscaleDNS } from "./config-dns";

interface PatchConfig {
  path: string;
  value: unknown;
}

interface DNSConfigView {
  magicDns: boolean;
  baseDomain: string;
  nameservers: string[];
  splitDns: Record<string, string[]>;
  searchDomains: string[];
  overrideDns: boolean;
  extraRecords: DNSRecord[];
}

interface OIDCConfigView {
  issuer: string;
  allowedDomains: string[];
  allowedGroups: string[];
  allowedUsers: string[];
}

interface ParsedDNSConfig {
  magic_dns: boolean;
  base_domain: string;
  nameservers: {
    global: string[];
    split: Record<string, string[]>;
  };
  search_domains: string[];
  override_local_dns: boolean;
  extra_records: DNSRecord[];
  extra_records_path?: string;
}

const DNS_CONFIG_DEFAULTS: ParsedDNSConfig = {
  magic_dns: true,
  base_domain: "",
  nameservers: {
    global: [],
    split: {},
  },
  search_domains: [],
  override_local_dns: true,
  extra_records: [],
};

const stringSchema = v.string();
const stringArraySchema = v.array(v.string());
const stringArrayRecordSchema = v.record(v.string(), stringArraySchema);
const goBooleanSchema = v.pipe(
  v.union([v.boolean(), v.picklist(["true", "false"])]),
  v.transform((value) => value === true || value === "true"),
);
const dnsRecordsSchema = v.array(
  v.object({
    name: v.string(),
    type: v.string(),
    value: v.string(),
  }),
);
const nameserversSchema = v.object({
  global: v.optional(v.fallback(stringArraySchema, []), []),
  split: v.optional(v.fallback(stringArrayRecordSchema, {}), {}),
});
const dnsConfigSchema = v.object({
  magic_dns: v.optional(
    v.fallback(goBooleanSchema, DNS_CONFIG_DEFAULTS.magic_dns),
    DNS_CONFIG_DEFAULTS.magic_dns,
  ),
  base_domain: v.optional(
    v.fallback(stringSchema, DNS_CONFIG_DEFAULTS.base_domain),
    DNS_CONFIG_DEFAULTS.base_domain,
  ),
  nameservers: v.optional(
    v.fallback(nameserversSchema, DNS_CONFIG_DEFAULTS.nameservers),
    DNS_CONFIG_DEFAULTS.nameservers,
  ),
  search_domains: v.optional(
    v.fallback(stringArraySchema, DNS_CONFIG_DEFAULTS.search_domains),
    DNS_CONFIG_DEFAULTS.search_domains,
  ),
  override_local_dns: v.optional(
    v.fallback(goBooleanSchema, DNS_CONFIG_DEFAULTS.override_local_dns),
    DNS_CONFIG_DEFAULTS.override_local_dns,
  ),
  extra_records: v.optional(
    v.fallback(dnsRecordsSchema, DNS_CONFIG_DEFAULTS.extra_records),
    DNS_CONFIG_DEFAULTS.extra_records,
  ),
  extra_records_path: v.optional(v.string()),
});
const headscaleConfigSchema = v.fallback(
  v.object({
    dns: v.optional(v.fallback(dnsConfigSchema, DNS_CONFIG_DEFAULTS), DNS_CONFIG_DEFAULTS),
  }),
  { dns: DNS_CONFIG_DEFAULTS },
);
const oidcConfigSchema = v.object({
  issuer: v.string(),
  allowed_domains: v.optional(v.fallback(stringArraySchema, []), []),
  allowed_groups: v.optional(v.fallback(stringArraySchema, []), []),
  allowed_users: v.optional(v.fallback(stringArraySchema, []), []),
});
const rawOIDCConfigSchema = v.fallback(
  v.object({
    oidc: v.optional(v.unknown()),
  }),
  {},
);
const extraRecordsConflictSchema = v.object({
  dns: v.optional(
    v.object({
      extra_records: v.optional(v.array(v.unknown())),
      extra_records_path: v.optional(v.string()),
    }),
  ),
});

interface HeadscaleConfigState {
  document?: Document;
  config: unknown;
  access: "rw" | "ro" | "no";
  path?: string;
  writeQueue: Promise<void>;
  dns?: HeadscaleDNSConfig;
}

interface HeadscaleConfig {
  readable: () => boolean;
  writable: () => boolean;
  getDNSConfig: () => DNSConfigView;
  getMagicDNSBaseDomain: () => string | undefined;
  getOIDCConfig: () => OIDCConfigView | undefined;
  hasOIDCConfig: () => boolean;
  dnsRecords: () => DNSRecord[];
  patch: (patches: PatchConfig[]) => Promise<void>;
  addDNS: (record: DNSRecord) => Promise<boolean | void>;
  removeDNS: (record: DNSRecord) => Promise<boolean | void>;
}

function createHeadscaleConfig(
  access: "rw" | "ro" | "no",
  dns?: HeadscaleDNSConfig,
  document?: Document,
  path?: string,
): HeadscaleConfig {
  const state: HeadscaleConfigState = {
    access,
    config: document?.toJSON() ?? {},
    document,
    path,
    writeQueue: Promise.resolve(),
    dns,
  };

  return {
    readable: () => readable(state),
    writable: () => writable(state),
    getDNSConfig: () => getDNSConfig(state),
    getMagicDNSBaseDomain: () => getMagicDNSBaseDomain(state),
    getOIDCConfig: () => getOIDCConfig(state),
    hasOIDCConfig: () => hasOIDCConfig(state),
    dnsRecords: () => dnsRecords(state),
    patch: (patches) => patchHeadscaleConfig(state, patches),
    addDNS: (record) => addDNS(state, record),
    removeDNS: (record) => removeDNS(state, record),
  };
}

function readable(config: HeadscaleConfigState) {
  return config.access !== "no";
}

function writable(config: HeadscaleConfigState) {
  return config.access === "rw";
}

function getDNSConfig(config: HeadscaleConfigState): DNSConfigView {
  const dns = v.parse(headscaleConfigSchema, config.config).dns;

  return {
    magicDns: dns.magic_dns,
    baseDomain: dns.base_domain,
    nameservers: dns.nameservers.global,
    splitDns: dns.nameservers.split ?? {},
    searchDomains: dns.search_domains,
    overrideDns: dns.override_local_dns,
    extraRecords: dnsRecords(config),
  };
}

function getMagicDNSBaseDomain(config: HeadscaleConfigState) {
  if (!readable(config)) return;
  const dns = getDNSConfig(config);
  return dns.magicDns && dns.baseDomain ? dns.baseDomain : undefined;
}

function getOIDCConfig(config: HeadscaleConfigState): OIDCConfigView | undefined {
  const oidc = v.safeParse(oidcConfigSchema, v.parse(rawOIDCConfigSchema, config.config).oidc);
  if (!oidc.success) return;

  return {
    issuer: oidc.output.issuer,
    allowedDomains: oidc.output.allowed_domains,
    allowedGroups: oidc.output.allowed_groups,
    allowedUsers: oidc.output.allowed_users,
  };
}

function hasOIDCConfig(config: HeadscaleConfigState) {
  return getOIDCConfig(config) !== undefined;
}

function dnsRecords(config: HeadscaleConfigState) {
  if (config.dns) {
    return config.dns.r;
  }

  return v.parse(headscaleConfigSchema, config.config).dns.extra_records;
}

async function patchHeadscaleConfig(config: HeadscaleConfigState, patches: PatchConfig[]) {
  if (!config.path || !config.document || !readable(config) || !writable(config)) {
    return;
  }

  const write = config.writeQueue.then(() => writePatches(config, patches));
  config.writeQueue = write.catch(() => undefined);
  await write;
}

async function writePatches(config: HeadscaleConfigState, patches: PatchConfig[]) {
  if (!config.path || !config.document) return;

  log.debug("config", "正在更新 Headscale 配置");
  for (const patch of patches) {
    const { path, value } = patch;
    log.debug("config", "正在更新 %s 为 %o", path, value);

    const key = splitPatchPath(path);
    if (value === null) {
      config.document.deleteIn(key);
      continue;
    }

    config.document.setIn(key, value);
  }

  log.debug("config", "正在将更新后的 Headscale 配置写入 %s", config.path);
  await writeFile(config.path, config.document.toString(), "utf8");
  config.config = config.document.toJSON();
}

function splitPatchPath(path: string) {
  const key = [];
  let current = "";
  let quote = false;

  for (const char of path) {
    if (char === '"') {
      quote = !quote;
      continue;
    }

    if (char === "." && !quote) {
      key.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  key.push(current);
  return key;
}

async function addDNS(config: HeadscaleConfigState, record: DNSRecord) {
  if (config.dns) {
    if (!config.dns.readable() || !config.dns.writable()) {
      log.debug("config", "DNS 配置不可写");
      return;
    }

    const records = config.dns.r;
    if (records.some((i) => i.name === record.name && i.type === record.type)) {
      log.debug("config", "DNS 记录已存在");
      return;
    }

    return config.dns.patch([...records, record]);
  }

  const existing = dnsRecords(config);
  if (existing.some((i) => i.name === record.name && i.type === record.type)) {
    log.debug("config", "DNS 记录已存在");
    return;
  }

  await patchHeadscaleConfig(config, [
    {
      path: "dns.extra_records",
      value: [...existing, record],
    },
  ]);

  return true;
}

async function removeDNS(config: HeadscaleConfigState, record: DNSRecord) {
  if (config.dns) {
    if (!config.dns.readable() || !config.dns.writable()) {
      log.debug("config", "DNS 配置不可写");
      return;
    }

    const records = config.dns.r.filter((i) => i.name !== record.name || i.type !== record.type);
    return config.dns.patch(records);
  }

  const existing = dnsRecords(config);
  const filtered = existing.filter((i) => i.name !== record.name || i.type !== record.type);
  if (existing.length === filtered.length) {
    return;
  }

  await patchHeadscaleConfig(config, [
    {
      path: "dns.extra_records",
      value: filtered,
    },
  ]);

  return true;
}

export async function loadHeadscaleConfig(path?: string, dnsPath?: string) {
  if (!path) {
    log.debug("config", "未提供 Headscale 配置文件");
    return createHeadscaleConfig("no");
  }

  log.debug("config", "正在加载 Headscale 配置文件：%s", path);
  const { r, w } = await validateConfigPath(path);
  if (!r) {
    return createHeadscaleConfig("no");
  }

  const document = await loadConfigFile(path);
  if (!document) {
    return createHeadscaleConfig("no");
  }

  const rawConfig = document.toJSON();
  const parsedConfig = v.parse(headscaleConfigSchema, rawConfig);
  const conflict = v.safeParse(extraRecordsConflictSchema, rawConfig);
  const extraRecordsPath = parsedConfig.dns.extra_records_path;

  if (conflict.success && conflict.output.dns?.extra_records && extraRecordsPath) {
    log.warn(
      "config",
      "同时设置了 dns.extra_records 和 dns.extra_records_path；Headplane 将使用 JSON 记录文件",
    );
  }

  const dns = await loadHeadscaleDNS(dnsPath ?? extraRecordsPath);
  if (dns && !extraRecordsPath) {
    log.error(
      "config",
      "使用了独立的 DNS 配置文件，但 Headscale 配置中未设置 dns.extra_records_path",
    );
    log.error("config", "请在 Headscale 配置中设置 `dns.extra_records_path`");
    log.error("config", "或从 Headplane 配置中移除 `headscale.dns_records_path`");

    exit(1);
  }

  return createHeadscaleConfig(w ? "rw" : "ro", dns, document, path);
}

async function validateConfigPath(path: string) {
  try {
    await access(path, constants.F_OK | constants.R_OK);
    log.info("config", "在 %s 找到有效的 Headscale 配置文件", path);
  } catch (error) {
    log.error("config", "无法读取 %s 处的 Headscale 配置文件", path);
    log.error("config", "%s", error);
    return { w: false, r: false };
  }

  try {
    await access(path, constants.F_OK | constants.W_OK);
    return { w: true, r: true };
  } catch {
    log.warn("config", "%s 处的 Headscale 配置文件不可写", path);
    return { w: false, r: true };
  }
}

async function loadConfigFile(path: string) {
  log.debug("config", "正在读取 %s 处的 Headscale 配置文件", path);
  try {
    const data = await readFile(path, "utf8");
    const configYaml = parseDocument(data);
    if (configYaml.errors.length > 0) {
      log.error("config", "无法解析 %s 处的 Headscale 配置文件", path);
      for (const error of configYaml.errors) {
        log.error("config", ` - ${error.toString()}`);
      }

      return false;
    }

    return configYaml;
  } catch (e) {
    log.error("config", "读取 %s 处的 Headscale 配置文件时出错", path);
    log.error("config", "%s", e);
    return false;
  }
}