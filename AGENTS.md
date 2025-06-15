# 🤖 AI 助手操作手册 (AGENTS.md)

欢迎！本文件旨在帮助您——AI 助手——理解并高效地管理 **InstantTranslateFloater** 项目。请在执行任何操作前仔细阅读此文档。

---

## 1. 项目核心目标

本项目的目标是创建一个浏览器扩展，允许用户在网页上选中文本后按下 **CapsLock** 键触发翻译，结果以侧边浮窗呈现，并有细线连接到原文位置。

## 2. 代码架构与文件导览

项目的核心代码全部位于 `itf-extension/` 目录下。

-   **`manifest.json`**
    -   **作用**：扩展程序的入口和配置文件，定义了所有组件、权限和行为。
    -   **关键字段**:
        -   `"permissions"`: `["activeTab", "storage", "scripting"]` - 分别用于与当前页面交互、存储用户设置和注入脚本。
        -   `"action"`: 定义了点击浏览器工具栏图标时弹出的 `popup.html`。
        -   `"content_scripts"`: 这是核心，它将 `queue.js`, `sentence.js` 和 `content_script.js` 注入到用户访问的所有页面中。**注意：注入顺序至关重要**，因为它们共享全局作用域。

-   **`service_worker.js`**
    -   **作用**：扩展的后台处理器，负责处理与外部 API 的通信。它是一个独立的环境，无法直接访问页面 DOM。
    -   **核心逻辑**:
        -   监听来自 `content_script.js` 的 `translate` 消息。
        -   在 `translateText` 函数中，**从 `chrome.storage.sync` 异步获取用户存储的 `apiKey`**。
        -   向 DeepSeek API (`ENDPOINT`) 发送 `fetch` 请求。
        -   解析返回的 JSON，提取翻译结果。
        -   将结果通过 `chrome.tabs.sendMessage` 发送回对应的 `content_script.js`。

-   **`content_script.js`**
    -   **作用**：项目的"手和眼"，直接运行在网页上，负责所有用户交互和 DOM 操作。
    -   **核心逻辑**:
        -   **状态同步**：从 `chrome.storage.sync` 初始化并监听 `isFeatureEnabled` 状态。
        -   **事件监听**：通过 `keydown`, `keyup`, `mousemove`, `click` 事件捕捉用户的意图。
        -   **高亮处理** (`handleHighlight`)：使用 `document.elementFromPoint` 找到光标下的元素，并添加/移除 `.itf-highlight` 样式类。
        -   **翻译触发** (`handleTranslationTrigger`)：当用户点击高亮元素时，准备好翻译所需的文本 (`text`, `context`)，并向 `service_worker.js` 发送消息。
        -   **UI 渲染**:
            -   `renderFloatingCard`: 创建一个新的浮窗（初始为加载中状态）。
            -   `updateFloatingCard`: 接收到 `service_worker` 的结果后，更新浮窗内容。
            -   `removeCard`: 处理浮窗的关闭。

-   **`popup.html` / `popup.css` / `popup.js`**
    -   **作用**：构成用户设置面板。
    -   **核心逻辑** (`popup.js`)：
        -   从 `chrome.storage.sync` 读取并显示 `isFeatureEnabled` 和 `apiKey` 的当前值。
        -   监听开关和输入框的变化，并将新值**实时、自动地保存**回 `chrome.storage.sync`。

-   **`utils/queue.js` & `utils/sentence.js`**
    -   **作用**：提供辅助函数。`layoutCards` 用于排列浮窗，`extendToSentence` 用于（旧版逻辑中）获取句子上下文。
    -   **重要**: 这些不是 ES 模块。它们通过 `manifest.json` 被直接注入，因此它们的函数 (`layoutCards`, `extendToSentence`) 成为全局函数，可被 `content_script.js` 直接调用。

---

## 3. 核心工作流程（数据流）

1.  **用户设置**：用户点击插件图标 -> `popup.html` 显示 -> 用户在 `popup.js` 控制下修改设置 -> 设置被存入 `chrome.storage.sync`。
2.  **功能启用**：`content_script.js` 监听到 `isFeatureEnabled` 变为 `true`，开始激活事件监听器。
3.  **交互 & 触发**：用户在页面上选中任意文本后，按下 `CapsLock` 键 -> `keydown` 事件触发 `handleCapsLockTrigger` -> 扩展创建翻译浮窗并连线。
4.  **请求发送**：`handleTranslationTrigger` 创建一个加载中的浮窗，然后通过 `chrome.runtime.sendMessage` 将翻译任务发送给 `service_worker.js`。
5.  **后台翻译**：`service_worker.js` 接收任务 -> 从存储中获取 API 密钥 -> 调用 `fetch` 请求 DeepSeek API -> 获得翻译结果。
6.  **结果返回**：`service_worker.js` 通过 `chrome.tabs.sendMessage` 将结果发回给发起请求的页面的 `content_script.js`。
7.  **UI 更新**：`content_script.js` 接收到结果 -> 调用 `updateFloatingCard` 更新对应浮窗的内容 -> 调用 `layoutCards` 重新排列所有浮窗。

---

## 4. 如何执行常见修改

在进行任何修改前，请先思考修改会影响到上述流程的哪个部分。

-   **任务：修改翻译 API**
    1.  **定位文件**：`service_worker.js`。
    2.  **修改 `ENDPOINT`**：将 `ENDPOINT`常量更新为新 API 的 URL。
    3.  **修改 `translateText` 函数**:
        -   调整 `fetch` 请求的 `headers` 和 `body` 结构以匹配新 API 的要求。
        -   修改解析响应 `json` 的部分，以正确提取出翻译后的文本。
        -   **不要**在此文件硬编码 API 密钥。密钥应始终通过 `chrome.storage.sync.get('apiKey')` 获取。

-   **任务：调整浮窗或高亮样式**
    1.  **定位文件**：`itf-extension/style.css`。
    2.  **修改浮窗**：找到 `[data-itf-card]` 选择器并修改其属性。
    3.  **修改高亮**：找到 `.itf-highlight` 选择器并修改其属性。
    4.  如果要修改浮窗的 **HTML 结构**，请到 `content_script.js` 的 `renderFloatingCard` 函数中进行修改。

-   **任务：更改交互快捷键 (例如，用 `Shift` 代替 `CapsLock`)**
    1.  **定位文件**：`content_script.js`。
    2.  **查找并替换**：在 `keydown` 监听器和相关逻辑中，将对 `e.key === 'CapsLock'` 的判断替换为新的按键即可。

-   **任务：在 Popup 中添加新设置**
    1.  **修改 `popup.html`**：添加新的 UI 元素（如复选框、输入框）。
    2.  **修改 `popup.css`**：（可选）为新元素添加样式。
    3.  **修改 `popup.js`**：
        -   在 `DOMContentLoaded` 监听器中，获取新元素的引用。
        -   使用 `chrome.storage.sync.get` 来加载并设置其初始值。
        -   为其添加事件监听器（如 `change` 或 `input`），并在事件触发时使用 `chrome.storage.sync.set` 保存新值。
    4.  **在 `content_script.js` (或 `service_worker.js`) 中使用新设置**：
        -   在初始化部分，通过 `chrome.storage.sync.get` 获取新设置的初始值。
        -   通过 `chrome.storage.onChanged` 监听其变化，并作出相应的行为调整。

---

## 5. 关键规则与约束

-   **禁止使用模块化导入**: Content Script 中**严禁**使用 `import`/`export` 语法。所有 JS 文件在 `manifest.json` 中被顺序注入，共享全局作用域。
-   **API 密钥安全**: API 密钥**绝不能**硬编码在任何文件中。它必须由用户在 `popup` 界面输入，并通过 `chrome.storage.sync` 进行存取。
-   **权限最小化**: 除非绝对必要，否则不要在 `manifest.json` 中添加新的权限。

本手册旨在帮助您快速上手。祝您工作顺利！ 