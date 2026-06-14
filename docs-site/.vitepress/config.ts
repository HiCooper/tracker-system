import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(defineConfig({
  title: 'Tracker System',
  description: '埋点分析数据采集平台文档',
  base: process.env.BASE_PATH || '/',
  lang: 'zh-CN',

  head: [
    ['link', { rel: 'icon', href: '/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#f59e0b' }],
  ],

  themeConfig: {
    logo: '/logo.svg',

    // 导航栏
    nav: [
      { text: '产品指南', link: '/guide/', activeMatch: '^/guide/' },
      { text: '技术架构', link: '/dev/', activeMatch: '^/dev/' },
      { text: '内部资料', link: '/knowledge/', activeMatch: '^/knowledge/' },
    ],

    // 侧边栏
    sidebar: {
      '/guide/': [
        {
          text: '产品指南',
          items: [
            { text: '快速开始', link: '/guide/' },
            { text: '埋点路径规范 (SPM)', link: '/guide/spm-spec' },
            { text: '需求管理工作流', link: '/guide/plan-workflow' },
          ],
        },
      ],
      '/dev/': [
        {
          text: '系统架构',
          items: [
            { text: '整体架构', link: '/dev/architecture' },
            { text: '事件管道', link: '/dev/event-pipeline' },
          ],
        },
        {
          text: '数据设计',
          items: [
            { text: '数据模型', link: '/dev/data-model' },
            { text: '会话管理', link: '/dev/session-design' },
          ],
        },
        {
          text: '服务端设计',
          items: [
            { text: '服务端架构', link: '/dev/server-design' },
            { text: 'Kafka 设计', link: '/dev/kafka-design' },
            { text: 'Redis 集群', link: '/dev/redis-cluster' },
            { text: 'DLQ 重放', link: '/dev/dlq-replay' },
          ],
        },
        {
          text: '客户端 SDK',
          items: [
            { text: 'SDK 设计', link: '/dev/sdk-design' },
          ],
        },
        {
          text: '部署运维',
          items: [
            { text: '部署配置', link: '/dev/deployment' },
          ],
        },
        {
          text: '参考资料',
          items: [
            { text: 'AB 分析 SQL 示例', link: '/dev/ab-analysis-sql' },
          ],
        },
      ],
      '/knowledge/': [
        {
          text: '内部资料',
          items: [
            { text: '服务访问入口', link: '/knowledge/service-endpoints' },
            { text: '架构决策记录', link: '/knowledge/adr/' },
            { text: '历史踩坑记录', link: '/knowledge/historical-lessons/' },
            { text: '外部参考资料', link: '/knowledge/external-resources/' },
          ],
        },
      ],
    },

    // 社交链接
    socialLinks: [
      { icon: 'github', link: 'https://github.com/HiCooper/gate-flow' },
    ],

    // 搜索
    search: {
      provider: 'local',
    },

    // 页脚
    footer: {
      message: 'Tracker System — GateFlow 埋点分析平台',
      copyright: 'Copyright © 2024-present GateFlow Team',
    },

    // 编辑链接
    editLink: {
      pattern: 'https://github.com/HiCooper/gate-flow/edit/main/docs/tracker-system/:path',
      text: '在 GitHub 上编辑此页',
    },

    // 上下页
    docFooter: {
      prev: '上一页',
      next: '下一页',
    },

    // 大纲
    outline: {
      level: [2, 3],
      label: '页面导航',
    },

    // 返回顶部的标签
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
  },

  // Markdown 配置
  markdown: {
    lineNumbers: true,
  },

  // 忽略死链检查
  ignoreDeadLinks: true,
}))
