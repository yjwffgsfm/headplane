import { data, redirect } from "react-router";

import { authContext, headscaleLiveStoreContext, requestApiContext } from "~/server/context";
import { isDataWithApiError } from "~/server/headscale/api/error-client";
import { nodesResource } from "~/server/headscale/live-store";
import { Capabilities } from "~/server/web/roles";
import { normalizeRegistrationKey } from "~/utils/register-key";

import type { Route } from "./+types/machine";

export async function machineAction({ request, context }: Route.ActionArgs) {
  const auth = context.get(authContext);
  const getRequestApi = context.get(requestApiContext);
  const headscaleLiveStore = context.get(headscaleLiveStoreContext);

  const { principal, api } = await getRequestApi(request);

  const formData = await request.formData();

  const action = formData.get("action_id")?.toString();
  if (!action) {
    throw data("表单数据中缺少 `action_id`。", {
      status: 400,
    });
  }

  // 快速通道：注册不需要现有机器
  if (action === "register") {
    if (!auth.can(principal, Capabilities.write_machines)) {
      throw data("您没有权限管理机器", {
        status: 403,
      });
    }

    const registrationKeyInput = formData.get("register_key")?.toString();
    if (!registrationKeyInput) {
      throw data("表单数据中缺少 `register_key`。", {
        status: 400,
      });
    }

    const registrationKey = normalizeRegistrationKey(registrationKeyInput);
    if (!registrationKey) {
      throw data("表单数据中的 `register_key` 无效。", {
        status: 400,
      });
    }

    const user = formData.get("user")?.toString();
    if (!user) {
      throw data("表单数据中缺少 `user`。", {
        status: 400,
      });
    }

    const node = await api.nodes.register(user, registrationKey);
    await headscaleLiveStore.refresh(nodesResource, api);
    return redirect(`/machines/${node.id}`);
  }

  // 检查用户是否有权限管理此机器
  const nodeId = formData.get("node_id")?.toString();
  if (!nodeId) {
    throw data("表单数据中缺少 `node_id`。", {
      status: 400,
    });
  }

  const node = await api.nodes.get(nodeId);
  if (!node) {
    throw data(`未找到 ID 为 ${nodeId} 的机器`, {
      status: 404,
    });
  }

  if (!auth.canManageNode(principal, node)) {
    throw data("您没有权限对此机器执行操作", {
      status: 403,
    });
  }

  switch (action) {
    case "rename": {
      const newName = formData.get("name")?.toString();
      if (!newName) {
        throw data("表单数据中缺少 `name`。", {
          status: 400,
        });
      }

      const name = String(formData.get("name"));
      if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(name.toLowerCase())) {
        throw data(
          "机器名称必须是有效的 DNS 标签：仅限小写字母、数字和连字符，且必须以字母或数字开头和结尾。",
          { status: 400 },
        );
      }

      await api.nodes.rename(nodeId, name);
      await headscaleLiveStore.refresh(nodesResource, api);
      return { message: "机器已重命名" };
    }

    case "delete": {
      await api.nodes.delete(nodeId);
      await headscaleLiveStore.refresh(nodesResource, api);
      return redirect("/machines");
    }

    case "expire": {
      await api.nodes.expire(nodeId);
      await headscaleLiveStore.refresh(nodesResource, api);
      return { message: "机器已过期" };
    }

    case "update_tags": {
      const tags = formData.get("tags")?.toString().split(",") ?? [];
      if (tags.length === 0) {
        throw data("表单数据中缺少 `tags`。", {
          status: 400,
        });
      }

      try {
        await api.nodes.setTags(
          nodeId,
          tags.map((tag) => tag.trim()).filter((tag) => tag !== ""),
        );

        await headscaleLiveStore.refresh(nodesResource, api);
        return { success: true as const, message: "标签已更新" };
      } catch (error) {
        if (isDataWithApiError(error) && error.data.statusCode === 400) {
          return data(
            {
              success: false as const,
              error:
                extractApiErrorMessage(error.data) ??
                "一个或多个标签未在您的 ACL 策略中定义。请在分配给机器之前将其添加到策略中。",
            },
            { status: 400 },
          );
        }

        throw error;
      }
    }

    case "update_routes": {
      const newApproved = node.approvedRoutes;
      const routes = formData.get("routes")?.toString();
      if (!routes) {
        throw data("表单数据中缺少 `routes`。", {
          status: 400,
        });
      }

      const allRoutes = routes.split(",").map((route) => route.trim());
      if (allRoutes.length === 0) {
        throw data("未提供要更新的路由", {
          status: 400,
        });
      }

      const enabled = formData.get("enabled")?.toString();
      if (enabled === undefined) {
        throw data("表单数据中缺少 `enabled`。", {
          status: 400,
        });
      }

      if (enabled === "true") {
        for (const route of allRoutes) {
          // 如果已批准则跳过，否则添加到已批准列表
          if (newApproved.includes(route)) {
            continue;
          }

          newApproved.push(route);
        }
      } else {
        for (const route of allRoutes) {
          // 如果未批准则跳过，否则从已批准列表中移除
          if (!newApproved.includes(route)) {
            continue;
          }

          const index = newApproved.indexOf(route);
          if (index > -1) {
            newApproved.splice(index, 1);
          }
        }
      }

      await api.nodes.approveRoutes(nodeId, newApproved);
      await headscaleLiveStore.refresh(nodesResource, api);
      return { message: "路由已更新" };
    }

    case "reassign": {
      const user = formData.get("user_id")?.toString();
      if (!user) {
        throw data("表单数据中缺少 `user_id`。", {
          status: 400,
        });
      }

      if (!api.nodes.reassignUser) {
        throw data("此 Headscale 版本不再支持重新分配节点所有者。", {
          status: 400,
        });
      }
      await api.nodes.reassignUser(nodeId, user);
      await headscaleLiveStore.refresh(nodesResource, api);
      return { message: "机器已重新分配" };
    }

    default:
      throw data("无效操作", {
        status: 400,
      });
  }
}

function extractApiErrorMessage(error: { data?: unknown; rawData: string }) {
  if (error.data != null && typeof error.data === "object" && "message" in error.data) {
    const message = (error.data as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }

  return error.rawData.length > 0 ? error.rawData : undefined;
}
