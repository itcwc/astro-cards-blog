// mermaid 渲染：把 <pre data-language="mermaid"> 换成真正的流程图
// 走 UMD 自托管（/vendor/mermaid.min.js），不依赖 CDN，也不进打包依赖
// 放在 public/ 下由页面按需引入，避免多页面内联脚本被去重导致丢失
(async function () {
  var pres = document.querySelectorAll('pre[data-language="mermaid"]');
  if (!pres.length) return;

  // 加载失败就保持原样，至少还能看到代码
  try {
    if (!window.mermaid) {
      await new Promise(function (res, rej) {
        var s = document.createElement('script');
        s.src = '/vendor/mermaid.min.js';
        s.onload = res;
        s.onerror = rej;
        document.head.appendChild(s);
      });
    }
  } catch (e) {
    return;
  }

  // Decap CMS 会把引号存成 &#34; 这类实体（再被代码块二次转义），
  // 不解码的话图上会直接印出转义串，所以先还原成真实字符
  function decodeHtml(s) {
    var t = document.createElement('textarea');
    t.innerHTML = s;
    return t.value;
  }

  var blocks = [];
  var sources = [];
  pres.forEach(function (pre) {
    var code = pre.querySelector('code');
    var src = (code ? code.textContent : pre.textContent) || '';
    var div = document.createElement('div');
    div.className = 'mermaid-block is-loading';
    pre.replaceWith(div);
    blocks.push(div);
    sources.push(decodeHtml(src));
  });

  var seq = 0;
  async function render() {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    window.mermaid.initialize({
      startOnLoad: false,
      theme: dark ? 'dark' : 'default',
      securityLevel: 'strict',
      fontFamily: 'inherit',
    });
    for (var i = 0; i < blocks.length; i++) {
      var box = blocks[i];
      try {
        // 用 render 而不是 run：源码不进 DOM，语法错误也只影响这一张图
        var id = 'mmd-' + i + '-' + seq++ + '-' + Math.random().toString(36).slice(2, 8);
        var out = await window.mermaid.render(id, sources[i]);
        box.innerHTML = out.svg;
      } catch (e) {
        box.classList.add('is-error'); // 渲染失败就退回显示源码，不至于开天窗
        box.textContent = sources[i];
      } finally {
        box.classList.remove('is-loading');
      }
    }
  }

  await render();

  // 切换深浅色时重渲染，让图表配色跟随主题
  var timer;
  new MutationObserver(function () {
    clearTimeout(timer);
    timer = setTimeout(render, 120);
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
})();
