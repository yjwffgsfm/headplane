import { type } from "arktype";

import log from "~/utils/log";

import DockerIntegration from "./integration/docker";
import KubernetesIntegration from "./integration/kubernetes";
import ProcIntegration from "./integration/proc";
import { deprecatedField } from "./utils";

export const pathSupportedKeys = [
  "server.cookie_secret",
  "headscale.api_key",
  "oidc.client_secret",
  "oidc.headscale_api_key",
] as const;

function normalizeStringArray(values: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (trimmed.length === 0 || seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
}

const serverConfig = type({
  host: 'string.ip = "0.0.0.0"',
  port: "number.integer = 3000",
  base_url: "string.url?",
  data_path: 'string.lower = "/var/lib/headplane/"',
  info_secret: "string?",

  cookie_secret: "(32 <= string <= 32)",
  cookie_secure: "boolean = true",
  cookie_domain: "string.lower?",
  cookie_max_age: "number.integer = 86400",

  // TLS 终止。当同时提供了 `tls_cert_path` 和 `tls_key_path` 时，
  // Headplane 在 `server.port` 上提供 HTTPS 服务。
  // 当设置了其中任意一个时，`cookie_secure` 会被强制设为 `true`。
  tls_cert_path: "string?",
  tls_key_path: "string?",

  "proxy_auth?": {
    enabled: "boolean",
    allowed_cidrs: "string[]?",
    trusted_proxy_cidrs: "string[]?",
    ip_header: "string?",
    user_header: "string?",
    email_header: "string?",
    name_header: "string?",
    picture_header: "string?",
  },
});

const partialServerConfig = type({
  host: "string.ip?",
  port: "number.integer?",
  base_url: "string.url?",
  data_path: "string.lower?",
  info_secret: "string?",

  cookie_secret: "(32 <= string <= 32)?",
  cookie_secure: "boolean?",
  cookie_domain: "string.lower?",
  cookie_max_age: "number.integer?",

  tls_cert_path: "string?",
  tls_key_path: "string?",

  "proxy_auth?": {
    enabled: "boolean?",
    allowed_cidrs: "string[]?",
    trusted_proxy_cidrs: "string[]?",
    ip_header: "string?",
    user_header: "string?",
    email_header: "string?",
    name_header: "string?",
    picture_header: "string?",
  },
});

const headscaleConfig = type({
  url: type("string.url").pipe((v) => (v.endsWith("/") ? v.slice(0, -1) : v)),
  public_url: type("string.url")
    .pipe((v) => (v.endsWith("/") ? v.slice(0, -1) : v))
    .optional(),
  api_key: "string?",
  config_path: "string.lower?",
  config_strict: "boolean = true",
  dns_records_path: "string.lower?",
  tls_cert_path: "string.lower?",
});

const partialHeadscaleConfig = type({
  url: type("string.url")
    .pipe((v) => (v.endsWith("/") ? v.slice(0, -1) : v))
    .optional(),
  public_url: type("string.url")
    .pipe((v) => (v.endsWith("/") ? v.slice(0, -1) : v))
    .optional(),
  api_key: "string?",
  config_path: "string.lower?",
  config_strict: "boolean?",
  dns_records_path: "string.lower?",
  tls_cert_path: "string.lower?",
});

const assignableRole = '"admin" | "network_admin" | "it_admin" | "auditor" | "viewer" | "member"';

const oidcConfig = type({
  enabled: "boolean = true",
  issuer: "string.url",
  client_id: "string",
  client_secret: "string",
  headscale_api_key: type("string")
    .pipe((value, ctx) => {
      log.warn("config", "%s 已弃用，请改用 headscale.api_key", ctx.propString);
      return value;
    })
    .optional(),
  use_pkce: "boolean = false",
  redirect_uri: type("string.url")
    .pipe((value, ctx) => {
      log.warn("config", "%s 已弃用，将在 0.7.0 中移除", ctx.propString);

      const cleanedValue = new URL(value.trim());
      if (cleanedValue.pathname.endsWith(`${__PREFIX__}/oidc/callback`)) {
        cleanedValue.pathname = cleanedValue.pathname.replace(`${__PREFIX__}/oidc/callback`, "/");

        log.warn(
          "config",
          '请迁移至使用 `server.base_url`，值为 "%s"',
          cleanedValue.toString(),
        );
      }

      return cleanedValue.toString();
    })
    .optional(),
  disable_api_key_login: "boolean = false",
  scope: 'string = "openid email profile"',
  subject_claims: type("string[]").pipe(normalizeStringArray).optional(),
  default_role: `${assignableRole} = "member"`,
  role_claim: "string?",
  allow_weak_rsa_keys: "boolean = false",
  profile_picture_source: '"oidc" | "gravatar" = "oidc"',
  extra_params: "Record<string, string>?",

  authorization_endpoint: "string.url?",
  token_endpoint: "string.url?",
  userinfo_endpoint: "string.url?",
  end_session_endpoint: "string.url?",
  post_logout_redirect_uri: "string.url?",
  use_end_session: "boolean = false",
  token_endpoint_auth_method: '"client_secret_basic" | "client_secret_post" | "client_secret_jwt"?',

  // 旧版/已弃用选项
  strict_validation: type("unknown").narrow(deprecatedField()).optional(),
});

const partialOidcConfig = type({
  enabled: "boolean?",
  issuer: "string.url?",
  client_id: "string?",
  client_secret: "string?",
  use_pkce: "boolean?",
  headscale_api_key: "string?",
  redirect_uri: "string.url?",
  disable_api_key_login: "boolean?",
  scope: "string?",
  subject_claims: type("string[]").pipe(normalizeStringArray).optional(),
  default_role: `${assignableRole}?`,
  role_claim: "string?",
  allow_weak_rsa_keys: "boolean?",
  extra_params: "Record<string, string>?",
  profile_picture_source: '"oidc" | "gravatar"?',

  authorization_endpoint: "string.url?",
  token_endpoint: "string.url?",
  userinfo_endpoint: "string.url?",
  end_session_endpoint: "string.url?",
  post_logout_redirect_uri: "string.url?",
  use_end_session: "boolean?",
  token_endpoint_auth_method: '"client_secret_basic" | "client_secret_post" | "client_secret_jwt"?',

  // 旧版/已弃用选项
  strict_validation: type("unknown").narrow(deprecatedField()).optional(),
});

const agentConfig = type({
  enabled: "boolean",
  host_name: 'string = "headplane-agent"',
  cache_ttl: "number.integer = 180000",
  executable_path: 'string = "/usr/libexec/headplane/agent"',
  work_dir: 'string = "/var/lib/headplane/agent"',
  pre_authkey: type("unknown").narrow(deprecatedField()).optional(),
  cache_path: type("unknown").narrow(deprecatedField()).optional(),
});

const partialAgentConfig = type({
  enabled: "boolean?",
  host_name: "string?",
  cache_ttl: "number.integer?",
  executable_path: "string?",
  work_dir: "string?",
  pre_authkey: type("unknown").narrow(deprecatedField()).optional(),
  cache_path: type("unknown").narrow(deprecatedField()).optional(),
});

const integrationConfig = type({
  docker: DockerIntegration.configSchema.full,
  kubernetes: KubernetesIntegration.configSchema.full,
  proc: ProcIntegration.configSchema.full,
  agent: agentConfig.optional(),
}).partial();

export const partialIntegrationConfig = type({
  docker: DockerIntegration.configSchema.partial,
  kubernetes: KubernetesIntegration.configSchema.partial,
  proc: ProcIntegration.configSchema.partial,
  agent: partialAgentConfig.optional(),
}).partial();

export const headplaneConfig = type({
  debug: "boolean = false",
  server: serverConfig,
  headscale: headscaleConfig,
  oidc: oidcConfig.optional(),
  integration: integrationConfig.optional(),
}).onDeepUndeclaredKey("delete");

export const partialHeadplaneConfig = type({
  debug: "boolean?",
  server: partialServerConfig.optional(),
  headscale: partialHeadscaleConfig.optional(),
  oidc: partialOidcConfig.optional(),
  integration: partialIntegrationConfig.optional(),
});

export type HeadplaneConfig = typeof headplaneConfig.infer;
export type PartialHeadplaneConfig = typeof partialHeadplaneConfig.infer;

type DotNotationToObjects<T extends string, V> = T extends `${infer K}.${infer Rest}`
  ? { [P in K]?: DotNotationToObjects<Rest, V> }
  : { [P in `${T}_path`]?: V };

type ObjectDeepMerge<T> = T extends object
  ? {
      [K in keyof T]: T[K] extends object ? ObjectDeepMerge<T[K]> : T[K];
    }
  : T;

type ConfigWithPathKeys = ObjectDeepMerge<
  DotNotationToObjects<(typeof pathSupportedKeys)[number], string | undefined>
>;

export type PartialHeadplaneConfigWithPaths = PartialHeadplaneConfig & ConfigWithPathKeys;