(() => {
  const pageIds = new Set(['dashboard', 'workspace', 'portfolio', 'watchlist', 'news', 'reports', 'journal']);
  const pages = [...document.querySelectorAll('[data-page]')];
  const links = [...document.querySelectorAll('[data-page-link]')];
  const sidebar = document.querySelector('.sidebar');
  const menuToggle = document.querySelector('.menu-toggle');
  const toast = document.querySelector('#prototype-toast');
  let toastTimer;

  const showToast = (message) => {
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 4200);
  };

  const showPage = () => {
    const requested = decodeURIComponent(location.hash.slice(1));
    const current = pageIds.has(requested) ? requested : 'dashboard';
    pages.forEach((page) => { page.hidden = page.dataset.page !== current; });
    links.forEach((link) => {
      if (link.dataset.pageLink === current) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    sidebar.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    window.scrollTo(0, 0);
  };

  window.addEventListener('hashchange', showPage);
  showPage();

  menuToggle.addEventListener('click', () => {
    const open = sidebar.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(open));
  });

  document.querySelectorAll('[data-open-dialog]').forEach((button) => {
    button.addEventListener('click', () => document.getElementById(button.dataset.openDialog).showModal());
  });

  document.querySelectorAll('dialog').forEach((dialog) => {
    dialog.addEventListener('close', () => {
      if (dialog.returnValue === 'preview') showToast('Bu prototip işlemi kaydetmez. Canlı akış uygulamada çalışır.');
    });
  });

  document.querySelectorAll('.segmented, .tab-strip').forEach((group) => {
    group.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button || !group.contains(button)) return;
      group.querySelectorAll('button').forEach((item) => item.classList.toggle('is-active', item === button));
      showToast('Görünüm seçildi. Veri bağlı olmadığı için sonuç gösterilmiyor.');
    });
  });

  document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => showToast('Bu prototip veriye bağlı değildir; arama ve filtre uygulamada çalışır.'));
  });
})();
