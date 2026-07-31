import { data } from "react-router";

import { authContext, headscaleLiveStoreContext, requestApiContext } from "~/server/context";
import { usersResource } from "~/server/headscale/live-store";
import { isUserPrincipal } from "~/server/web/auth";
import { Capabilities } from "~/server/web/roles";
import type { Role } from "~/server/web/roles";

import type { Route } from "./+types/overview";

export async function userAction({ request, context }: Route.ActionArgs) {
  const auth = context.get(authContext);
  const getRequestApi = context.get(requestApiContext);
  const headscaleLiveStore = context.get(headscaleLiveStoreContext);

  const principal = await auth.require(request);
  const check = await auth.can(principal, Capabilities.write_users);
  if (!check) {
    throw data("你没有权限更新用户", {
      status: 403,
    });
  }

  const formData = await request.formData();
  const action = formData.get("action_id")?.toString();
  if (!action) {
    throw data("表单数据中缺少 `action_id`。", {
      status: 404,
    });
  }

  const { api } = await getRequestApi(request);
  switch (action) {
    case "create_user": {
      const name = formData.get("username")?.toString();
      const displayName = formData.get("display_name")?.toString();
      const email = formData.get("email")?.toString();

      if (!name) {
        throw data("表单数据中缺少 `username`。", {
          status: 400,
        });
      }

      await api.users.create({ name, email, displayName });
      await headscaleLiveStore.refresh(usersResource, api);
      return { message: "用户创建成功" };
    }
    case "delete_user": {
      const headscaleUserId = formData.get("headscale_user_id")?.toString();
      if (!headscaleUserId) {
        throw data("表单数据中缺少 `headscale_user_id`。", {
          status: 400,
        });
      }

      await api.users.delete(headscaleUserId);
      await headscaleLiveStore.refresh(usersResource, api);
      return { message: "用户删除成功" };
    }
    case "rename_user": {
      const headscaleUserId = formData.get("headscale_user_id")?.toString();
      const newName = formData.get("new_name")?.toString();
      if (!headscaleUserId || !newName) {
        return data({ success: false }, 400);
      }

      const users = await api.users.list({ id: headscaleUserId });
      const user = users.find((user) => user.id === headscaleUserId);
      if (!user) {
        throw data(`未找到 ID 为 ${headscaleUserId} 的用户`, { status: 400 });
      }

      if (user.provider === "oidc") {
        // OIDC users cannot be renamed via this endpoint, return an error
        throw data("由 OIDC 管理的用户无法重命名", {
          status: 403,
        });
      }

      await api.users.rename(headscaleUserId, newName);
      await headscaleLiveStore.refresh(usersResource, api);
      return { message: "用户重命名成功" };
    }
    case "reassign_user": {
      const headplaneUserId = formData.get("headplane_user_id")?.toString();
      const newRole = formData.get("new_role")?.toString();
      if (!headplaneUserId || !newRole) {
        throw data("表单数据中缺少 `headplane_user_id` 或 `new_role`。", {
          status: 400,
        });
      }

      const result = await auth.reassignUser(headplaneUserId, newRole as Role);
      if (!result) {
        throw data("重新分配用户角色失败。", { status: 500 });
      }

      return { message: "用户角色重新分配成功" };
    }
    case "transfer_ownership": {
      if (!isUserPrincipal(principal) || principal.user.role !== "owner") {
        throw data("只有所有者才能转让所有权。", { status: 403 });
      }

      const headplaneUserId = formData.get("headplane_user_id")?.toString();
      if (!headplaneUserId) {
        throw data("表单数据中缺少 `headplane_user_id`。", { status: 400 });
      }

      const result = await auth.transferOwnership(principal.user.id, headplaneUserId);
      if (!result) {
        throw data("转让所有权失败。", { status: 500 });
      }

      return { message: "所有权转让成功" };
    }
    case "link_user": {
      const headplaneUserId = formData.get("headplane_user_id")?.toString();
      const headscaleUserId = formData.get("headscale_user_id")?.toString();
      if (!headplaneUserId || !headscaleUserId) {
        throw data("表单数据中缺少 `headplane_user_id` 或 `headscale_user_id`。", {
          status: 400,
        });
      }

      const linked = await auth.linkHeadscaleUser(headplaneUserId, headscaleUserId);
      if (!linked) {
        throw data("该 Headscale 用户已关联到其他账户。", { status: 409 });
      }

      return { message: "Headscale 用户关联成功" };
    }
    default:
      throw data("提供了无效的 `action_id`。", {
        status: 400,
      });
  }
}
