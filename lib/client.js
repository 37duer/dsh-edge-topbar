/**
 * dsh-edge-topbar — client half（浏览器半，classic script）。
 *
 * 由 DSH Web 客户端在页面启动时经 /plugins 组合脚本自动加载，
 * 契约：window.__ModuleLoader__.load({ id, factory }) + exports.inject / exports.apply(ctx)。
 *
 * 触发条件：访问者使用 Microsoft Edge 时才渲染信息条（UA 含 "Edg/" 或
 * userAgentData.brands 含 "Microsoft Edge"），否则静默退出、不碰任何 DOM。
 *
 * 功能（自油猴脚本《局域网DSH前端优化》v0.9 迁移）：
 *   - 顶部固定信息条：居中日期时钟
 *   - 信息条左侧：页面缩放 -/+/复位/滚轮微调，localStorage 记忆（默认 100%）
 *   - 信息条右侧：全屏/退出全屏按钮
 *
 * 作者：37duer · 适配 DSH >=0.2.2-rc.3（已在 0.2.2-rc.3 实测通过）
 */
window.__ModuleLoader__.load({ id: 'dsh-edge-topbar', factory: (require) => { var module = { exports: {} }; var exports = module.exports;
'use strict';

// ===== 触发条件：仅 Microsoft Edge 显示 =====
// Chromium 版 Edge 的 UA 含独有的 "Edg/" token（Edge 的 UA 缩减政策不移除自家 token）；
// userAgentData 可用时做双重确认。非 Edge 浏览器静默退出，不做任何 DOM 操作。
var ua = navigator.userAgent;
var isEdge = ua.indexOf('Edg/') !== -1;
try {
  var uad = navigator.userAgentData;
  if (!isEdge && uad && uad.brands) {
    for (var i = 0; i < uad.brands.length; i++) {
      if (uad.brands[i].brand === 'Microsoft Edge') { isEdge = true; break; }
    }
  }
} catch (e) { /* 保留 UA 判定结果 */ }

// ===== 缩放配置（改这几个数字即可）=====
var DEFAULT_ZOOM = 100;              // 默认缩放比例（百分比）
var ZOOM_STEP    = 5;                // 每点一次 +/- 的调节步长（百分比）
var ZOOM_MIN     = 60;               // 允许的最小比例
var ZOOM_MAX     = 200;              // 允许的最大比例
var ZOOM_KEY     = 'dsh-topbar:zoom';// localStorage 记忆键（与油猴版 tm-dsh-zoom 区分，互不覆盖）
var BAR_HEIGHT   = 40;
var BAR_ID       = 'dsh-topbar';

function clampZoom(v) {
  if (!isFinite(v)) v = DEFAULT_ZOOM;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v));
}

// 按钮公共样式（与全屏按钮同一套配色，保持风格统一）
var BTN_BASE = [
  'height: 26px !important;',
  'border: 1px solid #4b5563 !important;',
  'border-radius: 6px !important;',
  'background: #374151 !important;',
  'color: #e5e7eb !important;',
  'font-size: 12px !important;',
  'font-family: system-ui, sans-serif !important;',
  'line-height: 24px !important;',
  'cursor: pointer !important;',
  'pointer-events: auto !important;',
  'user-select: none !important;',
  'padding: 0 !important;'
].join(' ');

function bindHover(el) {
  el.addEventListener('mouseenter', function () { el.style.background = '#4b5563'; });
  el.addEventListener('mouseleave', function () { el.style.background = '#374151'; });
}

// ===== 挂载信息条；返回卸载函数（Cordis 可逆效应）=====
function mountBar() {
  if (document.getElementById(BAR_ID)) return function () {};

  var zoomPct = clampZoom(parseInt(localStorage.getItem(ZOOM_KEY), 10));
  // 建 UI 之前先缩放一次，避免「先 100% 再跳到目标比例」的闪动
  document.documentElement.style.zoom = zoomPct / 100;

  // ===== 顶部信息条 =====
  var bar = document.createElement('div');
  bar.id = BAR_ID;
  bar.style.cssText = [
    'height: ' + BAR_HEIGHT + 'px !important;',
    'width: 100% !important;',
    'background: #1f2937 !important;',
    'color: #e5e7eb !important;',
    'font-size: 13px !important;',
    'font-family: system-ui, sans-serif !important;',
    'display: flex !important;',
    'align-items: center !important;',
    'justify-content: center !important;',
    'padding: 0 12px !important;',
    'box-sizing: border-box !important;',
    'position: fixed !important;',
    'top: 0 !important;',
    'left: 0 !important;',
    'z-index: 2147483647 !important;',
    'pointer-events: none !important;',
    'user-select: none !important;'
  ].join(' ');

  // ===== 居中时钟 =====
  var clock = document.createElement('span');
  clock.style.cssText = 'font-variant-numeric: tabular-nums; white-space: nowrap; text-align: center;';

  function updateClock() {
    var now = new Date();
    var pad = function (n) { return String(n).padStart(2, '0'); };
    clock.textContent = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate())
      + ' 【' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds()) + '】';
  }
  updateClock();
  var clockTimer = setInterval(updateClock, 1000);

  // ===== 缩放控制件（绝对定位到信息条左侧，不影响时钟居中）=====
  var zoomGroup = document.createElement('div');
  zoomGroup.style.cssText = [
    'position: absolute !important;',
    'left: 12px !important;',
    'top: 50% !important;',
    'transform: translateY(-50%) !important;',
    'display: flex !important;',
    'align-items: center !important;',
    'gap: 6px !important;',
    'pointer-events: auto !important;',
    'user-select: none !important;'
  ].join(' ');

  var zoomDown = document.createElement('button');
  zoomDown.textContent = '\u2212';
  zoomDown.title = '缩小（每档 ' + ZOOM_STEP + '%）';
  zoomDown.style.cssText = BTN_BASE + 'width: 26px !important;';

  var zoomLabel = document.createElement('button');
  zoomLabel.title = '当前缩放比例，点击复位到 100%';
  zoomLabel.style.cssText = BTN_BASE + 'min-width: 52px !important; padding: 0 8px !important; font-variant-numeric: tabular-nums !important;';

  var zoomUp = document.createElement('button');
  zoomUp.textContent = '+';
  zoomUp.title = '放大（每档 ' + ZOOM_STEP + '%）';
  zoomUp.style.cssText = BTN_BASE + 'width: 26px !important;';

  function applyZoom(pct, save) {
    zoomPct = clampZoom(pct);
    document.documentElement.style.zoom = zoomPct / 100;
    zoomLabel.textContent = zoomPct + '%';
    zoomDown.disabled = (zoomPct <= ZOOM_MIN);
    zoomUp.disabled = (zoomPct >= ZOOM_MAX);
    zoomDown.style.opacity = zoomDown.disabled ? '0.35' : '1';
    zoomUp.style.opacity = zoomUp.disabled ? '0.35' : '1';
    if (save !== false) {
      try { localStorage.setItem(ZOOM_KEY, String(zoomPct)); } catch (e) {}
    }
  }

  zoomDown.addEventListener('click', function () { applyZoom(zoomPct - ZOOM_STEP); });
  zoomUp.addEventListener('click', function () { applyZoom(zoomPct + ZOOM_STEP); });
  zoomLabel.addEventListener('click', function () { applyZoom(100); });

  // 鼠标滚轮停在控制件上也可微调（向上放大 / 向下缩小），并阻止页面跟着滚动
  zoomGroup.addEventListener('wheel', function (e) {
    e.preventDefault();
    applyZoom(zoomPct + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
  }, { passive: false });

  bindHover(zoomDown);
  bindHover(zoomLabel);
  bindHover(zoomUp);

  zoomGroup.appendChild(zoomDown);
  zoomGroup.appendChild(zoomLabel);
  zoomGroup.appendChild(zoomUp);

  // ===== 全屏按钮（绝对定位到右侧）=====
  var fsBtn = document.createElement('button');
  fsBtn.textContent = '全屏';
  fsBtn.title = '切换全屏';
  fsBtn.style.cssText = BTN_BASE + 'position: absolute !important; right: 12px !important; top: 50% !important; transform: translateY(-50%) !important; padding: 0 12px !important;';
  bindHover(fsBtn);

  function updateFsLabel() {
    fsBtn.textContent = document.fullscreenElement ? '退出全屏' : '全屏';
  }

  fsBtn.addEventListener('click', function () {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(function () {});
    } else {
      document.documentElement.requestFullscreen().catch(function (err) {
        console.warn('全屏请求失败:', err);
      });
    }
  });

  document.addEventListener('fullscreenchange', updateFsLabel);
  updateFsLabel();

  bar.appendChild(zoomGroup);
  bar.appendChild(clock);
  bar.appendChild(fsBtn);
  document.documentElement.appendChild(bar);

  // 初始化控制件显示与按钮可用态（沿用已恢复的比例，不写回 localStorage）
  applyZoom(zoomPct, false);

  // 给 body 加 padding-top 推开内容（与 BAR_HEIGHT 同处一个 zoom 缩放体系，天然对齐）
  var body = document.body;
  var prevPaddingTop = 0;
  var hadInlinePadding = false;
  if (body) {
    prevPaddingTop = parseFloat(getComputedStyle(body).paddingTop) || 0;
    hadInlinePadding = body.style.paddingTop !== '';
    body.style.paddingTop = (prevPaddingTop + BAR_HEIGHT) + 'px';
    body.style.boxSizing = 'border-box';
  }

  // 卸载函数：插件移除时还原全部 DOM 副作用
  return function dispose() {
    clearInterval(clockTimer);
    document.removeEventListener('fullscreenchange', updateFsLabel);
    if (bar.parentNode) bar.parentNode.removeChild(bar);
    document.documentElement.style.zoom = '';
    if (body) {
      if (hadInlinePadding) {
        body.style.paddingTop = prevPaddingTop + 'px';
      } else {
        body.style.removeProperty('padding-top');
      }
    }
  };
}

// ===== client 模块契约：DSH Web 客户端启动时调用 apply(ctx) =====
exports.inject = [];

exports.apply = function (ctx) {
  console.info('[dsh-edge-topbar] v0.2.0 · by 37duer · ' + (isEdge ? 'Edge detected, top bar enabled' : 'non-Edge browser, top bar disabled'));
  if (!isEdge) return; // 非 Edge：静默退出，页面保持原样

  var dispose = null;
  var pendingListener = null;

  function cleanup() {
    if (pendingListener) {
      document.removeEventListener('DOMContentLoaded', pendingListener);
      pendingListener = null;
    }
    if (dispose) {
      var d = dispose;
      dispose = null;
      d();
    }
  }

  if (document.body) {
    dispose = mountBar();
  } else {
    pendingListener = function once() {
      pendingListener = null;
      document.removeEventListener('DOMContentLoaded', once);
      dispose = mountBar();
    };
    document.addEventListener('DOMContentLoaded', pendingListener);
  }

  // 把清理挂进 Cordis 生命周期（可逆效应）；ctx.effect 不可用时跳过
  if (ctx && typeof ctx.effect === 'function') {
    ctx.effect(function () { return cleanup; }, 'dsh-edge-topbar');
  }
};

return module.exports; } });
