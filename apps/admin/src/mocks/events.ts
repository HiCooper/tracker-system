import type { EventVO } from '../types/event';

let idCounter = 100;

function makeEvent(overrides: Partial<EventVO> = {}): EventVO {
  idCounter++;
  return {
    id: idCounter,
    eventKey: 'page_view',
    eventName: '页面浏览',
    description: '',
    category: 'page_view',
    status: 1,
    createdAt: new Date(Date.now() - Math.random() * 90 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
    ...overrides,
  };
}

export const mockEvents: EventVO[] = [
  makeEvent({ eventKey: 'page_view', eventName: '页面浏览', description: '用户访问页面时触发', category: 'page_view' }),
  makeEvent({ eventKey: 'click_buy_button', eventName: '购买按钮点击', description: '用户点击购买按钮', category: 'click' }),
  makeEvent({ eventKey: 'click_add_cart', eventName: '加入购物车', description: '用户点击加入购物车按钮', category: 'click' }),
  makeEvent({ eventKey: 'click_search', eventName: '搜索提交', description: '用户提交搜索请求', category: 'click' }),
  makeEvent({ eventKey: 'click_nav_tab', eventName: '导航标签点击', description: '点击顶部导航标签', category: 'click' }),
  makeEvent({ eventKey: 'click_share', eventName: '分享按钮点击', description: '用户点击分享按钮', category: 'click' }),
  makeEvent({ eventKey: 'click_login', eventName: '登录按钮点击', description: '用户点击登录按钮', category: 'click' }),
  makeEvent({ eventKey: 'exposure_banner_top', eventName: '顶部Banner曝光', description: '顶部Banner轮播图曝光', category: 'exposure' }),
  makeEvent({ eventKey: 'exposure_recommend', eventName: '推荐区域曝光', description: '首页推荐商品区域曝光', category: 'exposure' }),
  makeEvent({ eventKey: 'exposure_feeds_item', eventName: 'Feed流Item曝光', description: 'Feed流中单个内容卡片曝光', category: 'exposure' }),
  makeEvent({ eventKey: 'exposure_product_card', eventName: '商品卡片曝光', description: '商品列表中的商品卡片曝光', category: 'exposure' }),
  makeEvent({ eventKey: 'exposure_modal_ad', eventName: '弹窗广告曝光', description: '弹窗广告展示', category: 'exposure' }),
  makeEvent({ eventKey: 'exposure_sidebar', eventName: '侧边栏曝光', description: '侧边栏模块曝光', category: 'exposure' }),
  makeEvent({ eventKey: 'custom_register', eventName: '用户注册', description: '新用户完成注册', category: 'custom' }),
  makeEvent({ eventKey: 'custom_payment_success', eventName: '支付成功', description: '用户完成支付', category: 'custom' }),
  makeEvent({ eventKey: 'custom_video_play', eventName: '视频播放', description: '用户开始播放视频', category: 'custom' }),
  makeEvent({ eventKey: 'custom_download', eventName: '文件下载', description: '用户下载文件', category: 'custom' }),
  makeEvent({ eventKey: 'custom_comment', eventName: '发表评论', description: '用户发表评论', category: 'custom' }),
  makeEvent({ eventKey: 'custom_collect', eventName: '收藏内容', description: '用户收藏商品或内容', category: 'custom' }),
  makeEvent({ eventKey: 'custom_follow', eventName: '关注用户', description: '用户关注其他用户', category: 'custom' }),
  makeEvent({ eventKey: 'custom_like', eventName: '点赞内容', description: '用户点赞内容', category: 'custom' }),
  makeEvent({ eventKey: 'click_banner_1', eventName: 'Banner-1点击', description: '点击第一个Banner', category: 'click', status: 0 }),
  makeEvent({ eventKey: 'exposure_old_module', eventName: '旧版模块曝光', description: '已废弃的模块曝光', category: 'exposure', status: 0 }),
  makeEvent({ eventKey: 'custom_form_submit', eventName: '表单提交', description: '用户提交表单', category: 'custom' }),
  makeEvent({ eventKey: 'click_filter', eventName: '筛选条件点击', description: '用户点击筛选条件', category: 'click' }),
  makeEvent({ eventKey: 'exposure_live_card', eventName: '直播卡片曝光', description: '直播间卡片曝光', category: 'exposure' }),
  makeEvent({ eventKey: 'custom_coupon_claim', eventName: '优惠券领取', description: '用户领取优惠券', category: 'custom' }),
  makeEvent({ eventKey: 'click_tab_switch', eventName: 'Tab切换', description: '用户切换Tab', category: 'click' }),
  makeEvent({ eventKey: 'exposure_push_notify', eventName: '推送通知曝光', description: 'Push通知展示', category: 'exposure' }),
  makeEvent({ eventKey: 'custom_watch_time', eventName: '观看时长上报', description: '用户观看视频时长上报', category: 'custom' }),
];

export function getEventById(id: number): EventVO | undefined {
  return mockEvents.find((e) => e.id === id);
}
