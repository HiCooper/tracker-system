import { Card, Statistic, Spin } from 'antd';

interface Props {
  title: string;
  value: number | string;
  suffix?: string;
  precision?: number;
  loading?: boolean;
  color?: string;
}

export function MetricCard({ title, value, suffix = '', precision = 0, loading = false, color }: Props) {
  return (
    <Card>
      {loading ? (
        <Spin />
      ) : (
        <Statistic
          title={title}
          value={value}
          suffix={suffix}
          precision={precision}
          valueStyle={color ? { color } : undefined}
        />
      )}
    </Card>
  );
}
