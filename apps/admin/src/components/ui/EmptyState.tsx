import { Empty, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

interface Props {
  description?: string;
  createLabel?: string;
  onCreate?: () => void;
}

export function EmptyState({ description = '暂无数据', createLabel, onCreate }: Props) {
  return (
    <Empty
      description={description}
      style={{ padding: 60 }}
    >
      {onCreate && createLabel && (
        <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
          {createLabel}
        </Button>
      )}
    </Empty>
  );
}
