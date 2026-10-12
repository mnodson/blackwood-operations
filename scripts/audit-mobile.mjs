import { chromium, devices } from 'playwright';

const routes = ['/', '/compliance', '/compliance/signup', '/privacy-changes', '/privacy', '/leadership', '/contact'];
const viewports = [
  { name: 'iphone-se', width: 320, height: 640 },
  { name: 'iphone-12', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 }
];

const browser = await chromium.launch();
const report = [];

for (const vp of viewports) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
    isMobile: vp.width < 700,
    hasTouch: vp.width < 700
  });
  const page = await context.newPage();

  for (const route of routes) {
    await page.goto('http://localhost:4200' + route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);

    const result = await page.evaluate(() => {
      const doc = document.documentElement;
      const overflow = doc.scrollWidth - doc.clientWidth;

      // Elements sticking out past the viewport
      const offenders = [];
      document.querySelectorAll('body *').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        if (r.right > doc.clientWidth + 1 || r.left < -1) {
          const style = getComputedStyle(el);
          if (style.position === 'fixed' && style.visibility === 'hidden') return;
          offenders.push({
            tag: el.tagName.toLowerCase(),
            cls: (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || '').toString().slice(0, 60),
            left: Math.round(r.left),
            right: Math.round(r.right),
            w: Math.round(r.width)
          });
        }
      });

      // Tap targets smaller than 44px
      const small = [];
      document.querySelectorAll('a, button, input, select, [role="button"]').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        if (getComputedStyle(el).visibility === 'hidden') return;
        if (r.height < 40 || r.width < 40) {
          small.push({
            tag: el.tagName.toLowerCase(),
            text: (el.textContent || '').trim().slice(0, 30),
            h: Math.round(r.height),
            w: Math.round(r.width)
          });
        }
      });

      // Text below 14px
      const tiny = new Set();
      document.querySelectorAll('p, li, span, label, a, small').forEach(el => {
        if (!el.textContent?.trim()) return;
        const size = parseFloat(getComputedStyle(el).fontSize);
        if (size && size < 13) tiny.add(`${el.tagName.toLowerCase()}.${(el.className||'').toString().split(' ')[0]} @${size}px`);
      });

      return { overflow, offenders: offenders.slice(0, 8), small: small.slice(0, 8), tiny: [...tiny].slice(0, 6) };
    });

    report.push({ vp: vp.name, route, ...result });
  }
  await context.close();
}

await browser.close();

for (const r of report) {
  const issues = [];
  if (r.overflow > 0) issues.push(`H-SCROLL +${r.overflow}px`);
  if (r.offenders.length) issues.push(`overflow-els: ${r.offenders.map(o => o.cls || o.tag).join(', ')}`);
  if (r.small.length) issues.push(`small-taps: ${r.small.map(s => `${s.tag}"${s.text}"${s.w}x${s.h}`).join(' | ')}`);
  if (r.tiny.length) issues.push(`tiny-text: ${r.tiny.join(', ')}`);
  console.log(`${issues.length ? 'FAIL' : ' ok '} ${r.vp.padEnd(10)} ${r.route.padEnd(20)} ${issues.join(' ;; ')}`);
}
