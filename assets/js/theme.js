(function () {
  var toggle = document.getElementById('themetoggle');
  var checkbox = document.getElementById('themecheckbox');
  if (!toggle || !checkbox) return;

  function applyTheme(light) {
    document.documentElement.classList.toggle('light', light);
    checkbox.checked = !light;
    toggle.setAttribute('aria-checked', String(!light));
    localStorage.setItem('theme', light ? 'light' : 'dark');
  }

  applyTheme(document.documentElement.classList.contains('light'));
  checkbox.addEventListener('change', function () {
    applyTheme(!checkbox.checked);
  });
})();
