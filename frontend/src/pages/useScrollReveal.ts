import { useEffect, useRef } from 'react';
export function useScrollReveal() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const elements = Array.from(root.current?.querySelectorAll<HTMLElement>('.lp-section-heading, .lp-feature-card, .lp-centered-heading, .lp-demo-window, .lp-how > div, .lp-how li, .lp-faq-grid > div, .lp-final-cta') || []);
    let observer: IntersectionObserver | undefined;
    const setup = () => {
      observer?.disconnect();
      elements.forEach(el => el.classList.remove('lp-reveal-pending'));
      if (media.matches || !('IntersectionObserver' in window)) return;
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.remove('lp-reveal-pending');
            entry.target.classList.add('lp-reveal-visible');
            observer?.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
      elements.forEach(el => {
        if (el.classList.contains('lp-reveal-visible')) return;
        el.classList.add('lp-reveal', 'lp-reveal-pending');
        if (el.matches('.lp-feature-card, .lp-how li')) el.style.setProperty('--reveal-delay', `${Array.from(el.parentElement!.children).indexOf(el) * 95}ms`);
        observer!.observe(el);
      });
    };
    setup(); media.addEventListener('change', setup);
    return () => { observer?.disconnect(); media.removeEventListener('change', setup); elements.forEach(el => el.classList.remove('lp-reveal-pending')); };
  }, []);
  return root;
}
