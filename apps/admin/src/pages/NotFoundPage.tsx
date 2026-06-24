import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

/** 全局 404 兜底:命中未定义路由时给出明确提示与返回入口,而非白屏。 */
export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <Result
      status="404"
      title="404"
      subTitle="抱歉,页面不存在或尚未上线。"
      extra={
        <Button type="primary" onClick={() => navigate('/tracker/setup', { replace: true })}>
          返回首页
        </Button>
      }
    />
  );
}
