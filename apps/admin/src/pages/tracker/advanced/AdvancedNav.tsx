import { Segmented } from 'antd';
import { useNavigate } from 'react-router-dom';

/** 漏斗 / 留存 / 路径 之间的子导航,保持同一应用上下文切换。 */
export function AdvancedNav({
  appCode,
  active,
}: {
  appCode?: string;
  active: 'funnel' | 'retention' | 'path';
}) {
  const navigate = useNavigate();
  return (
    <Segmented
      style={{ marginBottom: 16 }}
      value={active}
      onChange={(v) => appCode && navigate(`/tracker/advanced/${appCode}/${v}`)}
      options={[
        { label: '漏斗分析', value: 'funnel' },
        { label: '留存分析', value: 'retention' },
        { label: '路径分析', value: 'path' },
      ]}
    />
  );
}
