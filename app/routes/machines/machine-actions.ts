import { redirect } from "react-router";
import * as v from "valibot";

import { authContext, headscaleLiveStoreContext, requestApiContext } from "~/server/context";
import { nodesResource } from "~/server/headscale/live-store";
import { ActionError, createAction } from "~/server/web/actions";
import { Capabilities } from "~/server/web/roles";
import { invalid, list, ok } from "~/utils/form";
import { normalizeRegistrationKey } from "~/utils/register-key";

import { machineName } from "./schemas";

const nodeId = v.pipe(v.string(), v.minLength(1));
const toggle = v.picklist(["true", "false"]);

export const machineAction = createAction({
  async setup({ request, context }) {
    const { principal, api } = await context.get(requestApiContext)(request);
    const auth = context.get(authContext);
    const liveStore = context.get(headscaleLiveStoreContext);

    async function requireNode(id: string) {
      const node = await api.nodes.get(id);
      if (!node) {
        throw new ActionError("此设备已不存在。", 404);
      }

      if (!auth.canManageNode(principal, node)) {
        throw new ActionError("你没有管理此设备的权限。", 403);
      }

      return node;
    }

    return {
      principal,
      api,
      requireNode,
      refresh: () => liveStore.refresh(nodesResource, api),
    };
  },
  intents: {
    register: {
      capability: Capabilities.write_machines,
      fields: {
        register_key: v.pipe(v.string(), v.minLength(1, "请粘贴设备密钥。")),
        user: v.pipe(v.string(), v.minLength(1, "请选择所有者。")),
      },
      async handler(input, { api, refresh }) {
        const registrationKey = normalizeRegistrationKey(input.register_key);
        if (!registrationKey) {
          return invalid({
            register_key: "请粘贴注册 URL，或 tailscale up 输出的完整 hskey-authreq-... 密钥。",
          });
        }

        const node = await api.nodes.register(input.user, registrationKey);
        await refresh();
        return redirect(`/machines/${node.id}`);
      },
    },
    rename: {
      fields: { node_id: nodeId, name: machineName },
      async handler(input, { api, requireNode, refresh }) {
        const node = await requireNode(input.node_id);
        await api.nodes.rename(node.id, input.name);
        await refresh();
        return ok("设备已重命名");
      },
    },
    delete: {
      fields: { node_id: nodeId },
      async handler(input, { api, requireNode, refresh }) {
        const node = await requireNode(input.node_id);
        await api.nodes.delete(node.id);
        await refresh();
        return redirect("/machines");
      },
    },
    expire: {
      fields: { node_id: nodeId },
      async handler(input, { api, requireNode, refresh }) {
        const node = await requireNode(input.node_id);
        await api.nodes.expire(node.id);
        await refresh();
        return ok("设备已过期");
      },
    },
    toggle_expiry: {
      fields: { node_id: nodeId, disable_expiry: toggle },
      async handler(input, { api, requireNode, refresh }) {
        const node = await requireNode(input.node_id);
        const disableExpiry = input.disable_expiry === "true";
        await api.nodes.toggleExpiry(node.id, disableExpiry);
        await refresh();
        return ok(disableExpiry ? "已禁用密钥过期" : "已启用密钥过期");
      },
    },
    update_tags: {
      fields: { node_id: nodeId, tags: list() },
      async handler(input, { api, requireNode, refresh }) {
        const node = await requireNode(input.node_id);
        const tags = input.tags.map((tag) => tag.trim()).filter((tag) => tag !== "");
        await api.nodes.setTags(node.id, tags);
        await refresh();
        return ok("标签已更新");
      },
    },
    update_routes: {
      fields: { node_id: nodeId, routes: list(), enabled: toggle },
      async handler(input, { api, requireNode, refresh }) {
        const node = await requireNode(input.node_id);
        const routes = input.routes.map((route) => route.trim()).filter((route) => route !== "");
        const approved =
          input.enabled === "true"
            ? [...new Set([...node.approvedRoutes, ...routes])]
            : node.approvedRoutes.filter((route) => !routes.includes(route));

        await api.nodes.approveRoutes(node.id, approved);
        await refresh();
        return ok("路由已更新");
      },
    },
    reassign: {
      fields: {
        node_id: nodeId,
        user_id: v.pipe(v.string(), v.minLength(1, "请选择所有者。")),
      },
      async handler(input, { api, requireNode, refresh }) {
        const node = await requireNode(input.node_id);
        if (!api.nodes.reassignUser) {
          throw new ActionError("此 Headscale 版本不支持更改设备所有者。");
        }

        await api.nodes.reassignUser(node.id, input.user_id);
        await refresh();
        return ok("所有者已更改");
      },
    },
  },
});
