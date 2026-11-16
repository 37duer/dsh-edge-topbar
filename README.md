# dsh-edge-topbar

DSH（DeepSeek Harness）Web UI 插件：在页面顶部插入一道固定信息条——居中日期时钟、左侧页面缩放控制（带 localStorage 记忆，**默认 100%**）、右侧全屏按钮。

**触发条件：仅当访问者使用 Microsoft Edge 时显示；其他浏览器（Chrome / Firefox / Safari / DSH 桌面版 Electron）不做任何 DOM 操作，页面保持原样。** 判定发生在每台访问 DSH 的浏览器本地（`userAgent` 含 `Edg/`，`userAgentData` 可用时双重确认），无需服务端按连接区分。

**设计缘由**：Edge 浏览器在全屏模式下，网页内容顶部有一横条区域无法点击（被浏览器全屏时收起的工具栏热区遮挡，点击会被"退出全屏/显示工具栏"拦截）。本插件的固定信息条正为规避该问题而设：它占位这道不可点击的横条，并通过 `body` 的 `padding-top` 把实际页面内容整体下推到可正常点击的区域，使 Edge 全屏下页面顶部控件不再失效。这也是插件仅在 Edge 下启用的原因——其他浏览器没有此遮挡问题，无需占位。

作者：**37duer** · 版本 0.2.0 · 适配 DSH **>= 0.2.2-rc.3**（已在 0.2.2-rc.3 实测通过） · 由油猴脚本《局域网DSH前端优化》v0.9 迁移而来。

## 结构

```
dsh-edge-topbar/
├── package.json       # dsh.bundle + dsh.client manifest（DSH 唯一认的清单）
├── cordis.patch.yml    # 把 host 插件行挂载进 profile
└── lib/
    ├── index.js        # host 半（Node 进程），极薄，仅注册插件身份
    └── client.js       # client 半（浏览器，classic script），全部功能在此
```

零依赖、免构建：两个 lib 文件均为手写产物，安装后无需 pnpm build。

## 安装（在运行 dsh web 的那台机器上执行）

从 GitHub 安装（推荐）：

```bash
dsh plugin --profile web add github:37duer/dsh-edge-topbar
```

或从本地目录安装：

```bash
dsh plugin --profile web add /path/to/dsh-edge-topbar
```

重启 dsh web 服务后生效。验证：Edge 打开 DSH 页面应出现顶部信息条（控制台可见 `[dsh-edge-topbar] v0.2.0 · by 37duer` 署名日志）；换 Chrome / Firefox 打开应无任何变化（控制台提示 top bar disabled）。

卸载：

```bash
dsh plugin --profile web remove dsh-edge-topbar
```

## 配置

缩放默认值 / 步长 / 上下限在 `lib/client.js` 顶部常量区（`DEFAULT_ZOOM`＝100、`ZOOM_STEP`、`ZOOM_MIN`、`ZOOM_MAX`、`BAR_HEIGHT`），改完重装或刷新即可。首次使用按默认 100% 渲染；用户手动调节后记忆到 localStorage，此后沿用记忆值，点缩放数字可复位 100%。记忆键为 `dsh-topbar:zoom`（与油猴版的 `tm-dsh-zoom` 不同，两版共存时互不覆盖，但建议二选一，避免信息条叠两条）。

## 已知限制

1. **首屏有一次缩放闪动**：client 模块在页面渲染后才执行（油猴版近似 document-start，无此问题）。默认 100% 时记忆值恰为 100 的用户不受影响；如需彻底消除，需 DSH 暴露 HTML head 注入 seam 由 host 半提前写缩放脚本，当前版本接受这一次闪动。
2. **DSH 处于 developer preview**：本插件按 client 模块契约编写（`window.__ModuleLoader__.load` + `apply(ctx)`），适配并验证于 **0.2.2-rc.3**（该版本无插件契约破坏性变更）；DSH 后续升级若变更该契约需同步调整。
3. 卸载还原：插件被 DSH 移除时会经 Cordis 可逆效应自动拆掉信息条、还原 body padding 与缩放（若客户端 `ctx.effect` 不可用则降级为随页面卸载）。
