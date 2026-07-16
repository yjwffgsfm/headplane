import Card from "~/components/card";

export default function Logout() {
  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <Card className="m-4 max-w-md sm:m-0">
        <Card.Title>您已成功登出</Card.Title>
        <Card.Text>您现在可以关闭此窗口。如果您想重新登录，请刷新页面。</Card.Text>
      </Card>
    </div>
  );
}
