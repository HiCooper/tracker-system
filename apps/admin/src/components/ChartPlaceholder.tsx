import { Empty } from 'antd';

/**
 * 图表占位:在图表能力接入前,用诚实的「开发中」空态替代灰底假图,
 * 避免把永远不会出数的灰盒当作「即将展示的真实图表」。
 */
export function ChartPlaceholder({ height = 240, description = '图表开发中' }: { height?: number; description?: string }) {
  return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={description} />
    </div>
  );
}
