/**
 * dsh-edge-topbar — host half（运行在 DSH 的 Node 进程内）。
 *
 * 本插件的全部功能都在浏览器半（lib/client.js）实现：
 * 仅当访问者使用 Microsoft Edge 时，在 DSH Web UI 顶部渲染固定信息条
 * （日期时钟 / 页面缩放带记忆 / 全屏按钮），其他浏览器不做任何 DOM 操作。
 *
 * host 半保持极薄：只注册插件身份，使 cordis.patch.yml 能把本包挂载进 profile。
 *
 * 作者：37duer · 适配 DSH >=0.2.2-rc.3（已在 0.2.2-rc.3 实测通过）
 */

export const name = 'dsh-edge-topbar'
export const inject = []

export function apply(ctx, config) {
  // 故意留空：无 host 侧逻辑
}
