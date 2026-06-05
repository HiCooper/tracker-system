import type { PropertyVO } from '../types/property';

let propIdCounter = 200;

function makeProp(overrides: Partial<PropertyVO> = {}): PropertyVO {
  propIdCounter++;
  return {
    id: propIdCounter,
    eventId: 101,
    eventName: '页面浏览',
    propKey: 'page_url',
    propName: '页面URL',
    dataType: 'string',
    description: '',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export const mockProperties: PropertyVO[] = [
  makeProp({ eventId: 101, eventName: '页面浏览', propKey: 'page_url', propName: '页面URL', dataType: 'string' }),
  makeProp({ eventId: 101, eventName: '页面浏览', propKey: 'page_title', propName: '页面标题', dataType: 'string' }),
  makeProp({ eventId: 101, eventName: '页面浏览', propKey: 'referrer', propName: '来源页面', dataType: 'string' }),
  makeProp({ eventId: 101, eventName: '页面浏览', propKey: 'stay_duration', propName: '停留时长(秒)', dataType: 'number' }),
  makeProp({ eventId: 102, eventName: '购买按钮点击', propKey: 'button_text', propName: '按钮文案', dataType: 'string' }),
  makeProp({ eventId: 102, eventName: '购买按钮点击', propKey: 'product_id', propName: '商品ID', dataType: 'string' }),
  makeProp({ eventId: 102, eventName: '购买按钮点击', propKey: 'product_price', propName: '商品价格', dataType: 'number' }),
  makeProp({ eventId: 102, eventName: '购买按钮点击', propKey: 'page_position', propName: '页面位置', dataType: 'string' }),
  makeProp({ eventId: 103, eventName: '加入购物车', propKey: 'product_id', propName: '商品ID', dataType: 'string' }),
  makeProp({ eventId: 103, eventName: '加入购物车', propKey: 'quantity', propName: '数量', dataType: 'number' }),
  makeProp({ eventId: 108, eventName: '顶部Banner曝光', propKey: 'banner_id', propName: 'Banner ID', dataType: 'string' }),
  makeProp({ eventId: 108, eventName: '顶部Banner曝光', propKey: 'banner_position', propName: 'Banner位置', dataType: 'number' }),
  makeProp({ eventId: 108, eventName: '顶部Banner曝光', propKey: 'is_auto_play', propName: '是否自动播放', dataType: 'boolean' }),
  makeProp({ eventId: 109, eventName: '推荐区域曝光', propKey: 'module_id', propName: '模块ID', dataType: 'string' }),
  makeProp({ eventId: 109, eventName: '推荐区域曝光', propKey: 'item_count', propName: '展示商品数', dataType: 'number' }),
  makeProp({ eventId: 114, eventName: '用户注册', propKey: 'register_type', propName: '注册方式', dataType: 'string' }),
  makeProp({ eventId: 114, eventName: '用户注册', propKey: 'channel', propName: '渠道来源', dataType: 'string' }),
  makeProp({ eventId: 114, eventName: '用户注册', propKey: 'is_new_device', propName: '是否新设备', dataType: 'boolean' }),
  makeProp({ eventId: 115, eventName: '支付成功', propKey: 'order_id', propName: '订单ID', dataType: 'string' }),
  makeProp({ eventId: 115, eventName: '支付成功', propKey: 'amount', propName: '支付金额', dataType: 'number' }),
  makeProp({ eventId: 115, eventName: '支付成功', propKey: 'pay_method', propName: '支付方式', dataType: 'string' }),
  makeProp({ eventId: 115, eventName: '支付成功', propKey: 'pay_time', propName: '支付时间', dataType: 'date' }),
];

export function getPropertiesByEventId(eventId: number): PropertyVO[] {
  return mockProperties.filter((p) => p.eventId === eventId);
}
