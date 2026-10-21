import { useFetcher } from "react-router";

import Button from "~/components/button";
import Callout from "~/components/callout";
import { Dialog, DialogActions, DialogClose, DialogTitle } from "~/components/dialog";
import Link from "~/components/link";
import { Row, RowList } from "~/components/section";
import Switch from "~/components/switch";
import type { ActionResult } from "~/utils/form";
import type { PopulatedNode } from "~/utils/node-info";

interface RoutesProps {
  node: PopulatedNode;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function Routes({ node, isOpen, setIsOpen }: RoutesProps) {
  const fetcher = useFetcher<ActionResult>();
  const subnets = [
    ...node.customRouting.subnetApprovedRoutes,
    ...node.customRouting.subnetWaitingRoutes,
  ];

  function submit(routes: string[], enabled: boolean) {
    const form = new FormData();
    form.set("intent", "update_routes");
    form.set("node_id", node.id);
    form.set("enabled", String(enabled));
    for (const route of routes) {
      form.append("routes", route);
    }

    fetcher.submit(form, { method: "POST" });
  }

  return (
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
      <DialogTitle>{node.givenName} 的路由</DialogTitle>
      <section className="flex flex-col gap-2">
        <h3 className="font-medium">子网路由</h3>
        <p className="text-muted">
          通过此设备通告的 IP 网段，访问无法运行 Tailscale 的设备。
          <Link external styled to="https://tailscale.com/kb/1019/subnets">
            文档
          </Link>
        </p>
        {subnets.length === 0 ? (
          <p className="text-muted py-2.5 text-sm">此设备未通告任何路由</p>
        ) : (
          <RowList>
            {subnets.map((route) => (
              <Row
                action={
                  <Switch
                    defaultChecked={node.approvedRoutes.includes(route)}
                    label={`批准 ${route}`}
                    onCheckedChange={(checked) => submit([route], checked)}
                  />
                }
                key={route}
              >
                <span className="font-mono text-xs break-all">{route}</span>
              </Row>
            ))}
          </RowList>
        )}
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="font-medium">出口节点</h3>
        <p className="text-muted">
          让设备经由此设备发送互联网流量。
          <Link external styled to="https://tailscale.com/kb/1103/exit-nodes">
            文档
          </Link>
        </p>
        {node.customRouting.exitRoutes.length === 0 ? (
          <p className="text-muted py-2.5 text-sm">此设备未通告为出口节点</p>
        ) : (
          <RowList>
            <Row
              action={
                <Switch
                  defaultChecked={node.customRouting.exitApproved}
                  label="用作出口节点"
                  onCheckedChange={(checked) => submit(node.customRouting.exitRoutes, checked)}
                />
              }
            >
              用作出口节点
            </Row>
          </RowList>
        )}
      </section>
      {fetcher.data?.ok === false && (
        <Callout variant="error">{fetcher.data.errors.form ?? "无法更新路由。"}</Callout>
      )}
      <DialogActions>
        <DialogClose render={<Button>完成</Button>} />
      </DialogActions>
    </Dialog>
  );
}
