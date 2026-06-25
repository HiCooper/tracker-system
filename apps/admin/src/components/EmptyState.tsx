import { Empty, Button } from 'antd';
import type { ReactNode } from 'react';

/**
 * 统一空状态:替代各页散落的「暂无数据」纯文本 div,可选行动引导按钮。
 * - image="simple" 用于列表/卡片内的紧凑空态;默认用于整页空态。
 */
export function EmptyState({
  description = '暂无数据',
  actionText,
  onAction,
  image = 'default',
}: {
  description?: ReactNode;
  actionText?: string;
  onAction?: () => void;
  image?: 'default' | 'simple';
}) {
  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <Empty
        image={image === 'simple' ? Empty.PRESENTED_IMAGE_SIMPLE : undefined}
        description={description}
      >
        {actionText && onAction ? (
          <Button type="primary" onClick={onAction}>{actionText}</Button>
        ) : null}
      </Empty>
    </div>
  );
}
