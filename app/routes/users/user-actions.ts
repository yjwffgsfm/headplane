import * as v from "valibot";

import { authContext, headscaleLiveStoreContext, requestApiContext } from "~/server/context";
import type { HeadscaleClient } from "~/server/headscale/api";
import { isDataWithApiError } from "~/server/headscale/api/error-client";
import { usersResource } from "~/server/headscale/live-store";
import { ActionError, createAction } from "~/server/web/actions";
import { type AuthService, isUserPrincipal } from "~/server/web/auth";
import { Capabilities, Roles, type Role } from "~/server/web/roles";
import { isValidGroupName, parsePolicy, serializePolicy, setUserGroups } from "~/utils/acl-policy";
import { invalid, list, ok } from "~/utils/form";

import { username } from "./schemas";

const id = v.pipe(v.string(), v.minLength(1));
const optionalText = v.pipe(
  v.optional(v.string(), ""),
  v.trim(),
  v.transform((value) => value || undefined),
);

const assignableRoles = Object.keys(Roles).filter((role) => role !== "owner") as Exclude<
  Role,
  "owner"
>[];

export const userAction = createAction({
  capability: Capabilities.write_users,
  async setup({ request, context }) {
    const { principal, api } = await context.get(requestApiContext)(request);
    const liveStore = context.get(headscaleLiveStoreContext);

    return {
      principal,
      api,
      auth: context.get(authContext),
      refresh: () => liveStore.refresh(usersResource, api),
    };
  },
  intents: {
    create: {
      fields: { name: username, display_name: optionalText, email: optionalText },
      async handler(input, { api, refresh }) {
        await requireFreeName(api, input.name);
        await api.users.create({
          name: input.name,
          displayName: input.display_name,
          email: input.email,
        });
        await refresh();
        return ok("用户已创建");
      },
    },
    delete: {
      fields: { headscale_user_id: id },
      async handler(input, { api, auth, refresh }) {
        await api.users.delete(input.headscale_user_id);
        for (const user of await auth.listUsers()) {
          if (user.headscale_user_id === input.headscale_user_id) {
            await auth.unlinkHeadscaleUser(user.id);
          }
        }

        await refresh();
        return ok("用户已删除");
      },
    },
    rename: {
      fields: { headscale_user_id: id, name: username },
      async handler(input, { api, refresh }) {
        const users = await api.users.list({ id: input.headscale_user_id });
        const user = users.find((user) => user.id === input.headscale_user_id);
        if (!user) {
          throw new ActionError("该用户已不存在。", 404);
        }

        if (user.provider === "oidc") {
          throw new ActionError("由 OIDC 管理的用户无法重命名。", 403);
        }

        await requireFreeName(api, input.name);
        await api.users.rename(user.id, input.name);
        await refresh();
        return ok("用户已重命名");
      },
    },
    reassign: {
      fields: { headplane_user_id: id, role: v.picklist(assignableRoles, "请选择角色。") },
      async handler(input, { auth }) {
        const user = await requireHeadplaneUser(auth, input.headplane_user_id);
        if (user.role === "owner") {
          throw new ActionError("请先转移所有权，再更改所有者的角色。", 403);
        }

        if (!(await auth.reassignUser(user.id, input.role))) {
          throw new ActionError("无法更改角色，请重试。", 500);
        }

        return ok("角色已更改");
      },
    },
    transfer: {
      fields: { headplane_user_id: id },
      async handler(input, { auth, principal }) {
        if (!isUserPrincipal(principal) || principal.user.role !== "owner") {
          throw new ActionError("只有所有者可以转移所有权。", 403);
        }

        const target = await requireHeadplaneUser(auth, input.headplane_user_id);
        if (target.id === principal.user.id) {
          throw new ActionError("你已经是 Headplane 的所有者。");
        }

        if (!(await auth.transferOwnership(principal.user.id, input.headplane_user_id))) {
          throw new ActionError("无法转移所有权，请重试。", 500);
        }

        return ok("所有权已转移");
      },
    },
    link: {
      fields: {
        headplane_user_id: id,
        headscale_user_id: v.pipe(v.string(), v.minLength(1, "请选择 Headscale 用户。")),
      },
      async handler(input, { api, auth }) {
        const user = await requireHeadplaneUser(auth, input.headplane_user_id);
        const [headscaleUser] = await api.users.list({ id: input.headscale_user_id });
        if (headscaleUser?.id !== input.headscale_user_id) {
          throw new ActionError("该 Headscale 用户已不存在。", 404);
        }

        if (!(await auth.linkHeadscaleUser(user.id, headscaleUser.id))) {
          throw new ActionError("该 Headscale 用户已关联到其他账户。", 409);
        }

        return ok("Headscale 用户已关联");
      },
    },
    update_groups: {
      // Group membership lives in the policy, so `write_policy` is needed too.
      capability: Capabilities.write_policy,
      fields: { user_name: id, groups: list() },
      async handler(input, { api }) {
        const groups = input.groups.map((group) => group.trim()).filter((group) => group !== "");
        const invalidGroups = groups.filter((group) => !isValidGroupName(group));
        if (invalidGroups.length > 0) {
          return invalid({ form: `无效的组名：${invalidGroups.join(", ")}` });
        }

        const { policy } = await api.policy.get();
        const parsed = parsePolicy(policy);
        if (!parsed.ok) {
          throw new ActionError(`无法解析 ACL 策略：${parsed.error}`);
        }

        try {
          await api.policy.set(
            serializePolicy(setUserGroups(parsed.policy, input.user_name, groups)),
          );
        } catch (error) {
          // Headscale refuses policy writes in `file` mode. The UI hides group
          // editing then, but a stale page can still get here.
          if (isDataWithApiError(error) && error.data.rawData.includes("update is disabled")) {
            throw new ActionError(
              "ACL 策略为只读。请在 Headscale 配置中将 `policy.mode` 设为 `database` 以编辑组。",
              403,
            );
          }

          throw error;
        }

        return ok("组已更新");
      },
    },
  },
});

async function requireFreeName(api: HeadscaleClient, name: string) {
  const [existing] = await api.users.list({ name });
  if (existing?.name === name) {
    throw new ActionError(`名为 ${name} 的用户已存在。`, 409);
  }
}

async function requireHeadplaneUser(auth: AuthService, id: string) {
  const user = (await auth.listUsers()).find((user) => user.id === id);
  if (!user) {
    throw new ActionError("该用户已不存在。", 404);
  }

  return user;
}
