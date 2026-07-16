import { data } from "react-router";

import {
  authContext,
  headscaleConfigContext,
  headscaleContext,
  integrationContext,
} from "~/server/context";
import { Capabilities } from "~/server/web/roles";

import type { Route } from "./+types/overview";

export async function restrictionAction({ request, context }: Route.ActionArgs) {
  const auth = context.get(authContext);
  const headscale = context.get(headscaleContext);
  const headscaleConfig = context.get(headscaleConfigContext);
  const integration = context.get(integrationContext);

  const principal = await auth.require(request);
  const check = auth.can(principal, Capabilities.configure_iam);

  if (!check) {
    throw data("您没有权限修改 IAM 设置。", {
      status: 403,
    });
  }

  if (!headscaleConfig.writable()) {
    throw data("Headscale 配置文件不可编辑。", {
      status: 403,
    });
  }

  const formData = await request.formData();
  const action = formData.get("action_id")?.toString();
  if (!action) {
    throw data("未提供操作。", {
      status: 400,
    });
  }

  switch (action) {
    case "add_domain": {
      const domain = formData.get("domain")?.toString()?.trim();
      if (!domain) {
        throw data("未提供域名。", {
          status: 400,
        });
      }

      const domains = [
        ...new Set([...(headscaleConfig.getOIDCConfig()?.allowedDomains ?? []), domain]),
      ];

      await headscaleConfig.patch([
        {
          path: "oidc.allowed_domains",
          value: domains,
        },
      ]);

      integration?.onConfigChange(headscale);
      return data("域名添加成功。");
    }

    case "remove_domain": {
      const domain = formData.get("domain")?.toString()?.trim();
      if (!domain) {
        throw data("未提供域名。", {
          status: 400,
        });
      }

      const storedDomains = headscaleConfig.getOIDCConfig()?.allowedDomains ?? [];
      if (!storedDomains.includes(domain)) {
        // 域名不在列表中
        throw data(`在允许的域名中未找到 "${domain}"。`, {
          status: 400,
        });
      }

      // 过滤掉该域名以将其从列表中移除
      const domains = storedDomains.filter((d: string) => d !== domain);
      await headscaleConfig.patch([
        {
          path: "oidc.allowed_domains",
          value: domains,
        },
      ]);
      integration?.onConfigChange(headscale);
      return data("域名移除成功。");
    }

    case "add_group": {
      const group = formData.get("group")?.toString()?.trim();
      if (!group) {
        throw data("未提供群组。", {
          status: 400,
        });
      }

      const groups = [
        ...new Set([...(headscaleConfig.getOIDCConfig()?.allowedGroups ?? []), group]),
      ];

      await headscaleConfig.patch([
        {
          path: "oidc.allowed_groups",
          value: groups,
        },
      ]);

      integration?.onConfigChange(headscale);
      return data("群组添加成功。");
    }

    case "remove_group": {
      const group = formData.get("group")?.toString()?.trim();
      if (!group) {
        throw data("未提供群组。", {
          status: 400,
        });
      }

      const storedGroups = headscaleConfig.getOIDCConfig()?.allowedGroups ?? [];
      if (!storedGroups.includes(group)) {
        // 群组不在列表中
        throw data(`在允许的群组中未找到 "${group}"。`, {
          status: 400,
        });
      }

      // 过滤掉该群组以将其从列表中移除
      const groups = storedGroups.filter((d: string) => d !== group);
      await headscaleConfig.patch([
        {
          path: "oidc.allowed_groups",
          value: groups,
        },
      ]);

      integration?.onConfigChange(headscale);
      return data("群组移除成功。");
    }

    case "add_user": {
      const user = formData.get("user")?.toString()?.trim();
      if (!user) {
        throw data("未提供用户。", {
          status: 400,
        });
      }

      const users = [...new Set([...(headscaleConfig.getOIDCConfig()?.allowedUsers ?? []), user])];

      await headscaleConfig.patch([
        {
          path: "oidc.allowed_users",
          value: users,
        },
      ]);

      integration?.onConfigChange(headscale);
      return data("用户添加成功。");
    }

    case "remove_user": {
      const user = formData.get("user")?.toString()?.trim();
      if (!user) {
        throw data("未提供用户。", {
          status: 400,
        });
      }

      const storedUsers = headscaleConfig.getOIDCConfig()?.allowedUsers ?? [];
      if (!storedUsers.includes(user)) {
        // 用户不在列表中
        throw data(`在允许的用户中未找到 "${user}"。`, {
          status: 400,
        });
      }

      // 过滤掉该用户以将其从列表中移除
      const users = storedUsers.filter((d: string) => d !== user);
      await headscaleConfig.patch([
        {
          path: "oidc.allowed_users",
          value: users,
        },
      ]);

      integration?.onConfigChange(headscale);
      return data("用户移除成功。");
    }

    default: {
      throw data("提供了无效的操作。", {
        status: 400,
      });
    }
  }
}
