(() => {
  const VDITOR_VERSION = '3.11.2';
  const VDITOR_CDN = `https://unpkg.com/vditor@${VDITOR_VERSION}`;
  let loader = null;

  const loadAsset = (tagName, url) =>
    new Promise((resolve, reject) => {
      const existing = document.querySelector(`[data-a1right-asset="${url}"]`);
      if (existing?.dataset.loaded === 'true') return resolve();

      const tag = existing || document.createElement(tagName);
      tag.dataset.a1rightAsset = url;
      if (tagName === 'link') {
        tag.rel = 'stylesheet';
        tag.href = url;
      } else {
        tag.src = url;
        tag.async = true;
      }
      tag.addEventListener('load', () => {
        tag.dataset.loaded = 'true';
        resolve();
      }, { once: true });
      tag.addEventListener('error', reject, { once: true });
      if (!existing) document.head.append(tag);
    });

  const loadVditor = () => {
    if (window.Vditor) return Promise.resolve(window.Vditor);
    if (!loader) {
      loader = Promise.all([
        loadAsset('link', `${VDITOR_CDN}/dist/index.css`),
        loadAsset('script', `${VDITOR_CDN}/dist/index.min.js`),
      ]).then(() => window.Vditor);
    }
    return loader;
  };

  const register = () => {
    if (!window.CMS || !window.createClass || !window.h || window.__A1RIGHT_WYSIWYG_REGISTERED__) return;
    window.__A1RIGHT_WYSIWYG_REGISTERED__ = true;

    const Control = window.createClass({
      componentDidMount() {
        this.mounted = true;
        loadVditor()
          .then((Vditor) => {
            if (!this.mounted || !Vditor || !this.host) return;
            this.editor = new Vditor(this.host, {
              cdn: VDITOR_CDN,
              i18n: 'zh_CN',
              mode: 'wysiwyg',
              height: 620,
              minHeight: 420,
              cache: { enable: false },
              counter: { enable: true },
              toolbarConfig: { pin: true },
              toolbar: [
                'headings', 'bold', 'italic', 'strike', 'link', '|',
                'list', 'ordered-list', 'check', 'outdent', 'indent', '|',
                'quote', 'line', 'code', 'inline-code', 'table', '|',
                'undo', 'redo', 'edit-mode', 'both', 'preview', 'fullscreen', 'outline',
              ],
              value: this.props.value || '',
              after: () => {
                this.lastValue = this.editor.getValue();
                this.bindAdapter();
              },
              input: (value) => {
                this.lastValue = value;
                this.props.onChange(value);
              },
            });
          })
          .catch(() => {
            if (this.host) this.host.textContent = 'Editor assets failed to load. Refresh and try again.';
          });
      },
      componentDidUpdate() {
        if (!this.editor) return;
        const nextValue = this.props.value || '';
        if (nextValue !== this.lastValue && nextValue !== this.editor.getValue()) {
          this.editor.setValue(nextValue);
          this.lastValue = nextValue;
        }
      },
      componentWillUnmount() {
        this.mounted = false;
        if (this.host) delete this.host.__a1rightVditor;
        this.editor?.destroy?.();
      },
      bindAdapter() {
        if (!this.host || !this.editor) return;
        this.host.__a1rightVditor = {
          getValue: () => this.editor.getValue(),
          setValue: (value) => {
            this.editor.setValue(value || '');
            this.lastValue = this.editor.getValue();
            this.props.onChange(this.lastValue);
          },
          insertValue: (value) => {
            this.editor.focus();
            this.editor.insertValue(value, true);
            window.setTimeout(() => {
              if (!this.editor) return;
              this.lastValue = this.editor.getValue();
              this.props.onChange(this.lastValue);
            }, 0);
          },
          focus: () => this.editor.focus(),
          scrollIntoView: () => this.host.scrollIntoView({ behavior: 'smooth', block: 'center' }),
        };
      },
      render() {
        return window.h('div', {
          id: this.props.forID,
          className: 'a1right-vditor-widget',
          ref: (element) => { this.host = element; },
        });
      },
    });

    window.CMS.registerWidget('a1right_wysiwyg', Control);
  };

  window.__A1RIGHT_REGISTER_WYSIWYG__ = register;
  register();
})();
