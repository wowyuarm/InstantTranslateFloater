# 🎈 InstantTranslateFloater (ITF) - 即时翻译浮窗

InstantTranslateFloater 是一款浏览器扩展程序，旨在提供一种快速、无缝的网页划词翻译体验。

## ✨ 功能特性

- **开关控制**：通过点击浏览器右上角的扩展图标，可以方便地启用或禁用划词翻译功能。
- **快捷翻译**：选中任意文本后按下 `CapsLock` 键，即可在页面右侧生成翻译浮窗，并有细线连接到原文位置。
- **多浮窗管理**：支持同时显示多个翻译浮窗，并以堆叠方式自动排布，避免重叠。
- **高效稳定**：使用 Manifest V3 标准开发，响应迅速，并采用 DeepSeek 提供高质量的翻译服务。

---

## 🚀 安装与配置

由于此扩展程序包含 API 密钥，需要您手动进行安装和配置。

### 步骤 1: 下载项目

将本仓库克隆或下载到您的本地计算机。

```bash
git clone https://github.com/YOUR_USERNAME/InstantTranslateFloater.git
```
*(请将 YOUR_USERNAME 替换为您的 GitHub 用户名)*

### 步骤 2: 获取 API 密钥

本插件使用 [DeepSeek API](https://platform.deepseek.com/) 作为翻译引擎。
1.  访问 DeepSeek 开放平台并注册账户。
2.  导航至 "API 密钥" 页面创建一个新的密钥。
3.  复制您创建的密钥。

### 步骤 3: 填入 API 密钥

1.  加载扩展后，点击浏览器工具栏中的插件图标。
2.  在弹出的设置窗口中，将您复制的密钥填写到 **API Key** 输入框。
3.  输入后即会自动保存，无需再次修改代码。

### 步骤 4: 在浏览器中加载扩展

**对于 Chrome / Edge 用户:**

1.  打开浏览器，在地址栏输入 `chrome://extensions` 并回车。
2.  在页面右上角，打开 **"开发者模式"** 的开关。
3.  点击左上角的 **"加载已解压的扩展程序"** 按钮。
4.  在弹出的文件选择窗口中，选择本项目下的 `itf-extension` 文件夹。

加载成功后，您应该能在浏览器右上角看到插件的 "T" 字图标。

---

## 📖 使用指南

1.  **开启功能**：单击浏览器工具栏中的插件图标，在弹出的小窗口中打开开关。
2.  **翻译文本**：在网页上选中想要翻译的内容后，直接按下 `CapsLock` 键即可触发翻译。
3.  **关闭浮窗**：点击翻译浮窗右上角的 "×" 可将其关闭。

---

## 🛠️ 技术栈

- **核心框架**: Manifest V3, Vanilla JavaScript (ES6)
- **翻译服务**: [DeepSeek API](https://platform.deepseek.com/)
- **样式**: HTML5 & CSS3
- **核心逻辑**:
  - `content_script.js`: 实现页面高亮、点击监听、UI注入等核心交互。
  - `service_worker.js`: 负责调用 API、管理缓存及处理后台逻辑。
  - `popup.js`: 控制功能开关的逻辑。

---

## 许可协议

本项目采用 [MIT License](./LICENSE) 授权。 