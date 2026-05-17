# FitRestTimer 健身组间计时器

一款专注于**组间休息倒计时**的微信小程序，帮助你控制休息时长，避免休息过久影响训练效果。

## 功能

- **休息倒计时** — 30 秒到 3 分钟可选，倒计时结束自动震动提醒
- **多组训练追踪** — 设置训练组数，顶部圆点实时显示进度
- **本组计时** — 训练中正计时，了解每组实际用时
- **⚠️ 即将结束提醒** — 剩余 ≤10 秒时倒计时变色预警
- **训练记录** — 自动保存每次训练数据，支持查看历史

## 截图

> 开发中，截图待补充

## 开发环境

- 微信开发者工具
- 基础库 3.x+
- 不依赖任何第三方 npm 包

## 本地运行

1. 下载 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 克隆项目

```bash
git clone https://github.com/shyoucc/FitRestTimer.git
```

3. 打开微信开发者工具 → 导入项目 → 选择项目目录
4. 填入自己的 AppID（测试可用体验版 AppID）

## 项目结构

```
├── app.js              # 全局逻辑，历史数据管理
├── app.json            # 页面注册，导航栏配置
├── app.wxss            # 全局样式
├── pages/
│   ├── index/          # 主计时页
│   └── history/        # 训练记录页
└── assets/
    └── icons/          # 图标资源
```

## License

MIT
