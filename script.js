addEventListener('scroll', () => {
    document.querySelector('.title-bg').classList.toggle('scrolled', scrollY > 40);
}, { passive: true });