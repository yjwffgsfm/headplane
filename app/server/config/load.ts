import { access, constants, readFile } from "node:fs/promises";

import { type } from "arktype";
import { load } from "js-yaml";

import log from "~/utils/log";

import {
  headplaneConfig,
  PartialHeadplaneConfig,
  partialHeadplaneConfig,
  pathSupportedKeys,
} from "./config-schema";
import { ConfigError } from "./error";

/**
 * 主入口函数，尝试从 YAML 配置文件（如果可用）和环境变量中加载并合并配置。
 * 重要说明：环境变量会覆盖配置文件中的任何值。
 *
 * 该函数还支持通过检查对应的 `_path` 后缀的环境变量或配置文件条目，
 * 从文件路径加载特定配置键的密钥值（例如证书、私钥）。
 *
 * @param configPathOverride 用于测试时覆盖配置文件路径
 * @returns @ref{HeadplaneConfig} 经过完全验证的配置
 * @throws {Error} 如果最终配置存在验证错误
 */
export async function loadConfig(configPathOverride?: string) {
  const configPath =
    configPathOverride != null
      ? configPathOverride
      : process.env.HEADPLANE_CONFIG_PATH != null
        ? String(process.env.HEADPLANE_CONFIG_PATH)
        : "/etc/headplane/config.yaml";

  const fileConfig = await loadConfigFile(configPath);
  const envConfig = await loadConfigEnv();

  const combinedConfig = deepMerge(fileConfig, envConfig);
  await loadConfigKeyPaths(combinedConfig);

  const finalConfig = headplaneConfig(combinedConfig);
  if (finalConfig instanceof type.errors) {
    throw ConfigError.from("INVALID_REQUIRED_FIELDS", {
      messages: finalConfig.map((e) => e.toString()),
    });
  }

  return finalConfig;
}

/**
 * 尝试从指定路径的 YAML 文件加载配置。
 * 如果文件不可访问，则返回 undefined。
 *
 * @param path 要加载配置的文件路径
 * @returns 部分配置对象或 undefined
 * @throws {Error} 如果加载的配置存在验证错误
 */
export async function loadConfigFile(path: string) {
  try {
    await access(path, constants.R_OK);
  } catch {
    log.info("config", "无法访问配置文件：%s", path);
    return;
  }

  const rawBuffer = await readFile(path, "utf8");
  const rawConfig = load(rawBuffer);
  const config = partialHeadplaneConfig(rawConfig);
  if (config instanceof type.errors) {
    throw ConfigError.from("INVALID_REQUIRED_FIELDS", {
      messages: config.map((e) => e.toString()),
    });
  }

  return config;
}

/**
 * 从以 `HEADPLANE_` 为前缀的环境变量加载配置覆盖项。
 * 嵌套配置键可以使用双下划线（`__`）表示。
 * 例如，`HEADPLANE_SERVER__PORT=8080` 会将 `server.port` 配置键设置为 `8080`。
 *
 * @returns 部分配置对象或 undefined
 * @throws {Error} 如果加载的配置存在验证错误
 */
export async function loadConfigEnv() {
  if (process.env.HEADPLANE_LOAD_ENV_OVERRIDES != null) {
    log.warn(
      "config",
      "HEADPLANE_LOAD_ENV_OVERRIDES 已弃用，将在未来版本中移除",
    );
    log.warn(
      "config",
      "环境变量始终会被加载，不再支持 `.env` 文件",
    );
  }

  const rawConfig: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value == null || !key.startsWith("HEADPLANE_")) {
      continue;
    }

    const parsedValue = parseEnvValue(value);
    const configKey = key.slice("HEADPLANE_".length).toLowerCase();
    deepSet(rawConfig, configKey.split("__"), parsedValue);
  }

  const config = partialHeadplaneConfig(rawConfig);
  if (config instanceof type.errors) {
    throw ConfigError.from("INVALID_REQUIRED_FIELDS", {
      messages: config.map((e) => e.toString()),
    });
  }

  return Object.keys(config).length > 0 ? config : undefined;
}

/**
 * 深度合并多个对象。参数列表中较靠后的对象会覆盖较靠前对象的属性。
 *
 * @param objects 要合并的对象
 * @returns 合并后的对象
 */
function deepMerge<T>(...objects: (T | undefined)[]): T {
  const result: { [key: string]: unknown } = {};
  for (const obj of objects.filter((o) => o != null)) {
    for (const [key, value] of Object.entries(
      obj as {
        [key: string]: unknown;
      },
    )) {
      if (value != null && typeof value === "object" && !Array.isArray(value)) {
        if (result[key] == null || typeof result[key] !== "object" || Array.isArray(result[key])) {
          result[key] = {};
        }
        result[key] = deepMerge(result[key], value);
      } else {
        result[key] = value;
      }
    }
  }

  return result as T;
}

/**
 * 根据提供的路径在对象中深度设置值。
 *
 * @param obj 要设置值的对象
 * @param path 表示要设置路径的键数组
 * @param value 要在指定路径设置的值
 */
function deepSet(obj: { [key: string]: unknown }, path: string[], value: unknown): void {
  let current = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (current[key] == null || typeof current[key] !== "object") {
      current[key] = {};
    }

    current = current[key] as { [key: string]: unknown };
  }

  current[path[path.length - 1]] = value;
}

/**
 * 将环境变量字符串值解析为适当的类型。
 * 支持布尔值、null、undefined 和数字。否则回退为字符串。
 *
 * @param value 环境变量字符串值
 * @returns 解析后的值
 */
function parseEnvValue(value: string): unknown {
  const v = value.trim().toLowerCase();
  if (v === "true") return true;
  if (v === "false") return false;
  if (v === "null") return null;
  if (v === "undefined") return undefined;

  if (/^-?\d+(\.\d+)?$/.test(v)) {
    const num = Number(v);
    if (!Number.isNaN(num)) return num;
  }

  return value;
}

/**
 * 对于支持从文件路径加载的配置键（例如证书、私钥），
 * 该函数检查对应的 `_path` 后缀键，并在主键未设置时加载文件内容。
 *
 * @param partial 要更新的部分配置对象
 */
export async function loadConfigKeyPaths(partial: PartialHeadplaneConfig) {
  for (const key of pathSupportedKeys) {
    const pathKey = `${key}_path`;
    const pathValue = deepGet(partial, pathKey.split("."));
    const existing = deepGet(partial, key.split("."));

    if (pathValue == null || typeof pathValue !== "string") {
      continue;
    }

    if (existing != null) {
      throw ConfigError.from("CONFLICTING_SECRET_PATH_FIELD", {
        fieldName: key,
      });
    }

    const realPath = pathValue.replace(/\$\{([^}]+)\}/g, (_, variableName) => {
      const value = process.env[variableName];
      if (value === undefined) {
        throw ConfigError.from("MISSING_INTERPOLATION_VARIABLE", {
          pathKey: `${key}_path`,
          variableName: variableName,
        });
      }

      return value;
    });

    try {
      const fileContent = await readFile(realPath, "utf8");
      deepSet(partial, key.split("."), fileContent.trim().normalize());
    } catch {
      throw ConfigError.from("MISSING_SECRET_FILE", {
        pathKey: `${key}_path`,
        filePath: realPath,
      });
    }
  }
}

/**
 * 根据提供的路径从对象中深度获取值。
 *
 * @param obj 要获取值的对象
 * @param path 表示要获取路径的键数组
 * @returns 指定路径的值，如果未找到则返回 undefined
 */
function deepGet(obj: { [key: string]: unknown }, path: string[]): unknown {
  let current = obj;
  for (const segment of path) {
    if (current == null || typeof current !== "object") {
      return undefined;
    }

    current = current[segment] as { [key: string]: unknown };
  }

  return current;
}