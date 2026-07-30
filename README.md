# Prompt Manager

一个轻量、隐私友好的 Chrome Manifest V3 提示词管理扩展。无需账号和服务器，可在浏览器本地新增、分类、搜索、收藏、复制、导入和导出提示词。

## 功能

- 新增、编辑、删除和收藏提示词
- 标题、正文与多标签管理
- 搜索与单标签/Shift 多标签筛选
- 一键复制与使用次数统计
- 标签颜色设置
- JSON 导入与导出
- 弹窗模式和独立管理页

## 隐私与权限

扩展仅申请 `storage` 权限，不申请任何网站访问权限，也不包含远程脚本、统计、广告或遥测。提示词正文保存在 `chrome.storage.local`；标签颜色保存在 `chrome.storage.sync`，可能随同一 Chrome 账号同步。项目不配置服务器，也不会主动把提示词发送给开发者或第三方。详见 [PRIVACY.md](PRIVACY.md)。

> 源码与发布 ZIP 不包含开发者个人提示词。新安装后的提示词列表为空。卸载扩展可能删除浏览器本地数据，请先导出重要内容。

## 从 GitHub Release 安装

1. 在 Releases 页面下载 `prompt-manager-v1.0.0.zip`。
2. 解压 ZIP。
3. 在 Chrome 地址栏打开 `chrome://extensions/`。
4. 开启右上角“开发者模式”。
5. 点击“加载已解压的扩展程序”，选择解压后的文件夹。

GitHub Pages 是项目介绍和下载页面，不是 Chrome 一键安装页面。面向普通用户的一键安装需要后续发布到 Chrome Web Store。

## 从源码安装

克隆或下载仓库，确认目录根部存在 `manifest.json`，然后按照上述开发者模式步骤加载该目录。

## 数据格式

导出的文件是 JSON 数组，每项结构如下：

```json
{
  "id": "uuid",
  "title": "标题",
  "content": "提示词正文",
  "tags": ["标签A", "标签B"],
  "favorite": true,
  "createdAt": "2026-07-31T00:00:00.000Z",
  "updatedAt": "2026-07-31T00:00:00.000Z",
  "usageCount": 3
}
```

导入限制：文件最大 5 MB、最多 5000 条；空正文会被忽略。

## 开发与打包

要求 Node.js 20 或更高版本。

```bash
npm run check
npm run package
```

生成文件：`dist/prompt-manager-v1.0.0.zip`。ZIP 根目录直接包含 `manifest.json`。

## 目录结构

- `manifest.json`：扩展清单
- `options.html` / `options.css` / `options.js`：主界面与功能
- `mode.js`：弹窗/页面模式识别
- `icons/`：扩展图标
- `scripts/`：检查、清理和打包脚本
- `docs/`：GitHub Pages
- `.github/workflows/`：CI、Release 和 Pages 自动化

## 发布流程

1. 更新 `manifest.json` 和 `package.json` 版本。
2. 更新 `CHANGELOG.md`。
3. 运行 `npm run check && npm run package`。
4. 推送 `vX.Y.Z` 标签，Release 工作流会创建发布并上传 ZIP。

## 已知限制

- 当前界面仅提供简体中文。
- GitHub 安装版需要开发者模式。
- 尚未发布到 Chrome Web Store。
- 浏览器交互自动化覆盖有限，发布前仍建议完成人工验收。

## 贡献与安全

参见 [CONTRIBUTING.md](CONTRIBUTING.md) 和 [SECURITY.md](SECURITY.md)。提交截图或导出数据前，请先移除敏感提示词。

## 许可证

[MIT](LICENSE)
