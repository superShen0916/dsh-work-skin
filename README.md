# DSH 一键换肤

**打开 DSH，今天在海边写代码。** 选「海风微语」，壁纸是青绿的海岸，侧栏和消息气泡也带一点海水的颜色。换到「晴窗猫咪」，聊天背景变成晒着太阳的窗台，输入框和代码块也换成暖米色。

内置 13 套高清壁纸，每套都配好了整组界面颜色。宽窗留出更多背景，缩窄窗口时会重新取景，消息区的半透明底色让长对话和代码依然清楚。打开通用设置，看缩略图点选，重启后接着用。

也可以上传自己的照片或 AI 生成图，选一套配色就能用。想把壁纸、颜色和取景都搭成自己的一套，可以从现有主题改起。[自定义壁纸与扩展主题指南](docs/customization.md)

![海风微语的聊天壁纸与侧栏配色](docs/screenshots/seaside-breeze.png)

![晴窗猫咪的聊天壁纸与代码块配色](docs/screenshots/sunlit-atelier.png)

![风起云庭的聊天壁纸与界面配色](docs/screenshots/windborne-terrace.png)

## 安装和使用

1. 在 DeepSeek Harness 桌面版的侧栏打开 **插件 → 添加插件**，输入 `github:superShen0916/dsh-work-skin#v1.1.0`。
2. 安装完成后点击 **立即启用**。
3. 打开 **设置 → 通用设置 → DSH 一键换肤**，展开预览并点击一套主题。

首次启用时保留当前外观。选好皮肤后，在同一个桌面用户配置里保持插件启用，重启 DSH 会自动应用上次选中的皮肤。点击 **恢复默认** 可回到换肤前的浅色、深色或跟随系统。

完整壁纸需要支持插件资源加载的 DSH 版本。本版在 **Windows 桌面版 0.2.2-rc.1** 上实测。 [下载固定版本安装包](https://github.com/superShen0916/dsh-work-skin/releases/tag/v1.1.0)

![13 套皮肤的设置页预览](docs/screenshots/gallery.png)

## 主题

海风微语、晴窗猫咪、风起云庭、露西晨光版、昼光协议、明雾机房、云端来信、月白庭院、纸上云汀、虹光观测站、橘园午后、浮鲸之境、黄金时刻。原作 13 套均为浅色。

## 自定义皮肤

展开皮肤预览，在 **自定义壁纸** 里上传图片并选配色。上传、换图、添加整套主题，以及让 DSH 帮你编辑主题配置的步骤都在[自定义指南](docs/customization.md)。

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
