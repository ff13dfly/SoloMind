import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'SoloMind',
  description: '超级个体的 AI 私域能力管理平台',
  
  // GitHub Pages 部署路径
  base: '/SoloMind/',
  
  // 多语言配置
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      themeConfig: {
        nav: [
          { text: '首页', link: '/zh/' },
          { text: '指南', link: '/zh/guide/' },
          { text: '协议', link: '/zh/protocol/' },
          { text: 'API', link: '/zh/api/' }
        ],
        sidebar: {
          '/zh/guide/': [
            {
              text: '入门',
              items: [
                { text: '简介', link: '/zh/guide/' },
                { text: '快速开始', link: '/zh/guide/getting-started' },
                { text: '安装部署', link: '/zh/guide/installation' }
              ]
            },
            {
              text: '核心概念',
              items: [
                { text: '系统架构', link: '/zh/guide/architecture' },
                { text: '工作流', link: '/zh/guide/workflow' }
              ]
            }
          ],
          '/zh/protocol/': [
            {
              text: '协议规范',
              items: [
                { text: '概述', link: '/zh/protocol/' },
                { text: '工作流', link: '/zh/protocol/workflow' },
                { text: '安全', link: '/zh/protocol/security' },
                { text: '短期记忆', link: '/zh/protocol/memory' },
                { text: '审批', link: '/zh/protocol/approval' },

                { text: '联邦分类', link: '/zh/protocol/category' },
                { text: 'AI 测试', link: '/zh/protocol/ai-test' },
                { text: '报表', link: '/zh/protocol/report' }
              ]
            }
          ],
          '/zh/api/': [
            {
              text: 'API 参考',
              items: [
                { text: '概述', link: '/zh/api/' },
                { text: 'Agent API', link: '/zh/api/agent' }
              ]
            }
          ]
        }
      }
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      themeConfig: {
        nav: [
          { text: 'Home', link: '/en/' },
          { text: 'Guide', link: '/en/guide/' },
          { text: 'Protocol', link: '/en/protocol/' },
          { text: 'API', link: '/en/api/' }
        ],
        sidebar: {
          '/en/guide/': [
            {
              text: 'Getting Started',
              items: [
                { text: 'Introduction', link: '/en/guide/' },
                { text: 'Quick Start', link: '/en/guide/getting-started' },
                { text: 'Installation', link: '/en/guide/installation' }
              ]
            },
            {
              text: 'Core Concepts',
              items: [
                { text: 'Architecture', link: '/en/guide/architecture' },
                { text: 'Workflow', link: '/en/guide/workflow' }
              ]
            }
          ],
          '/en/protocol/': [
            {
              text: 'Protocols',
              items: [
                { text: 'Overview', link: '/en/protocol/' },
                { text: 'Workflow', link: '/en/protocol/workflow' },
                { text: 'Security', link: '/en/protocol/security' },
                { text: 'Memory', link: '/en/protocol/memory' },
                { text: 'Approval', link: '/en/protocol/approval' },

                { text: 'Category', link: '/en/protocol/category' },
                { text: 'AI Test', link: '/en/protocol/ai-test' },
                { text: 'Report', link: '/en/protocol/report' }
              ]
            }
          ],
          '/en/api/': [
            {
              text: 'API Reference',
              items: [
                { text: 'Overview', link: '/en/api/' },
                { text: 'Agent API', link: '/en/api/agent' }
              ]
            }
          ]
        }
      }
    }
  },

  themeConfig: {
    logo: '/logo.svg',
    socialLinks: [
      { icon: 'github', link: 'https://github.com/ff13dfly/SoloMind' }
    ],
    footer: {
      message: 'Released under the Apache 2.0 License.',
      copyright: 'Copyright © 2024-present SoloMind'
    },
    search: {
      provider: 'local'
    }
  }
})
