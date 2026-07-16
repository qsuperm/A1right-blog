(() => {
  const runtime = window.__A1RIGHT_ADMIN__ || {};
  const mediaFolder = `${runtime.mediaFolder || 'public/images/uploads'}`.replace(/^\/+|\/+$/g, '');
  const publicFolder = `${runtime.publicFolder || 'images/uploads'}`.replace(/^\/+|\/+$/g, '');
  const publicFolderUrl = `/${publicFolder}`;
  const uploadState = { busy: false };
  const previewState = {
    objectUrls: new Set(),
    imageFieldState: new WeakMap(),
    inlineImageSources: new Map(),
  };
  const decoratorState = {
    richTextCodeRefreshRaf: 0,
    toolbarRefreshRaf: 0,
    codeGroupCounter: 0,
    boundToolbarCodeButtons: new WeakSet(),
    boundToolbarActionBars: new WeakSet(),
  };
  const workflowState = {
    dirty: false,
    autoSaveTimer: 0,
    lastAutoSavedAt: 0,
    lastSavedAt: 0,
    lastDraftToastAt: 0,
    activeDraftKey: '',
    restoreBannerDismissed: false,
    statsRefreshRaf: 0,
    assistRefreshRaf: 0,
    outlineRefreshRaf: 0,
    publishFieldRefreshRaf: 0,
  };
  const uiState = {
    recentUploads: [],
    uploadOverlayHideTimer: 0,
    dropTargetClearTimer: 0,
    activeDropTarget: null,
    inlineImagePopover: null,
    activeInlineImageBlock: null,
  };
  const markdownPreviewState = {
    refreshRaf: 0,
    lastSignature: '',
  };
  const editorState = {
    lastMarkdownRoot: null,
    lastMarkdownEditable: null,
    lastMarkdownTextarea: null,
    lastSelectionStart: null,
    lastSelectionEnd: null,
    lastRichTextSelection: null,
    lastImageRoot: null,
    lastContextKind: null,
    lastContextRoot: null,
    lastInteractionAt: 0,
  };


  const TAG_SUGGESTIONS = {
    global: {
      'zh-cn': ['Web\u5b89\u5168', 'CTF', 'Writeup', '\u6e17\u900f\u6d4b\u8bd5', '\u6f0f\u6d1e\u5206\u6790', '\u4ee3\u7801\u5ba1\u8ba1', 'MCP', '\u6d4f\u89c8\u5668\u81ea\u52a8\u5316'],
      en: ['Web Security', 'CTF', 'Writeup', 'Pentest', 'Code Audit', 'MCP', 'Automation', 'Browser'],
    },
    category: {
      'web-security': {
        'zh-cn': ['\u8ba4\u8bc1\u7ed5\u8fc7', '\u6587\u4ef6\u4e0a\u4f20', 'JWT', 'XSS', 'SQL\u6ce8\u5165', '\u903b\u8f91\u6f0f\u6d1e'],
        en: ['Auth Bypass', 'File Upload', 'JWT', 'XSS', 'SQLi', 'Business Logic'],
      },
      'ctf-writeup': {
        'zh-cn': ['Misc', 'Web', 'Pwn', 'Crypto', 'Reverse', 'Forensics'],
        en: ['Misc', 'Web', 'Pwn', 'Crypto', 'Reverse', 'Forensics'],
      },
      'agent-pentest': {
        'zh-cn': ['Agent', 'MCP', 'Prompt Injection', 'Tool Chain', 'Browser', 'Workflow'],
        en: ['Agent', 'MCP', 'Prompt Injection', 'Toolchain', 'Browser', 'Workflow'],
      },
    },
  };

  const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

  const ensureToastRoot = () => {
    let root = document.getElementById('a1right-admin-toast-root');
    if (root) return root;

    root = document.createElement('div');
    root.id = 'a1right-admin-toast-root';
    document.body.append(root);
    return root;
  };

  const mountToast = (toast, duration = 3200) => {
    const root = ensureToastRoot();
    root.append(toast);

    window.requestAnimationFrame(() => toast.classList.add('is-visible'));
    window.setTimeout(() => {
      toast.classList.remove('is-visible');
      window.setTimeout(() => toast.remove(), 220);
    }, duration);

    return toast;
  };

  const createToast = (type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `a1right-admin-toast is-${type}`;
    return toast;
  };

  const showToast = (message, type = 'info', duration = 3200) => {
    const toast = createToast(type);
    toast.textContent = message;
    return mountToast(toast, duration);
  };

  const getElementUiText = (element) =>
    [
      element?.getAttribute?.('aria-label') || '',
      element?.getAttribute?.('title') || '',
      element?.textContent || '',
    ]
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

  const normalizeUiText = (value = '') => `${value}`.replace(/\s+/g, ' ').trim().toLowerCase();

  const hasCjk = (value = '') => /[\u3400-\u9fff]/.test(value);

  const cleanDisplayText = (value = '') =>
    `${value}`
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[^\w\u3400-\u9fff ]+/g, ' ')
      .replace(/\b\d{8,}\b/g, ' ')
      .trim();

  const formatFileSize = (size = 0) =>
    size >= 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`;

  const formatClockTime = (value) => {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelativeTime = (value) => {
    if (!value) return '';
    const diff = Date.now() - Number(value);
    if (diff < 60_000) return '刚刚';
    if (diff < 3_600_000) return `${Math.max(1, Math.round(diff / 60_000))} 分钟前`;
    if (diff < 86_400_000) return `${Math.max(1, Math.round(diff / 3_600_000))} 小时前`;
    return `${Math.max(1, Math.round(diff / 86_400_000))} 天前`;
  };

  const formatDateTime = (value) => {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const clampNumber = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

  const slugifyText = (value = '') => {
    const base = `${value || ''}`
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');

    const ascii = base
      .replace(/[\u4e00-\u9fff]/g, '')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');

    if (ascii) return ascii.slice(0, 72);

    const fallback = `a1right-post-${new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 12)}`;
    return fallback;
  };

  const estimateReadingTime = (text = '') => {
    const asciiWords = `${text || ''}`.match(/[A-Za-z0-9_]+/g)?.length || 0;
    const cjkChars = (`${text || ''}`.match(/[\u3400-\u9fff]/g) || []).length;
    const weightedWords = asciiWords + cjkChars;
    return Math.max(1, Math.ceil(weightedWords / 260));
  };

  const countBodyStats = (text = '') => {
    const normalized = `${text || ''}`.replace(/\r\n/g, '\n');
    const asciiWords = normalized.match(/[A-Za-z0-9_]+/g)?.length || 0;
    const cjkChars = (normalized.match(/[\u3400-\u9fff]/g) || []).length;
    const lines = normalized ? normalized.split('\n').length : 0;
    return {
      words: asciiWords + cjkChars,
      lines,
      readingMinutes: estimateReadingTime(normalized),
    };
  };

  const stripMarkdownToPlainText = (source = '') =>
    `${source || ''}`
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`[^`]*`/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/^#{1,6}\s+/gm, ' ')
      .replace(/^>\s?/gm, ' ')
      .replace(/[>*_~|-]/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const truncateText = (value = '', maxLength = 256) => {
    const normalized = `${value || ''}`.replace(/\s+/g, ' ').trim();
    if (!normalized) return '';
    return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength).trim()}\u2026`;
  };

  const buildExcerptFromBody = (maxLength = 120) => {
    const bodyText = stripMarkdownToPlainText(getBodyPlainText());
    return truncateText(bodyText, Math.max(48, Math.min(256, maxLength)));
  };

  const getCurrentEditorLocale = () => (/articles_en/i.test(window.location.hash || '') ? 'en' : 'zh-cn');

  const parseHeadingLine = (line = '', lineNumber = 0) => {
    const matched = `${line || ''}`.match(/^\s*(#{1,3})\s+(.+?)\s*$/);
    if (!matched) return null;

    return {
      level: matched[1].length,
      text: matched[2].trim(),
      lineNumber,
    };
  };

  const getBodyHeadingItems = () => {
    const editable = getBodyEditable();
    const richTextHeadings = editable instanceof HTMLElement
      ? [...editable.querySelectorAll('h1, h2, h3')]
          .map((element, index) => ({
            level: Number(element.tagName.slice(1)),
            text: `${element.textContent || ''}`.replace(/\s+/g, ' ').trim(),
            lineNumber: index,
            kind: 'rich-text',
          }))
          .filter((heading) => heading.text)
      : [];

    if (richTextHeadings.length) return richTextHeadings;

    return `${getBodyPlainText() || ''}`
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((line, index) => parseHeadingLine(line, index))
      .filter(Boolean);
  };

  const extractFirstBodyImage = () => {
    const source = `${getBodyPlainText() || ''}`;
    const matched = source.match(/!\[(.*?)\]\((.+?)\)/);
    if (!matched) return null;

    const alt = `${matched[1] || ''}`.trim();
    const rawPayload = `${matched[2] || ''}`.trim();
    const titled = rawPayload.match(/^(\S+)\s+(?:\"([^\"]*)\"|'([^']*)')$/);
    const rawSource = titled?.[1] || rawPayload;
    const title = titled?.[2] || titled?.[3] || '';
    const sourceUrl = normalizePreviewLink(rawSource);
    const fieldPath = normalizeFieldPath(rawSource) || rawSource;

    if (!sourceUrl && !fieldPath) return null;

    return {
      alt,
      title,
      rawSource,
      sourceUrl,
      fieldPath,
    };
  };

  const normalizeTagToken = (value = '') =>
    `${value || ''}`
      .replace(/^#+/, '')
      .replace(/[\uFF0C\u3001]/g, ',')
      .replace(/\s+/g, ' ')
      .trim();

  const splitCompositeTags = (value = '') => {
    const normalized = `${value || ''}`.trim();
    if (!normalized) return [];

    if (/^#/.test(normalized) && normalized.match(/#/g)?.length >= 2) {
      return normalized
        .split('#')
        .map((item) => normalizeTagToken(item))
        .filter(Boolean);
    }

    if (/[\uFF0C,\u3001/|]/.test(normalized)) {
      return normalized
        .split(/[\uFF0C,\u3001/|]/)
        .map((item) => normalizeTagToken(item))
        .filter(Boolean);
    }

    return [normalizeTagToken(normalized)].filter(Boolean);
  };

  const editableDecorationSelector =
    '.a1right-admin-code-copy, .a1right-admin-code-lineno, .a1right-admin-code-toggle, .a1right-admin-code-wrap-toggle, .a1right-admin-code-meta, .a1right-admin-inline-image-preview';

  const stripEditableDecorationNodes = (root) => {
    root?.querySelectorAll?.(editableDecorationSelector)?.forEach((node) => node.remove());
    return root;
  };

  const extractDecoratedNodeText = (node) => {
    if (node?.nodeType === Node.TEXT_NODE) return `${node.textContent || ''}`;
    if (!(node instanceof HTMLElement)) return '';
    if (node.tagName === 'BR') return '\n';

    const text = [...node.childNodes].map((child) => extractDecoratedNodeText(child)).join('');
    const isBlockNode = /^(P|DIV|LI|PRE|BLOCKQUOTE|H1|H2|H3|H4|H5|H6)$/i.test(node.tagName);
    return isBlockNode ? `${text}\n` : text;
  };

  const extractEditableSourceText = (element) => {
    if (!(element instanceof HTMLElement)) return '';
    const clone = element.cloneNode(true);
    stripEditableDecorationNodes(clone);
    return extractDecoratedNodeText(clone).replace(/\u00a0/g, ' ').replace(/\n{3,}/g, '\n\n').trimEnd();
  };

  const stripMarkdownBlockPrefix = (value = '') =>
    `${value || ''}`.replace(/^\s*(?:#{1,6}\s+|>\s+)/, '').trimStart();

  const getMarkdownBlockPrefix = (kind) => {
    if (kind === 'h1') return '# ';
    if (kind === 'h2') return '## ';
    if (kind === 'blockquote') return '> ';
    return '';
  };

  const formatMarkdownBlockText = (value = '', kind = 'h1') => {
    const prefix = getMarkdownBlockPrefix(kind);
    if (!prefix) return `${value || ''}`;

    const normalized = `${value || ''}`.replace(/\r\n/g, '\n');
    const lines = normalized.split('\n');
    return lines
      .map((line, index) => {
        const cleaned = stripMarkdownBlockPrefix(line);
        if (!cleaned.trim()) return index === 0 ? prefix : '';
        return `${prefix}${cleaned}`;
      })
      .join('\n');
  };

  const dispatchEditableMutation = (editable, data = '') => {
    if (!(editable instanceof HTMLElement)) return;
    editable.dispatchEvent(new InputEvent('input', { bubbles: true, data, inputType: 'insertText' }));
    editable.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const getMarkedEngine = () => {
    if (window.marked?.parse) return window.marked;
    if (window.marked?.marked?.parse) return window.marked.marked;
    return null;
  };

  const sanitizeMarkdownSource = (source = '') =>
    `${source || ''}`
      .replace(/^\s*import\s.+$/gm, '')
      .replace(/^\s*export\s.+$/gm, '')
      .replace(/^\s*<{3}.+$/gm, '');

  const renderMarkdownSourceToHtml = (source = '') => {
    const markedEngine = getMarkedEngine();
    if (!markedEngine) return '';

    try {
      return markedEngine.parse(sanitizeMarkdownSource(source), {
        async: false,
        gfm: true,
        breaks: true,
      });
    } catch (error) {
      console.error('[a1right-admin] failed to render markdown preview', error);
      return '';
    }
  };

  const sanitizePreviewHtml = (html = '') => {
    if (window.DOMPurify?.sanitize) {
      return window.DOMPurify.sanitize(html, {
        USE_PROFILES: { html: true },
      });
    }

    return html;
  };

  const normalizeAssetUrl = (value = '') => {
    const trimmed = `${value || ''}`.trim();
    if (!trimmed) return '';
    if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
      return trimmed;
    }

    return trimmed.startsWith('/') ? trimmed : `/${trimmed.replace(/^\/+/, '')}`;
  };

  const isLocalFileValue = (value = '') => /^[a-z]:\\(?:fakepath\\)?/i.test(`${value || ''}`.trim());

  const normalizeFieldPath = (value = '') => {
    const trimmed = `${value || ''}`.trim();
    if (!trimmed || isLocalFileValue(trimmed)) return '';
    if (/^(blob:|data:)/i.test(trimmed)) return '';
    if (/^(https?:)?\/\//i.test(trimmed)) {
      try {
        const url = new URL(trimmed, window.location.origin);
        if (url.origin !== window.location.origin) return trimmed;
        return url.pathname.replace(/^\/+/, '');
      } catch {
        return trimmed;
      }
    }

    return trimmed.replace(/^\/+/, '');
  };

  const rememberObjectUrl = (source) => {
    if (!(source instanceof Blob)) return '';

    const url = URL.createObjectURL(source);
    previewState.objectUrls.add(url);
    return url;
  };

  const revokeObjectUrl = (url = '') => {
    if (!url || !previewState.objectUrls.has(url)) return;
    previewState.objectUrls.delete(url);
    URL.revokeObjectURL(url);
  };

  const buildPreviewDescription = (upload, contextKind = 'markdown') => {
    const size = upload?.size ? formatFileSize(upload.size) : '';
    const label = upload?.alt || cleanDisplayText(upload?.filename || '');

    if (contextKind === 'image') {
      return [label, size, '已同步到封面字段'].filter(Boolean).join(' · ');
    }

    return [label, size, '已插入正文当前位置'].filter(Boolean).join(' · ');
  };

  const showPreviewToast = ({
    title,
    description = '',
    imageUrl = '',
    badge = '',
    actionLabel = '',
    onClick = null,
    type = 'success',
    duration = 4200,
  } = {}) => {
    const toast = createToast(type);
    toast.classList.add('a1right-admin-toast--preview');

    const figure = document.createElement('div');
    figure.className = 'a1right-admin-toast__figure';

    if (imageUrl) {
      const image = document.createElement('img');
      image.className = 'a1right-admin-toast__image';
      image.src = imageUrl;
      image.alt = title || 'preview image';
      image.loading = 'eager';
      figure.append(image);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'a1right-admin-toast__placeholder';
      placeholder.textContent = 'IMG';
      figure.append(placeholder);
    }

    if (badge) {
      const badgeNode = document.createElement('span');
      badgeNode.className = 'a1right-admin-toast__badge';
      badgeNode.textContent = badge;
      figure.append(badgeNode);
    }

    const body = document.createElement('div');
    body.className = 'a1right-admin-toast__body';

    const heading = document.createElement('strong');
    heading.className = 'a1right-admin-toast__title';
    heading.textContent = title || '图片已处理';
    body.append(heading);

    if (description) {
      const detail = document.createElement('p');
      detail.className = 'a1right-admin-toast__description';
      detail.textContent = description;
      body.append(detail);
    }

    if (typeof onClick === 'function') {
      toast.classList.add('is-actionable');
      toast.tabIndex = 0;
      toast.setAttribute('role', 'button');

      const action = document.createElement('span');
      action.className = 'a1right-admin-toast__action';
      action.textContent = actionLabel || '点击定位';
      body.append(action);

      const activate = () => {
        try {
          onClick();
          toast.classList.add('is-activated');
        } catch (error) {
          console.error('[a1right-admin] preview toast action failed', error);
        }
      };

      toast.addEventListener('click', activate);
      toast.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        activate();
      });
    }

    toast.append(figure, body);
    return mountToast(toast, duration);
  };

  const ensureUploadOverlay = () => {
    let overlay = document.getElementById('a1right-admin-upload-overlay');
    if (overlay) return overlay;

    overlay = document.createElement('section');
    overlay.id = 'a1right-admin-upload-overlay';
    overlay.innerHTML = `
      <div class="a1right-admin-upload-overlay__label">图片上传中</div>
      <div class="a1right-admin-upload-overlay__meta">准备中…</div>
      <div class="a1right-admin-upload-overlay__step"></div>
      <div class="a1right-admin-upload-overlay__bar"><i></i></div>
    `;
    document.body.append(overlay);
    return overlay;
  };

  const updateUploadOverlay = ({
    label = '图片上传中',
    meta = '准备中…',
    step = '',
    progress = 12,
    visible = true,
  } = {}) => {
    const overlay = ensureUploadOverlay();
    overlay.querySelector('.a1right-admin-upload-overlay__label').textContent = label;
    overlay.querySelector('.a1right-admin-upload-overlay__meta').textContent = meta;
    overlay.querySelector('.a1right-admin-upload-overlay__step').textContent = step;
    overlay.querySelector('.a1right-admin-upload-overlay__bar i').style.width = `${clampNumber(progress)}%`;
    overlay.classList.toggle('is-visible', visible);
  };

  const finishUploadOverlay = (meta = '图片已处理完成', label = '上传完成') => {
    const overlay = ensureUploadOverlay();
    window.clearTimeout(uiState.uploadOverlayHideTimer);
    updateUploadOverlay({ label, meta, step: '', progress: 100, visible: true });
    uiState.uploadOverlayHideTimer = window.setTimeout(() => {
      overlay.classList.remove('is-visible');
    }, 1400);
  };

  const getStoredUser = () => {
    try {
      const raw = window.localStorage.getItem('decap-cms-user');
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error('[a1right-admin] failed to parse decap auth user', error);
      return null;
    }
  };

  const markLastContext = (kind, root) => {
    if (!(root instanceof Element)) return;
    editorState.lastContextKind = kind;
    editorState.lastContextRoot = root;
    editorState.lastInteractionAt = Date.now();
    if (kind === 'image') editorState.lastImageRoot = root;
    if (kind === 'markdown') editorState.lastMarkdownRoot = root;
  };

  const getControlContainerByLabel = (patterns, fallbackPatterns = []) => {
    const root = document.getElementById('nc-root');
    if (!(root instanceof Element)) return null;

    const labels = [...root.querySelectorAll('label, [class*="ControlLabel"]')];
    const isMatch = (text, regexList) => regexList.some((pattern) => pattern.test(text));

    for (const label of labels) {
      const text = (label.textContent || '').trim();
      if (!text) continue;
      if (!isMatch(text, patterns)) continue;
      if (fallbackPatterns.length && isMatch(text, fallbackPatterns)) continue;

      const container =
        label.closest('[class*="ControlContainer"]') ||
        label.parentElement?.closest('[class*="ControlContainer"]') ||
        label.parentElement;

      if (container instanceof Element) return container;
    }

    return null;
  };

  const getTitleFieldValue = () => {
    const container = getControlContainerByLabel([/文章标题/, /英文标题/, /(^|\s)title(\s|$)/i], [/seo/i]);
    const input = container?.querySelector('input, textarea');
    return cleanDisplayText(input?.value || '');
  };

  const buildAltText = ({ filename = '', kind = 'body' } = {}) => {
    const title = getTitleFieldValue();
    if (title) {
      const suffix = hasCjk(title)
        ? kind === 'cover'
          ? '封面图'
          : '配图'
        : kind === 'cover'
          ? 'cover image'
          : 'image';
      return `${title} ${suffix}`.trim().slice(0, 80);
    }

    const cleaned = cleanDisplayText(filename);
    if (cleaned && cleaned.length >= 2) {
      return cleaned.slice(0, 80);
    }

    return kind === 'cover' ? 'cover image' : 'image';
  };

  const setFieldValueInContainer = (container, value, { onlyIfEmpty = false } = {}) => {
    if (!(container instanceof Element)) return false;
    const input = container.querySelector('input:not([type="hidden"]), textarea');
    if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) return false;
    if (onlyIfEmpty && `${input.value || ''}`.trim()) return false;

    setNativeValue(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  };

  const maybeFillCoverAlt = (value) => {
    const container = getControlContainerByLabel([/封面描述/, /cover description/i]);
    return setFieldValueInContainer(container, value, { onlyIfEmpty: true });
  };

  const getFieldInputByLabel = (patterns, fallbackPatterns = []) => {
    const container = getControlContainerByLabel(patterns, fallbackPatterns);
    const input = container?.querySelector('input:not([type="hidden"]), textarea, select');
    return input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement
      ? input
      : null;
  };

  const getBodyFieldContainer = () =>
    getControlContainerByLabel([/正文/, /英文正文/, /(^|\s)body(\s|$)/i], [/seo/i]);

  const getBodyEditable = () => {
    const container = getBodyFieldContainer();
    const editable = container?.querySelector('[contenteditable="true"]');
    return editable instanceof HTMLElement ? editable : null;
  };

  const getBodyPlainText = () => {
    const codeMirror = getCodeMirrorInstance(getBodyFieldContainer());
    if (codeMirror) return codeMirror.getValue();

    const bodyInput = getFieldInputByLabel([/正文/, /英文正文/, /(^|\s)body(\s|$)/i], [/seo/i]);
    if (bodyInput instanceof HTMLTextAreaElement) return bodyInput.value || '';
    if (bodyInput instanceof HTMLInputElement) return bodyInput.value || '';

    const editable = getBodyEditable();
    return extractEditableSourceText(editable) || '';
  };

  const getCurrentEditorRouteKey = () => {
    const hash = `${window.location.hash || '#/'}`.replace(/\/+$/, '');
    // v2 deliberately ignores snapshots created while custom decorations were
    // written into Slate's DOM tree.
    return `a1right-admin:draft:v2:${hash || 'root'}`;
  };

  const getCurrentEditorIdentity = () => {
    const routeSlug = getFieldInputByLabel([/\u8def\u7531 Slug/, /route slug/i])?.value?.trim() || '';
    const title = getTitleFieldValue();
    return routeSlug || title || `${window.location.hash || '#/'}`;
  };

  const getEditorManagedInputs = () => ({
    title: getFieldInputByLabel([/\u6587\u7ae0\u6807\u9898/, /\u82f1\u6587\u6807\u9898/, /(^|\s)title(\s|$)/i], [/seo/i]),
    excerpt: getFieldInputByLabel([/\u6587\u7ae0\u6458\u8981/, /\u82f1\u6587\u6458\u8981/, /(^|\s)excerpt(\s|$)/i]),
    routeSlug: getFieldInputByLabel([/\u8def\u7531 Slug/, /route slug/i]),
    seoTitle: getFieldInputByLabel([/SEO \u6807\u9898/, /seo title/i]),
    seoDescription: getFieldInputByLabel([/SEO \u63cf\u8ff0/, /seo description/i]),
    categoryKey: getFieldInputByLabel([/\u5206\u7c7b Key/, /category key/i]),
    visibility: getFieldInputByLabel([/\u53ef\u89c1\u6027\u63a7\u5236/, /visibility/i]),
    publishMode: getFieldInputByLabel([/\u53d1\u5e03\u65b9\u5f0f/, /publish mode/i]),
    scheduledAt: getFieldInputByLabel([/\u5b9a\u65f6\u53d1\u5e03\u65f6\u95f4/, /scheduled publish time/i]),
    cover: getFieldInputByLabel([/\u5c01\u9762\u56fe/, /cover image/i], [/\u63cf\u8ff0/, /alt/i]),
    coverAlt: getFieldInputByLabel([/\u5c01\u9762\u63cf\u8ff0/, /cover description/i]),
    contentType: getFieldInputByLabel([/\u7248\u6743\u58f0\u660e/, /content copyright type/i]),
    sourceUrl: getFieldInputByLabel([/\u539f\u6587\u94fe\u63a5/, /source url/i]),
    allowRepost: getFieldInputByLabel([/\u8f6c\u8f7d\u534f\u8bae/, /repost policy/i]),
  });

  const getTagsFieldContainer = () =>
    getControlContainerByLabel([/\u82f1\u6587\u6807\u7b7e/, /^\u6807\u7b7e$/, /(^|\s)tags(\s|$)/i]);

  const getTagInputs = () => {
    const container = getTagsFieldContainer();
    if (!(container instanceof Element)) return [];
    return [...container.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea')]
      .filter((input) => input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)
      .filter((input) => !input.closest('.a1right-admin-field-assist'));
  };

  const getCurrentTagValues = () =>
    getTagInputs()
      .map((input) => normalizeTagToken(input.value || ''))
      .filter(Boolean);

  const waitForCondition = async (predicate, timeout = 720, interval = 40) => {
    const startedAt = Date.now();
    while (Date.now() - startedAt <= timeout) {
      const result = predicate();
      if (result) return result;
      await sleep(interval);
    }
    return null;
  };

  const findListActionButton = (container, matcher, excludedMatcher = null) => {
    if (!(container instanceof Element)) return null;
    return [...container.querySelectorAll('button')].find((button) => {
      const text = normalizeUiText(getElementUiText(button));
      if (!text) return false;
      if (excludedMatcher && excludedMatcher.test(text)) return false;
      return matcher.test(text);
    }) || null;
  };

  const findAddTagButton = () =>
    findListActionButton(getTagsFieldContainer(), /\u6dfb\u52a0|\u65b0\u589e|new|add|plus|\+/, /\u5220\u9664|\u79fb\u9664|remove|minus/);

  const ensureTagInputSlot = async () => {
    const currentInputs = getTagInputs();
    const emptyInput = currentInputs.find((input) => !`${input.value || ''}`.trim());
    if (emptyInput) return emptyInput;

    const addButton = findAddTagButton();
    if (!(addButton instanceof HTMLButtonElement)) return null;

    const beforeCount = currentInputs.length;
    addButton.click();
    return waitForCondition(() => {
      const inputs = getTagInputs();
      return inputs.length > beforeCount ? inputs.at(-1) : null;
    });
  };

  const setInputLikeValue = (input, value) => {
    if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) return false;
    setNativeValue(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  };

  const addTagValue = async (value) => {
    const normalized = normalizeTagToken(value);
    if (!normalized) return false;

    const values = getCurrentTagValues();
    if (values.some((item) => item.toLowerCase() === normalized.toLowerCase())) {
      showToast(`\u6807\u7b7e\u201c${normalized}\u201d\u5df2\u7ecf\u5b58\u5728\u3002`, 'info', 2200);
      return false;
    }

    if (values.length >= 5) {
      showToast('\u6807\u7b7e\u6700\u591a\u4fdd\u7559 5 \u4e2a\uff0c\u5148\u5220\u6389\u4e00\u4e2a\u518d\u6dfb\u52a0\u5427\u3002', 'warn', 2600);
      return false;
    }

    const slot = await ensureTagInputSlot();
    if (!(slot instanceof HTMLInputElement || slot instanceof HTMLTextAreaElement)) {
      showToast('\u6682\u65f6\u6ca1\u6709\u627e\u5230\u53ef\u5199\u5165\u7684\u6807\u7b7e\u8f93\u5165\u6846\u3002', 'warn', 2600);
      return false;
    }

    setInputLikeValue(slot, normalized);
    slot.focus();
    setDirtyState(true);
    scheduleAutoDraftSave();
    scheduleManagedFieldAssistRefresh();
    showToast(`\u6807\u7b7e\u201c${normalized}\u201d\u5df2\u52a0\u5165\u3002`, 'success', 2200);
    return true;
  };

  const normalizeCompositeTagField = async (input) => {
    if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) return false;
    const tokens = splitCompositeTags(input.value || '');
    if (tokens.length <= 1) return false;

    const [first, ...rest] = tokens.slice(0, 5);
    setInputLikeValue(input, first || '');
    for (const token of rest) {
      await addTagValue(token);
    }
    showToast('\u68c0\u6d4b\u5230\u7ec4\u5408\u6807\u7b7e\uff0c\u5df2\u81ea\u52a8\u62c6\u6210\u5355\u72ec\u6807\u7b7e\u9879\u3002', 'success', 2400);
    return true;
  };

  const applyTagListValues = async (values = []) => {
    const normalizedValues = [...new Set((values || []).map((item) => normalizeTagToken(item)).filter(Boolean))].slice(0, 5);
    let inputs = getTagInputs();
    const total = Math.max(inputs.length, normalizedValues.length, 1);

    for (let index = 0; index < total; index += 1) {
      if (!inputs[index]) {
        const slot = await ensureTagInputSlot();
        if (slot) inputs = getTagInputs();
      }

      const input = inputs[index];
      if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
        setInputLikeValue(input, normalizedValues[index] || '');
      }
    }

    return true;
  };

  const serializeEditorSnapshot = () => {
    const inputs = getEditorManagedInputs();
    const bodyEditable = getBodyEditable();
    // Slate already owns rich-text recovery. Persisting its HTML and assigning it
    // back later creates DOM nodes that Slate cannot resolve.
    const bodyText = bodyEditable instanceof HTMLElement ? '' : getBodyPlainText();

    return {
      id: getCurrentEditorIdentity(),
      route: `${window.location.hash || '#/'}`,
      savedAt: Date.now(),
      title: inputs.title?.value || '',
      excerpt: inputs.excerpt?.value || '',
      routeSlug: inputs.routeSlug?.value || '',
      seoTitle: inputs.seoTitle?.value || '',
      seoDescription: inputs.seoDescription?.value || '',
      categoryKey: inputs.categoryKey?.value || '',
      tags: getCurrentTagValues(),
      visibility: inputs.visibility?.value || '',
      publishMode: inputs.publishMode?.value || '',
      scheduledAt: inputs.scheduledAt?.value || '',
      cover: inputs.cover?.value || '',
      coverAlt: inputs.coverAlt?.value || '',
      contentType: inputs.contentType?.value || '',
      sourceUrl: inputs.sourceUrl?.value || '',
      allowRepost: inputs.allowRepost?.value || '',
      bodyText,
    };
  };

  const hasMeaningfulSnapshot = (snapshot) =>
    Boolean(
      snapshot &&
      [
        snapshot.title,
        snapshot.excerpt,
        snapshot.routeSlug,
        snapshot.seoTitle,
        snapshot.seoDescription,
        snapshot.categoryKey,
        snapshot.visibility,
        snapshot.publishMode,
        snapshot.scheduledAt,
        snapshot.cover,
        snapshot.coverAlt,
        snapshot.contentType,
        snapshot.sourceUrl,
        snapshot.allowRepost,
        snapshot.bodyText,
        ...(snapshot.tags || []),
      ].some((value) => `${value || ''}`.trim()),
    );

  const readStoredDraft = (key = getCurrentEditorRouteKey()) => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error('[a1right-admin] failed to read local draft', error);
      return null;
    }
  };

  const removeStoredDraft = (key = workflowState.activeDraftKey || getCurrentEditorRouteKey()) => {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error('[a1right-admin] failed to remove local draft', error);
    }
  };

  const writeStoredDraft = (snapshot, key = getCurrentEditorRouteKey()) => {
    try {
      window.localStorage.setItem(key, JSON.stringify(snapshot));
      workflowState.lastAutoSavedAt = Date.now();
      workflowState.activeDraftKey = key;
    } catch (error) {
      console.error('[a1right-admin] failed to persist local draft', error);
    }
  };

  const applySnapshotValue = (input, value) => {
    if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement)) return;
    setNativeValue(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const restoreEditorSnapshot = async (snapshot) => {
    if (!snapshot) return false;

    if (getBodyEditable() instanceof HTMLElement && `${snapshot.bodyText || ''}`.trim()) {
      const copied = await copyTextToClipboard(snapshot.bodyText);
      showToast(
        copied ? '富文本草稿已复制到剪贴板，请在正文中手动粘贴。' : '富文本草稿不能直接写回，避免破坏编辑器节点。',
        'warn',
        4200,
      );
      return false;
    }

    const inputs = getEditorManagedInputs();
    applySnapshotValue(inputs.title, snapshot.title || '');
    applySnapshotValue(inputs.excerpt, snapshot.excerpt || '');
    applySnapshotValue(inputs.routeSlug, snapshot.routeSlug || '');
    applySnapshotValue(inputs.seoTitle, snapshot.seoTitle || '');
    applySnapshotValue(inputs.seoDescription, snapshot.seoDescription || '');
    applySnapshotValue(inputs.categoryKey, snapshot.categoryKey || '');
    applySnapshotValue(inputs.visibility, snapshot.visibility || 'public');
    applySnapshotValue(inputs.publishMode, snapshot.publishMode || 'now');
    applySnapshotValue(inputs.scheduledAt, snapshot.scheduledAt || '');
    applySnapshotValue(inputs.cover, snapshot.cover || '');
    applySnapshotValue(inputs.coverAlt, snapshot.coverAlt || '');
    applySnapshotValue(inputs.contentType, snapshot.contentType || 'original');
    applySnapshotValue(inputs.sourceUrl, snapshot.sourceUrl || '');
    applySnapshotValue(inputs.allowRepost, snapshot.allowRepost || 'forbid');
    await applyTagListValues(snapshot.tags || []);

    const codeMirror = getCodeMirrorInstance(getBodyFieldContainer());
    if (codeMirror && typeof snapshot.bodyText === 'string') {
      codeMirror.setValue(snapshot.bodyText);
    } else {
      const bodyInput = getFieldInputByLabel([/\u6b63\u6587/, /\u82f1\u6587\u6b63\u6587/, /(^|\s)body(\s|$)/i], [/seo/i]);
      if (bodyInput instanceof HTMLTextAreaElement || bodyInput instanceof HTMLInputElement) {
        applySnapshotValue(bodyInput, snapshot.bodyText || '');
      }
    }

    workflowState.dirty = true;
    workflowState.restoreBannerDismissed = true;
    scheduleRichTextCodeRefresh();
    scheduleToolbarCodeRefresh();
    scheduleEditorWorkflowRefresh();
    scheduleMarkdownPreviewRefresh();
    scheduleManagedFieldAssistRefresh();
    scheduleOutlineRefresh();
    schedulePublishFieldRefresh();
    scheduleAutoDraftSave();
    showToast('\u672c\u5730\u8349\u7a3f\u5df2\u6062\u590d\u3002', 'success', 2400);
    return true;
  };

  const isSnapshotDifferentFromCurrent = (snapshot) => {
    if (!snapshot) return false;
    const current = serializeEditorSnapshot();
    const keys = [
      'title',
      'excerpt',
      'routeSlug',
      'seoTitle',
      'seoDescription',
      'categoryKey',
      'visibility',
      'publishMode',
      'scheduledAt',
      'cover',
      'coverAlt',
      'contentType',
      'sourceUrl',
      'allowRepost',
      'bodyText',
    ];
    const primitiveChanged = keys.some((key) => `${snapshot[key] || ''}` !== `${current[key] || ''}`);
    if (primitiveChanged) return true;
    return JSON.stringify(snapshot.tags || []) !== JSON.stringify(current.tags || []);
  };

  const ensureEditorWorkflowPanel = () => {
    const container = getBodyFieldContainer();
    if (!(container instanceof Element)) return null;

    let panel = container.querySelector('.a1right-admin-editor-panel');
    if (panel) return panel;

    panel = document.createElement('section');
    panel.className = 'a1right-admin-editor-panel';
    panel.innerHTML = `
      <div class="a1right-admin-editor-panel__stats"></div>
      <div class="a1right-admin-editor-panel__actions">
        <button type="button" class="a1right-admin-chip-button" data-action="insert-code">Code Block</button>
        <button type="button" class="a1right-admin-chip-button" data-action="insert-math-inline">\u03a3 \u884c\u5185\u516c\u5f0f</button>
        <button type="button" class="a1right-admin-chip-button" data-action="insert-math-block">\u03a3 \u516c\u5f0f\u5757</button>
        <button type="button" class="a1right-admin-chip-button" data-action="insert-video">\u89c6\u9891\u5d4c\u5165</button>
        <button type="button" class="a1right-admin-chip-button" data-action="cover-from-body">\u6b63\u6587\u9996\u56fe\u505a\u5c01\u9762</button>
        <button type="button" class="a1right-admin-chip-button" data-action="excerpt-120" data-tone="ghost">\u63d0\u53d6 120 \u5b57\u6458\u8981</button>
        <button type="button" class="a1right-admin-chip-button" data-action="format-h1" data-tone="ghost">\u683c\u5f0f 1</button>
        <button type="button" class="a1right-admin-chip-button" data-action="format-h2" data-tone="ghost">\u683c\u5f0f 2</button>
        <button type="button" class="a1right-admin-chip-button" data-action="format-quote" data-tone="ghost">\u5f15\u7528\u5757</button>
      </div>
      <div class="a1right-admin-editor-panel__status"></div>
      <div class="a1right-admin-editor-panel__restore" hidden></div>
      <div class="a1right-admin-editor-panel__uploads"></div>
    `;

    panel.innerHTML = '<div class="a1right-admin-editor-panel__restore" hidden></div>';

    panel.querySelectorAll('button').forEach((button) => {
      button.addEventListener('mousedown', (event) => event.preventDefault());
    });

    panel.querySelector('[data-action="insert-code"]')?.addEventListener('click', () => {
      void insertCodeTemplateSnippet();
    });
    panel.querySelector('[data-action="insert-math-inline"]')?.addEventListener('click', () => {
      void insertMathTemplateSnippet(false);
    });
    panel.querySelector('[data-action="insert-math-block"]')?.addEventListener('click', () => {
      void insertMathTemplateSnippet(true);
    });
    panel.querySelector('[data-action="insert-video"]')?.addEventListener('click', () => {
      void insertVideoEmbedSnippet();
    });
    panel.querySelector('[data-action="cover-from-body"]')?.addEventListener('click', () => {
      void applyCoverFromBodyFirstImage();
    });
    panel.querySelector('[data-action="excerpt-120"]')?.addEventListener('click', () => {
      applyExcerptFromBody(120);
    });
    panel.querySelector('[data-action="format-h1"]')?.addEventListener('click', () => {
      void applyBodyBlockFormat('h1');
    });
    panel.querySelector('[data-action="format-h2"]')?.addEventListener('click', () => {
      void applyBodyBlockFormat('h2');
    });
    panel.querySelector('[data-action="format-quote"]')?.addEventListener('click', () => {
      void applyBodyBlockFormat('blockquote');
    });

    container.append(panel);
    return panel;
  };

  const renderRecentUploadsRail = () => {
    const panel = ensureEditorWorkflowPanel();
    const rail = panel?.querySelector('.a1right-admin-editor-panel__uploads');
    if (!(rail instanceof HTMLElement)) return;

    rail.innerHTML = '';
    const items = uiState.recentUploads.slice(0, 6);
    rail.hidden = items.length === 0;
    if (!items.length) return;

    items.forEach((item) => {
      const card = document.createElement('article');
      card.className = 'a1right-admin-upload-card';
      card.innerHTML = `
        <img src="${item.previewUrl || item.publicPath}" alt="${item.alt || 'image'}" />
        <div class="a1right-admin-upload-card__body">
          <strong>${item.filename}</strong>
          <code>${item.fieldPath}</code>
          <div class="a1right-admin-upload-card__actions">
            <button type="button" data-action="copy-path">复制路径</button>
            <button type="button" data-action="copy-md">复制 Markdown</button>
          </div>
        </div>
      `;

      card.querySelector('[data-action="copy-path"]')?.addEventListener('click', async () => {
        const copied = await copyTextToClipboard(item.fieldPath);
        showToast(copied ? '图片路径已复制。' : '复制失败，请重试。', copied ? 'success' : 'warn', 2200);
      });

      card.querySelector('[data-action="copy-md"]')?.addEventListener('click', async () => {
        const snippet = `![${item.alt || 'image'}](${item.publicPath})`;
        const copied = await copyTextToClipboard(snippet);
        showToast(copied ? 'Markdown 已复制。' : '复制失败，请重试。', copied ? 'success' : 'warn', 2200);
      });

      rail.append(card);
    });
  };

  const pushRecentUploads = (uploads) => {
    uploads.forEach(cacheInlineImagePreview);
    const bodyEditable = getBodyEditable();
    if (bodyEditable instanceof HTMLElement) {
      decorateRichTextInlineImages(bodyEditable);
      window.setTimeout(() => decorateRichTextInlineImages(bodyEditable), 80);
    }
    uiState.recentUploads = [...uploads, ...uiState.recentUploads]
      .filter((item) => item?.fieldPath)
      .slice(0, 8);
    renderRecentUploadsRail();
    scheduleRichTextCodeRefresh();
  };

  const renderEditorWorkflowPanel = () => {
    const panel = ensureEditorWorkflowPanel();
    if (!(panel instanceof HTMLElement)) return;

    const statsNode = panel.querySelector('.a1right-admin-editor-panel__stats');
    const statusNode = panel.querySelector('.a1right-admin-editor-panel__status');
    const restoreNode = panel.querySelector('.a1right-admin-editor-panel__restore');
    const stats = countBodyStats(getBodyPlainText());
    const snapshot = readStoredDraft();

    if (statsNode instanceof HTMLElement) {
      statsNode.innerHTML = `
        <span class="a1right-admin-stat-card"><small>字数</small><strong>${stats.words}</strong></span>
        <span class="a1right-admin-stat-card"><small>行数</small><strong>${stats.lines}</strong></span>
        <span class="a1right-admin-stat-card"><small>阅读</small><strong>${stats.readingMinutes} 分钟</strong></span>
      `;
    }

    if (statusNode instanceof HTMLElement) {
      const dirty = workflowState.dirty ? '未保存修改' : '编辑状态稳定';
      const savedText = workflowState.lastAutoSavedAt
        ? `本地草稿 ${formatRelativeTime(workflowState.lastAutoSavedAt)}`
        : '尚未写入本地草稿';
      const lastSynced = workflowState.lastSavedAt ? `最近同步 ${formatDateTime(workflowState.lastSavedAt)}` : '等待首次同步';
      statusNode.innerHTML = `
        <span class="a1right-admin-status-pill ${workflowState.dirty ? 'is-dirty' : 'is-clean'}">${dirty}</span>
        <span class="a1right-admin-status-text">${savedText}</span>
        <span class="a1right-admin-status-text">${lastSynced}</span>
      `;
    }

    if (restoreNode instanceof HTMLElement) {
      const shouldShowRestore =
        !workflowState.restoreBannerDismissed &&
        hasMeaningfulSnapshot(snapshot) &&
        isSnapshotDifferentFromCurrent(snapshot);

      restoreNode.hidden = !shouldShowRestore;
      if (shouldShowRestore) {
        restoreNode.innerHTML = `
          <span>发现 ${formatClockTime(snapshot.savedAt)} 保存的本地草稿。</span>
          <div>
            <button type="button" data-action="restore">恢复草稿</button>
            <button type="button" data-action="discard">忽略</button>
          </div>
        `;

        restoreNode.querySelector('[data-action="restore"]')?.addEventListener('click', () => {
          restoreEditorSnapshot(snapshot);
        });
        restoreNode.querySelector('[data-action="discard"]')?.addEventListener('click', () => {
          workflowState.restoreBannerDismissed = true;
          renderEditorWorkflowPanel();
        });
      }
    }

    renderRecentUploadsRail();
  };

  const formatPreviewCodeLanguage = (value = '') => {
    const key = `${value || ''}`.trim().toLowerCase();
    if (!key) return 'TEXT';

    const aliases = {
      js: 'JavaScript',
      jsx: 'JSX',
      ts: 'TypeScript',
      tsx: 'TSX',
      py: 'Python',
      sh: 'Shell',
      bash: 'Bash',
      zsh: 'Zsh',
      yml: 'YAML',
      md: 'Markdown',
      plaintext: 'Text',
      txt: 'Text',
    };

    return aliases[key] || key.replace(/^[a-z]/, (char) => char.toUpperCase());
  };

  const normalizePreviewLink = (value = '') => {
    const trimmed = `${value || ''}`.trim();
    if (!trimmed) return '';
    if (/^(https?:|mailto:|tel:|#)/i.test(trimmed)) return trimmed;
    return normalizeAssetUrl(trimmed);
  };

  const cacheInlineImagePreview = (upload) => {
    const previewUrl = `${upload?.previewUrl || ''}`.trim();
    if (!previewUrl) return;

    [upload?.publicPath, upload?.fieldPath]
      .map((value) => normalizeFieldPath(value || ''))
      .filter(Boolean)
      .forEach((path) => previewState.inlineImageSources.set(path, previewUrl));
  };

  const resolveInlineImageSource = (rawSource = '') => {
    const fieldPath = normalizeFieldPath(rawSource);
    return previewState.inlineImageSources.get(fieldPath) || normalizePreviewLink(rawSource);
  };

  const ensureMarkdownPreviewPanel = () => {
    const container = getBodyFieldContainer();
    if (!(container instanceof Element)) return null;

    container.querySelector('.a1right-admin-markdown-preview')?.remove();
    return null;
  };

  const decorateMarkdownPreviewBody = (root) => {
    if (!(root instanceof HTMLElement)) return;

    root.querySelectorAll('img').forEach((image) => {
      const source = image.getAttribute('src') || image.currentSrc || '';
      const normalized = normalizePreviewLink(source);
      if (normalized) image.setAttribute('src', normalized);
      image.setAttribute('loading', 'lazy');
      image.setAttribute('decoding', 'async');
      if (!image.getAttribute('alt')) image.setAttribute('alt', 'article image');
    });

    root.querySelectorAll('a[href]').forEach((link) => {
      const href = normalizePreviewLink(link.getAttribute('href') || '');
      if (href) link.setAttribute('href', href);
      if (/^https?:\/\//i.test(href)) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noreferrer');
      }
    });

    root.querySelectorAll('pre').forEach((pre) => {
      const code = pre.querySelector('code');
      const className = code?.className || '';
      const matched = className.match(/language-([a-z0-9_+-]+)/i);
      pre.dataset.lang = formatPreviewCodeLanguage(matched?.[1] || 'text');
    });
  };

  const renderMarkdownPreview = () => {
    const panel = ensureMarkdownPreviewPanel();
    if (!(panel instanceof HTMLElement)) return;

    const inputs = getEditorManagedInputs();
    const bodyText = getBodyPlainText();
    const stats = countBodyStats(bodyText);
    const title = `${inputs.title?.value || ''}`.trim() || '未命名文章';
    const excerpt = `${inputs.excerpt?.value || ''}`.trim();
    const cover = normalizeAssetUrl(inputs.cover?.value || '');
    const coverAlt = `${inputs.coverAlt?.value || ''}`.trim() || `${title} 封面图`;
    const engineReady = Boolean(getMarkedEngine());
    const signature = JSON.stringify({
      engineReady,
      title,
      excerpt,
      cover,
      coverAlt,
      bodyText,
    });

    if (signature === markdownPreviewState.lastSignature) return;
    markdownPreviewState.lastSignature = signature;

    const metaNode = panel.querySelector('[data-preview-meta]');
    const titleNode = panel.querySelector('[data-preview-title]');
    const excerptNode = panel.querySelector('[data-preview-excerpt]');
    const bodyNode = panel.querySelector('[data-preview-body]');
    const coverNode = panel.querySelector('[data-preview-cover]');
    const coverImage = panel.querySelector('[data-preview-cover-image]');

    if (metaNode instanceof HTMLElement) {
      metaNode.textContent = `${stats.words} 字 · ${stats.lines} 行 · 约 ${stats.readingMinutes} 分钟 · 自动刷新`;
    }

    if (titleNode instanceof HTMLElement) {
      titleNode.textContent = title;
    }

    if (excerptNode instanceof HTMLElement) {
      excerptNode.textContent = excerpt;
      excerptNode.hidden = !excerpt;
    }

    if (coverNode instanceof HTMLElement && coverImage instanceof HTMLImageElement) {
      if (cover) {
        coverNode.hidden = false;
        coverImage.src = cover;
        coverImage.alt = coverAlt;
      } else {
        coverNode.hidden = true;
        coverImage.removeAttribute('src');
      }
    }

    if (!(bodyNode instanceof HTMLElement)) return;

    if (!engineReady) {
      bodyNode.innerHTML = `
        <div class="a1right-admin-markdown-preview__placeholder">
          Markdown 预览引擎加载中，稍等几秒后会自动显示实时预览。
        </div>
      `;
      return;
    }

    const renderedHtml = renderMarkdownSourceToHtml(bodyText);
    if (!renderedHtml.trim()) {
      bodyNode.innerHTML = `
        <div class="a1right-admin-markdown-preview__placeholder">
          正文还没有可预览的内容。继续输入 Markdown / MDX 后，这里会立即显示图片、标题层级和代码块样式。
        </div>
      `;
      return;
    }

    bodyNode.innerHTML = sanitizePreviewHtml(renderedHtml);
    decorateMarkdownPreviewBody(bodyNode);
  };

  const scheduleMarkdownPreviewRefresh = () => {
    if (markdownPreviewState.refreshRaf) return;
    markdownPreviewState.refreshRaf = window.requestAnimationFrame(() => {
      markdownPreviewState.refreshRaf = 0;
      renderMarkdownPreview();
    });
  };

  const scheduleEditorWorkflowRefresh = () => {
    if (workflowState.statsRefreshRaf) return;
    workflowState.statsRefreshRaf = window.requestAnimationFrame(() => {
      workflowState.statsRefreshRaf = 0;
      renderEditorWorkflowPanel();
    });
  };

  const setDirtyState = (dirty = true) => {
    workflowState.dirty = dirty;
    scheduleEditorWorkflowRefresh();
    scheduleManagedFieldAssistRefresh();
  };

  const announceDraftAutoSaved = (savedAt) => {
    if (!savedAt) return;
    const now = Date.now();
    if (now - workflowState.lastDraftToastAt < 12_000) return;
    workflowState.lastDraftToastAt = now;
    showToast(`本地草稿已自动保存 · ${formatClockTime(savedAt)}`, 'success', 1800);
  };

  const scheduleAutoDraftSave = () => {
    window.clearTimeout(workflowState.autoSaveTimer);
    workflowState.autoSaveTimer = window.setTimeout(() => {
      const snapshot = serializeEditorSnapshot();
      if (!hasMeaningfulSnapshot(snapshot)) return;
      writeStoredDraft(snapshot, getCurrentEditorRouteKey());
      scheduleEditorWorkflowRefresh();
      announceDraftAutoSaved(snapshot.savedAt);
    }, 2600);
  };

  const markCleanAfterSync = () => {
    workflowState.dirty = false;
    workflowState.lastSavedAt = Date.now();
    workflowState.lastAutoSavedAt = workflowState.lastSavedAt;
    removeStoredDraft();
    scheduleEditorWorkflowRefresh();
    scheduleManagedFieldAssistRefresh();
  };

  const syncAutoField = (input, nextValue) => {
    if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) || !nextValue) return false;
    const current = `${input.value || ''}`.trim();
    const lastAuto = input.dataset.a1rightLastAuto || '';
    const autoManaged = !current || current === lastAuto || input.dataset.a1rightAutoManaged !== 'manual';
    if (!autoManaged) return false;

    if (current === nextValue) {
      input.dataset.a1rightLastAuto = nextValue;
      return false;
    }

    input.dataset.a1rightAutoManaged = 'auto';
    input.dataset.a1rightLastAuto = nextValue;
    applySnapshotValue(input, nextValue);
    return true;
  };

  const syncDerivedMetadata = () => {
    const inputs = getEditorManagedInputs();
    const title = `${inputs.title?.value || ''}`.trim();
    const excerpt = `${inputs.excerpt?.value || ''}`.trim();
    if (title) {
      syncAutoField(inputs.routeSlug, slugifyText(title));
      syncAutoField(inputs.seoTitle, title.slice(0, 80));
    }
    if (excerpt) {
      syncAutoField(inputs.seoDescription, excerpt.slice(0, 160));
    }
    scheduleManagedFieldAssistRefresh();
  };

  const noteManualOverride = (input) => {
    if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) return;
    const current = `${input.value || ''}`.trim();
    const lastAuto = input.dataset.a1rightLastAuto || '';
    input.dataset.a1rightAutoManaged = !current || current === lastAuto ? 'auto' : 'manual';
  };

  const getManagedFieldAssistConfig = (role) => {
    if (role === 'routeSlug') {
      return {
        autoText: '\u8ddf\u968f\u6807\u9898\u81ea\u52a8\u751f\u6210\u77ed\u94fe\u63a5',
        manualText: '\u5df2\u624b\u52a8\u9501\u5b9a Slug',
        restoreText: '\u6062\u590d\u81ea\u52a8',
        restoredToast: '\u8def\u7531 Slug \u5df2\u6062\u590d\u81ea\u52a8\u751f\u6210\u3002',
      };
    }

    if (role === 'seoTitle') {
      return {
        autoText: '\u9ed8\u8ba4\u8ddf\u968f\u6587\u7ae0\u6807\u9898',
        manualText: '\u5df2\u624b\u52a8\u8bbe\u7f6e SEO \u6807\u9898',
        restoreText: '\u6062\u590d\u8ddf\u968f\u6807\u9898',
        restoredToast: 'SEO \u6807\u9898\u5df2\u6062\u590d\u8ddf\u968f\u6587\u7ae0\u6807\u9898\u3002',
      };
    }

    if (role === 'seoDescription') {
      return {
        autoText: '\u9ed8\u8ba4\u8ddf\u968f\u6587\u7ae0\u6458\u8981',
        manualText: '\u5df2\u624b\u52a8\u8bbe\u7f6e SEO \u63cf\u8ff0',
        restoreText: '\u6062\u590d\u8ddf\u968f\u6458\u8981',
        restoredToast: 'SEO \u63cf\u8ff0\u5df2\u6062\u590d\u8ddf\u968f\u6587\u7ae0\u6458\u8981\u3002',
      };
    }

    return null;
  };

  const ensureManagedFieldAssist = (container) => {
    if (!(container instanceof Element)) return null;
    let assist = container.querySelector('.a1right-admin-field-assist');
    if (assist) return assist;

    assist = document.createElement('div');
    assist.className = 'a1right-admin-field-assist';
    assist.innerHTML = `
      <span class="a1right-admin-field-assist__status"></span>
      <div class="a1right-admin-field-assist__actions"></div>
    `;
    container.append(assist);
    return assist;
  };

  const renderAutoManagedFieldAssist = (role, inputs) => {
    const input = inputs[role];
    const config = getManagedFieldAssistConfig(role);
    const container = input?.closest('[class*="ControlContainer"]');
    if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) || !config || !(container instanceof Element)) {
      return;
    }

    const assist = ensureManagedFieldAssist(container);
    if (!(assist instanceof HTMLElement)) return;

    assist.dataset.assistMode = 'auto';
    const statusNode = assist.querySelector('.a1right-admin-field-assist__status');
    const actionsNode = assist.querySelector('.a1right-admin-field-assist__actions');
    const current = `${input.value || ''}`.trim();
    const lastAuto = input.dataset.a1rightLastAuto || '';
    const autoManaged = !current || current === lastAuto || input.dataset.a1rightAutoManaged !== 'manual';

    assist.classList.toggle('is-auto', autoManaged);
    assist.classList.toggle('is-manual', !autoManaged);

    if (statusNode instanceof HTMLElement) {
      statusNode.textContent = autoManaged ? config.autoText : config.manualText;
    }

    if (actionsNode instanceof HTMLElement) {
      actionsNode.innerHTML = '';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'a1right-admin-field-assist__button';
      button.textContent = autoManaged ? '\u81ea\u52a8\u8054\u52a8\u4e2d' : config.restoreText;
      button.disabled = autoManaged;
      button.addEventListener('click', () => {
        input.dataset.a1rightAutoManaged = 'auto';
        syncDerivedMetadata();
        scheduleManagedFieldAssistRefresh();
        setDirtyState(true);
        scheduleAutoDraftSave();
        showToast(config.restoredToast, 'success', 2200);
      });
      actionsNode.append(button);
    }
  };

  const applyExcerptFromBody = (maxLength = 120) => {
    const inputs = getEditorManagedInputs();
    const excerptInput = inputs.excerpt;
    if (!(excerptInput instanceof HTMLTextAreaElement || excerptInput instanceof HTMLInputElement)) return false;

    const nextExcerpt = buildExcerptFromBody(maxLength);
    if (!nextExcerpt) {
      showToast('\u6b63\u6587\u8fd8\u6ca1\u6709\u8db3\u591f\u5185\u5bb9\uff0c\u5148\u5199\u4e00\u70b9\u518d\u63d0\u53d6\u6458\u8981\u3002', 'warn', 2400);
      return false;
    }

    setInputLikeValue(excerptInput, nextExcerpt);
    syncDerivedMetadata();
    setDirtyState(true);
    scheduleAutoDraftSave();
    scheduleEditorWorkflowRefresh();
    scheduleManagedFieldAssistRefresh();
    showToast(`\u5df2\u4ece\u6b63\u6587\u63d0\u53d6 ${Math.min(256, maxLength)} \u5b57\u6458\u8981\u3002`, 'success', 2200);
    return true;
  };

  const renderExcerptFieldAssist = (inputs) => {
    const input = inputs.excerpt;
    const container = input?.closest('[class*="ControlContainer"]');
    if (!(input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) || !(container instanceof Element)) return;

    const assist = ensureManagedFieldAssist(container);
    if (!(assist instanceof HTMLElement)) return;

    assist.dataset.assistMode = 'excerpt';
    assist.classList.remove('is-auto', 'is-manual');
    const statusNode = assist.querySelector('.a1right-admin-field-assist__status');
    const actionsNode = assist.querySelector('.a1right-admin-field-assist__actions');
    const current = `${input.value || ''}`.trim();
    const currentLength = current.length;
    const statusText = currentLength > 256
      ? `\u6458\u8981\u5efa\u8bae\u63a7\u5236\u5728 256 \u5b57\u4ee5\u5185\uff0c\u5f53\u524d ${currentLength} \u5b57\u3002`
      : `\u6458\u8981\u4f1a\u7528\u4e8e\u9996\u9875\u5361\u7247\u3001\u641c\u7d22\u7ed3\u679c\u548c SEO \u63cf\u8ff0\uff0c\u5f53\u524d ${currentLength}/256 \u5b57\u3002`;

    if (statusNode instanceof HTMLElement) {
      statusNode.textContent = statusText;
    }

    if (actionsNode instanceof HTMLElement) {
      actionsNode.innerHTML = '';
      const lengths = [120, 180, 256];
      lengths.forEach((length) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'a1right-admin-field-assist__button';
        button.textContent = `\u63d0\u53d6 ${length} \u5b57`;
        button.addEventListener('click', () => {
          applyExcerptFromBody(length);
        });
        actionsNode.append(button);
      });
    }
  };

  const buildSuggestedTags = (inputs) => {
    const locale = getCurrentEditorLocale();
    const categoryKey = `${inputs.categoryKey?.value || ''}`.trim();
    const categoryTags = TAG_SUGGESTIONS.category[categoryKey]?.[locale] || [];
    const globalTags = TAG_SUGGESTIONS.global[locale] || [];
    return [...new Set([...categoryTags, ...globalTags])].slice(0, 10);
  };

  const renderTagsFieldAssist = (inputs) => {
    const container = getTagsFieldContainer();
    if (!(container instanceof Element)) return;

    const assist = ensureManagedFieldAssist(container);
    if (!(assist instanceof HTMLElement)) return;

    assist.dataset.assistMode = 'tags';
    assist.classList.remove('is-auto', 'is-manual');
    const statusNode = assist.querySelector('.a1right-admin-field-assist__status');
    const actionsNode = assist.querySelector('.a1right-admin-field-assist__actions');
    const values = getCurrentTagValues();
    const suggestions = buildSuggestedTags(inputs);

    if (statusNode instanceof HTMLElement) {
      statusNode.textContent = `\u5df2\u9009 ${values.length}/5 \u4e2a\u6807\u7b7e\u3002\u5efa\u8bae\u4fdd\u7559 2~5 \u4e2a\u5173\u952e\u8bcd\uff0c\u6bcf\u4e2a\u6807\u7b7e\u5355\u72ec\u4e00\u9879\u3002`;
    }

    if (actionsNode instanceof HTMLElement) {
      actionsNode.innerHTML = '';
      const rail = document.createElement('div');
      rail.className = 'a1right-admin-chip-rail';

      suggestions.forEach((tag) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'a1right-admin-field-assist__button is-chip';
        button.textContent = `# ${tag}`;
        button.disabled = values.some((item) => item.toLowerCase() === tag.toLowerCase());
        button.addEventListener('click', () => {
          void addTagValue(tag);
        });
        rail.append(button);
      });

      actionsNode.append(rail);
    }
  };

  const getCoverFieldRoot = () =>
    document.querySelector('[aria-label="image field"]') ||
    (editorState.lastImageRoot instanceof Element ? editorState.lastImageRoot : null);

  const applyCoverFromBodyFirstImage = async (root = null) => {
    const targetRoot = (root instanceof Element && root.isConnected ? root : null) || getCoverFieldRoot();
    if (!(targetRoot instanceof Element)) {
      showToast('\u6682\u65f6\u8fd8\u6ca1\u627e\u5230\u5c01\u9762\u56fe\u8f93\u5165\u533a\u57df\u3002', 'warn', 2400);
      return false;
    }

    const firstImage = extractFirstBodyImage();
    if (!firstImage) {
      showToast('\u6b63\u6587\u91cc\u8fd8\u6ca1\u6709\u56fe\u7247\uff0c\u5148\u63d2\u5165\u4e00\u5f20\u56fe\u518d\u63d0\u53d6\u5c01\u9762\u3002', 'warn', 2600);
      return false;
    }

    const nextValue = firstImage.fieldPath || firstImage.rawSource || '';
    if (!nextValue) {
      showToast('\u6b63\u6587\u9996\u56fe\u8def\u5f84\u6682\u65f6\u65e0\u6cd5\u8bc6\u522b\uff0c\u8bf7\u6362\u4e00\u5f20\u56fe\u7247\u518d\u8bd5\u3002', 'warn', 2600);
      return false;
    }

    const applied = await applyImageFieldValue(targetRoot, nextValue);
    if (!applied) {
      showToast('\u5c01\u9762\u56fe\u5b57\u6bb5\u6682\u65f6\u65e0\u6cd5\u81ea\u52a8\u56de\u586b\u3002', 'warn', 2600);
      return false;
    }

    const coverAlt = firstImage.alt || buildAltText({ filename: nextValue, kind: 'cover' });
    maybeFillCoverAlt(coverAlt);
    setImageFieldPreviewState(targetRoot, {
      fieldPath: nextValue,
      filename: nextValue.split('/').pop() || nextValue,
      previewUrl: firstImage.sourceUrl || normalizeAssetUrl(nextValue),
      alt: coverAlt,
      description: '\u5df2\u4ece\u6b63\u6587\u7b2c\u4e00\u5f20\u56fe\u63d0\u53d6\u4e3a\u5c01\u9762\uff0c\u53ef\u7ee7\u7eed\u66ff\u6362\u6216\u88c1\u5207\u3002',
    });

    setDirtyState(true);
    scheduleAutoDraftSave();
    scheduleEditorWorkflowRefresh();
    scheduleManagedFieldAssistRefresh();
    showToast('\u5df2\u628a\u6b63\u6587\u7b2c\u4e00\u5f20\u56fe\u540c\u6b65\u4e3a\u5c01\u9762\u3002', 'success', 2400);
    return true;
  };

  const setControlVisibility = (container, visible) => {
    if (!(container instanceof Element)) return;
    container.classList.toggle('a1right-admin-control-hidden', !visible);
    container.setAttribute('aria-hidden', visible ? 'false' : 'true');
  };

  const refreshPublishFieldVisibility = () => {
    const inputs = getEditorManagedInputs();
    const scheduledContainer = inputs.scheduledAt?.closest('[class*="ControlContainer"]');
    const sourceUrlContainer = inputs.sourceUrl?.closest('[class*="ControlContainer"]');
    const allowRepostContainer = inputs.allowRepost?.closest('[class*="ControlContainer"]');

    const publishMode = `${inputs.publishMode?.value || 'now'}`;
    const contentType = `${inputs.contentType?.value || 'original'}`;

    setControlVisibility(scheduledContainer, publishMode === 'scheduled');
    setControlVisibility(sourceUrlContainer, contentType !== 'original');
    setControlVisibility(allowRepostContainer, contentType === 'original');
  };

  const schedulePublishFieldRefresh = () => {
    if (workflowState.publishFieldRefreshRaf) return;
    workflowState.publishFieldRefreshRaf = window.requestAnimationFrame(() => {
      workflowState.publishFieldRefreshRaf = 0;
      refreshPublishFieldVisibility();
    });
  };

  const ensureEditorOutlinePanel = () => {
    const container = getBodyFieldContainer();
    if (!(container instanceof Element)) return null;

    container.classList.add('a1right-admin-body-control');
    let outline = container.querySelector('.a1right-admin-editor-outline');
    if (outline) return outline;

    outline = document.createElement('aside');
    outline.className = 'a1right-admin-editor-outline';
    outline.innerHTML = `
      <div class="a1right-admin-editor-outline__chrome">
        <span class="a1right-admin-editor-outline__eyebrow">\u76ee\u5f55</span>
        <strong class="a1right-admin-editor-outline__title">\u5b9e\u65f6\u5927\u7eb2</strong>
        <p class="a1right-admin-editor-outline__hint">\u6839\u636e\u6b63\u6587\u91cc\u7684 H1 / H2 / H3 \u81ea\u52a8\u751f\u6210\uff0c\u9002\u5408\u957f\u6587\u5feb\u901f\u8df3\u8f6c\u3002</p>
      </div>
      <div class="a1right-admin-editor-outline__list"></div>
    `;
    container.append(outline);
    return outline;
  };

  const locateHeadingInBody = (headingIndex) => {
    const headings = getBodyHeadingItems();
    const target = headings[headingIndex];
    if (!target) return;

    const bodyRoot = getBodyFieldContainer();
    const codeMirror = getCodeMirrorInstance(bodyRoot);
    if (codeMirror) {
      const position = { line: target.lineNumber, ch: 0 };
      codeMirror.focus();
      codeMirror.getDoc().setCursor(position);
      codeMirror.scrollIntoView(position, 120);
      pulseField(resolveMarkdownRoot(bodyRoot), 'a1right-admin-field-guided');
      return;
    }

    const editable = getBodyEditable();
    if (editable instanceof HTMLElement) {
      const richTextHeadings = [...editable.querySelectorAll('h1, h2, h3')];
      const markdownBlocks = [...editable.children].filter((node) => parseHeadingLine(extractEditableSourceText(node), 0));
      const block = target.kind === 'rich-text' ? richTextHeadings[target.lineNumber] : markdownBlocks[headingIndex];
      if (block instanceof HTMLElement) {
        editable.focus();
        block.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const selection = window.getSelection();
        if (selection) {
          const range = document.createRange();
          range.selectNodeContents(block);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        pulseField(resolveMarkdownRoot(editable), 'a1right-admin-field-guided');
      }
      return;
    }

    const textarea = bodyRoot?.querySelector('textarea');
    if (textarea instanceof HTMLTextAreaElement) {
      const lines = textarea.value.replace(/\r\n/g, '\n').split('\n');
      const offset = lines.slice(0, target.lineNumber).join('\n').length + (target.lineNumber > 0 ? 1 : 0);
      textarea.focus();
      textarea.setSelectionRange(offset, offset + lines[target.lineNumber].length);
      scrollTextareaSelectionIntoView(textarea, offset);
      pulseField(resolveMarkdownRoot(bodyRoot), 'a1right-admin-field-guided');
    }
  };

  const renderEditorOutline = () => {
    const outline = ensureEditorOutlinePanel();
    if (!(outline instanceof HTMLElement)) return;

    const list = outline.querySelector('.a1right-admin-editor-outline__list');
    if (!(list instanceof HTMLElement)) return;

    const headings = getBodyHeadingItems();
    if (!headings.length) {
      list.innerHTML = '<div class="a1right-admin-editor-outline__empty">\u5148\u5199\u51e0\u4e2a # / ## / ### \u6807\u9898\uff0c\u8fd9\u91cc\u5c31\u4f1a\u81ea\u52a8\u751f\u6210\u76ee\u5f55\u3002</div>';
      return;
    }

    list.innerHTML = '';
    headings.forEach((heading, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `a1right-admin-editor-outline__item is-depth-${heading.level}`;
      button.innerHTML = `
        <span class="a1right-admin-editor-outline__dot"></span>
        <span class="a1right-admin-editor-outline__text">${heading.text}</span>
      `;
      button.addEventListener('click', () => locateHeadingInBody(index));
      list.append(button);
    });
  };

  const scheduleOutlineRefresh = () => {
    if (workflowState.outlineRefreshRaf) return;
    workflowState.outlineRefreshRaf = window.requestAnimationFrame(() => {
      workflowState.outlineRefreshRaf = 0;
      renderEditorOutline();
    });
  };

  const renderManagedFieldAssist = () => {
    const inputs = getEditorManagedInputs();
    ['routeSlug', 'seoTitle', 'seoDescription'].forEach((role) => renderAutoManagedFieldAssist(role, inputs));
    renderExcerptFieldAssist(inputs);
    renderTagsFieldAssist(inputs);
    schedulePublishFieldRefresh();
  };

  const scheduleManagedFieldAssistRefresh = () => {
    if (workflowState.assistRefreshRaf) return;
    workflowState.assistRefreshRaf = window.requestAnimationFrame(() => {
      workflowState.assistRefreshRaf = 0;
      renderManagedFieldAssist();
    });
  };

  const getManagedFieldRole = (target) => {
    if (!(target instanceof Element)) return '';
    const container = target.closest('[class*="ControlContainer"]');
    const label = cleanDisplayText(container?.querySelector('label, [class*="ControlLabel"]')?.textContent || '').toLowerCase();
    if (!label) return '';
    if ((/title/.test(label) || /\u6807\u9898/.test(label)) && !/seo/.test(label)) return 'title';
    if (/excerpt/.test(label) || /\u6458\u8981/.test(label)) return 'excerpt';
    if (/slug/.test(label)) return 'routeSlug';
    if ((/seo/.test(label) && /\u6807\u9898/.test(label)) || /seo title/.test(label)) return 'seoTitle';
    if ((/seo/.test(label) && /\u63cf\u8ff0/.test(label)) || /seo description/.test(label)) return 'seoDescription';
    if (/\u5206\u7c7b key/.test(label) || /category key/.test(label)) return 'categoryKey';
    if (/\u6807\u7b7e/.test(label) || /(^|\s)tags(\s|$)/.test(label)) return 'tags';
    if (/\u53ef\u89c1\u6027/.test(label) || /visibility/.test(label)) return 'visibility';
    if (/\u53d1\u5e03\u65b9\u5f0f/.test(label) || /publish mode/.test(label)) return 'publishMode';
    if (/\u5b9a\u65f6\u53d1\u5e03/.test(label) || /scheduled publish/.test(label)) return 'scheduledAt';
    if (/\u5c01\u9762\u56fe/.test(label) || /cover image/.test(label)) return 'cover';
    if (/\u5c01\u9762\u63cf\u8ff0/.test(label) || /cover description/.test(label)) return 'coverAlt';
    if (/\u7248\u6743\u58f0\u660e/.test(label) || /content copyright type/.test(label)) return 'contentType';
    if (/\u539f\u6587\u94fe\u63a5/.test(label) || /source url/.test(label)) return 'sourceUrl';
    if (/\u8f6c\u8f7d\u534f\u8bae/.test(label) || /repost policy/.test(label)) return 'allowRepost';
    if ((/\u6b63\u6587/.test(label) || /body/.test(label)) && !/seo/.test(label)) return 'body';
    return '';
  };

  const handleManagedFieldInput = (target) => {
    const role = getManagedFieldRole(target);
    if (!role) return;

    if (['routeSlug', 'seoTitle', 'seoDescription'].includes(role)) {
      noteManualOverride(target);
    }

    if (['title', 'excerpt'].includes(role)) {
      syncDerivedMetadata();
    }

    if (role === 'tags') {
      void normalizeCompositeTagField(target);
    }

    setDirtyState(true);
    scheduleAutoDraftSave();
    scheduleEditorWorkflowRefresh();
    scheduleMarkdownPreviewRefresh();
    scheduleManagedFieldAssistRefresh();
    scheduleOutlineRefresh();
    schedulePublishFieldRefresh();
  };

  const handlePossibleSaveAction = (target) => {
    const button = target instanceof Element ? target.closest('button, a') : null;
    if (!(button instanceof HTMLElement)) return;
    const text = `${button.textContent || ''}`.trim();
    if (!/publish|save|发布|保存|同步/i.test(text)) return;

    showToast('正在同步到仓库，请稍等…', 'info', 1800);
    window.setTimeout(() => {
      markCleanAfterSync();
    }, 2600);
  };

  const getMarkdownRootFromElement = (element) => {
    if (!(element instanceof Element)) return null;

    return (
      element.closest('[aria-label="markdown field"]') ||
      element.closest('.CodeMirror') ||
      element.closest('[class*="MarkdownControl"]') ||
      null
    );
  };

  const getImageRootFromElement = (element) => {
    if (!(element instanceof Element)) return null;
    return element.closest('[aria-label="image field"]') || null;
  };

  const syncMarkdownEditorState = (target) => {
    const root = getMarkdownRootFromElement(target);
    if (!root) return;

    editorState.lastMarkdownRoot = root;
    markLastContext('markdown', root);

    const textarea =
      (target instanceof HTMLTextAreaElement && root.contains(target) ? target : null) ||
      root.querySelector('textarea');

    if (textarea instanceof HTMLTextAreaElement) {
      editorState.lastMarkdownTextarea = textarea;
      editorState.lastSelectionStart = textarea.selectionStart ?? textarea.value.length;
      editorState.lastSelectionEnd = textarea.selectionEnd ?? editorState.lastSelectionStart;
    }

    const editable =
      (target instanceof HTMLElement && target.isContentEditable ? target : null) ||
      root.querySelector('[contenteditable="true"]');

    if (editable instanceof HTMLElement) {
      editorState.lastMarkdownEditable = editable;
      editorState.lastRichTextSelection = captureRichTextSelection(editable);
    }
  };

  const isNodeWithinEditable = (node, editable) => {
    if (!(editable instanceof HTMLElement) || !node) return false;
    const element = node instanceof Element ? node : node.parentElement;
    return element instanceof Element && editable.contains(element);
  };

  const captureRichTextSelection = (editable) => {
    if (!(editable instanceof HTMLElement)) return null;
    const selection = window.getSelection();
    if (!selection?.rangeCount) return null;

    const range = selection.getRangeAt(0);
    if (!isNodeWithinEditable(range.startContainer, editable) || !isNodeWithinEditable(range.endContainer, editable)) {
      return null;
    }

    return range.cloneRange();
  };

  const restoreRichTextSelection = (editable, bookmark) => {
    if (!(editable instanceof HTMLElement) || !(bookmark instanceof Range)) return false;
    if (!bookmark.startContainer.isConnected || !bookmark.endContainer.isConnected) return false;
    if (!isNodeWithinEditable(bookmark.startContainer, editable) || !isNodeWithinEditable(bookmark.endContainer, editable)) {
      return false;
    }

    const selection = window.getSelection();
    if (!selection) return false;
    selection.removeAllRanges();
    selection.addRange(bookmark);
    return true;
  };

  const syncImageEditorState = (target) => {
    const root = getImageRootFromElement(target);
    if (!root) return;
    editorState.lastImageRoot = root;
    markLastContext('image', root);
  };

  const getClipboardContext = () => {
    const active = document.activeElement;
    if (active instanceof Element) {
      const imageField = getImageRootFromElement(active);
      if (imageField) {
        markLastContext('image', imageField);
        return { kind: 'image', root: imageField };
      }
    }

    const markdownField =
      (active instanceof Element ? getMarkdownRootFromElement(active) : null) ||
      editorState.lastMarkdownRoot;

    if (markdownField) {
      if (active instanceof Element) syncMarkdownEditorState(active);
      const editable =
        (active instanceof HTMLElement && active.isContentEditable ? active : null) ||
        markdownField.querySelector('[contenteditable="true"]');
      return {
        kind: 'markdown',
        root: markdownField,
        richTextSelection: captureRichTextSelection(editable),
      };
    }

    if (
      editorState.lastContextRoot instanceof Element &&
      editorState.lastContextRoot.isConnected &&
      Date.now() - editorState.lastInteractionAt < 30_000
    ) {
      return {
        kind: editorState.lastContextKind,
        root: editorState.lastContextRoot,
      };
    }

    if (editorState.lastImageRoot instanceof Element && editorState.lastImageRoot.isConnected) {
      return { kind: 'image', root: editorState.lastImageRoot };
    }

    return null;
  };

  const sanitizeBaseName = (value = 'pasted-image') =>
    `${value}`
      .replace(/\.[a-z0-9]+$/i, '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\u4e00-\u9fff]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 42) || 'pasted-image';

  const inferExtension = (mime = '', fallbackName = '') => {
    const normalizedMime = `${mime}`.toLowerCase();
    if (normalizedMime.includes('png')) return 'png';
    if (normalizedMime.includes('jpeg') || normalizedMime.includes('jpg')) return 'jpg';
    if (normalizedMime.includes('webp')) return 'webp';
    if (normalizedMime.includes('gif')) return 'gif';
    if (normalizedMime.includes('svg')) return 'svg';
    if (normalizedMime.includes('bmp')) return 'bmp';

    const matched = `${fallbackName}`.toLowerCase().match(/\.([a-z0-9]{2,5})(?:$|\?)/);
    return matched?.[1] || 'png';
  };

  const buildFilename = (name = 'pasted-image', mime = '') => {
    const now = new Date();
    const timestamp = [
      now.getFullYear(),
      `${now.getMonth() + 1}`.padStart(2, '0'),
      `${now.getDate()}`.padStart(2, '0'),
      '-',
      `${now.getHours()}`.padStart(2, '0'),
      `${now.getMinutes()}`.padStart(2, '0'),
      `${now.getSeconds()}`.padStart(2, '0'),
    ].join('');
    const random = Math.random().toString(36).slice(2, 8);
    const base = sanitizeBaseName(name);
    const ext = inferExtension(mime, name);
    return `${base}-${timestamp}-${random}.${ext}`;
  };

  const arrayBufferToBase64 = (buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;

    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }

    return window.btoa(binary);
  };

  const setNativeValue = (element, value) => {
    const prototype = Object.getPrototypeOf(element);
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');

    if (descriptor?.set) {
      descriptor.set.call(element, value);
    } else {
      element.value = value;
    }
  };

  const getCoverAltFieldValue = () => {
    const container = getControlContainerByLabel([/封面描述/, /cover description/i]);
    const input = container?.querySelector('input, textarea');
    return cleanDisplayText(input?.value || '');
  };

  const getImageFieldValue = (root) => {
    if (!(root instanceof Element)) return '';

    const directInput = root.querySelector('input:not([type="file"]), textarea');
    if (directInput instanceof HTMLInputElement || directInput instanceof HTMLTextAreaElement) {
      const value = normalizeFieldPath(directInput.value || '');
      if (value) return value;
    }

    const fallback = [...root.querySelectorAll('input, textarea')]
      .map((input) => normalizeFieldPath(input.value || ''))
      .find(Boolean);

    return fallback || '';
  };

  const getImageFieldDomPreview = (root) => {
    if (!(root instanceof Element)) return null;

    const image = [...root.querySelectorAll('img')]
      .find((item) => !item.closest('.a1right-admin-cover-preview') && item.getAttribute('src'));

    if (image instanceof HTMLImageElement) {
      return {
        previewUrl: image.currentSrc || image.src || '',
        alt: cleanDisplayText(image.alt || ''),
      };
    }

    const link = [...root.querySelectorAll('a[href]')]
      .find((item) => !item.closest('.a1right-admin-cover-preview') && /\.(png|jpe?g|gif|webp|svg|bmp)(?:$|\?)/i.test(item.getAttribute('href') || ''));

    if (link instanceof HTMLAnchorElement) {
      return {
        previewUrl: link.href,
        fieldPath: normalizeFieldPath(link.getAttribute('href') || ''),
      };
    }

    return null;
  };

  const getStoredImageFieldPreview = (root) => {
    if (!(root instanceof Element)) return null;

    const currentFieldValue = getImageFieldValue(root);
    const stored = previewState.imageFieldState.get(root) || null;
    if (!stored) return null;

    if (stored.fieldPath && currentFieldValue && stored.fieldPath !== currentFieldValue) {
      revokeObjectUrl(stored.previewUrl);
      previewState.imageFieldState.delete(root);
      return null;
    }

    return stored;
  };

  const formatImageDimensions = (width, height) =>
    width && height ? `${Math.round(width)} × ${Math.round(height)}` : '';

  const formatAspectRatio = (width, height) => {
    if (!width || !height) return '';
    const gcd = (a, b) => (b ? gcd(b, a % b) : a);
    const divisor = gcd(Math.round(width), Math.round(height)) || 1;
    return `${Math.round(width / divisor)}:${Math.round(height / divisor)}`;
  };

  const readImageDimensions = (source) =>
    new Promise((resolve) => {
      if (!source) {
        resolve(null);
        return;
      }

      const image = new Image();
      image.onload = () => {
        resolve({
          width: image.naturalWidth || image.width || 0,
          height: image.naturalHeight || image.height || 0,
        });
      };
      image.onerror = () => resolve(null);
      image.src = source;
    });

  const ensureImageFieldMeta = async (root, preview = null) => {
    const resolvedRoot = resolveImageFieldRoot(root);
    if (!(resolvedRoot instanceof Element)) return;

    const current = preview || getStoredImageFieldPreview(resolvedRoot) || {};
    const metaSource = current.previewUrl || normalizeAssetUrl(current.fieldPath);
    if (!metaSource) return;
    if (current.metaSource === metaSource || current.metaLoadingSource === metaSource) return;

    previewState.imageFieldState.set(resolvedRoot, {
      ...(getStoredImageFieldPreview(resolvedRoot) || {}),
      ...current,
      metaLoadingSource: metaSource,
    });

    const dimensions = await readImageDimensions(metaSource);
    const latest = getStoredImageFieldPreview(resolvedRoot) || {};
    if (latest.metaLoadingSource !== metaSource) return;

    setImageFieldPreviewState(resolvedRoot, {
      width: dimensions?.width || 0,
      height: dimensions?.height || 0,
      aspectRatio: dimensions ? formatAspectRatio(dimensions.width, dimensions.height) : '',
      metaSource,
      metaLoadingSource: '',
    });
  };

  const pulseField = (root, className = 'a1right-admin-field-guided') => {
    if (!(root instanceof Element)) return;
    root.classList.remove(className);
    void root.offsetWidth;
    root.classList.add(className);
    window.setTimeout(() => root.classList.remove(className), 1600);
  };

  const setActiveDropTarget = (root = null) => {
    const previous = uiState.activeDropTarget;
    if (previous instanceof Element && previous !== root) {
      previous.classList.remove('a1right-admin-drop-target', 'is-drop-active');
    }

    if (root instanceof Element) {
      root.classList.add('a1right-admin-drop-target', 'is-drop-active');
      uiState.activeDropTarget = root;
      window.clearTimeout(uiState.dropTargetClearTimer);
      uiState.dropTargetClearTimer = window.setTimeout(() => {
        setActiveDropTarget(null);
      }, 160);
      return;
    }

    uiState.activeDropTarget = null;
    window.clearTimeout(uiState.dropTargetClearTimer);
  };

  const resolveImageFieldRoot = (root) =>
    (root instanceof Element && root.isConnected ? root : null) ||
    (editorState.lastImageRoot instanceof Element && editorState.lastImageRoot.isConnected
      ? editorState.lastImageRoot
      : null);

  const findImageFieldTextInput = (root) => {
    if (!(root instanceof Element)) return null;
    return root.querySelector('input:not([type="hidden"]):not([type="file"]), textarea');
  };

  const revealImageFieldTextInput = async (root) => {
    const resolvedRoot = resolveImageFieldRoot(root);
    if (!(resolvedRoot instanceof Element)) return null;

    let input = findImageFieldTextInput(resolvedRoot);
    if (input) return input;

    const switchButton = [...resolvedRoot.querySelectorAll('button')].find((button) =>
      /url|替代|链接|link/i.test(button.textContent || ''),
    );

    switchButton?.click();
    await sleep(80);
    input = findImageFieldTextInput(resolvedRoot);
    return input;
  };

  const focusImageFieldForReplacement = async (root) => {
    const resolvedRoot = resolveImageFieldRoot(root);
    if (!(resolvedRoot instanceof Element)) return false;

    markLastContext('image', resolvedRoot);
    resolvedRoot.scrollIntoView({ behavior: 'smooth', block: 'center' });
    pulseField(resolvedRoot);

    const input = await revealImageFieldTextInput(resolvedRoot);
    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
      input.focus();
      input.select?.();
      return true;
    }

    const fallbackButton = resolvedRoot.querySelector('button');
    if (fallbackButton instanceof HTMLButtonElement) {
      fallbackButton.focus();
      return true;
    }

    resolvedRoot.focus?.();
    return true;
  };

  const clearImageFieldPreviewState = (root) => {
    const resolvedRoot = resolveImageFieldRoot(root);
    if (!(resolvedRoot instanceof Element)) return;

    const previous = previewState.imageFieldState.get(resolvedRoot);
    if (previous?.previewUrl) revokeObjectUrl(previous.previewUrl);
    previewState.imageFieldState.delete(resolvedRoot);
    renderImageFieldPreview(resolvedRoot, {});
  };

  const clearImageFieldValue = async (root) => {
    const resolvedRoot = resolveImageFieldRoot(root);
    if (!(resolvedRoot instanceof Element)) return false;

    const previousValue = getImageFieldValue(resolvedRoot);
    if (!previousValue) {
      clearImageFieldPreviewState(resolvedRoot);
      return false;
    }

    const applied = await applyImageFieldValue(resolvedRoot, '');
    if (!applied) {
      const removeButton = [...resolvedRoot.querySelectorAll('button')].find((button) =>
        /remove|clear|delete|移除|删除|清空/i.test(button.textContent || ''),
      );
      removeButton?.click();
      await sleep(120);
    } else {
      await sleep(80);
    }

    const currentValue = getImageFieldValue(resolvedRoot);
    if (currentValue) {
      renderImageFieldPreview(resolvedRoot);
      return false;
    }

    clearImageFieldPreviewState(resolvedRoot);
    pulseField(resolvedRoot);
    return true;
  };

  const previewSelectedImageFile = (input) => {
    if (!(input instanceof HTMLInputElement) || input.type !== 'file') return false;
    const root = getImageRootFromElement(input);
    if (!(root instanceof Element)) return false;

    const file = input.files?.[0];
    if (!(file instanceof File)) return false;

    const fieldPath = getImageFieldValue(root);
    const previewUrl = rememberObjectUrl(file);
    const coverAlt = buildAltText({ filename: file.name, kind: 'cover' });

    setImageFieldPreviewState(root, {
      fieldPath,
      filename: file.name,
      previewUrl,
      alt: coverAlt,
      size: file.size,
      description: '封面图已选择，正在同步上传结果与最终路径。',
    });

    maybeFillCoverAlt(coverAlt);
    pulseField(root);
    return true;
  };

  const ensureImageFieldPreviewCard = (root) => {
    if (!(root instanceof Element)) return null;

    let card = root.querySelector('.a1right-admin-cover-preview');
    if (card) return card;

    card = document.createElement('section');
    card.className = 'a1right-admin-cover-preview is-empty';

    const media = document.createElement('div');
    media.className = 'a1right-admin-cover-preview__media';

    const image = document.createElement('img');
    image.className = 'a1right-admin-cover-preview__image';
    image.alt = 'cover preview';
    image.loading = 'lazy';

    const placeholder = document.createElement('div');
    placeholder.className = 'a1right-admin-cover-preview__placeholder';
    placeholder.textContent = 'PASTE COVER';

    const badge = document.createElement('span');
    badge.className = 'a1right-admin-cover-preview__badge';
    badge.textContent = '封面预览';

    media.append(image, placeholder, badge);

    const body = document.createElement('div');
    body.className = 'a1right-admin-cover-preview__body';

    const eyebrow = document.createElement('span');
    eyebrow.className = 'a1right-admin-cover-preview__eyebrow';
    eyebrow.textContent = 'Cover Preview';

    const title = document.createElement('strong');
    title.className = 'a1right-admin-cover-preview__title';
    title.textContent = '等待封面图';

    const description = document.createElement('p');
    description.className = 'a1right-admin-cover-preview__description';
    description.textContent = '先点一下封面图区，再 Ctrl + V，这里会立即显示缩略预览。';

    const insights = document.createElement('div');
    insights.className = 'a1right-admin-cover-preview__insights';

    const meta = document.createElement('div');
    meta.className = 'a1right-admin-cover-preview__meta';

    const path = document.createElement('code');
    path.className = 'a1right-admin-cover-preview__path';
    path.textContent = '尚未设置图片路径';

    const open = document.createElement('a');
    open.className = 'a1right-admin-cover-preview__open';
    open.href = '#';
    open.target = '_blank';
    open.rel = 'noreferrer';
    open.textContent = '打开图片';
    open.hidden = true;

    const actions = document.createElement('div');
    actions.className = 'a1right-admin-cover-preview__actions';

    const replaceButton = document.createElement('button');
    replaceButton.type = 'button';
    replaceButton.className = 'a1right-admin-cover-preview__action is-primary';
    replaceButton.textContent = '替换图片';
    replaceButton.addEventListener('click', async () => {
      const focused = await focusImageFieldForReplacement(root);
      if (!focused) {
        showToast('暂时没有找到封面图输入框。', 'warn', 3200);
        return;
      }

      showToast('已定位封面图，直接 Ctrl + V 就能替换。', 'info', 2800);
    });

    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.className = 'a1right-admin-cover-preview__action is-secondary';
    clearButton.textContent = '清空图片';
    clearButton.addEventListener('click', async () => {
      const cleared = await clearImageFieldValue(root);
      showToast(cleared ? '封面图已清空。' : '当前没有可清空的封面图。', cleared ? 'success' : 'info', 2800);
    });

    const copyPathButton = document.createElement('button');
    copyPathButton.type = 'button';
    copyPathButton.className = 'a1right-admin-cover-preview__action is-ghost';
    copyPathButton.textContent = '复制路径';
    copyPathButton.addEventListener('click', async () => {
      const fieldPath = getImageFieldValue(root);
      const copied = fieldPath ? await copyTextToClipboard(fieldPath) : false;
      showToast(copied ? '封面图路径已复制。' : '当前没有可复制的封面图路径。', copied ? 'success' : 'info', 2400);
    });

    actions.append(replaceButton, fromBodyButton, copyPathButton, clearButton);
    meta.append(path, open);
    body.append(eyebrow, title, description, insights, meta, actions);
    card.append(media, body);
    root.append(card);
    return card;
  };

  const renderImageFieldPreview = (root, override = null) => {
    if (!(root instanceof Element)) return;

    const card = ensureImageFieldPreviewCard(root);
    if (!(card instanceof Element)) return;

    const state = override || getStoredImageFieldPreview(root) || {};
    const domPreview = getImageFieldDomPreview(root) || {};
    const fieldPath = state.fieldPath || getImageFieldValue(root) || domPreview.fieldPath || '';
    const previewUrl = state.previewUrl || domPreview.previewUrl || normalizeAssetUrl(fieldPath);
    const alt = state.alt || domPreview.alt || getCoverAltFieldValue() || buildAltText({ filename: fieldPath, kind: 'cover' });

    const image = card.querySelector('.a1right-admin-cover-preview__image');
    const title = card.querySelector('.a1right-admin-cover-preview__title');
    const description = card.querySelector('.a1right-admin-cover-preview__description');
    const insights = card.querySelector('.a1right-admin-cover-preview__insights');
    const path = card.querySelector('.a1right-admin-cover-preview__path');
    const open = card.querySelector('.a1right-admin-cover-preview__open');
    const clearButton = card.querySelector('.a1right-admin-cover-preview__action.is-secondary');
    const copyPathButton = card.querySelector('.a1right-admin-cover-preview__action.is-ghost');

    const hasImage = Boolean(previewUrl);
    card.classList.toggle('is-empty', !hasImage);

    if (image instanceof HTMLImageElement) {
      if (hasImage) {
        image.src = previewUrl;
        image.alt = alt || 'cover preview';
      } else {
        image.removeAttribute('src');
        image.alt = 'cover preview';
      }
    }

    if (title instanceof HTMLElement) {
      title.textContent = hasImage
        ? cleanDisplayText(state.filename || fieldPath || 'cover image') || '当前封面图'
        : '等待封面图';
    }

    if (description instanceof HTMLElement) {
      const syncedDescription =
        state.description && fieldPath && /同步|上传/.test(state.description)
          ? '封面图已同步完成，现在会自动显示预览效果。'
          : state.description;

      description.textContent = hasImage
        ? syncedDescription || '已自动同步当前封面字段，可以直接检查构图和裁切效果。'
        : '选择封面图片后，这里会自动出现预览效果，也支持直接 Ctrl + V 粘贴。';
    }

    if (insights instanceof HTMLElement) {
      const pills = [];
      const dimensionsLabel = formatImageDimensions(state.width, state.height);
      if (dimensionsLabel) pills.push(dimensionsLabel);
      if (state.aspectRatio) pills.push(state.aspectRatio);
      if (state.size) pills.push(formatFileSize(state.size));
      pills.push(hasImage ? '已可检查裁切效果' : '支持粘贴 / 拖拽');
      insights.innerHTML = pills
        .map((item) => `<span class="a1right-admin-cover-preview__pill">${item}</span>`)
        .join('');
    }

    if (path instanceof HTMLElement) {
      path.textContent = fieldPath || '尚未设置图片路径';
    }

    if (open instanceof HTMLAnchorElement) {
      const href = normalizeAssetUrl(fieldPath) || previewUrl;
      open.hidden = !href;
      open.href = href || '#';
    }

    if (clearButton instanceof HTMLButtonElement) {
      clearButton.disabled = !hasImage;
    }
    if (copyPathButton instanceof HTMLButtonElement) {
      copyPathButton.disabled = !fieldPath;
    }

    if (hasImage) {
      void ensureImageFieldMeta(root, {
        ...state,
        fieldPath,
        previewUrl,
      });
    }
  };

  const setImageFieldPreviewState = (root, nextState = {}) => {
    const resolvedRoot =
      (root instanceof Element && root.isConnected ? root : null) ||
      (editorState.lastImageRoot instanceof Element && editorState.lastImageRoot.isConnected
        ? editorState.lastImageRoot
        : null);

    if (!(resolvedRoot instanceof Element)) return;

    const previous = previewState.imageFieldState.get(resolvedRoot);
    if (previous?.previewUrl && previous.previewUrl !== nextState.previewUrl) {
      revokeObjectUrl(previous.previewUrl);
    }

    const nextPreviewSource = nextState.previewUrl || normalizeAssetUrl(nextState.fieldPath || '');
    const previousPreviewSource = previous?.previewUrl || normalizeAssetUrl(previous?.fieldPath || '');
    const previewChanged = nextPreviewSource && nextPreviewSource !== previousPreviewSource;

    previewState.imageFieldState.set(resolvedRoot, {
      ...previous,
      ...(previewChanged
        ? {
            width: 0,
            height: 0,
            aspectRatio: '',
            metaSource: '',
            metaLoadingSource: '',
          }
        : {}),
      ...nextState,
    });

    renderImageFieldPreview(resolvedRoot, previewState.imageFieldState.get(resolvedRoot));
  };

  const refreshAllImageFieldPreviews = () => {
    document.querySelectorAll('[aria-label="image field"]').forEach((root) => {
      renderImageFieldPreview(root);
    });
  };

  const scheduleImageFieldPreviewRefresh = (() => {
    let rafId = 0;

    return () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        refreshAllImageFieldPreviews();
      });
    };
  })();

  const readCodeLineText = (element) => {
    if (!(element instanceof HTMLElement)) return '';
    if (element.matches('pre')) return extractEditableSourceText(element);

    const codeChild = element.firstElementChild;
    if (codeChild instanceof HTMLElement && codeChild.tagName === 'CODE' && element.childElementCount === 1) {
      return `${codeChild.textContent || ''}`;
    }

    return extractEditableSourceText(element);
  };

  const isRichTextCodeLine = (element) => {
    if (!(element instanceof HTMLElement)) return false;
    if (element.matches('pre')) return true;
    if (element.childElementCount !== 1) return false;

    const first = element.firstElementChild;
    if (!(first instanceof HTMLElement) || first.tagName !== 'CODE') return false;

    const hasOtherMeaningfulNodes = [...element.childNodes].some((node) => {
      if (node === first) return false;
      if (node.nodeType === Node.TEXT_NODE) return `${node.textContent || ''}`.trim().length > 0;
      if (node.nodeType === Node.ELEMENT_NODE) return true;
      return false;
    });

    return !hasOtherMeaningfulNodes;
  };

  const inferCodeLanguage = (lines) => {
    const joined = lines.join('\n').trim();
    const lower = joined.toLowerCase();
    const firstLine = `${lines[0] || ''}`.trim().toLowerCase();

    if (/python/.test(firstLine) || /\bdef\b|\bimport\s+\w+|\belif\b|print\(|__name__/.test(lower)) return 'Python';
    if (/bash|sh/.test(firstLine) || /^\$ /.test(joined) || /\b(curl|grep|chmod|sudo|apt|export)\b/.test(lower)) return 'Bash';
    if (/\b(console\.log|function|const |let |=>|import .* from )\b/.test(lower)) return 'JavaScript';
    if (/\binterface |type |enum |implements |readonly /.test(lower)) return 'TypeScript';
    if (/<[a-z][\s\S]*?>/i.test(joined) || /<\/[a-z]+>/i.test(joined)) return 'HTML';
    if (/\bselect\b[\s\S]*\bfrom\b|\binsert into\b|\bupdate\b.+\bset\b|\bdelete from\b/.test(lower)) return 'SQL';
    if (/^#include\b|std::|cout\s*<</m.test(joined)) return 'C++';
    if (/\bpackage main\b|\bfmt\./.test(lower)) return 'Go';
    if (/\bpublic class\b|\bsystem\.out\.println\b|\bstring\[\]\s+args\b/.test(lower)) return 'Java';
    if (/^#!/.test(firstLine)) return firstLine.includes('python') ? 'Python' : 'Shell';
    return 'Code';
  };

  const getCodeLanguageKey = (language = '') => {
    const normalized = `${language || ''}`.trim().toLowerCase();
    if (normalized === 'c++') return 'cpp';
    return normalized.replace(/[^a-z0-9]+/g, '-');
  };

  const copyTextToClipboard = async (value = '') => {
    const text = `${value || ''}`;
    if (!text) return false;

    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', 'true');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      textarea.style.pointerEvents = 'none';
      document.body.append(textarea);
      textarea.select();
      textarea.setSelectionRange(0, text.length);

      let copied = false;
      try {
        copied = document.execCommand('copy');
      } catch {
        copied = false;
      }

      textarea.remove();
      return copied;
    }
  };

  const createCodeCopyButton = (codeText) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'a1right-admin-code-copy';
    button.textContent = '复制代码';
    button.setAttribute('contenteditable', 'false');
    button.setAttribute('tabindex', '-1');

    button.addEventListener('mousedown', (event) => {
      event.preventDefault();
    });

    button.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const copied = await copyTextToClipboard(codeText);
      if (copied) {
        button.textContent = '已复制';
        showToast('代码已复制到剪贴板。', 'success', 2200);
        window.setTimeout(() => {
          if (button.isConnected) button.textContent = '复制代码';
        }, 1400);
        return;
      }

      showToast('复制失败，请再试一次。', 'warn', 2600);
    });

    return button;
  };

  const createCodeActionButton = (label, className, onClick) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    button.setAttribute('contenteditable', 'false');
    button.setAttribute('tabindex', '-1');
    button.addEventListener('mousedown', (event) => event.preventDefault());
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick?.(button);
    });
    return button;
  };

  const createCodeMetaBadge = (label) => {
    const badge = document.createElement('span');
    badge.className = 'a1right-admin-code-meta';
    badge.textContent = label;
    badge.setAttribute('contenteditable', 'false');
    return badge;
  };

  const applyCodeGroupState = (group, { expanded = true, wrap = true } = {}) => {
    group.forEach((item, index) => {
      item.dataset.codeExpanded = expanded ? 'true' : 'false';
      item.dataset.codeWrap = wrap ? 'true' : 'false';
      item.classList.toggle('is-code-collapsed', !expanded && index >= 8);
      item.classList.toggle('is-code-nowrap', !wrap);
    });
  };

  const parseMarkdownImageLine = (value = '') => {
    const matched = `${value || ''}`.trim().match(/^!\[(.*?)\]\((.+?)\)$/);
    if (!matched) return null;

    const alt = matched[1].trim();
    const rawPayload = matched[2].trim();
    const titled = rawPayload.match(/^(\S+)\s+(?:"([^"]*)"|'([^']*)')$/);
    const rawSource = titled?.[1] || rawPayload;
    const title = titled?.[2] || titled?.[3] || '';
    const source = resolveInlineImageSource(rawSource);
    if (!source) return null;

    return {
      alt: alt || 'image',
      source,
      rawSource,
      title,
    };
  };

  const normalizeInlineImageWidth = (value) => {
    const number = Number.parseFloat(`${value || ''}`);
    return Number.isFinite(number) ? Math.max(32, Math.min(100, Math.round(number))) : 100;
  };

  const applyInlineImageWidth = (block, value) => {
    if (!(block instanceof HTMLElement)) return;
    const width = normalizeInlineImageWidth(value);
    block.dataset.inlineImageWidth = `${width}`;
    block.style.setProperty('--inline-image-width', `${width}%`);
  };

  const closeInlineImagePopover = () => {
    uiState.inlineImagePopover?.remove();
    uiState.inlineImagePopover = null;
    uiState.activeInlineImageBlock = null;
  };

  const openInlineImagePopover = (block) => {
    if (!(block instanceof HTMLElement) || !block.classList.contains('a1right-admin-inline-image-line')) return;
    if (uiState.activeInlineImageBlock === block && uiState.inlineImagePopover?.isConnected) return;

    closeInlineImagePopover();
    const popover = document.createElement('div');
    popover.id = 'a1right-admin-inline-image-popover';
    popover.setAttribute('role', 'toolbar');
    popover.setAttribute('aria-label', '图片宽度');

    const range = document.createElement('input');
    range.type = 'range';
    range.min = '32';
    range.max = '100';
    range.value = `${normalizeInlineImageWidth(block.dataset.inlineImageWidth)}`;
    range.setAttribute('aria-label', '图片宽度');
    range.addEventListener('input', () => applyInlineImageWidth(block, range.value));
    popover.append(range);

    [40, 70, 100].forEach((width) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${width}%`;
      button.addEventListener('click', () => {
        applyInlineImageWidth(block, width);
        range.value = `${width}`;
      });
      popover.append(button);
    });

    document.body.append(popover);
    const rect = block.getBoundingClientRect();
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - popover.offsetWidth - 12));
    const top = Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - popover.offsetHeight - 12));
    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
    uiState.inlineImagePopover = popover;
    uiState.activeInlineImageBlock = block;
  };

  const bindInlineImageResizeControls = (block, preview) => {
    if (!(block instanceof HTMLElement) || !(preview instanceof HTMLElement)) return;

    preview.querySelectorAll('[data-inline-image-width]').forEach((button) => {
      button.addEventListener('mousedown', (event) => event.preventDefault());
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        applyInlineImageWidth(block, button.getAttribute('data-inline-image-width'));
      });
    });

    const handle = preview.querySelector('.a1right-admin-inline-image-resize-handle');
    handle?.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const startX = event.clientX;
      const startWidth = normalizeInlineImageWidth(block.dataset.inlineImageWidth);
      const canvasWidth = block.parentElement?.getBoundingClientRect().width || block.getBoundingClientRect().width || 1;

      const onMove = (moveEvent) => {
        const width = startWidth + ((moveEvent.clientX - startX) / canvasWidth) * 100;
        applyInlineImageWidth(block, width);
      };
      const onEnd = () => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onEnd);
      };

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onEnd, { once: true });
    });
  };

  const createInlineImagePreviewCard = ({ alt = 'image', source = '', rawSource = '', title = '' }) => {
    const wrapper = document.createElement('span');
    wrapper.className = 'a1right-admin-inline-image-preview';
    wrapper.setAttribute('contenteditable', 'false');
    wrapper.setAttribute('tabindex', '-1');
    wrapper.setAttribute('aria-label', title || alt || 'article image');
    wrapper.dataset.inlineImageSource = rawSource;
    wrapper.addEventListener('mousedown', (event) => event.preventDefault());

    const image = document.createElement('img');
    image.className = 'a1right-admin-inline-image-preview__image';
    image.src = source;
    image.alt = alt || 'image';
    image.loading = 'lazy';
    image.decoding = 'async';
    const fallbackSource = normalizePreviewLink(rawSource);
    image.addEventListener('error', () => {
      if (fallbackSource && image.dataset.fallbackApplied !== 'true' && image.src !== fallbackSource) {
        image.dataset.fallbackApplied = 'true';
        image.src = fallbackSource;
      }
    });

    const controls = document.createElement('span');
    controls.className = 'a1right-admin-inline-image-tools';
    [40, 70, 100].forEach((width) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'a1right-admin-inline-image-size-button';
      button.setAttribute('data-inline-image-width', `${width}`);
      button.title = `图片宽度 ${width}%`;
      button.textContent = `${width}%`;
      controls.append(button);
    });

    const resizeHandle = document.createElement('button');
    resizeHandle.type = 'button';
    resizeHandle.className = 'a1right-admin-inline-image-resize-handle';
    resizeHandle.setAttribute('aria-label', '拖拽调整图片宽度');
    resizeHandle.title = '拖拽调整图片宽度';
    resizeHandle.textContent = '↘';

    const meta = document.createElement('span');
    meta.className = 'a1right-admin-inline-image-preview__meta';

    const badge = document.createElement('span');
    badge.className = 'a1right-admin-inline-image-preview__badge';
    badge.textContent = '图片预览';

    const text = document.createElement('span');
    text.className = 'a1right-admin-inline-image-preview__text';

    const titleNode = document.createElement('strong');
    titleNode.textContent = title || alt || '已插入图片';

    const pathNode = document.createElement('code');
    pathNode.textContent = rawSource || source;

    text.append(titleNode, pathNode);
    meta.append(badge, text);
    wrapper.append(image, controls, resizeHandle);
    return wrapper;
  };

  const getRichTextImageBlocks = (editable) => {
    if (!(editable instanceof HTMLElement)) return [];

    const directBlocks = [...editable.children];
    const nestedLeafBlocks = [...editable.querySelectorAll('p, li, div')].filter((block) =>
      ![...block.children].some((child) => /^(P|LI|DIV)$/i.test(child.tagName)),
    );

    return [...new Set([...directBlocks, ...nestedLeafBlocks])].filter((block) => block instanceof HTMLElement);
  };

  const decorateRichTextInlineImages = (editable) => {
    if (!(editable instanceof HTMLElement)) return;

    getRichTextImageBlocks(editable).forEach((block) => {
      if (block.matches('pre') || block.classList.contains('a1right-admin-code-line')) return;

      const parsed = parseMarkdownImageLine(extractEditableSourceText(block));
      const isCurrent =
        block.classList.contains('a1right-admin-inline-image-line') &&
        block.dataset.inlineImageRawSource === parsed?.rawSource &&
        block.style.getPropertyValue('--inline-image-url');

      if (isCurrent) return;

      block.classList.remove('a1right-admin-inline-image-line');
      block.removeAttribute('data-inline-image-src');
      block.removeAttribute('data-inline-image-alt');
      block.removeAttribute('data-inline-image-raw-source');
      block.style.removeProperty('--inline-image-url');
      block.style.removeProperty('--inline-image-aspect');

      if (!parsed) return;

      block.classList.add('a1right-admin-inline-image-line');
      block.dataset.inlineImageSrc = parsed.source;
      block.dataset.inlineImageAlt = parsed.alt;
      block.dataset.inlineImageRawSource = parsed.rawSource;
      block.style.setProperty('--inline-image-url', `url("${parsed.source.replace(/["\\]/g, '\\$&')}")`);
      applyInlineImageWidth(block, block.dataset.inlineImageWidth);

      const probe = new Image();
      probe.addEventListener('load', () => {
        if (block.dataset.inlineImageRawSource !== parsed.rawSource || !probe.naturalWidth || !probe.naturalHeight) return;
        block.style.setProperty('--inline-image-aspect', `${probe.naturalWidth} / ${probe.naturalHeight}`);
      }, { once: true });
      probe.src = parsed.source;
    });
  };

  const decorateRichTextCodeBlocks = (editable) => {
    if (!(editable instanceof HTMLElement)) return;

    const blocks = [...editable.children].filter((item) => item instanceof HTMLElement);
    blocks.forEach((block) => {
      block._a1rightCodeState = {
        expanded: block.dataset.codeExpanded !== 'false',
        wrap: block.dataset.codeWrap !== 'false',
      };
      block.querySelectorAll('.a1right-admin-code-copy').forEach((button) => button.remove());
      block
        .querySelectorAll('.a1right-admin-code-toggle, .a1right-admin-code-wrap-toggle, .a1right-admin-code-lineno, .a1right-admin-code-meta')
        .forEach((node) => node.remove());
      block.classList.remove(
        'a1right-admin-code-line',
        'is-code-start',
        'is-code-middle',
        'is-code-end',
        'is-code-single',
        'is-code-empty',
        'is-code-collapsed',
        'is-code-nowrap',
      );
      block.removeAttribute('data-code-lang');
      block.removeAttribute('data-code-lang-key');
      block.removeAttribute('data-code-group');
    });

    let group = [];
    const flush = () => {
      if (!group.length) return;
      const lines = group.map((item) => readCodeLineText(item));
      const language = inferCodeLanguage(lines);
      const languageKey = getCodeLanguageKey(language);
      const codeText = lines.join('\n');
      const groupId = `code-group-${++decoratorState.codeGroupCounter}`;
      const preservedState = group[0]._a1rightCodeState || { expanded: group.length <= 14, wrap: true };

      group.forEach((item, index) => {
        item.classList.add('a1right-admin-code-line');
        if (!readCodeLineText(item).trim()) item.classList.add('is-code-empty');
        item.dataset.codeGroup = groupId;

        if (group.length === 1) {
          item.classList.add('is-code-single', 'is-code-start', 'is-code-end');
        } else if (index === 0) {
          item.classList.add('is-code-start');
        } else if (index === group.length - 1) {
          item.classList.add('is-code-end');
        } else {
          item.classList.add('is-code-middle');
        }

        const lineNo = document.createElement('span');
        lineNo.className = 'a1right-admin-code-lineno';
        lineNo.textContent = `${index + 1}`;
        lineNo.setAttribute('contenteditable', 'false');
        item.prepend(lineNo);
      });

      group[0].setAttribute('data-code-lang', language);
      group[0].setAttribute('data-code-lang-key', languageKey);
      group[0].append(createCodeMetaBadge(`${group.length} 行`));
      group[0].append(
        createCodeActionButton(preservedState.wrap ? '不换行' : '自动换行', 'a1right-admin-code-wrap-toggle', (button) => {
          const wrap = button.textContent === '自动换行';
          applyCodeGroupState(group, { expanded: group[0].dataset.codeExpanded !== 'false', wrap });
          button.textContent = wrap ? '不换行' : '自动换行';
        }),
      );
      if (group.length > 8) {
        group[0].append(
          createCodeActionButton(preservedState.expanded ? '折叠' : '展开', 'a1right-admin-code-toggle', (button) => {
            const expanded = button.textContent === '展开';
            applyCodeGroupState(group, { expanded, wrap: group[0].dataset.codeWrap !== 'false' });
            button.textContent = expanded ? '折叠' : '展开';
          }),
        );
      }
      group[0].append(createCodeCopyButton(codeText));
      applyCodeGroupState(group, preservedState);
      group = [];
    };

    for (const block of blocks) {
      if (isRichTextCodeLine(block)) {
        group.push(block);
      } else {
        flush();
      }
    }

    flush();
  };

  const refreshAllRichTextCodeBlocks = () => {
    const decoratedEditables = [...document.querySelectorAll('#nc-root [class*="EditorControl"] [contenteditable="true"]')]
      .filter((editable) => editable instanceof HTMLElement);

    decoratedEditables.forEach((editable) => {
      // Decap owns the rich-text subtree. Adding code controls to it makes React's
      // reconciler lose track of child nodes after an edit or deletion.
      decorateRichTextInlineImages(editable);
    });

    const bodyEditable = getBodyEditable();
    if (bodyEditable instanceof HTMLElement && !decoratedEditables.includes(bodyEditable)) {
      decorateRichTextInlineImages(bodyEditable);
    }
  };

  const scheduleRichTextCodeRefresh = () => {
    if (decoratorState.richTextCodeRefreshRaf) return;
    decoratorState.richTextCodeRefreshRaf = window.requestAnimationFrame(() => {
      decoratorState.richTextCodeRefreshRaf = 0;
      refreshAllRichTextCodeBlocks();
    });
  };

  const isElementVisible = (element) =>
    element instanceof HTMLElement && Boolean(element.offsetWidth || element.offsetHeight || element.getClientRects().length);

  const isInlineCodeToolbarButton = (button) => {
    if (!(button instanceof HTMLButtonElement)) return false;
    const text = normalizeUiText(getElementUiText(button));
    if (!text) return false;
    if (/code block|代码块/.test(text)) return false;
    return /\bcode\b/.test(text) || text === '代码';
  };

  const findToolbarMenuTrigger = (toolbar, excludeButton = null) => {
    if (!(toolbar instanceof Element)) return null;
    return [...toolbar.querySelectorAll('button')]
      .find((button) => {
        if (button === excludeButton) return false;
        const text = normalizeUiText(getElementUiText(button));
        return (
          button.getAttribute('aria-haspopup') === 'menu' ||
          button.getAttribute('aria-haspopup') === 'true' ||
          /insert|add|more|\+|plus|块|插入/.test(text)
        );
      }) || null;
  };

  const findVisibleCodeBlockMenuItem = (scope = document) =>
    [...scope.querySelectorAll('[role="menuitem"], [role="option"], button')]
      .find((element) => {
        const text = normalizeUiText(element.textContent || '');
        return isElementVisible(element) && /^(code block|代码块)$/.test(text);
      }) || null;

  const triggerBuiltInCodeBlockEntry = async (triggerButton = null) => {
    const existingItem = findVisibleCodeBlockMenuItem(document);
    if (existingItem instanceof HTMLElement) {
      existingItem.click();
      return true;
    }

    const toolbar =
      (triggerButton instanceof Element ? triggerButton.closest('[class*="EditorToolbar"]') : null) ||
      document.querySelector('#nc-root [class*="EditorToolbar"]');

    const menuTrigger = findToolbarMenuTrigger(toolbar, triggerButton);
    if (!(menuTrigger instanceof HTMLButtonElement)) return false;

    menuTrigger.click();
    await sleep(70);

    const menuItem = findVisibleCodeBlockMenuItem(document);
    if (!(menuItem instanceof HTMLElement)) return false;

    menuItem.click();
    return true;
  };

  const decorateToolbarCodeButtons = () => {
    document.querySelectorAll('#nc-root [class*="EditorToolbar"] button').forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) return;
      if (!isInlineCodeToolbarButton(button)) return;

      button.dataset.a1rightCodeMerged = 'true';
      button.setAttribute('aria-label', 'Code Block');
      button.setAttribute('title', 'Code Block');
      button.classList.add('a1right-admin-toolbar-code-main');

      if (decoratorState.boundToolbarCodeButtons.has(button)) return;
      decoratorState.boundToolbarCodeButtons.add(button);

      button.addEventListener('mousedown', (event) => {
        event.preventDefault();
      });

      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        void insertCodeTemplateSnippet({ preferCodeBlockWidget: true, triggerButton: button });
      });
    });
  };

  const createToolbarWorkbenchButton = (label, action, title = label) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'a1right-admin-toolbar-workbench__button';
    button.textContent = label;
    button.dataset.action = action;
    button.title = title;
    return button;
  };

  const ensureToolbarWorkbench = (toolbar) => {
    if (!(toolbar instanceof Element)) return null;
    let workbench = toolbar.querySelector('.a1right-admin-toolbar-workbench');
    if (workbench) return workbench;

    workbench = document.createElement('div');
    workbench.className = 'a1right-admin-toolbar-workbench';
    workbench.append(
      createToolbarWorkbenchButton('Code', 'code', '\u63d2\u5165 Code Block'),
      createToolbarWorkbenchButton('H1', 'h1', '\u683c\u5f0f 1'),
      createToolbarWorkbenchButton('H2', 'h2', '\u683c\u5f0f 2'),
      createToolbarWorkbenchButton('\u5f15\u7528', 'quote', '\u63d2\u5165\u5f15\u7528\u5757'),
      createToolbarWorkbenchButton('\u03a3', 'math-inline', '\u63d2\u5165\u884c\u5185\u516c\u5f0f'),
      createToolbarWorkbenchButton('\u03a3\u5757', 'math-block', '\u63d2\u5165\u516c\u5f0f\u5757'),
      createToolbarWorkbenchButton('\u89c6\u9891', 'video', '\u63d2\u5165\u89c6\u9891 iframe'),
      createToolbarWorkbenchButton('\u6458\u8981', 'excerpt', '\u4ece\u6b63\u6587\u63d0\u53d6 120 \u5b57\u6458\u8981'),
      createToolbarWorkbenchButton('\u9996\u56fe', 'cover', '\u6b63\u6587\u9996\u56fe\u4f5c\u4e3a\u5c01\u9762'),
    );
    toolbar.append(workbench);
    return workbench;
  };

  const decorateToolbarWorkbench = () => {
    document.querySelectorAll('#nc-root [class*="EditorToolbar"]').forEach((toolbar) => {
      const workbench = ensureToolbarWorkbench(toolbar);
      if (!(workbench instanceof HTMLElement) || decoratorState.boundToolbarActionBars.has(workbench)) return;
      decoratorState.boundToolbarActionBars.add(workbench);

      workbench.addEventListener('mousedown', (event) => {
        event.preventDefault();
      });

      workbench.addEventListener('click', (event) => {
        const button = event.target instanceof Element ? event.target.closest('button[data-action]') : null;
        if (!(button instanceof HTMLButtonElement)) return;
        event.preventDefault();
        event.stopPropagation();

        const action = button.dataset.action || '';
        if (action === 'code') {
          void insertCodeTemplateSnippet({ preferCodeBlockWidget: true, triggerButton: button });
          return;
        }
        if (action === 'h1') {
          void applyBodyBlockFormat('h1');
          return;
        }
        if (action === 'h2') {
          void applyBodyBlockFormat('h2');
          return;
        }
        if (action === 'quote') {
          void applyBodyBlockFormat('blockquote');
          return;
        }
        if (action === 'math-inline') {
          void insertMathTemplateSnippet(false);
          return;
        }
        if (action === 'math-block') {
          void insertMathTemplateSnippet(true);
          return;
        }
        if (action === 'video') {
          void insertVideoEmbedSnippet();
          return;
        }
        if (action === 'excerpt') {
          applyExcerptFromBody(120);
          return;
        }
        if (action === 'cover') {
          void applyCoverFromBodyFirstImage();
        }
      });
    });
  };

  const scheduleToolbarCodeRefresh = () => {
    if (decoratorState.toolbarRefreshRaf) return;
    decoratorState.toolbarRefreshRaf = window.requestAnimationFrame(() => {
      decoratorState.toolbarRefreshRaf = 0;
      decorateToolbarCodeButtons();
      decorateToolbarWorkbench();
    });
  };

  const resolveMarkdownRoot = (root) => {
    if (root instanceof Element && root.isConnected) return root;
    if (editorState.lastMarkdownRoot instanceof Element && editorState.lastMarkdownRoot.isConnected) {
      return editorState.lastMarkdownRoot;
    }

    return (
      document.querySelector('[aria-label="markdown field"] .CodeMirror')?.closest('[aria-label="markdown field"]') ||
      document.querySelector('[aria-label="markdown field"]') ||
      document.querySelector('[class*="MarkdownControl"]') ||
      document.querySelector('.CodeMirror') ||
      null
    );
  };

  const getCodeMirrorInstance = (root) => {
    const focused = document.querySelector('.CodeMirror-focused');
    if (focused?.CodeMirror) return focused.CodeMirror;

    const resolvedRoot = resolveMarkdownRoot(root);
    if (!(resolvedRoot instanceof Element)) {
      const anyHost = [...document.querySelectorAll('.CodeMirror')].find((item) => item?.CodeMirror);
      return anyHost?.CodeMirror || null;
    }

    const host = resolvedRoot.matches('.CodeMirror') ? resolvedRoot : resolvedRoot.querySelector('.CodeMirror');
    return host?.CodeMirror || null;
  };

  const getSurroundingSpacing = (beforeText, afterText) => {
    const before = `${beforeText || ''}`;
    const after = `${afterText || ''}`;

    const leading =
      !before
        ? ''
        : /\n\s*\n$/.test(before)
          ? ''
          : /\n$/.test(before)
            ? '\n'
            : '\n\n';

    const trailing =
      !after
        ? ''
        : /^\s*\n\s*\n/.test(after)
          ? ''
          : /^\n/.test(after)
            ? '\n'
            : '\n\n';

    return { leading, trailing };
  };

  const scrollTextareaSelectionIntoView = (textarea, selectionStart = 0) => {
    if (!(textarea instanceof HTMLTextAreaElement)) return;
    const lineHeight = Number.parseFloat(window.getComputedStyle(textarea).lineHeight || '0') || 22;
    const lineCount = textarea.value.slice(0, selectionStart).split('\n').length;
    textarea.scrollTop = Math.max(0, (lineCount - 3) * lineHeight);
  };

  const insertIntoContentEditable = (editable, snippet, { appendParagraph = false } = {}) => {
    if (!(editable instanceof HTMLElement)) return { ok: false, locate: null };

    editable.focus();
    const inserted = document.execCommand('insertText', false, snippet);
    if (!inserted) return { ok: false, locate: null };

    if (appendParagraph && !document.execCommand('insertParagraph', false)) {
      return { ok: false, locate: null };
    }

    dispatchEditableMutation(editable, snippet);

    const locate = () => {
      editable.focus();
      editable.scrollIntoView({ behavior: 'smooth', block: 'center' });
      pulseField(resolveMarkdownRoot(editable), 'a1right-admin-field-guided');
    };

    return { ok: true, locate };
  };

  const insertMarkdownSnippet = (root, snippet, richTextSelection = null, { appendParagraph = false } = {}) => {
    const normalizedSnippet = `${snippet || ''}`.trim();
    const sourceSnippet = appendParagraph ? `${normalizedSnippet}\n\n` : normalizedSnippet;
    const codeMirror = getCodeMirrorInstance(root);
    if (codeMirror) {
      const doc = codeMirror.getDoc();
      const from = doc.getCursor('from');
      const to = doc.getCursor('to');
      const content = doc.getValue();
      const start = doc.indexFromPos(from);
      const end = doc.indexFromPos(to);
      const { leading, trailing } = getSurroundingSpacing(content.slice(0, start), content.slice(end));
      const payload = `${leading}${sourceSnippet}${trailing}`;
      const insertFrom = doc.posFromIndex(start);
      const insertTo = doc.posFromIndex(start + payload.length);

      doc.replaceSelection(payload);
      doc.setCursor(insertTo);
      codeMirror.focus();

      const locate = () => {
        codeMirror.focus();
        doc.setSelection(insertFrom, insertTo);
        codeMirror.scrollIntoView({ from: insertFrom, to: insertTo }, 120);
        pulseField(resolveMarkdownRoot(root), 'a1right-admin-field-guided');
      };

      return { ok: true, locate };
    }

    const resolvedRoot = resolveMarkdownRoot(root);
    const editable =
      (resolvedRoot instanceof Element && resolvedRoot.querySelector('[contenteditable="true"]')) ||
      editorState.lastMarkdownEditable ||
      null;

    if (editable instanceof HTMLElement) {
      restoreRichTextSelection(editable, richTextSelection);
      const currentText = extractEditableSourceText(editable);
      const { leading, trailing } = getSurroundingSpacing(currentText, '');
      const payload = `${leading}${normalizedSnippet}${trailing}`;
      const inserted = insertIntoContentEditable(editable, payload, { appendParagraph });
      if (inserted.ok) {
        return inserted;
      }
    }

    const textarea =
      (resolvedRoot instanceof Element && resolvedRoot.querySelector('textarea')) ||
      (editorState.lastMarkdownTextarea instanceof HTMLTextAreaElement ? editorState.lastMarkdownTextarea : null) ||
      (document.activeElement instanceof HTMLTextAreaElement ? document.activeElement : null);

    if (!textarea) return { ok: false, locate: null };

    const start =
      textarea.selectionStart ??
      editorState.lastSelectionStart ??
      textarea.value.length;
    const end =
      textarea.selectionEnd ??
      editorState.lastSelectionEnd ??
      start;
    const { leading, trailing } = getSurroundingSpacing(textarea.value.slice(0, start), textarea.value.slice(end));
    const payload = `${leading}${sourceSnippet}${trailing}`;
    const nextValue = `${textarea.value.slice(0, start)}${payload}${textarea.value.slice(end)}`;
    const insertedStart = start;
    const insertedEnd = start + payload.length;
    setNativeValue(textarea, nextValue);
    textarea.selectionStart = textarea.selectionEnd = insertedEnd;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    textarea.focus();
    scrollTextareaSelectionIntoView(textarea, insertedStart);

    const locate = () => {
      textarea.focus();
      textarea.setSelectionRange(insertedStart, insertedEnd);
      scrollTextareaSelectionIntoView(textarea, insertedStart);
      pulseField(resolveMarkdownRoot(root), 'a1right-admin-field-guided');
    };

    return { ok: true, locate };
  };

  const insertRichTextCodeTemplate = () => {
    const editable = getBodyEditable();
    if (!(editable instanceof HTMLElement)) return false;

    return insertIntoContentEditable(editable, ['# code block', '', 'print("hello world")'].join('\n')).ok;
  };

  const applyPlainTextBlockFormat = (value = '', selectionStart = 0, selectionEnd = selectionStart, kind = 'h1') => {
    const normalized = `${value || ''}`.replace(/\r\n/g, '\n');
    const startLineStart = normalized.lastIndexOf('\n', Math.max(0, selectionStart - 1)) + 1;
    const endLineBreak = normalized.indexOf('\n', selectionEnd);
    const endLineEnd = endLineBreak === -1 ? normalized.length : endLineBreak;
    const selectedBlock = normalized.slice(startLineStart, endLineEnd);
    const formattedBlock = formatMarkdownBlockText(selectedBlock, kind) || getMarkdownBlockPrefix(kind);

    return {
      nextValue: `${normalized.slice(0, startLineStart)}${formattedBlock}${normalized.slice(endLineEnd)}`,
      selectionStart: startLineStart,
      selectionEnd: startLineStart + formattedBlock.length,
    };
  };

  const applyBodyBlockFormat = async (kind = 'h1') => {
    const editable = getBodyEditable();
    if (editable instanceof HTMLElement) {
      editable.focus();
      const tag = kind === 'h1' ? 'H1' : kind === 'h2' ? 'H2' : 'BLOCKQUOTE';
      const formatted = document.execCommand('formatBlock', false, tag);
      if (!formatted) return false;
      dispatchEditableMutation(editable, '');
      setDirtyState(true);
      scheduleAutoDraftSave();
      scheduleEditorWorkflowRefresh();
      scheduleMarkdownPreviewRefresh();
      scheduleRichTextCodeRefresh();
      scheduleToolbarCodeRefresh();
      return true;
    }

    const codeMirror = getCodeMirrorInstance(getBodyFieldContainer());
    if (codeMirror) {
      const doc = codeMirror.getDoc();
      const from = doc.getCursor('from');
      const to = doc.getCursor('to');
      const start = { line: from.line, ch: 0 };
      const end = { line: to.line, ch: doc.getLine(to.line).length };
      const selectedBlock = doc.getRange(start, end);
      const formattedBlock = formatMarkdownBlockText(selectedBlock, kind) || getMarkdownBlockPrefix(kind);
      const lines = formattedBlock.split('\n');
      const nextEnd = { line: start.line + lines.length - 1, ch: lines.at(-1)?.length || 0 };
      doc.replaceRange(formattedBlock, start, end);
      doc.setSelection(start, nextEnd);
      codeMirror.focus();
      setDirtyState(true);
      scheduleAutoDraftSave();
      scheduleEditorWorkflowRefresh();
      scheduleMarkdownPreviewRefresh();
      scheduleRichTextCodeRefresh();
      scheduleToolbarCodeRefresh();
      return true;
    }

    const textarea =
      getBodyFieldContainer()?.querySelector('textarea') ||
      (editorState.lastMarkdownTextarea instanceof HTMLTextAreaElement ? editorState.lastMarkdownTextarea : null);

    if (textarea instanceof HTMLTextAreaElement) {
      const result = applyPlainTextBlockFormat(
        textarea.value,
        textarea.selectionStart ?? editorState.lastSelectionStart ?? textarea.value.length,
        textarea.selectionEnd ?? editorState.lastSelectionEnd ?? textarea.value.length,
        kind,
      );
      setNativeValue(textarea, result.nextValue);
      textarea.focus();
      textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
      scrollTextareaSelectionIntoView(textarea, result.selectionStart);
      setDirtyState(true);
      scheduleAutoDraftSave();
      scheduleEditorWorkflowRefresh();
      scheduleMarkdownPreviewRefresh();
      scheduleRichTextCodeRefresh();
      scheduleToolbarCodeRefresh();
      return true;
    }

    showToast('当前没有找到可格式化的正文区域。', 'warn', 2600);
    return false;
  };

  const insertMathTemplateSnippet = async (displayMode = false) => {
    const snippet = displayMode ? ['$$', '\\sum_{i=1}^{n} a_i = S', '$$'].join('\n') : '$E = mc^2$';
    const inserted = insertMarkdownSnippet(getBodyFieldContainer(), snippet);
    if (!inserted.ok) {
      const copied = await copyTextToClipboard(snippet);
      showToast(copied ? '\u6ca1\u6709\u627e\u5230\u53ef\u63d2\u5165\u4f4d\u7f6e\uff0c\u516c\u5f0f\u6a21\u677f\u5df2\u590d\u5236\u5230\u526a\u8d34\u677f\u3002' : '\u6682\u65f6\u6ca1\u627e\u5230\u53ef\u63d2\u5165\u516c\u5f0f\u6a21\u677f\u7684\u4f4d\u7f6e\u3002', copied ? 'warn' : 'error', 3200);
      return false;
    }

    inserted.locate?.();
    setDirtyState(true);
    scheduleAutoDraftSave();
    scheduleEditorWorkflowRefresh();
    scheduleOutlineRefresh();
    showToast(displayMode ? '\u516c\u5f0f\u5757\u6a21\u677f\u5df2\u63d2\u5165\u3002' : '\u884c\u5185\u516c\u5f0f\u6a21\u677f\u5df2\u63d2\u5165\u3002', 'success', 2200);
    return true;
  };

  const insertVideoEmbedSnippet = async () => {
    const snippet = [
      '<iframe',
      '  src="https://www.youtube.com/embed/VIDEO_ID"',
      '  title="Embedded video"',
      '  loading="lazy"',
      '  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"',
      '  allowfullscreen',
      '></iframe>',
    ].join('\n');

    const inserted = insertMarkdownSnippet(getBodyFieldContainer(), snippet);
    if (!inserted.ok) {
      const copied = await copyTextToClipboard(snippet);
      showToast(copied ? '\u6ca1\u6709\u627e\u5230\u63d2\u5165\u4f4d\u7f6e\uff0c\u89c6\u9891 iframe \u6a21\u677f\u5df2\u590d\u5236\u5230\u526a\u8d34\u677f\u3002' : '\u6682\u65f6\u6ca1\u627e\u5230\u53ef\u63d2\u5165\u89c6\u9891\u6a21\u677f\u7684\u4f4d\u7f6e\u3002', copied ? 'warn' : 'error', 3200);
      return false;
    }

    inserted.locate?.();
    setDirtyState(true);
    scheduleAutoDraftSave();
    scheduleEditorWorkflowRefresh();
    scheduleOutlineRefresh();
    showToast('\u89c6\u9891\u5d4c\u5165\u6a21\u677f\u5df2\u63d2\u5165\uff0c\u628a VIDEO_ID \u6362\u6210\u4f60\u7684\u94fe\u63a5\u5373\u53ef\u3002', 'success', 2400);
    return true;
  };

  const insertCodeTemplateSnippet = async ({ preferCodeBlockWidget = true, triggerButton = null } = {}) => {
    if (preferCodeBlockWidget) {
      const openedCodeBlock = await triggerBuiltInCodeBlockEntry(triggerButton);
      if (openedCodeBlock) return true;
    }

    const markdownSnippet = ['```python', '# code block', '', 'print("hello world")', '```'].join('\n');
    const inserted = insertMarkdownSnippet(getBodyFieldContainer(), markdownSnippet);
    if (inserted.ok) {
      inserted.locate?.();
      setDirtyState(true);
      scheduleAutoDraftSave();
      showToast('没有找到 Code Block 组件入口，已回退为 Markdown 代码模板。', 'warn', 2600);
      return true;
    }

    const richInserted = insertRichTextCodeTemplate();
    if (richInserted) {
      setDirtyState(true);
      scheduleAutoDraftSave();
      showToast('没有找到 Code Block 组件入口，已回退为 Markdown 代码模板。', 'warn', 2600);
      return true;
    }

    const copied = await copyTextToClipboard(markdownSnippet);
    showToast(copied ? '没有找到光标位置，代码模板已复制到剪贴板。' : '暂时没找到可插入代码模板的位置。', copied ? 'warn' : 'error', 3200);
    return false;
  };

  const applyImageFieldValue = async (root, nextValue) => {
    const resolvedRoot =
      (root instanceof Element && root.isConnected ? root : null) ||
      (editorState.lastImageRoot instanceof Element && editorState.lastImageRoot.isConnected
        ? editorState.lastImageRoot
        : null);

    if (!(resolvedRoot instanceof Element)) return false;

    let input = resolvedRoot.querySelector('input:not([type="hidden"]):not([type="file"])');

    if (!input) {
      const switchButton = [...resolvedRoot.querySelectorAll('button')].find((button) =>
        /url|替代/i.test(button.textContent || ''),
      );
      switchButton?.click();
      await sleep(80);
      input = resolvedRoot.querySelector('input:not([type="hidden"]):not([type="file"])');
    }

    if (!input) return false;

    setNativeValue(input, nextValue);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.blur();
    return true;
  };

  const fileFromDataUrl = async (dataUrl) => {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return new File([blob], buildFilename('clipboard-image', blob.type), { type: blob.type });
  };

  const extractImageUrlsFromHtml = (html) => {
    if (!html) return [];

    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return [...doc.querySelectorAll('img')]
        .map((image) =>
          image.getAttribute('src') ||
          image.getAttribute('data-src') ||
          image.getAttribute('data-original') ||
          image.getAttribute('data-actualsrc') ||
          '',
        )
        .map((value) => value.trim())
        .filter(Boolean);
    } catch (error) {
      console.error('[a1right-admin] failed to parse clipboard html', error);
      return [];
    }
  };

  const looksLikeImageUrl = (value = '') =>
    /^https?:\/\//i.test(value) &&
    /(\.(png|jpe?g|gif|webp|svg|bmp))(?:[?#].*)?$/i.test(value);

  const getClipboardSources = (clipboardData, contextKind) => {
    if (!clipboardData) return [];

    const fileItems = [...(clipboardData.items || [])]
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter(Boolean)
      .map((file) => ({ kind: 'file', file }));

    if (fileItems.length) return fileItems;

    const htmlUrls = extractImageUrlsFromHtml(clipboardData.getData('text/html'));
    if (htmlUrls.length) return htmlUrls.map((url) => ({ kind: 'url', url }));

    const text = clipboardData.getData('text/plain').trim();
    if (text.startsWith('data:image/')) return [{ kind: 'data-url', value: text }];
    if (contextKind === 'image' && /^https?:\/\//i.test(text)) return [{ kind: 'url', url: text }];
    if (looksLikeImageUrl(text)) return [{ kind: 'url', url: text }];

    return [];
  };

  const fetchRemoteImage = async (url) => {
    const response = await fetch('/api/fetch-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const message = (await response.text()) || '无法抓取远程图片';
      throw new Error(message);
    }

    const blob = await response.blob();
    const filename = response.headers.get('x-source-filename') || 'remote-image';
    const type = blob.type || response.headers.get('content-type') || 'image/png';
    return new File([blob], filename, { type });
  };

  const uploadFileToGitHub = async (file) => {
    const user = getStoredUser();
    const token = user?.token;
    const tokenKeyword = user?.tokenKeyword || 'token';

    if (!token) {
      throw new Error('GitHub 登录状态失效了，请先重新登录后台。');
    }

    if (!runtime.repo || !runtime.branch) {
      throw new Error('后台仓库配置不完整，缺少 repo / branch。');
    }

    const filename = buildFilename(file.name, file.type);
    const repoPath = `${mediaFolder}/${filename}`.replace(/^\/+/, '');
    const publicPath = `${publicFolderUrl}/${filename}`;
    const fieldPath = `${publicFolder}/${filename}`;
    const apiPath = repoPath.split('/').map(encodeURIComponent).join('/');
    const content = arrayBufferToBase64(await file.arrayBuffer());

    const response = await fetch(`https://api.github.com/repos/${runtime.repo}/contents/${apiPath}`, {
      method: 'PUT',
      headers: {
        Authorization: `${tokenKeyword} ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `上传剪贴板图片：${filename}`,
        content,
        branch: runtime.branch,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`上传到 GitHub 失败：${response.status} ${errorBody}`);
    }

    const alt = buildAltText({ filename: file.name, kind: 'body' });

    return {
      filename,
      publicPath,
      fieldPath,
      alt,
      size: file.size,
      previewUrl: rememberObjectUrl(file),
    };
  };

  const resolveUploadFileFromSource = async (source) => {
    if (source.kind === 'file') return source.file;
    if (source.kind === 'data-url') return fileFromDataUrl(source.value);
    return fetchRemoteImage(source.url);
  };

  const processImageSources = async ({ context, sources, origin = '粘贴' }) => {
    if (uploadState.busy) return false;
    if (!context || !sources?.length) return false;

    setActiveDropTarget(null);
    uploadState.busy = true;
    updateUploadOverlay({
      label: origin === '拖拽' ? '正在处理拖拽图片' : '正在处理剪贴板图片',
      meta: '准备上传…',
      step: context.kind === 'image' ? '目标：封面图区' : '目标：正文编辑器',
      progress: 12,
      visible: true,
    });

    try {
      const uploads = [];
      const candidates = sources.slice(0, context.kind === 'image' ? 1 : 4);

      for (const [index, source] of candidates.entries()) {
        updateUploadOverlay({
          label: '图片上传中',
          meta: `正在上传第 ${index + 1} / ${candidates.length} 张`,
          step: source.kind === 'file' ? `文件：${source.file?.name || 'clipboard-image'}` : '文件：远程图片',
          progress: 18 + Math.round((index / Math.max(1, candidates.length)) * 56),
          visible: true,
        });

        const file = await resolveUploadFileFromSource(source);
        uploads.push(await uploadFileToGitHub(file));
      }

      if (!uploads.length) return true;

      updateUploadOverlay({
        label: '整理内容中',
        meta: context.kind === 'image' ? '正在同步封面图字段…' : '正在插入正文并刷新缩略列表…',
        step: uploads[0]?.filename ? `已上传：${uploads[0].filename}` : '',
        progress: 86,
        visible: true,
      });

      if (context.kind === 'image') {
        const target = uploads[0];
        const applied = await applyImageFieldValue(context.root, target.fieldPath);
        const coverAlt = buildAltText({ filename: target.filename, kind: 'cover' });
        maybeFillCoverAlt(coverAlt);
        setImageFieldPreviewState(context.root, {
          fieldPath: target.fieldPath,
          filename: target.filename,
          previewUrl: target.previewUrl,
          alt: coverAlt,
          description: origin === '拖拽' ? '刚刚通过拖拽上传，可直接检查封面视觉效果。' : '刚刚通过剪贴板上传，可直接检查封面视觉效果。',
        });

        if (!applied) {
          await navigator.clipboard?.writeText(target.fieldPath).catch(() => {});
          finishUploadOverlay('图片已上传，路径已复制到剪贴板');
          showToast(`已上传 ${target.filename}，路径已复制到剪贴板。`, 'warn', 4600);
          return true;
        }

        finishUploadOverlay('封面图已同步完成');
        showPreviewToast({
          title: '封面图已更新',
          description: buildPreviewDescription({ ...target, alt: coverAlt }, 'image'),
          imageUrl: target.previewUrl || normalizeAssetUrl(target.fieldPath),
          type: 'success',
          duration: 4600,
        });
        setDirtyState(true);
        scheduleAutoDraftSave();
        scheduleEditorWorkflowRefresh();
        return true;
      }

      const snippet = uploads
        .map((item) => `![${item.alt || 'image'}](${item.publicPath})`)
        .join('\n\n');
      // Keep Decap's persisted value as Markdown. The editor's CSS render layer
      // displays this line as an image without introducing an unmanaged <img> node.
      const inserted = insertMarkdownSnippet(context.root, snippet, context.richTextSelection, { appendParagraph: true });
      if (!inserted.ok) {
        await navigator.clipboard?.writeText(snippet).catch(() => {});
        finishUploadOverlay('Markdown 已复制到剪贴板');
        showToast('图片已上传，但没找到正文光标位置；Markdown 已复制到剪贴板。', 'warn', 4600);
        pushRecentUploads(uploads);
        scheduleEditorWorkflowRefresh();
        return true;
      }

      pushRecentUploads(uploads);
      finishUploadOverlay(`已处理 ${uploads.length} 张图片`);

      const firstUpload = uploads[0];
      showPreviewToast({
        title: uploads.length === 1 ? '截图已插入当前行' : `已插入 ${uploads.length} 张截图`,
        description: buildPreviewDescription(firstUpload, 'markdown'),
        imageUrl: firstUpload.previewUrl || firstUpload.publicPath,
        badge: uploads.length > 1 ? `+${uploads.length - 1}` : '',
        actionLabel: '点击定位到刚插入的位置',
        onClick: inserted.locate,
        type: 'success',
        duration: 5600,
      });

      setDirtyState(true);
      scheduleAutoDraftSave();
      scheduleEditorWorkflowRefresh();
      return true;
    } catch (error) {
      console.error('[a1right-admin] image upload failed', error);
      updateUploadOverlay({
        label: '上传失败',
        meta: error instanceof Error ? error.message : '图片上传失败',
        progress: 100,
        visible: true,
      });
      finishUploadOverlay(error instanceof Error ? error.message : '图片上传失败', '上传失败');
      showToast(error instanceof Error ? error.message : '剪贴板图片上传失败', 'error', 5600);
      return false;
    } finally {
      uploadState.busy = false;
    }
  };

  const handlePaste = async (event) => {
    const context = getClipboardContext();
    if (!context) return;

    const sources = getClipboardSources(event.clipboardData, context.kind);
    if (!sources.length) return;

    event.preventDefault();
    await processImageSources({ context, sources, origin: '粘贴' });
  };

  document.addEventListener('paste', (event) => {
    void handlePaste(event);
  }, true);

  document.addEventListener('focusin', (event) => {
    syncMarkdownEditorState(event.target);
    syncImageEditorState(event.target);
    scheduleMarkdownPreviewRefresh();
    scheduleRichTextCodeRefresh();
    scheduleToolbarCodeRefresh();
    scheduleOutlineRefresh();
    schedulePublishFieldRefresh();
  }, true);

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const imageBlock = target?.closest('.a1right-admin-inline-image-line');
    if (imageBlock instanceof HTMLElement) {
      openInlineImagePopover(imageBlock);
    } else if (!target?.closest('#a1right-admin-inline-image-popover')) {
      closeInlineImagePopover();
    }

    syncMarkdownEditorState(event.target);
    syncImageEditorState(event.target);
    scheduleMarkdownPreviewRefresh();
    scheduleRichTextCodeRefresh();
    scheduleToolbarCodeRefresh();
    scheduleOutlineRefresh();
    schedulePublishFieldRefresh();
    handlePossibleSaveAction(event.target);
  }, true);

  document.addEventListener('keyup', (event) => {
    syncMarkdownEditorState(event.target);
    syncImageEditorState(event.target);
    scheduleMarkdownPreviewRefresh();
    scheduleRichTextCodeRefresh();
    scheduleToolbarCodeRefresh();
    scheduleOutlineRefresh();
    schedulePublishFieldRefresh();
  }, true);

  document.addEventListener('mouseup', (event) => {
    syncMarkdownEditorState(event.target);
    syncImageEditorState(event.target);
    scheduleMarkdownPreviewRefresh();
    scheduleRichTextCodeRefresh();
    scheduleToolbarCodeRefresh();
    scheduleOutlineRefresh();
    schedulePublishFieldRefresh();
  }, true);

  document.addEventListener('input', (event) => {
    if (!(event.target instanceof Element)) return;

    handleManagedFieldInput(event.target);

    const imageRoot = getImageRootFromElement(event.target);
    if (imageRoot) {
      renderImageFieldPreview(imageRoot);
      scheduleMarkdownPreviewRefresh();
      scheduleOutlineRefresh();
      schedulePublishFieldRefresh();
      return;
    }

    if (getControlContainerByLabel([/\u5c01\u9762\u63cf\u8ff0/, /cover description/i])) {
      scheduleImageFieldPreviewRefresh();
    }
    scheduleMarkdownPreviewRefresh();
    scheduleRichTextCodeRefresh();
    scheduleToolbarCodeRefresh();
    scheduleOutlineRefresh();
    schedulePublishFieldRefresh();
  }, true);

  document.addEventListener('change', (event) => {
    if (!(event.target instanceof Element)) return;

    if (event.target instanceof HTMLInputElement && event.target.type === 'file') {
      const previewed = previewSelectedImageFile(event.target);
      if (previewed) {
        setDirtyState(true);
        scheduleAutoDraftSave();
        scheduleEditorWorkflowRefresh();
        scheduleMarkdownPreviewRefresh();
        scheduleOutlineRefresh();
        schedulePublishFieldRefresh();
        return;
      }
    }

    handleManagedFieldInput(event.target);

    const imageRoot = getImageRootFromElement(event.target);
    if (imageRoot) {
      renderImageFieldPreview(imageRoot);
      scheduleMarkdownPreviewRefresh();
      scheduleOutlineRefresh();
      schedulePublishFieldRefresh();
      return;
    }

    scheduleImageFieldPreviewRefresh();
    scheduleMarkdownPreviewRefresh();
    scheduleRichTextCodeRefresh();
    scheduleToolbarCodeRefresh();
    scheduleOutlineRefresh();
    schedulePublishFieldRefresh();
  }, true);

  document.addEventListener('dragover', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const hasImageFiles = [...(event.dataTransfer?.items || [])].some((item) => item.kind === 'file' && item.type.startsWith('image/'));
    if (!hasImageFiles) {
      setActiveDropTarget(null);
      return;
    }

    const context =
      getImageRootFromElement(target) ||
      getMarkdownRootFromElement(target) ||
      getBodyFieldContainer();

    if (!context) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    setActiveDropTarget(context);
  }, true);

  document.addEventListener('drop', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const files = [...(event.dataTransfer?.files || [])].filter((file) => file.type.startsWith('image/'));
    if (!files.length) return;

    const imageRoot = getImageRootFromElement(target);
    const markdownRoot = getMarkdownRootFromElement(target) || getBodyFieldContainer();
    const context = imageRoot
      ? { kind: 'image', root: imageRoot }
      : markdownRoot
        ? { kind: 'markdown', root: markdownRoot }
        : null;

    if (!context) return;
    event.preventDefault();
    setActiveDropTarget(null);
    void processImageSources({
      context,
      sources: files.map((file) => ({ kind: 'file', file })),
      origin: '\u62d6\u62fd',
    });
  }, true);

  document.addEventListener('dragleave', () => {
    setActiveDropTarget(null);
  }, true);

  document.addEventListener('dragend', () => {
    setActiveDropTarget(null);
  }, true);

  window.addEventListener('hashchange', () => {
    workflowState.activeDraftKey = getCurrentEditorRouteKey();
    workflowState.restoreBannerDismissed = false;
    markdownPreviewState.lastSignature = '';
    window.setTimeout(scheduleImageFieldPreviewRefresh, 140);
    window.setTimeout(scheduleRichTextCodeRefresh, 140);
    window.setTimeout(scheduleToolbarCodeRefresh, 140);
    window.setTimeout(scheduleEditorWorkflowRefresh, 140);
    window.setTimeout(scheduleMarkdownPreviewRefresh, 140);
    window.setTimeout(scheduleManagedFieldAssistRefresh, 140);
    window.setTimeout(scheduleOutlineRefresh, 140);
    window.setTimeout(schedulePublishFieldRefresh, 140);
  });

  window.addEventListener('beforeunload', (event) => {
    if (!workflowState.dirty) return;
    event.preventDefault();
    event.returnValue = '';
  });

  window.addEventListener('beforeunload', () => {
    [...previewState.objectUrls].forEach((url) => revokeObjectUrl(url));
  });

  const cmsRoot = document.getElementById('nc-root');
  if (cmsRoot) {
    new MutationObserver(() => {
      scheduleImageFieldPreviewRefresh();
      scheduleRichTextCodeRefresh();
      scheduleToolbarCodeRefresh();
      scheduleMarkdownPreviewRefresh();
      scheduleManagedFieldAssistRefresh();
      scheduleOutlineRefresh();
      schedulePublishFieldRefresh();
    }).observe(cmsRoot, { childList: true, subtree: true });
  }

  scheduleImageFieldPreviewRefresh();
  scheduleRichTextCodeRefresh();
  scheduleToolbarCodeRefresh();
  workflowState.activeDraftKey = getCurrentEditorRouteKey();
  scheduleEditorWorkflowRefresh();
  scheduleMarkdownPreviewRefresh();
  scheduleManagedFieldAssistRefresh();
  scheduleOutlineRefresh();
  schedulePublishFieldRefresh();
})();
