/**
 * GateFlow Tracker Web SDK v2.0.0
 *
 * === 核心设计 ===
 * data-track 标记的是「点位」而非「事件类型」。
 * 一个元素只有一个 data-track。SDK 自动推断事件类型：
 *   - 页面加载       → page_view
 *   - 元素进入视口   → exposure
 *   - 元素被点击     → click
 *
 * === SPM 层级自动继承 ===
 * <meta name="gateflow-spm" content="myapp.b_home_page">   ← 页面级: spma.spmb
 *
 * <div data-track="c_hero">                                 ← 区块级: spma.spmb.c_hero
 *   <button data-track="c_hero.d_cta">购买</button>         ← 功能级: spma.spmb.c_hero.d_cta
 * </div>
 *
 * 功能级的 spmc 自动从祖先 data-track 继承，不用重复写。
 *
 * === 接入方式（零代码）===
 * 1. <script src="/tracker-sdk.js" data-app-code="myapp"></script>
 * 2. <meta name="gateflow-spm" content="myapp.b_page_name">
 * 3. 在元素上加 data-track 即可，SDK 自动采集 exposure + click
 *
 * 登录后标识用户（仅此一行 JS）：
 *   GateFlowTracker.setUserId('user_123')
 */

(function (global) {
  'use strict';

  // ============ 配置 ============
  var DEFAULT_CONFIG = {
    trackUrl: '/api/v1/collect',
    appCode: '',
    appKey: '',
    sdkToken: '',
    userId: '',
    autoTrackPageView: true,
    autoTrackExposure: true,
    autoTrackClick: true,
    batchSize: 5,
    flushInterval: 3000,
    debug: false,
  };

  // ============ 工具函数 ============
  function generateId() {
    return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0, v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function now() { return new Date().getTime(); }

  function getDeviceInfo() {
    var ua = navigator.userAgent;
    return {
      platform: 'web',
      deviceType: /Mobi|Android/i.test(ua) ? 'mobile' : 'desktop',
      os: /Windows/i.test(ua) ? 'Windows' : /Mac/i.test(ua) ? 'MacOS' : /Linux/i.test(ua) ? 'Linux' : /Android/i.test(ua) ? 'Android' : /iOS|iPhone|iPad/i.test(ua) ? 'iOS' : 'Unknown',
      browser: /Chrome/i.test(ua) ? 'Chrome' : /Firefox/i.test(ua) ? 'Firefox' : /Safari/i.test(ua) && !/Chrome/i.test(ua) ? 'Safari' : /Edge/i.test(ua) ? 'Edge' : 'Unknown',
      screenWidth: screen.width, screenHeight: screen.height,
      language: navigator.language || '',
      sdkVersion: '2.0.0',
    };
  }

  // ============ 状态 ============
  var eventQueue = [];
  var sessionId = generateId();
  var anonymousId = localStorage.getItem('_gf_aid') || (function () { var id = generateId(); localStorage.setItem('_gf_aid', id); return id; })();
  var currentUserId = '';
  var config = {};
  var flushTimer = null;
  var exposureObserver = null;

  // ============ SPM 层级解析 ============

  /**
   * 解析 data-track 值：
   *   "c_hero"       → { spmc: "hero" }
   *   "c_hero.d_cta" → { spmc: "hero", spmd: "cta" }
   * 前缀 c_/d_ 仅作约定标记，实际去掉前缀取后面的值
   */
  function parseTrackValue(value) {
    if (!value) return {};
    var parts = value.split('.');
    return {
      spmc: parts[0] ? parts[0].replace(/^c_/, '') : '',
      spmd: parts[1] ? parts[1].replace(/^d_/, '') : '',
    };
  }

  /**
   * 解析元素完整 SPM 四层，按继承规则合并：
   *   spma, spmb → <meta name="gateflow-spm">（页面级）
   *   spmc       → 向上查找最近祖先 [data-track] 的 spmc
   *   spmd       → 当前元素自身的 d_xxx
   */
  function resolveSPM(element) {
    // L1-L2: 页面级 <meta>
    var meta = document.querySelector('meta[name="gateflow-spm"]');
    var metaParts = meta ? (meta.getAttribute('content') || '').split('.') : [];
    var spma = metaParts[0] || config.appCode || '';
    var spmb = metaParts[1] || '';

    // L3: 祖先继承 spmc
    var spmc = metaParts[2] || '';
    if (element && element.hasAttribute('data-track')) {
      var own = parseTrackValue(element.getAttribute('data-track'));
      // 自身有 c_ 则直接取，否则向上找祖先
      if (own.spmc) {
        spmc = own.spmc;
      } else {
        var p = element.parentElement;
        for (var i = 0; i < 10 && p; i++, p = p.parentElement) {
          if (p.hasAttribute && p.hasAttribute('data-track')) {
            var pv = parseTrackValue(p.getAttribute('data-track'));
            if (pv.spmc) { spmc = pv.spmc; break; }
          }
        }
      }
      // L4: 自身 spmd
      var spmd = own.spmd;
      return { spma: spma, spmb: spmb, spmc: spmc, spmd: spmd };
    }

    return { spma: spma, spmb: spmb, spmc: spmc, spmd: '' };
  }

  // ============ 事件构建 ============

  function buildEvent(eventType, element, extra) {
    var spm = resolveSPM(element);
    var dev = getDeviceInfo();
    extra = extra || {};
    return {
      eventId: 'evt_' + generateId(),
      eventType: eventType,
      timestamp: now(),
      userId: extra.userId || currentUserId || '',
      anonymousId: extra.anonymousId || anonymousId,
      sessionId: extra.sessionId || sessionId,
      platform: 'web',
      pageUrl: extra.pageUrl || location.href,
      pageTitle: extra.pageTitle || document.title,
      pageReferrer: extra.pageReferrer || document.referrer || '',
      spma: extra.spma || spm.spma,
      spmb: extra.spmb || spm.spmb,
      spmc: extra.spmc || spm.spmc,
      spmd: extra.spmd || spm.spmd,
      deviceType: dev.deviceType, os: dev.os, browser: dev.browser,
      screenWidth: dev.screenWidth, screenHeight: dev.screenHeight,
      language: dev.language, sdkVersion: dev.sdkVersion,
      elementId: element ? (element.id || '') : '',
      elementType: element ? (element.tagName || '').toLowerCase() : '',
      elementText: element ? (element.innerText || element.textContent || '').trim().substring(0, 100) : '',
      clickX: extra.clickX != null ? extra.clickX : null,
      clickY: extra.clickY != null ? extra.clickY : null,
      utmSource: extra.utmSource || '',
      utmMedium: extra.utmMedium || '',
      utmCampaign: extra.utmCampaign || '',
      properties: extra.properties ? JSON.stringify(extra.properties) : '{}',
    };
  }

  function enqueue(event) {
    eventQueue.push(event);
    if (config.debug) {
      var fullSPM = event.spma + '.' + event.spmb + '.' + event.spmc + (event.spmd ? '.' + event.spmd : '');
      console.log('[GateFlow] ' + event.eventType + '  ' + fullSPM);
    }
    if (eventQueue.length >= config.batchSize) flush();
  }

  function flush() {
    if (eventQueue.length === 0) return;
    var batch = eventQueue.splice(0, config.batchSize);
    var body = JSON.stringify({ events: batch });

    var xhr = new XMLHttpRequest();
    xhr.open('POST', config.trackUrl, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('X-Timestamp', now().toString());

    // 优先 SDK Token（服务端签发，无伪造风险）
    if (config.sdkToken) {
      xhr.setRequestHeader('X-Sdk-Token', config.sdkToken);
    } else if (config.appKey) {
      xhr.setRequestHeader('X-App-Key', config.appKey);
    }

    xhr.onload = function () { if (config.debug) console.log('[GateFlow] Sent ' + batch.length); };
    xhr.onerror = function () { eventQueue = batch.concat(eventQueue); };
    xhr.send(body);
  }

  // ============ 性能采集：Core Web Vitals + Navigation Timing ============

  function setupPerformanceTracking() {
    if (!global.PerformanceObserver) return;

    // LCP (Largest Contentful Paint)
    try {
      new PerformanceObserver(function (list) {
        var entries = list.getEntries();
        var last = entries[entries.length - 1];
        if (!last) return;
        enqueue(buildEvent('perf_lcp', null, {
          pageUrl: location.href,
          properties: { value: last.startTime, rating: last.startTime < 2500 ? 'good' : last.startTime < 4000 ? 'needs-improvement' : 'poor' }
        }));
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) { /* ignore */ }

    // FID (First Input Delay)
    try {
      new PerformanceObserver(function (list) {
        list.getEntries().forEach(function (entry) {
          enqueue(buildEvent('perf_fid', null, {
            pageUrl: location.href,
            properties: { value: entry.duration, rating: entry.duration < 100 ? 'good' : entry.duration < 300 ? 'needs-improvement' : 'poor' }
          }));
        });
      }).observe({ type: 'first-input', buffered: true });
    } catch (e) { /* ignore */ }

    // CLS (Cumulative Layout Shift)
    var clsValue = 0;
    try {
      new PerformanceObserver(function (list) {
        list.getEntries().forEach(function (entry) {
          if (!entry.hadRecentInput) clsValue += entry.value;
        });
        enqueue(buildEvent('perf_cls', null, {
          pageUrl: location.href,
          properties: { value: clsValue, rating: clsValue < 0.1 ? 'good' : clsValue < 0.25 ? 'needs-improvement' : 'poor' }
        }));
      }).observe({ type: 'layout-shift', buffered: true });
    } catch (e) { /* ignore */ }

    // Navigation Timing (page load waterfall)
    if (performance.timing && performance.timing.navigationStart > 0) {
      setTimeout(function () {
        var t = performance.timing;
        enqueue(buildEvent('perf_timing', null, {
          pageUrl: location.href,
          properties: {
            dnsTime: t.domainLookupEnd - t.domainLookupStart,
            tcpTime: t.connectEnd - t.connectStart,
            ttfb: t.responseStart - t.requestStart,
            domReady: t.domContentLoadedEventEnd - t.navigationStart,
            pageLoad: t.loadEventEnd - t.navigationStart
          }
        }));
      }, 0);
    }
  }

  // ============ 异常采集：JS Error + Promise Rejection ============

  function setupErrorTracking() {
    // Synchronous errors
    var origOnError = window.onerror;
    window.onerror = function (message, source, lineno, colno, error) {
      enqueue(buildEvent('error_js', null, {
        pageUrl: location.href,
        properties: {
          message: String(message || '').substring(0, 500),
          source: String(source || '').substring(0, 200),
          lineno: lineno, colno: colno,
          stack: error && error.stack ? String(error.stack).substring(0, 2000) : '',
          errorType: 'onerror'
        }
      }));
      if (origOnError) origOnError.apply(window, arguments);
    };

    // Promise rejections
    window.addEventListener('unhandledrejection', function (event) {
      enqueue(buildEvent('error_js', null, {
        pageUrl: location.href,
        properties: {
          message: String(event.reason || '').substring(0, 500),
          errorType: 'unhandledrejection'
        }
      }));
    });
  }

  // ============ 接口监控：fetch 拦截 ============

  function setupNetworkTracking() {
    if (!global.fetch) return;
    var origFetch = global.fetch;
    global.fetch = function (input, init) {
      var url = typeof input === 'string' ? input : (input.url || '');
      var method = (init && init.method) || 'GET';
      var start = now();
      return origFetch.apply(this, arguments).then(function (resp) {
        var duration = now() - start;
        if (url.indexOf(location.host) !== -1 || url.indexOf('/api/') !== -1) {
          enqueue(buildEvent('api_call', null, {
            pageUrl: location.href,
            properties: { url: url.replace(/\?.*/, '').substring(0, 200), method: method, status: resp.status, duration: duration, success: resp.ok }
          }));
        }
        return resp;
      }, function (err) {
        var duration = now() - start;
        if (url.indexOf(location.host) !== -1 || url.indexOf('/api/') !== -1) {
          enqueue(buildEvent('api_call', null, {
            pageUrl: location.href,
            properties: { url: url.replace(/\?.*/, '').substring(0, 200), method: method, status: 0, duration: duration, success: false, error: String(err).substring(0, 200) }
          }));
        }
        throw err;
      });
    };
  }

  // ============ 全埋点模式：自动捕获所有交互元素（无需 data-track）============

  var autoTrackMode = false;

  /** 生成 View Path 唯一标识（格式: tag#id.class[data-track]:nth-child > ...） */
  function buildViewPath(el) {
    var parts = [];
    var current = el;
    for (var i = 0; i < 5 && current && current !== document.body; i++) {
      var seg = (current.tagName || '').toLowerCase();
      if (current.id) seg += '#' + current.id;
      if (current.hasAttribute && current.hasAttribute('data-track')) {
        seg += '[' + current.getAttribute('data-track') + ']';
      }
      if (current.parentElement) {
        var siblings = current.parentElement.children;
        for (var j = 0; j < siblings.length; j++) {
          if (siblings[j] === current) { seg += ':nth(' + j + ')'; break; }
        }
      }
      parts.unshift(seg);
      current = current.parentElement;
    }
    return parts.join(' > ');
  }

  /** 简单字符串哈希 → 8 位十六进制 */
  function hashString(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
    return Math.abs(h).toString(16).substring(0, 8);
  }

  function setupFullAutoTrack() {
    if (!autoTrackMode) return;

    // 全量 click（跳过已标记 data-track 的元素）
    document.addEventListener('click', function (e) {
      var el = e.target;
      if (!el || !el.tagName) return;
      if (el.hasAttribute && el.hasAttribute('data-track')) return;
      if (el.hasAttribute && el.getAttribute('data-gf-auto') === 'false') return;

      var tag = el.tagName.toLowerCase();
      var interactive = ['a', 'button', 'input', 'select', 'textarea', 'label', 'img', 'span', 'div', 'li', 'td', 'th', 'svg', 'path'];
      if (interactive.indexOf(tag) === -1) return;

      var viewPath = buildViewPath(el);
      var autoEventCode = 'auto_' + hashString(viewPath);
      enqueue(buildEvent('auto_click', el, {
        clickX: e.clientX, clickY: e.clientY,
        properties: {
          autoEventCode: autoEventCode,
          viewPath: viewPath,
          tag: tag,
          className: el.className && typeof el.className === 'string' ? el.className.substring(0, 100) : '',
          href: el.href || '',
          inputType: el.type || '',
          inputName: el.name || ''
        }
      }));
    }, true);

    // 全量 input/select change
    document.addEventListener('change', function (e) {
      var el = e.target;
      if (!el || !el.tagName) return;
      if (el.hasAttribute && (el.hasAttribute('data-track') || el.getAttribute('data-gf-auto') === 'false')) return;
      var tag = el.tagName.toLowerCase();
      if (['input', 'select', 'textarea'].indexOf(tag) === -1) return;

      var viewPath = buildViewPath(el);
      var autoEventCode = 'auto_' + hashString(viewPath);
      enqueue(buildEvent('auto_input', el, {
        properties: {
          autoEventCode: autoEventCode, viewPath: viewPath, tag: tag,
          inputType: el.type || '', inputName: el.name || '',
          valueLength: el.value ? el.value.length : 0
        }
      }));
    }, true);

    // 滚动深度
    var scrollMarks = {};
    var pageKey = location.pathname;
    document.addEventListener('scroll', function () {
      var st = window.pageYOffset || document.documentElement.scrollTop;
      var dh = document.documentElement.scrollHeight - window.innerHeight;
      if (dh <= 0) return;
      var pct = Math.round((st / dh) * 100);
      var mark = [25, 50, 75, 100].filter(function (m) { return pct >= m; }).pop();
      if (mark && !scrollMarks[pageKey + '_' + mark]) {
        scrollMarks[pageKey + '_' + mark] = true;
        enqueue(buildEvent('auto_scroll', null, {
          properties: { depth: mark, pageUrl: location.href }
        }));
      }
    }, { passive: true });
  }

  // ============ 自动采集：[data-track] 产生 exposure + click ============

  function setupAutoTracking() {
    if (!global.IntersectionObserver) return;

    // exposure：元素进入视口 ≥50%
    var exposed = new WeakSet();
    exposureObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          var el = entry.target;
          if (exposed.has(el)) return;
          exposed.add(el);
          enqueue(buildEvent('exposure', el));
        }
      });
    }, { threshold: 0.5 });

    var observeAll = function (root) {
      (root || document).querySelectorAll('[data-track]').forEach(function (el) {
        exposureObserver.observe(el);
      });
    };
    observeAll();

    // 动态新增元素（SPA / 懒加载）
    if (global.MutationObserver) {
      new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
          m.addedNodes.forEach(function (node) {
            if (node.nodeType === 1) {
              if (node.hasAttribute && node.hasAttribute('data-track')) exposureObserver.observe(node);
              if (node.querySelectorAll) observeAll(node);
            }
          });
        });
      }).observe(document.body, { childList: true, subtree: true });
    }

    // click：点击 [data-track] 元素
    document.addEventListener('click', function (e) {
      var el = e.target;
      for (var i = 0; i < 5 && el && el !== document.body; i++, el = el.parentElement) {
        if (!el || !el.getAttribute) break;
        if (el.hasAttribute('data-track')) {
          enqueue(buildEvent('click', el, { clickX: e.clientX, clickY: e.clientY }));
          return;
        }
      }
    }, true);
  }

  /** SDK 自服务鉴权：用 appKey 向 tracker-service 换取 JWT Token */
  function authenticate() {
    if (!config.appKey) return;
    var xhr = new XMLHttpRequest();
    xhr.open('POST', config.trackUrl + '/auth', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('X-App-Key', config.appKey);
    xhr.onload = function () {
      if (xhr.status === 200) {
        try {
          var data = JSON.parse(xhr.responseText);
          if (data.sdkToken) {
            config.sdkToken = data.sdkToken;
            if (config.debug) console.log('[GateFlow] Authenticated, token expires in ' + (data.expiresIn || '?') + 's');
            // 拿到 token 后立即 flush 之前缓存的事件
            flush();
          }
        } catch (e) {}
      } else {
        if (config.debug) console.warn('[GateFlow] Auth failed: invalid appKey?');
      }
    };
    xhr.onerror = function () {
      if (config.debug) console.warn('[GateFlow] Auth network error');
    };
    xhr.send();
  }

  // ============ 公开 API ============
  var Tracker = {

    init: function (options) {
      config = Object.assign({}, DEFAULT_CONFIG, options);

      var scripts = document.getElementsByTagName('script');
      for (var i = 0; i < scripts.length; i++) {
        if ((scripts[i].getAttribute('src') || '').indexOf('tracker-sdk.js') !== -1) {
          config.appCode = scripts[i].getAttribute('data-app-code') || config.appCode;
          config.appKey = scripts[i].getAttribute('data-app-key') || config.appKey;
          config.sdkToken = scripts[i].getAttribute('data-sdk-token') || config.sdkToken;
          config.tokenUrl = scripts[i].getAttribute('data-token-url') || config.tokenUrl;
          config.trackUrl = scripts[i].getAttribute('data-track-url') || config.trackUrl;
          config.userId = scripts[i].getAttribute('data-user-id') || config.userId;
          config.autoTrackPageView = scripts[i].getAttribute('data-auto-page-view') !== 'false';
          config.autoTrackExposure = scripts[i].getAttribute('data-auto-exposure') !== 'false';
          config.autoTrackClick = scripts[i].getAttribute('data-auto-click') !== 'false';
          config.autoTrackMode = scripts[i].getAttribute('data-auto-track-mode') === 'true';
          config.debug = scripts[i].getAttribute('data-debug') === 'true';
          break;
        }
      }

      if (!currentUserId) {
        currentUserId = config.userId || localStorage.getItem('_gf_uid') || '';
      }

      if (config.debug) console.log('[GateFlow] Init app=' + config.appCode + ' user=' + (currentUserId || '(anonymous)'));

      // 自服务鉴权：appKey → tracker-service → JWT Token
      if (!config.sdkToken && config.appKey) {
        authenticate();
      }

      // page_view
      if (config.autoTrackPageView) {
        Tracker.track('page_view');
        var lastUrl = location.href;
        ['pushState', 'replaceState'].forEach(function (m) {
          var orig = history[m];
          history[m] = function () { orig.apply(history, arguments); if (location.href !== lastUrl) { lastUrl = location.href; Tracker.track('page_view'); } };
        });
        window.addEventListener('popstate', function () { if (location.href !== lastUrl) { lastUrl = location.href; Tracker.track('page_view'); } });
      }

      // exposure + click（统一监听 [data-track]）
      if (config.autoTrackExposure || config.autoTrackClick) setupAutoTracking();

      // 全埋点模式（自动捕获所有交互，无需 data-track 标记）
      if (config.autoTrackMode) { autoTrackMode = true; setupFullAutoTrack(); }

      // 性能采集（Core Web Vitals + Navigation Timing）
      setupPerformanceTracking();

      // JS 异常捕获
      setupErrorTracking();

      // 接口监控（fetch 拦截）
      setupNetworkTracking();

      flushTimer = setInterval(flush, config.flushInterval);
      window.addEventListener('beforeunload', function () { flush(); });
    },

    /** 手动上报（仅复杂自定义场景，绝大多数场景用 data-track 属性即可） */
    track: function (eventType, data) {
      enqueue(buildEvent(eventType, null, data || {}));
    },

    custom: function (name, data) { Tracker.track(name, data); },

    /** 登录后调用，之后所有事件自动带 userId */
    setUserId: function (id) {
      currentUserId = id;
      localStorage.setItem('_gf_uid', id);
      if (config.debug) console.log('[GateFlow] User: ' + id);
    },

    getUserId: function () { return currentUserId; },
    getAnonymousId: function () { return anonymousId; },
    getSessionId: function () { return sessionId; },
    resetSession: function () { sessionId = generateId(); },
    flush: flush,
    getQueueSize: function () { return eventQueue.length; },

    /** 开启/关闭全埋点模式（无需 data-track 属性） */
    enableAutoTrack: function (on) {
      autoTrackMode = !!on;
      if (autoTrackMode) setupFullAutoTrack();
    },
    isAutoTrackEnabled: function () { return autoTrackMode; },
  };

  global.GateFlowTracker = Tracker;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { Tracker.init(); });
  } else {
    setTimeout(function () { Tracker.init(); }, 0);
  }
})(window);
