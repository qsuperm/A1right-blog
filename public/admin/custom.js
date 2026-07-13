(() => {
  const runtime = window.__A1RIGHT_ADMIN__ || {};
  const mediaFolder = `${runtime.mediaFolder || 'public/images/uploads'}`.replace(/^\/+|\/+$/g, '');
  const publicFolder = `${runtime.publicFolder || 'images/uploads'}`.replace(/^\/+|\/+$/g, '');
  const publicFolderUrl = `/${publicFolder}`;
  const uploadState = { busy: false };
  const previewState = {
    objectUrls: new Set(),
    imageFieldState: new WeakMap(),
  };
  const editorState = {
    lastMarkdownRoot: null,
    lastMarkdownEditable: null,
    lastMarkdownTextarea: null,
    lastSelectionStart: null,
    lastSelectionEnd: null,
    lastImageRoot: null,
    lastContextKind: null,
    lastContextRoot: null,
    lastInteractionAt: 0,
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

  const normalizeAssetUrl = (value = '') => {
    const trimmed = `${value || ''}`.trim();
    if (!trimmed) return '';
    if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
      return trimmed;
    }

    return trimmed.startsWith('/') ? trimmed : `/${trimmed.replace(/^\/+/, '')}`;
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
    }
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
      return { kind: 'markdown', root: markdownField };
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
      const value = `${directInput.value || ''}`.trim();
      if (value) return value;
    }

    const fallback = [...root.querySelectorAll('input, textarea')]
      .map((input) => `${input.value || ''}`.trim())
      .find(Boolean);

    return fallback || '';
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

  const pulseField = (root, className = 'a1right-admin-field-guided') => {
    if (!(root instanceof Element)) return;
    root.classList.remove(className);
    void root.offsetWidth;
    root.classList.add(className);
    window.setTimeout(() => root.classList.remove(className), 1600);
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

    actions.append(replaceButton, clearButton);
    meta.append(path, open);
    body.append(eyebrow, title, description, meta, actions);
    card.append(media, body);
    root.append(card);
    return card;
  };

  const renderImageFieldPreview = (root, override = null) => {
    if (!(root instanceof Element)) return;

    const card = ensureImageFieldPreviewCard(root);
    if (!(card instanceof Element)) return;

    const state = override || getStoredImageFieldPreview(root) || {};
    const fieldPath = state.fieldPath || getImageFieldValue(root);
    const previewUrl = state.previewUrl || normalizeAssetUrl(fieldPath);
    const alt = state.alt || getCoverAltFieldValue() || buildAltText({ filename: fieldPath, kind: 'cover' });

    const image = card.querySelector('.a1right-admin-cover-preview__image');
    const title = card.querySelector('.a1right-admin-cover-preview__title');
    const description = card.querySelector('.a1right-admin-cover-preview__description');
    const path = card.querySelector('.a1right-admin-cover-preview__path');
    const open = card.querySelector('.a1right-admin-cover-preview__open');
    const clearButton = card.querySelector('.a1right-admin-cover-preview__action.is-secondary');

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
      description.textContent = hasImage
        ? state.description || '已自动同步当前封面字段，可以直接检查构图和裁切效果。'
        : '先点一下封面图区，再 Ctrl + V，这里会立即显示缩略预览。';
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

    previewState.imageFieldState.set(resolvedRoot, {
      ...previous,
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

  const insertIntoContentEditable = (editable, snippet) => {
    if (!(editable instanceof HTMLElement)) return { ok: false, locate: null };

    editable.focus();
    const selection = window.getSelection();
    if (!selection) return { ok: false, locate: null };

    if (!selection.rangeCount) {
      const range = document.createRange();
      range.selectNodeContents(editable);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    const range = selection.getRangeAt(0);
    range.deleteContents();
    const textNode = document.createTextNode(snippet);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    editable.dispatchEvent(new InputEvent('input', { bubbles: true, data: snippet, inputType: 'insertText' }));
    editable.dispatchEvent(new Event('change', { bubbles: true }));

    const locate = () => {
      if (!textNode.isConnected) return;
      editable.focus();
      const nextSelection = window.getSelection();
      if (!nextSelection) return;
      const nextRange = document.createRange();
      nextRange.selectNodeContents(textNode);
      nextSelection.removeAllRanges();
      nextSelection.addRange(nextRange);
      textNode.parentElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      pulseField(resolveMarkdownRoot(editable), 'a1right-admin-field-guided');
    };

    return { ok: true, locate };
  };

  const insertMarkdownSnippet = (root, snippet) => {
    const codeMirror = getCodeMirrorInstance(root);
    if (codeMirror) {
      const doc = codeMirror.getDoc();
      const from = doc.getCursor('from');
      const to = doc.getCursor('to');
      const content = doc.getValue();
      const start = doc.indexFromPos(from);
      const end = doc.indexFromPos(to);
      const { leading, trailing } = getSurroundingSpacing(content.slice(0, start), content.slice(end));
      const payload = `${leading}${snippet.trim()}${trailing}`;
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
      const currentText = editable.textContent || '';
      const { leading, trailing } = getSurroundingSpacing(currentText, '');
      const inserted = insertIntoContentEditable(editable, `${leading}${snippet.trim()}${trailing}`);
      if (inserted.ok) {
        return inserted;
      }
    }

    const directInsert = insertIntoContentEditable(editable, snippet);
    if (directInsert.ok) {
      return directInsert;
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
    const payload = `${leading}${snippet.trim()}${trailing}`;
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

  const handlePaste = async (event) => {
    if (uploadState.busy) return;

    const context = getClipboardContext();
    if (!context) return;

    const sources = getClipboardSources(event.clipboardData, context.kind);
    if (!sources.length) return;

    event.preventDefault();
    uploadState.busy = true;
    showToast('正在处理剪贴板图片…', 'info', 1800);

    try {
      const uploads = [];

      for (const source of sources.slice(0, context.kind === 'image' ? 1 : 4)) {
        let file;
        if (source.kind === 'file') file = source.file;
        else if (source.kind === 'data-url') file = await fileFromDataUrl(source.value);
        else file = await fetchRemoteImage(source.url);

        uploads.push(await uploadFileToGitHub(file));
      }

      if (!uploads.length) return;

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
          description: '刚刚通过剪贴板上传，可直接检查封面视觉效果。',
        });

        if (!applied) {
          await navigator.clipboard?.writeText(target.fieldPath).catch(() => {});
          showToast(`已上传 ${target.filename}，路径已复制到剪贴板。`, 'warn', 4600);
          return;
        }

        showPreviewToast({
          title: '封面图已更新',
          description: buildPreviewDescription({ ...target, alt: coverAlt }, 'image'),
          imageUrl: target.previewUrl || normalizeAssetUrl(target.fieldPath),
          type: 'success',
          duration: 4600,
        });
        return;
      }

      const snippet = uploads
        .map((item) => `![${item.alt || 'image'}](${item.publicPath})`)
        .join('\n\n');

      const inserted = insertMarkdownSnippet(context.root, snippet);
      if (!inserted.ok) {
        await navigator.clipboard?.writeText(snippet).catch(() => {});
        showToast('图片已上传，但没找到正文光标位置；Markdown 已复制到剪贴板。', 'warn', 4600);
        return;
      }

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
    } catch (error) {
      console.error('[a1right-admin] clipboard upload failed', error);
      showToast(error instanceof Error ? error.message : '剪贴板图片上传失败', 'error', 5600);
    } finally {
      uploadState.busy = false;
    }
  };

  document.addEventListener('paste', (event) => {
    void handlePaste(event);
  }, true);

  document.addEventListener('focusin', (event) => {
    syncMarkdownEditorState(event.target);
    syncImageEditorState(event.target);
  }, true);

  document.addEventListener('click', (event) => {
    syncMarkdownEditorState(event.target);
    syncImageEditorState(event.target);
  }, true);

  document.addEventListener('keyup', (event) => {
    syncMarkdownEditorState(event.target);
    syncImageEditorState(event.target);
  }, true);

  document.addEventListener('mouseup', (event) => {
    syncMarkdownEditorState(event.target);
    syncImageEditorState(event.target);
  }, true);

  document.addEventListener('input', (event) => {
    if (!(event.target instanceof Element)) return;

    const imageRoot = getImageRootFromElement(event.target);
    if (imageRoot) {
      renderImageFieldPreview(imageRoot);
      return;
    }

    if (getControlContainerByLabel([/封面描述/, /cover description/i])) {
      scheduleImageFieldPreviewRefresh();
    }
  }, true);

  document.addEventListener('change', (event) => {
    if (!(event.target instanceof Element)) return;

    const imageRoot = getImageRootFromElement(event.target);
    if (imageRoot) {
      renderImageFieldPreview(imageRoot);
      return;
    }

    scheduleImageFieldPreviewRefresh();
  }, true);

  window.addEventListener('hashchange', () => {
    window.setTimeout(scheduleImageFieldPreviewRefresh, 140);
  });

  window.addEventListener('beforeunload', () => {
    [...previewState.objectUrls].forEach((url) => revokeObjectUrl(url));
  });

  const cmsRoot = document.getElementById('nc-root');
  if (cmsRoot) {
    new MutationObserver(() => {
      scheduleImageFieldPreviewRefresh();
    }).observe(cmsRoot, { childList: true, subtree: true });
  }

  scheduleImageFieldPreviewRefresh();
})();
