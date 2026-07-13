(() => {
  const runtime = window.__A1RIGHT_ADMIN__ || {};
  const mediaFolder = `${runtime.mediaFolder || 'public/images/uploads'}`.replace(/^\/+|\/+$/g, '');
  const publicFolder = `${runtime.publicFolder || 'images/uploads'}`.replace(/^\/+|\/+$/g, '');
  const publicFolderUrl = `/${publicFolder}`;
  const uploadState = { busy: false };
  const editorState = {
    lastMarkdownRoot: null,
    lastMarkdownEditable: null,
    lastMarkdownTextarea: null,
    lastSelectionStart: null,
    lastSelectionEnd: null,
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

  const showToast = (message, type = 'info', duration = 3200) => {
    const root = ensureToastRoot();
    const toast = document.createElement('div');
    toast.className = `a1right-admin-toast is-${type}`;
    toast.textContent = message;
    root.append(toast);

    window.requestAnimationFrame(() => toast.classList.add('is-visible'));
    window.setTimeout(() => {
      toast.classList.remove('is-visible');
      window.setTimeout(() => toast.remove(), 220);
    }, duration);
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

  const getMarkdownRootFromElement = (element) => {
    if (!(element instanceof Element)) return null;

    return (
      element.closest('[aria-label="markdown field"]') ||
      element.closest('.CodeMirror') ||
      element.closest('[class*="MarkdownControl"]') ||
      null
    );
  };

  const syncMarkdownEditorState = (target) => {
    const root = getMarkdownRootFromElement(target);
    if (!root) return;

    editorState.lastMarkdownRoot = root;

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

  const getClipboardContext = () => {
    const active = document.activeElement;
    if (!(active instanceof Element)) return null;

    const imageField = active.closest('[aria-label="image field"]');
    if (imageField) return { kind: 'image', root: imageField };

    const markdownField = getMarkdownRootFromElement(active) || editorState.lastMarkdownRoot;

    if (markdownField) {
      syncMarkdownEditorState(active);
      return { kind: 'markdown', root: markdownField };
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

  const insertIntoContentEditable = (editable, snippet) => {
    if (!(editable instanceof HTMLElement)) return false;

    editable.focus();
    const selection = window.getSelection();
    if (!selection) return false;

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
    return true;
  };

  const insertMarkdownSnippet = (root, snippet) => {
    const codeMirror = getCodeMirrorInstance(root);
    if (codeMirror) {
      codeMirror.replaceSelection(snippet);
      codeMirror.focus();
      return true;
    }

    const resolvedRoot = resolveMarkdownRoot(root);
    const editable =
      (resolvedRoot instanceof Element && resolvedRoot.querySelector('[contenteditable="true"]')) ||
      editorState.lastMarkdownEditable ||
      null;

    if (insertIntoContentEditable(editable, snippet)) {
      return true;
    }

    const textarea =
      (resolvedRoot instanceof Element && resolvedRoot.querySelector('textarea')) ||
      (editorState.lastMarkdownTextarea instanceof HTMLTextAreaElement ? editorState.lastMarkdownTextarea : null) ||
      (document.activeElement instanceof HTMLTextAreaElement ? document.activeElement : null);

    if (!textarea) return false;

    const start =
      textarea.selectionStart ??
      editorState.lastSelectionStart ??
      textarea.value.length;
    const end =
      textarea.selectionEnd ??
      editorState.lastSelectionEnd ??
      start;
    const nextValue = `${textarea.value.slice(0, start)}${snippet}${textarea.value.slice(end)}`;
    setNativeValue(textarea, nextValue);
    textarea.selectionStart = textarea.selectionEnd = start + snippet.length;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    textarea.focus();
    return true;
  };

  const applyImageFieldValue = async (root, nextValue) => {
    if (!(root instanceof Element)) return false;

    let input = root.querySelector('input:not([type="hidden"]):not([type="file"])');

    if (!input) {
      const switchButton = [...root.querySelectorAll('button')].find((button) =>
        /url|替代/i.test(button.textContent || ''),
      );
      switchButton?.click();
      await sleep(80);
      input = root.querySelector('input:not([type="hidden"]):not([type="file"])');
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

    return {
      filename,
      publicPath,
      fieldPath,
      alt: sanitizeBaseName(file.name).replace(/-/g, ' '),
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

        if (!applied) {
          await navigator.clipboard?.writeText(target.fieldPath).catch(() => {});
          showToast(`已上传 ${target.filename}，路径已复制到剪贴板。`, 'warn', 4600);
          return;
        }

        showToast(`封面图已上传：${target.filename}`, 'success');
        return;
      }

      const snippet = uploads
        .map((item) => `![${item.alt || 'image'}](${item.publicPath})`)
        .join('\n\n');

      const inserted = insertMarkdownSnippet(context.root, snippet);
      if (!inserted) {
        await navigator.clipboard?.writeText(snippet).catch(() => {});
        showToast('图片已上传，但没找到正文光标位置；Markdown 已复制到剪贴板。', 'warn', 4600);
        return;
      }

      showToast(`已上传并插入 ${uploads.length} 张图片`, 'success');
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
  }, true);

  document.addEventListener('click', (event) => {
    syncMarkdownEditorState(event.target);
  }, true);

  document.addEventListener('keyup', (event) => {
    syncMarkdownEditorState(event.target);
  }, true);

  document.addEventListener('mouseup', (event) => {
    syncMarkdownEditorState(event.target);
  }, true);
})();
