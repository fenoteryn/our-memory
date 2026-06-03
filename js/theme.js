const btn = document.getElementById('themeToggle');
if (btn) {
  btn.textContent = document.documentElement.classList.contains('dark') ? '☀️' : '🌙';
  btn.onclick = () => {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    btn.textContent = isDark ? '☀️' : '🌙';
  };
}
