(() => {
  const VDITOR_VERSION = '3.11.2';
  const VDITOR_CDN = `https://unpkg.com/vditor@${VDITOR_VERSION}`;
  const LOCAL_UPLOAD_PREFIX = '/images/uploads/';
  const MAX_IMAGE_RETRIES = 8;
  const MIN_EDITOR_HEIGHT = 260;
  const MAX_EDITOR_HEIGHT = 860;
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
              height: 'auto',
              minHeight: MIN_EDITOR_HEIGHT,
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
                this.lastValue = this.getPersistedValue();
                this.bindAdapter();
                this.bindImageRecovery();
                this.syncEditorViewport();
              },
              input: () => {
                this.lastValue = this.getPersistedValue();
                this.props.onChange(this.lastValue);
                this.syncEditorViewport();
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
        if (nextValue !== this.lastValue && nextValue !== this.getPersistedValue()) {
          this.editor.setValue(nextValue);
          this.lastValue = nextValue;
          this.recoverBrokenImages();
          this.syncEditorViewport();
        }
      },
      componentWillUnmount() {
        this.mounted = false;
        this.imageRetryTimers?.forEach((timer) => window.clearTimeout(timer));
        if (this.imageRoot && this.imageErrorHandler) {
          this.imageRoot.removeEventListener('error', this.imageErrorHandler, true);
        }
        if (this.host) delete this.host.__a1rightVditor;
        this.editor?.destroy?.();
      },
      toLocalUploadPath(value = '') {
        try {
          const url = new URL(value, window.location.origin);
          return url.origin === window.location.origin && url.pathname.startsWith(LOCAL_UPLOAD_PREFIX)
            ? url.pathname
            : '';
        } catch {
          return '';
        }
      },
      getWysiwygRoot() {
        return this.host?.querySelector('.vditor-wysiwyg') || null;
      },
      getContentRoot() {
        return this.host?.querySelector('.vditor-content') || null;
      },
      getHeadingElements() {
        return [...(this.getWysiwygRoot()?.querySelectorAll('h1, h2, h3') || [])];
      },
      collectHeadingItems() {
        const seen = new Map();
        return this.getHeadingElements()
          .map((element, index) => {
            const text = `${element.textContent || ''}`.replace(/\s+/g, ' ').trim();
            if (!text) return null;
            const key = text.toLowerCase();
            const occurrence = seen.get(key) || 0;
            seen.set(key, occurrence + 1);
            return {
              index,
              kind: 'vditor',
              level: Number(element.tagName.slice(1)),
              lineNumber: index,
              text,
              occurrence,
            };
          })
          .filter(Boolean);
      },
      findHeadingElement(target = {}) {
        const elements = this.getHeadingElements();
        if (!elements.length) return null;

        const requestedIndex = Number.isInteger(target?.index) ? target.index : -1;
        if (requestedIndex >= 0 && elements[requestedIndex]) return elements[requestedIndex];

        const normalizedText = `${target?.text || ''}`.replace(/\s+/g, ' ').trim().toLowerCase();
        if (!normalizedText) return elements[0] || null;

        const wantedOccurrence = Number.isInteger(target?.occurrence) ? target.occurrence : 0;
        let matchedCount = 0;
        for (const element of elements) {
          const currentText = `${element.textContent || ''}`.replace(/\s+/g, ' ').trim().toLowerCase();
          if (currentText !== normalizedText) continue;
          if (matchedCount === wantedOccurrence) return element;
          matchedCount += 1;
        }

        return elements.find((element) =>
          `${element.textContent || ''}`.replace(/\s+/g, ' ').trim().toLowerCase() === normalizedText,
        ) || null;
      },
      focusHeadingElement(element) {
        if (!(element instanceof HTMLElement)) return false;
        this.editor?.focus();
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        const selection = window.getSelection();
        if (selection) {
          const range = document.createRange();
          range.selectNodeContents(element);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }

        return true;
      },
      syncEditorViewport() {
        const shell = this.host?.querySelector('.vditor');
        const content = this.getContentRoot();
        const root = this.getWysiwygRoot();
        if (!(shell instanceof HTMLElement) || !(content instanceof HTMLElement) || !(root instanceof HTMLElement)) return;

        const desiredHeight = Math.max(MIN_EDITOR_HEIGHT, Math.min(MAX_EDITOR_HEIGHT, root.scrollHeight + 40));
        shell.style.height = 'auto';
        content.style.height = `${desiredHeight}px`;
        content.style.maxHeight = `${MAX_EDITOR_HEIGHT}px`;
        content.style.overflowY = desiredHeight >= MAX_EDITOR_HEIGHT ? 'auto' : 'hidden';
        root.style.minHeight = `${Math.max(MIN_EDITOR_HEIGHT - 40, 220)}px`;
      },
      getPersistedValue() {
        if (!this.editor) return '';

        const restored = [];
        this.getWysiwygRoot()?.querySelectorAll('img[data-a1right-persist-src]').forEach((image) => {
          const persistedSource = image.dataset.a1rightPersistSrc;
          const visualSource = image.dataset.a1rightPreviewSrc || image.getAttribute('src') || '';
          if (!persistedSource || image.getAttribute('src') === persistedSource) return;
          restored.push({ image, visualSource });
          image.setAttribute('src', persistedSource);
        });

        try {
          return this.editor.getValue();
        } finally {
          restored.forEach(({ image, visualSource }) => image.setAttribute('src', visualSource));
        }
      },
      applyLocalImagePreviews(uploads = {}, attempt = 0) {
        const root = this.getWysiwygRoot();
        const items = Array.isArray(uploads) ? uploads : [];
        if (!root || !items.length) return;

        let applied = 0;
        items.forEach((upload) => {
          const persistedSource = this.toLocalUploadPath(upload?.publicPath || '');
          const previewSource = `${upload?.previewUrl || ''}`.trim();
          if (!persistedSource || !previewSource) return;

          root.querySelectorAll('img').forEach((image) => {
            const imageSource = this.toLocalUploadPath(image.dataset.a1rightPersistSrc || image.getAttribute('src') || '');
            if (imageSource !== persistedSource) return;
            image.dataset.a1rightPersistSrc = persistedSource;
            image.dataset.a1rightPreviewSrc = previewSource;
            image.setAttribute('src', previewSource);
            applied += 1;
          });
        });

        if (!applied && attempt < 3) {
          window.setTimeout(() => this.applyLocalImagePreviews(items, attempt + 1), 80 * (attempt + 1));
        }
      },
      bindImageRecovery() {
        const root = this.getWysiwygRoot();
        if (!root || this.imageRoot === root) return;

        this.imageRoot = root;
        this.imageRetryTimers = new Set();
        this.imageErrorHandler = (event) => this.retryBrokenImage(event.target);
        root.addEventListener('error', this.imageErrorHandler, true);
        window.setTimeout(() => this.recoverBrokenImages(), 0);
      },
      recoverBrokenImages() {
        this.getWysiwygRoot()?.querySelectorAll('img').forEach((image) => {
          if (image.complete && !image.naturalWidth) this.retryBrokenImage(image);
        });
      },
      retryBrokenImage(image) {
        if (!(image instanceof HTMLImageElement) || !this.mounted || image.naturalWidth) return;
        const source = image.dataset.a1rightPersistSrc || this.toLocalUploadPath(image.getAttribute('src') || '');
        if (!source || !this.toLocalUploadPath(source)) return;

        const retries = Number.parseInt(image.dataset.a1rightRetryCount || '0', 10);
        if (retries >= MAX_IMAGE_RETRIES || image.dataset.a1rightRetryPending === 'true') return;

        image.dataset.a1rightPersistSrc = this.toLocalUploadPath(source);
        image.dataset.a1rightRetryCount = `${retries + 1}`;
        image.dataset.a1rightRetryPending = 'true';
        const timer = window.setTimeout(() => {
          this.imageRetryTimers?.delete(timer);
          image.dataset.a1rightRetryPending = 'false';
          if (!this.mounted || !image.isConnected || image.naturalWidth) return;
          image.setAttribute('src', `${source}?a1right-retry=${Date.now()}`);
        }, Math.min(2000 * (retries + 1), 16000));
        this.imageRetryTimers?.add(timer);
      },
      bindAdapter() {
        if (!this.host || !this.editor) return;
        this.host.__a1rightVditor = {
          getValue: () => this.getPersistedValue(),
          getHeadingItems: () => this.collectHeadingItems(),
          scrollToHeading: (target) => this.focusHeadingElement(this.findHeadingElement(target)),
          setValue: (value) => {
            this.editor.setValue(value || '');
            this.lastValue = this.getPersistedValue();
            this.props.onChange(this.lastValue);
            this.recoverBrokenImages();
            this.syncEditorViewport();
          },
          insertValue: (value, { appendParagraph = false } = {}) => {
            this.editor.focus();
            // insertValue treats its argument as HTML. Keep the stored body as
            // Markdown so Vditor creates one managed image block instead.
            this.editor.insertMD(value);
            if (appendParagraph) this.editor.insertEmptyBlock('afterend');
            window.setTimeout(() => {
              if (!this.editor) return;
              this.lastValue = this.getPersistedValue();
              this.props.onChange(this.lastValue);
              this.syncEditorViewport();
            }, 0);
          },
          setImagePreviews: (uploads) => this.applyLocalImagePreviews(uploads),
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
