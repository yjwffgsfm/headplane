interface ErrorCodes {
  CONFLICTING_SECRET_PATH_FIELD: {
    fieldName: string;
  };

  INVALID_REQUIRED_FIELDS: {
    messages: string[];
  };

  MISSING_INTERPOLATION_VARIABLE: {
    pathKey: string;
    variableName: string;
  };

  MISSING_SECRET_FILE: {
    pathKey: string;
    filePath: string;
  };
}

const translationsWithVars: {
  [K in keyof ErrorCodes]: (vars: ErrorCodes[K]) => string;
} = {
  CONFLICTING_SECRET_PATH_FIELD: ({ fieldName }) =>
    `同时设置了 "${fieldName}" 和 "${fieldName}_path"，请仅提供其中一个字段。`,
  INVALID_REQUIRED_FIELDS: ({ messages }) =>
    `配置缺少必填字段或包含无效值：\n- ${messages.join("\n- ")}`,
  MISSING_INTERPOLATION_VARIABLE: ({ pathKey, variableName }) =>
    `无法解析配置键 "${pathKey}" 的环境变量 "${variableName}"。`,

  MISSING_SECRET_FILE: ({ pathKey, filePath }) =>
    `无法访问 "${pathKey}" 中指定的密钥文件，路径为 "${filePath}"。请确保文件存在且可读。`,
} as const;

/**
 * 配置相关错误的自定义错误类。
 */
export class ConfigError extends Error {
  /**
   * 表示配置错误类型的错误代码。
   */
  code: keyof ErrorCodes;

  /**
   * 创建一个新的 ConfigError 实例。
   *
   * @param code 错误代码
   * @param vars 要插入到错误消息中的变量
   */
  constructor(code: keyof ErrorCodes, vars: unknown) {
    super(
      translationsWithVars[code](
        vars as (typeof translationsWithVars)[typeof code] extends (vars: infer U) => string
          ? U
          : never,
      ),
    );
    this.code = code;
    this.name = "ConfigError";
  }

  /**
   * 工厂方法，用于创建 ConfigError 实例。
   *
   * @param code 错误代码
   * @param vars 要插入到错误消息中的变量
   * @returns 一个新的 ConfigError 实例
   */
  static from<K extends keyof ErrorCodes>(code: K, vars: ErrorCodes[K]) {
    return new ConfigError(code, vars);
  }
}