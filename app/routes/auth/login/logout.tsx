import { Link as RouterLink } from "react-router";

import Button from "~/components/button";

import Shell from "./shell";

export default function Logout() {
  return (
    <Shell description="现在可以关闭此窗口。" title="已退出登录">
      <Button
        className="w-full"
        nativeButton={false}
        render={<RouterLink prefetch="none" reloadDocument to="/login" />}
        variant="primary"
      >
        重新登录
      </Button>
    </Shell>
  );
}
