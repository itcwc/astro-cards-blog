// 站内搜索：零依赖，索引由构建期 /search.json 生成
// 交互：点击导航放大镜 / 按 / / Ctrl(⌘)+K 打开；↑↓ 选择，↵ 打开，ESC 关闭
// 打开链接可带 ?q=关键词 直接进入结果页
(function () {
  'use strict';

  var overlay = document.getElementById('search');
  var openBtn = document.getElementById('search-open');
  if (!overlay || !openBtn) return;

  var input = document.getElementById('search-input');
  var listEl = document.getElementById('search-results');
  var countEl = document.getElementById('search-count');
  var tabEl = document.getElementById('search-tabs');
  var tabs = Array.prototype.slice.call(tabEl.querySelectorAll('button'));

  var LABEL = { article: '文章', note: '笔记' };
  var index = null;
  var pending = null;
  var failed = false;
  var kind = 'all';
  var tokens = [];
  var rows = [];
  var active = -1;
  var lastFocus = null;

  /* ---------- 索引 ---------- */

  function load() {
    if (index) return Promise.resolve(index);
    if (pending) return pending;
    pending = fetch('/search.json', { credentials: 'omit' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        index = data.map(function (it) {
          return {
            type: it.type,
            title: it.title || '',
            url: it.url,
            date: it.date || '',
            meta: it.meta || '',
            desc: it.desc || '',
            raw: it.text || '',
            t: (it.title || '').toLowerCase(),
            m: (it.meta || '').toLowerCase(),
            d: (it.desc || '').toLowerCase(),
            x: (it.text || '').toLowerCase()
          };
        });
        return index;
      })
      .catch(function () {
        failed = true;
        pending = null;
        throw new Error('index failed');
      });
    return pending;
  }

  /* ---------- 打分 ---------- */

  function occurrences(hay, needle) {
    var n = 0;
    var i = 0;
    while (true) {
      i = hay.indexOf(needle, i);
      if (i === -1) break;
      n++;
      i += needle.length;
    }
    return n;
  }

  // 多关键词为“与”关系：任一关键词完全没命中则整条淘汰
  function score(it, toks) {
    var sum = 0;
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i];
      var s = 0;
      var at = it.t.indexOf(t);
      if (at === 0) s += 120;
      else if (at > 0) s += 70;
      if (it.m.indexOf(t) !== -1) s += 28; // 标签 / 专栏
      if (it.d.indexOf(t) !== -1) s += 18; // 摘要
      var c = occurrences(it.x, t);
      if (c) s += 14 + Math.min(c, 8) * 3;
      if (!s) return 0;
      sum += s;
    }
    return sum;
  }

  /* ---------- 渲染 ---------- */

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function escRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function highlight(text, toks) {
    var out = esc(text);
    if (!toks.length) return out;
    var re = new RegExp('(' + toks.map(function (t) { return escRe(esc(t)); }).join('|') + ')', 'gi');
    return out.replace(re, '<mark>$1</mark>');
  }

  function snippet(it, toks) {
    var src = it.raw || it.desc || '';
    if (!src) return '';
    var low = src.toLowerCase();
    var at = -1;
    for (var i = 0; i < toks.length; i++) {
      var p = low.indexOf(toks[i]);
      if (p !== -1) { at = p; break; }
    }
    // 只在标题/标签命中时正文可能完全没匹配：退回开头一段
    var start = at > 40 ? at - 40 : 0;
    var out = src.slice(start, start + 150);
    if (start > 0) out = '…' + out;
    if (start + 150 < src.length) out += '…';
    return highlight(out, toks);
  }

  function setActive(n) {
    var nodes = listEl.querySelectorAll('.sr-item');
    if (!nodes.length) return;
    if (n < 0) n = nodes.length - 1;
    if (n >= nodes.length) n = 0;
    active = n;
    for (var i = 0; i < nodes.length; i++) {
      var on = i === n;
      nodes[i].classList.toggle('active', on);
      nodes[i].setAttribute('aria-selected', on ? 'true' : 'false');
    }
    var el = nodes[n];
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }

  function render() {
    if (failed) {
      listEl.innerHTML = '<p class="sr-empty">索引加载失败，请刷新重试。</p>';
      countEl.textContent = '';
      return;
    }
    if (!index) {
      listEl.innerHTML = '<p class="sr-empty">正在加载索引…</p>';
      countEl.textContent = '';
      return;
    }

    var q = input.value.trim().toLowerCase();
    var toks = q ? q.split(/\s+/).filter(Boolean) : [];
    tokens = toks;

    rows = [];
    for (var i = 0; i < index.length; i++) {
      var it = index[i];
      if (kind !== 'all' && it.type !== kind) continue;
      if (!toks.length) {
        if (rows.length < 6) rows.push({ it: it, q: 0 }); // 空查询：最近更新
        continue;
      }
      var s = score(it, toks);
      if (s > 0) rows.push({ it: it, q: s });
    }
    if (toks.length) rows.sort(function (a, b) { return b.q - a.q; });

    if (!rows.length) {
      listEl.innerHTML = '<p class="sr-empty">没有匹配的内容，换个关键词试试。</p>';
      countEl.textContent = '0 条结果';
      active = -1;
      return;
    }

    var html = '';
    for (var j = 0; j < rows.length; j++) {
      var row = rows[j];
      var item = row.it;
      var snip = toks.length
        ? snippet(item, toks)
        : esc((item.desc || item.raw || '').slice(0, 110));
      html +=
        '<a class="sr-item' + (j === 0 ? ' active' : '') + '" role="option" aria-selected="' +
        (j === 0 ? 'true' : 'false') + '" href="' + esc(item.url) + '" data-i="' + j + '">' +
        '<div class="sr-top">' +
        '<span class="kind">' + LABEL[item.type] + '</span>' +
        '<span class="sr-title">' + highlight(item.title, toks) + '</span>' +
        '<span class="sr-date">' + esc(item.date) + '</span>' +
        '</div>' +
        (snip ? '<p class="sr-snippet">' + snip + '</p>' : '') +
        '</a>';
    }
    listEl.innerHTML = html;
    active = 0;
    countEl.textContent = toks.length ? rows.length + ' 条结果' : '最近更新';
    var first = listEl.querySelector('.sr-item');
    if (first) first.scrollIntoView({ block: 'nearest' });
  }

  /* ---------- 开关 ---------- */

  function open(q) {
    lastFocus = document.activeElement;
    overlay.hidden = false;
    document.body.classList.add('search-open');
    if (typeof q === 'string' && q) input.value = q;
    input.focus();
    if (input.value) input.select();
    render();
    load()
      .then(function () { if (!overlay.hidden) render(); })
      .catch(function () { render(); });
  }

  function close() {
    if (overlay.hidden) return;
    overlay.hidden = true;
    document.body.classList.remove('search-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function isOpen() {
    return !overlay.hidden;
  }

  /* ---------- 事件 ---------- */

  openBtn.addEventListener('click', function () { open(isOpen() ? null : ''); });
  openBtn.addEventListener('mouseenter', function () { load().catch(function () {}); });

  overlay.addEventListener('mousedown', function (e) {
    if (e.target === overlay) close();
  });

  input.addEventListener('input', render);

  listEl.addEventListener('click', function (e) {
    if (e.target.closest('.sr-item')) close();
  });

  listEl.addEventListener('mousemove', function (e) {
    var a = e.target.closest('.sr-item');
    if (!a) return;
    var n = Number(a.getAttribute('data-i'));
    if (n !== active) setActive(n);
  });

  tabs.forEach(function (b) {
    b.addEventListener('click', function () {
      kind = b.getAttribute('data-kind');
      tabs.forEach(function (x) { x.classList.toggle('active', x === b); });
      render();
      input.focus();
    });
  });

  overlay.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(active + 1);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(active - 1);
      return;
    }
    if (e.key === 'Enter') {
      var target = listEl.querySelectorAll('.sr-item')[active];
      if (target) {
        e.preventDefault();
        close();
        location.href = target.getAttribute('href');
      }
    }
  });

  function isTyping(el) {
    if (!el || !el.tagName) return false;
    var tag = el.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
  }

  document.addEventListener('keydown', function (e) {
    var key = e.key;
    if ((e.metaKey || e.ctrlKey) && (key === 'k' || key === 'K')) {
      e.preventDefault();
      if (isOpen()) close(); else open('');
      return;
    }
    if (key === '/' && !isOpen() && !isTyping(e.target)) {
      e.preventDefault();
      open('');
    }
  });

  // 支持 /search?q=xxx 或 /?q=xxx 直接带查询打开
  try {
    var q0 = new URLSearchParams(location.search).get('q');
    if (q0) open(q0);
  } catch (err) {
    /* 老浏览器忽略 */
  }
})();
