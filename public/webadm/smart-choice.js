/**
 * Decap CMS 自定义控件：smart-choice
 *
 * 用途：分类 / 专栏 / 标签这类「从已有项里选，也能随手新增」的字段。
 * Decap 原生 select 只接受 config.yml 里写死的 options（源码用 react-select，
 * 没有 creatable 分支），所以这里用官方暴露的 createClass / h 手写一个控件。
 *
 * 行为：
 *   - 输入框下方列出已有候选项（config.yml 的 options + 本机输入过的新值），点一下即选用
 *   - 输入任意文字后按回车 → 直接新增并选用，不需要改 config.yml
 *   - 单值字段（分类/专栏）：新值替换旧值；多值字段（标签，multiple: true）：追加
 *   - Backspace（输入框为空时）删掉最后一个标签
 *   - 新增过的词记在 localStorage，按字段名隔离，刷新后仍在候选里
 *
 * 数据格式与原生控件完全一致：单值存 string，multiple 存 string[]，
 * 因此 Astro 模板和已有 md 文件都不需要改动。
 */
(function () {
  'use strict';

  var STORE_PREFIX = 'decap-smart-choice:';

  function readStore(name) {
    if (!name || typeof localStorage === 'undefined') return [];
    try {
      var raw = localStorage.getItem(STORE_PREFIX + name);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr)
        ? arr.filter(function (v) { return typeof v === 'string' && v.trim(); })
        : [];
    } catch (e) {
      return [];
    }
  }

  function writeStore(name, values) {
    if (!name || typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORE_PREFIX + name, JSON.stringify(values));
    } catch (e) {
      /* 隐私模式 / 存储配额满：不影响本次输入，只是下次不再记住 */
    }
  }

  // field.get('options') 在 Decap 里通常是 Immutable List，兼容普通数组
  function configOptions(field) {
    var opts = field && field.get('options');
    if (!opts) return [];
    if (typeof opts.toJS === 'function') {
      try { opts = opts.toJS(); } catch (e) { return []; }
    }
    if (!Array.isArray(opts)) return [];
    return opts
      .map(function (o) {
        if (typeof o === 'string' || typeof o === 'number') return String(o).trim();
        if (o && typeof o === 'object') {
          var v = o.value != null ? o.value : o.label;
          return v == null ? '' : String(v).trim();
        }
        return '';
      })
      .filter(Boolean);
  }

  function unique(list) {
    var seen = Object.create(null);
    var out = [];
    list.forEach(function (v) {
      var k = String(v);
      if (!seen[k]) {
        seen[k] = 1;
        out.push(k);
      }
    });
    return out;
  }

  // 兼容 Immutable List / 数组 / 字符串 / 空值
  function toValues(raw, multiple) {
    if (raw == null) return multiple ? [] : '';
    if (typeof raw.toJS === 'function') {
      try { raw = raw.toJS(); } catch (e) { /* ignore */ }
    }
    if (multiple) {
      if (Array.isArray(raw)) return raw.map(String);
      if (typeof raw === 'string') return raw ? [raw] : [];
      return [];
    }
    if (Array.isArray(raw)) return raw.length ? String(raw[0]) : '';
    return typeof raw === 'string' ? raw : String(raw);
  }

  var S = {
    wrap: { position: 'relative', padding: 0, border: 'none' },
    current: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
    chip: {
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 9px',
      borderRadius: 14, background: '#e8f1ff', border: '1px solid #bcd6ff',
      color: '#1b5bae', fontSize: 13, lineHeight: '18px'
    },
    chipRemove: {
      cursor: 'pointer', border: 0, background: 'transparent',
      color: '#1b5bae', fontSize: 16, lineHeight: 1, padding: 0
    },
    input: {
      width: '100%', boxSizing: 'border-box', padding: '8px 10px',
      border: '1px solid #c9d2db', borderRadius: 4, fontSize: 14,
      outline: 'none', background: '#fff'
    },
    list: {
      marginTop: 6, border: '1px solid #e3e8ee', borderRadius: 4, background: '#fff',
      maxHeight: 168, overflowY: 'auto', boxShadow: '0 2px 8px rgba(0,0,0,.06)'
    },
    item: {
      display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px', border: 0,
      borderBottom: '1px solid #f0f2f5', background: 'transparent',
      cursor: 'pointer', fontSize: 13, color: '#334455'
    }
  };

  var SmartChoice = createClass({
    getInitialState: function () {
      return { text: '', open: false };
    },

    componentDidMount: function () {
      var self = this;
      this._onDocDown = function (e) {
        if (self._root && !self._root.contains(e.target)) self.setState({ open: false });
      };
      document.addEventListener('mousedown', this._onDocDown);
    },

    componentWillUnmount: function () {
      if (this._onDocDown) document.removeEventListener('mousedown', this._onDocDown);
    },

    isMultiple: function () {
      return !!this.props.field.get('multiple');
    },

    fieldName: function () {
      return this.props.field.get('name') || 'field';
    },

    allOptions: function () {
      return unique(configOptions(this.props.field).concat(readStore(this.fieldName())));
    },

    add: function (value) {
      value = String(value || '').trim();
      if (!value) return;

      var saved = readStore(this.fieldName());
      if (saved.indexOf(value) === -1) {
        saved.push(value);
        writeStore(this.fieldName(), saved);
      }

      if (this.isMultiple()) {
        var values = toValues(this.props.value, true);
        if (values.indexOf(value) === -1) {
          values.push(value);
          this.props.onChange(values);
        }
      } else {
        this.props.onChange(value);
      }
      this.setState({ text: '', open: false });
    },

    removeAt: function (index) {
      var values = toValues(this.props.value, true);
      values.splice(index, 1);
      this.props.onChange(values);
    },

    clear: function () {
      this.props.onChange(this.isMultiple() ? [] : '');
    },

    onKeyDown: function (e) {
      // 中文等输入法组合期间的回车是「选字」，不能误当成新增
      if (e.isComposing || e.keyCode === 229) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        this.add(this.state.text);
      } else if (e.key === 'Escape') {
        this.setState({ open: false });
      } else if (e.key === 'Backspace' && !this.state.text && this.isMultiple()) {
        var values = toValues(this.props.value, true);
        if (values.length) this.removeAt(values.length - 1);
      }
    },

    render: function () {
      var self = this;
      var multiple = this.isMultiple();
      var current = toValues(this.props.value, multiple);
      var chips = multiple ? current : (current ? [current] : []);
      var query = this.state.text.trim().toLowerCase();
      var options = this.allOptions();
      var matches = query
        ? options.filter(function (o) { return o.toLowerCase().indexOf(query) !== -1; })
        : options;

      var children = [];

      if (chips.length) {
        children.push(
          h('div', { key: 'current', style: S.current }, chips.map(function (v, i) {
            return h('span', { key: v + '-' + i, style: S.chip },
              h('span', null, v),
              h('button', {
                type: 'button', title: '移除', style: S.chipRemove,
                onClick: function (e) {
                  e.preventDefault();
                  if (multiple) self.removeAt(i); else self.clear();
                }
              }, '×')
            );
          }))
        );
      }

      children.push(
        h('input', {
          key: 'input',
          id: this.props.forID,
          type: 'text',
          autoComplete: 'off',
          value: this.state.text,
          placeholder: multiple
            ? '输入后回车添加，或点选下方已有项'
            : '输入后回车设定，或点选下方已有项',
          style: S.input,
          onChange: function (e) { self.setState({ text: e.target.value, open: true }); },
          onFocus: function () { self.setState({ open: true }); },
          onKeyDown: this.onKeyDown
        })
      );

      if (this.state.open && matches.length) {
        children.push(
          h('div', { key: 'options', style: S.list }, matches.map(function (o) {
            return h('button', {
              type: 'button', key: o, style: S.item,
              onMouseDown: function (e) {
                e.preventDefault();
                self.add(o);
              }
            }, o);
          }))
        );
      }

      return h('div', {
        className: this.props.classNameWrapper,
        style: S.wrap,
        ref: function (el) { self._root = el; }
      }, children);
    }
  });

  CMS.registerWidget('smart-choice', SmartChoice, null, {
    properties: {
      multiple: { type: 'boolean' },
      options: { type: 'array' }
    }
  });
})();
