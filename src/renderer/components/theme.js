function applyTheme(theme) {
  document.documentElement.removeAttribute('data-theme');
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
}

function applyFontSize(size) {
  document.documentElement.style.setProperty('--base-font-size', `${size}px`);
  document.querySelectorAll('.result-name').forEach(el => {
    el.style.fontSize = `${size}px`;
  });
  document.querySelectorAll('.result-path').forEach(el => {
    el.style.fontSize = `${size - 2}px`;
  });
}

module.exports = {
  applyTheme,
  applyFontSize,
};
