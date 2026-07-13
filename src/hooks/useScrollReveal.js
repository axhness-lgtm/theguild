import { useEffect } from 'react';

/**
 * useScrollReveal Hook — Robust scroll observer that guarantees text and elements load line-by-line.
 * Observes sections (`[data-scroll-section]`, `.scroll-section`, `.hero-section`, `.about-section`, etc.) and individual line/item wraps.
 */
export function useScrollReveal() {
  useEffect(() => {
    const selectors = [
      '[data-scroll-section]',
      '.hero-section',
      '.about-section',
      '.screenings-section',
      '.why-section',
      '.roadmap-section',
      '.footer-section',
      '.swipe-reveal-right',
      '.swipe-reveal-left',
      '.swipe-reveal-up',
      '.block-swipe-reveal',
      '.scroll-reveal-card',
      '.reveal-line-wrap',
      '.reveal-item-wrap'
    ].join(', ');

    const observerCallback = (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    };

    const observerOptions = {
      root: null,
      rootMargin: '200px 0px -20px 0px',
      threshold: 0
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    const observeElements = () => {
      const elements = document.querySelectorAll(selectors);
      const viewportBottom = window.innerHeight + 150;

      elements.forEach((el) => {
        if (!el.classList.contains('is-revealed')) {
          const rect = el.getBoundingClientRect();
          // If element or section is in viewport or close to top fold on initial render, reveal immediately
          if (rect.top <= viewportBottom) {
            setTimeout(() => {
              el.classList.add('is-revealed');
            }, 50);
          } else {
            observer.observe(el);
          }
        }
      });
    };

    // Initial check on mount
    observeElements();

    // Secondary check shortly after render to catch any async layouts
    const timeoutId = setTimeout(observeElements, 250);

    const mutationObserver = new MutationObserver((mutations) => {
      let shouldScan = false;
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          shouldScan = true;
        }
      });
      if (shouldScan) {
        observeElements();
      }
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, []);
}
