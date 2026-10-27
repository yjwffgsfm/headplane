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

import { restrictionTypes, restrictionValue, type RestrictionType } from "./schemas";

const configPaths = {
  domain: { path: "oidc.allowed_domains", key: "allowedDomains" },
  group: { path: "oidc.allowed_groups", key: "allowedGroups" },
  user: { path: "oidc.allowed_users", key: "allowedUsers" },
} as const;

const labels = { domain: "域名", group: "组", user: "用户" };

export const restrictionAction = createAction({
  capability: Capabilities.configure_iam,
  async setup({ request, context }) {
    const principal = await context.get(authContext).require(request);
    const headscale = context.get(headscaleContext);
    const config = context.get(headscaleConfigContext);
    const integration = context.get(integrationContext);
    if (!config.writable()) {
      throw new ActionError("Headscale 配置为只读。", 403);
    }

    function current(type: RestrictionType) {
      return config.getOIDCConfig()?.[configPaths[type].key] ?? [];
    }

    async function save(type: RestrictionType, values: string[]) {
      await config.patch([{ path: configPaths[type].path, value: values }]);
      if (integration && !(await integration.onConfigChange(headscale))) {
        throw new ActionError("已保存，但 Headscale 重启后未能恢复。请检查其日志。", 502);
      }
    }

    return { principal, current, save };
  },
  intents: {
    add: {
      fields: { type: v.picklist(restrictionTypes), value: v.string() },
      async handler(input, { current, save }) {
        const value = parseValues(restrictionValue[input.type], input.value);
        if (!value.ok) {
          return invalid({ value: value.errors.form });
        }

        const values = current(input.type);
        if (values.includes(value.data)) {
          return invalid({ value: `该${labels[input.type]}已在列表中。` });
        }

        await save(input.type, [...values, value.data]);
        return ok(`${labels[input.type]}已添加`);
      },
    },
    remove: {
      fields: { type: v.picklist(restrictionTypes), value: v.string() },
      async handler(input, { current, save }) {
        const values = current(input.type);
        if (!values.includes(input.value)) {
          throw new ActionError(`该${labels[input.type]}不在列表中。`);
        }

        await save(
          input.type,
          values.filter((value) => value !== input.value),
        );
        return ok(`${labels[input.type]}已移除`);
      },
    },
  },
});
