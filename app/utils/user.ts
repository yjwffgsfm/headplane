import type { User } from "~/types/User";

// Headscale 0.28+ assigns tagged nodes to this placeholder user.
export function isTaggedDevicesUser(user: User): boolean {
  return user.name === "tagged-devices";
}

export function getUserDisplayName(user: User): string {
  if (isTaggedDevicesUser(user)) {
    return "标签所有";
  }

  return user.name || user.displayName || user.email || user.id;
}

export function sortUsersByDisplayName(users: User[]): User[] {
  return users.toSorted((a, b) => getUserDisplayName(a).localeCompare(getUserDisplayName(b)));
}

// Mirrors Headscale's `util.ValidateUsername` (hscontrol/util/dns.go): a name has
// to start with a letter and may only contain letters, numbers, `-`, `.`, `_` and
// at most one `@` (`\p{L}`/`\p{Nd}` match Go's `unicode.IsLetter`/`IsDigit`).
// The trailing `@` is ours: Headscale strips it when resolving a
// username in an ACL policy, so a user whose name ends in `@` is created fine but
// can never be matched by a rule.
export const USERNAME_PATTERN = String.raw`\p{L}[\p{L}\p{Nd}._\-]*(@[\p{L}\p{Nd}._\-]+)?`;

export const USERNAME_RULE =
  "用户名至少 2 个字符，以字母开头，且只能包含字母、数字、点、短横线和下划线，" +
  "最多只能有一个 @，且不能位于末尾。";

const usernameRegex = new RegExp(`^${USERNAME_PATTERN}$`, "u");

// Returns an error message when the username is not usable in Headscale.
export function validateUsername(name: string): string | undefined {
  if (name.length < 2 || !usernameRegex.test(name)) {
    return USERNAME_RULE;
  }
}
