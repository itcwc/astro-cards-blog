// 文章目录：滚动时高亮当前所在章节
// 放在 public/ 下由页面按需引入，不参与打包，避免多页面内联脚本被去重导致丢失
(function () {
  var links = Array.prototype.slice.call(document.querySelectorAll('.toc-list a[href^="#"]'));
  if (!links.length) return;

  var items = [];
  links.forEach(function (a) {
    var hash = a.getAttribute('href').slice(1);
    var id;
    try {
      id = decodeURIComponent(hash);
    } catch (e) {
      id = hash;
    }
    var target = document.getElementById(id);
    if (target) items.push({ a: a, t: target });
  });
  if (!items.length) return;

  function update() {
    var current = items[0];
    for (var i = 0; i < items.length; i++) {
      if (items[i].t.getBoundingClientRect().top <= 100) current = items[i];
    }
    for (var j = 0; j < items.length; j++) {
      items[j].a.classList.toggle('active', items[j] === current);
    }
  }

  var ticking = false;
  window.addEventListener(
    'scroll',
    function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        update();
        ticking = false;
      });
    },
    { passive: true }
  );
  update();
})();
