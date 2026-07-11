(() => {
  const applyTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  };

  try {
    const storedTheme = localStorage.getItem('theme');
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const preferredTheme = media.matches ? 'dark' : 'light';
    const theme = storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : preferredTheme;
    applyTheme(theme);

    const syncSystemTheme = (event) => {
      if (!localStorage.getItem('theme')) {
        applyTheme(event.matches ? 'dark' : 'light');
      }
    };

    media.addEventListener('change', syncSystemTheme);
  } catch {
    applyTheme('dark');
  }
})();
