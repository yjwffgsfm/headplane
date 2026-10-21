import * as v from "valibot";

import {
  authContext,
  headscaleConfigContext,
  headscaleContext,
  integrationContext,
} from "~/server/context";
import { ActionError, createAction } from "~/server/web/actions";
import { Capabilities } from "~/server/web/roles";
import { invalid, ok, parseValues } from "~/utils/form";

import { moveItem } from "./reorder";
import { nameserver, recordValue } from "./schemas";

const text = (message: string) => v.pipe(v.string(), v.trim(), v.nonEmpty(message));
const toggle = v.picklist(["true", "false"]);

// Empty means the global nameservers rather than a split DNS domain.
const splitDomain = v.pipe(
  v.optional(v.string(), ""),
  v.trim(),
  v.transform((value) => value || undefined),
);

function nameserverPath(split?: string) {
  return split ? `dns.nameservers.split."${split}"` : "dns.nameservers.global";
}

export const dnsAction = createAction({
  capability: Capabilities.write_network,
  async setup({ request, context }) {
    const principal = await context.get(authContext).require(request);
    const headscale = context.get(headscaleContext);
    const config = context.get(headscaleConfigContext);
    const integration = context.get(integrationContext);
    if (!config.writable()) {
      throw new ActionError("Headscale 配置为只读。", 403);
    }

    return {
      principal,
      config,
      dns: config.getDNSConfig(),
      restart: async () => {
        if (integration && !(await integration.onConfigChange(headscale))) {
          throw new ActionError("已保存，但 Headscale 重启后未能恢复。请检查其日志。", 502);
        }
      },
    };
  },
  intents: {
    rename_tailnet: {
      fields: { name: text("请输入 Tailnet 名称。") },
      async handler(input, { config, restart }) {
        await config.patch([{ path: "dns.base_domain", value: input.name }]);
        await restart();
        return ok("Tailnet 已重命名");
      },
    },
    toggle_magic: {
      fields: { enabled: toggle },
      async handler(input, { config, restart }) {
        const isEnabled = input.enabled === "true";
        await config.patch([{ path: "dns.magic_dns", value: isEnabled }]);
        await restart();
        return ok(isEnabled ? "已启用 MagicDNS" : "已禁用 MagicDNS");
      },
    },
    override_dns: {
      fields: { enabled: toggle },
      async handler(input, { config, restart }) {
        await config.patch([{ path: "dns.override_local_dns", value: input.enabled === "true" }]);
        await restart();
        return ok("DNS 覆盖设置已更新");
      },
    },
    add_ns: {
      fields: { nameserver, split_domain: splitDomain },
      async handler(input, { config, dns, restart }) {
        const servers = input.split_domain
          ? (dns.splitDns[input.split_domain] ?? [])
          : dns.nameservers;
        if (servers.includes(input.nameserver)) {
          return invalid({ nameserver: "该名称服务器已在列表中。" });
        }

        await config.patch([
          { path: nameserverPath(input.split_domain), value: [...servers, input.nameserver] },
        ]);
        await restart();
        return ok("已添加名称服务器");
      },
    },
    remove_ns: {
      fields: { nameserver: v.string(), split_domain: splitDomain },
      async handler(input, { config, dns, restart }) {
        const servers = (
          input.split_domain ? (dns.splitDns[input.split_domain] ?? []) : dns.nameservers
        ).filter((server) => server !== input.nameserver);

        // An empty split list is dropped so Headscale doesn't keep the domain.
        await config.patch([
          {
            path: nameserverPath(input.split_domain),
            value: input.split_domain && servers.length === 0 ? null : servers,
          },
        ]);
        await restart();
        return ok("已移除名称服务器");
      },
    },
    move_ns: {
      fields: {
        nameserver: v.string(),
        split_domain: splitDomain,
        direction: v.picklist(["up", "down"]),
      },
      async handler(input, { config, dns, restart }) {
        const servers = input.split_domain
          ? (dns.splitDns[input.split_domain] ?? [])
          : dns.nameservers;

        await config.patch([
          {
            path: nameserverPath(input.split_domain),
            value: moveItem(servers, input.nameserver, input.direction),
          },
        ]);
        await restart();
        return ok();
      },
    },
    add_domain: {
      fields: { domain: text("请输入搜索域。") },
      async handler(input, { config, dns, restart }) {
        if (dns.searchDomains.includes(input.domain)) {
          return invalid({ domain: "该搜索域已在列表中。" });
        }

        await config.patch([
          { path: "dns.search_domains", value: [...dns.searchDomains, input.domain] },
        ]);
        await restart();
        return ok("已添加搜索域");
      },
    },
    remove_domain: {
      fields: { domain: v.string() },
      async handler(input, { config, dns, restart }) {
        await config.patch([
          {
            path: "dns.search_domains",
            value: dns.searchDomains.filter((domain) => domain !== input.domain),
          },
        ]);
        await restart();
        return ok("已移除搜索域");
      },
    },
    move_domain: {
      fields: { domain: v.string(), direction: v.picklist(["up", "down"]) },
      async handler(input, { config, dns, restart }) {
        await config.patch([
          {
            path: "dns.search_domains",
            value: moveItem(dns.searchDomains, input.domain, input.direction),
          },
        ]);
        await restart();
        return ok();
      },
    },
    add_record: {
      fields: {
        type: v.picklist(["A", "AAAA"], "请选择记录类型。"),
        name: text("请输入域名。"),
        value: v.string(),
      },
      async handler(input, { config, dns }) {
        if (!config.recordsWritable()) {
          throw new ActionError("只能通过 dns.extra_records_path 更改 DNS 记录。", 403);
        }

        const value = parseValues(recordValue[input.type], input.value);
        if (!value.ok) {
          return invalid({ value: value.errors.form });
        }

        if (dns.extraRecords.some((r) => r.name === input.name && r.type === input.type)) {
          return invalid({ name: `该域名已有 ${input.type} 记录。` });
        }

        await config.addDNS({ name: input.name, type: input.type, value: value.data });
        return ok("已添加记录");
      },
    },
    remove_record: {
      fields: { type: v.string(), name: v.string() },
      async handler(input, { config }) {
        if (!config.recordsWritable()) {
          throw new ActionError("只能通过 dns.extra_records_path 更改 DNS 记录。", 403);
        }

        await config.removeDNS({ name: input.name, type: input.type, value: "" });
        return ok("已移除记录");
      },
    },
  },
});
