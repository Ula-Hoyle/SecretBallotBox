// 为静态导出生成参数
export async function generateStaticParams() {
  // 为GitHub Pages静态部署生成一些示例参数
  // 实际部署时，这些页面会通过客户端路由动态加载
  return [
    { id: '1' },
    { id: '2' },
    { id: '3' }
  ];
}

export default function BallotLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
