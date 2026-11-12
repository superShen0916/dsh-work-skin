# DSH 一键换肤

为 DeepSeek Harness 提供 13 套插画主题。在设置里预览、切换并恢复默认外观。壁纸随聊天区域裁剪，侧栏、气泡、输入框、代码块和弹窗使用各主题的配色。

![海风微语在 DeepSeek Harness 的长对话](docs/screenshots/seaside-breeze.png)

## 安装和使用

1. 在 DeepSeek Harness 桌面版的侧栏打开 **插件 → 添加插件**，输入 `github:superShen0916/dsh-work-skin#v1.0.1`。
2. 安装完成后点击 **立即启用**。
3. 打开 **设置 → 通用设置 → DSH 一键换肤**，展开预览并点击一套主题。

选中的皮肤会在同一桌面用户配置中保留。点击 **恢复默认**，回到启用皮肤前的浅色、深色或跟随系统偏好。首次启用插件时，外观由当前 DSH 设置决定。

完整壁纸需要支持插件资源加载的 DSH 版本。本版在 **Windows 桌面版 0.2.2-rc.1** 上实测。 [下载固定版本安装包](https://github.com/superShen0916/dsh-work-skin/releases/tag/v1.0.1)

![13 套皮肤的设置页预览](docs/screenshots/gallery.png)

## 主题

海风微语、晴窗猫咪、风起云庭、露西晨光版、昼光协议、明雾机房、云端来信、月白庭院、纸上云汀、虹光观测站、橘园午后、浮鲸之境、黄金时刻。原作 13 套均为浅色。

## 开发

```sh
npm ci
npm run build
npm run check
npm test
npm pack
```

在 DSH 的「添加插件」中也可以输入本地项目目录。`themes.json` 保存原版配色和裁剪参数，并附有 DSH 窄窗裁剪参数。`src/palette.js` 映射原版配色到 DSH 的语义颜色。`lib/client.js` 由构建脚本生成，供 DSH 直接加载。

`scripts/verify-desktop.mjs` 可连接启用 Chromium 调试的隔离桌面实例，在预先打开的测试对话中验证 13 套皮肤、两种窗口宽度和重载恢复，并生成截图和 JSON 报告。

## 来源与许可

背景图和配色来自 [Doubao Work Skin 的 aaaf5a9 版本](https://github.com/superShen0916/doubao-work-skin/tree/aaaf5a945bc53d69799b6c736b819cb61a5f217f/skins)，保留了原版 PNG。背景为原项目维护者使用 GPT 生成。MIT 许可不授予其中可能涉及的第三方角色、商标或参考素材权利。

代码采用 [MIT](LICENSE) 许可。本项目由社区维护。
