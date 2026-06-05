import type { SpmVO } from '../types/spm';

let spmIdCounter = 300;

function makeSpm(overrides: Partial<SpmVO> = {}): SpmVO {
  spmIdCounter++;
  return {
    id: spmIdCounter,
    spmCode: 'HOME_BANNER_TOP',
    spmName: '首页顶部Banner',
    spmaLabel: '首页',
    spmbLabel: 'Banner区',
    spmcLabel: '顶部位置',
    spmdLabel: '第1张',
    description: '',
    createdAt: new Date(Date.now() - Math.random() * 60 * 86400000).toISOString(),
    ...overrides,
  };
}

export const mockSpms: SpmVO[] = [
  makeSpm({ spmCode: 'HOME_BANNER_TOP', spmName: '首页顶部Banner', spmaLabel: '首页', spmbLabel: 'Banner区', spmcLabel: '顶部', spmdLabel: '轮播1' }),
  makeSpm({ spmCode: 'HOME_BANNER_MID', spmName: '首页中部Banner', spmaLabel: '首页', spmbLabel: 'Banner区', spmcLabel: '中部', spmdLabel: '轮播2' }),
  makeSpm({ spmCode: 'HOME_RECOMMEND_FLOOR1', spmName: '首页推荐1楼', spmaLabel: '首页', spmbLabel: '推荐区', spmcLabel: '1楼', spmdLabel: '' }),
  makeSpm({ spmCode: 'HOME_RECOMMEND_FLOOR2', spmName: '首页推荐2楼', spmaLabel: '首页', spmbLabel: '推荐区', spmcLabel: '2楼', spmdLabel: '' }),
  makeSpm({ spmCode: 'HOME_FEEDS_LIST', spmName: '首页Feed列表', spmaLabel: '首页', spmbLabel: 'Feed区', spmcLabel: '列表', spmdLabel: '' }),
  makeSpm({ spmCode: 'HOME_FEEDS_ITEM_1', spmName: '首页Feed第1项', spmaLabel: '首页', spmbLabel: 'Feed区', spmcLabel: '列表', spmdLabel: '第1项' }),
  makeSpm({ spmCode: 'HOME_NAV_TOP', spmName: '首页顶部导航', spmaLabel: '首页', spmbLabel: '导航区', spmcLabel: '顶部', spmdLabel: '' }),
  makeSpm({ spmCode: 'PRODUCT_DETAIL_IMAGE', spmName: '商品详情图片区', spmaLabel: '商品详情页', spmbLabel: '图片区', spmcLabel: '', spmdLabel: '' }),
  makeSpm({ spmCode: 'PRODUCT_DETAIL_ACTION_BUY', spmName: '商品详情购买按钮', spmaLabel: '商品详情页', spmbLabel: '操作区', spmcLabel: '', spmdLabel: '购买' }),
  makeSpm({ spmCode: 'PRODUCT_DETAIL_ACTION_CART', spmName: '商品详情加购按钮', spmaLabel: '商品详情页', spmbLabel: '操作区', spmcLabel: '', spmdLabel: '加购' }),
  makeSpm({ spmCode: 'PRODUCT_LIST_ITEM_1', spmName: '商品列表第1项', spmaLabel: '商品列表页', spmbLabel: '列表区', spmcLabel: '', spmdLabel: '第1项' }),
  makeSpm({ spmCode: 'SEARCH_RESULT_LIST', spmName: '搜索结果列表', spmaLabel: '搜索结果页', spmbLabel: '列表区', spmcLabel: '', spmdLabel: '' }),
  makeSpm({ spmCode: 'CART_LIST_ITEM', spmName: '购物车商品项', spmaLabel: '购物车页', spmbLabel: '列表区', spmcLabel: '', spmdLabel: '商品' }),
  makeSpm({ spmCode: 'CART_CHECKOUT_BTN', spmName: '购物车结算按钮', spmaLabel: '购物车页', spmbLabel: '底部区', spmcLabel: '', spmdLabel: '结算' }),
  makeSpm({ spmCode: 'CHECKOUT_PAY_BTN', spmName: '结算页支付按钮', spmaLabel: '结算页', spmbLabel: '底部区', spmcLabel: '', spmdLabel: '支付' }),
  makeSpm({ spmCode: 'PROFILE_AVATAR', spmName: '个人中心头像', spmaLabel: '个人中心', spmbLabel: '头部区', spmcLabel: '', spmdLabel: '头像' }),
  makeSpm({ spmCode: 'PROFILE_SETTINGS_BTN', spmName: '个人中心设置按钮', spmaLabel: '个人中心', spmbLabel: '设置区', spmcLabel: '', spmdLabel: '按钮' }),
  makeSpm({ spmCode: 'LOGIN_PAGE_BTN', spmName: '登录页登录按钮', spmaLabel: '登录页', spmbLabel: '表单区', spmcLabel: '', spmdLabel: '登录按钮' }),
  makeSpm({ spmCode: 'REGISTER_PAGE_BTN', spmName: '注册页注册按钮', spmaLabel: '注册页', spmbLabel: '表单区', spmcLabel: '', spmdLabel: '注册按钮' }),
  makeSpm({ spmCode: 'LIVE_ROOM_CARD', spmName: '直播间卡片', spmaLabel: '直播列表页', spmbLabel: '列表区', spmcLabel: '', spmdLabel: '第1个' }),
];
