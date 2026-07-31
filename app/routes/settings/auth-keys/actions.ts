import { data } from "react-router";

import { authContext, requestApiContext } from "~/server/context";
import { isUserPrincipal } from "~/server/web/auth";
import { getOidcSubject } from "~/server/web/headscale-identity";
import { Capabilities } from "~/server/web/roles";
import type { PreAuthKey } from "~/types";

import type { Route } from "./+types/overview";

export async function authKeysAction({ request, context }: Route.ActionArgs) {
  const auth = context.get(authContext);
  const getRequestApi = context.get(requestApiContext);

  const { principal, api } = await getRequestApi(request);

  const canGenerateAny = auth.can(principal, Capabilities.generate_authkeys);
  const canGenerateOwn = auth.can(principal, Capabilities.generate_own_authkeys);

  if (!canGenerateAny && !canGenerateOwn) {
    throw data("你没有管理预认证密钥的权限", {
      status: 403,
    });
  }

  async function checkSelfServiceOwnership(userId: string) {
    if (canGenerateAny || !canGenerateOwn) return;
    const [targetUser] = await api.users.list({ id: userId });
    if (!targetUser) {
      throw data("未找到用户。", { status: 404 });
    }
    const targetSubject = getOidcSubject(targetUser);
    const ownsTarget =
      isUserPrincipal(principal) &&
      (principal.user.headscaleUserId === userId || targetSubject === principal.user.subject);
    if (!ownsTarget) {
      throw data("你没有管理该用户预认证密钥的权限", {
        status: 403,
      });
    }
  }

  const formData = await request.formData();
  const action = formData.get("action_id")?.toString();
  if (!action) {
    throw data("表单数据中缺少 `action_id`。", {
      status: 400,
    });
  }

  switch (action) {
    case "add_preauthkey": {
      const user = formData.get("user_id")?.toString() || null;
      const aclTagsRaw = formData.get("acl_tags")?.toString() || "";
      const aclTags = aclTagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      if (!user && aclTags.length === 0) {
        return data("必须指定用户或 ACL 标签。", {
          status: 400,
        });
      }

      if (user) {
        await checkSelfServiceOwnership(user);
      }

      const expiry = formData.get("expiry")?.toString();
      if (!expiry) {
        return data("表单数据中缺少 `expiry`。", {
          status: 400,
        });
      }

      const reusable = formData.get("reusable")?.toString();
      if (!reusable) {
        return data("表单数据中缺少 `reusable`。", {
          status: 400,
        });
      }

      const ephemeral = formData.get("ephemeral")?.toString();
      if (!ephemeral) {
        return data("表单数据中缺少 `ephemeral`。", {
          status: 400,
        });
      }

      const day = Number(expiry.toString().split(" ")[0]);
      const date = new Date();
      date.setDate(date.getDate() + day);

      const key = await api.preAuthKeys.create({
        user,
        ephemeral: ephemeral === "on",
        reusable: reusable === "on",
        expiration: date,
        aclTags: aclTags.length > 0 ? aclTags : null,
      });

      return data({ success: true as const, key: key.key });
    }

    case "expire_preauthkey": {
      const keyId = formData.get("key_id")?.toString();
      const key = formData.get("key")?.toString();
      if (!keyId || !key) {
        return data("表单数据中缺少 `key_id` 或 `key`。", {
          status: 400,
        });
      }

      const user = formData.get("user_id")?.toString();
      if (!user) {
        return data("表单数据中缺少 `user_id`。", {
          status: 400,
        });
      }

      await checkSelfServiceOwnership(user);
      // `user` here is the Headscale numeric user id (form field is wired
      // from User.id). Pre-0.28 expire posts a uint64 `user` field, which
      // the API layer reads from `key.user?.id`. Headscale 0.28+ only
      // looks at `key.id` (the stable preauthkey id).
      await api.preAuthKeys.expire({
        id: keyId,
        key,
        user: { id: user },
      } as unknown as PreAuthKey);
      return data("预认证密钥已过期");
    }

    default:
      return data("无效操作", {
        status: 400,
      });
  }
}
