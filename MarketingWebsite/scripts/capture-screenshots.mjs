#!/usr/bin/env node
/**
 * Captures screenshots from prototype/ and inspection mock for the marketing site.
 */
import { createServer } from 'node:http';
import { readFile, mkdir, stat } from 'node:fs/promises';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const REPO = join(ROOT, '..');
const PROTOTYPE_DIR = join(REPO, 'prototype');
const OUT_DIR = join(ROOT, 'public', 'assets', 'screenshots');

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function startServer(dir) {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const url = req.url === '/' ? '/index.html' : req.url.split('?')[0];
      const filePath = join(dir, url);
      try {
        const data = await readFile(filePath);
        res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickSurface(page, surface) {
  await page.click(`#surfaceTabs button[data-surface="${surface}"]`);
  await delay(400);
}

async function goToScreen(page, screenId, frameId) {
  await page.evaluate((id) => {
    const target = document.getElementById(id);
    if (!target) return;
    const parent = target.parentElement;
    parent.querySelectorAll(':scope > .screen').forEach((s) => s.classList.remove('active'));
    target.classList.add('active');
    target.scrollTop = 0;
    parent.scrollTop = 0;
  }, screenId);
  await delay(300);
}

async function captureFrame(page, selector, filename, width, height) {
  const el = await page.$(selector);
  if (!el) {
    console.warn(`  ⚠ Element not found: ${selector}`);
    return false;
  }
  await el.screenshot({ path: join(OUT_DIR, filename), type: 'png' });
  console.log(`  ✓ ${filename}`);
  return true;
}

async function capturePrototype(browser) {
  const { server, port } = await startServer(PROTOTYPE_DIR);
  const page = await browser.newPage();

  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle0' });
  await page.setViewport({ width: 1400, height: 900 });

  const shots = [
    { surface: 'app', screen: 'app-home', frame: '.phone', file: 'user-app-home.png', w: 390, h: 800 },
    { surface: 'app', screen: 'app-search', frame: '.phone', file: 'user-app-search.png' },
    { surface: 'app', screen: 'app-detail', frame: '.phone', file: 'user-app-detail.png' },
    { surface: 'app', screen: 'app-book', frame: '.phone', file: 'user-app-booking.png' },
    { surface: 'web', screen: 'web-home', frame: '.desktop', file: 'website-home.png', w: 1180, h: 800 },
    { surface: 'web', screen: 'web-listing', frame: '.desktop', file: 'website-listing.png' },
    { surface: 'web', screen: 'web-detail', frame: '.desktop', file: 'website-detail.png' },
    { surface: 'admin', screen: 'admin-dash', frame: '.desktop', file: 'admin-dashboard.png' },
    { surface: 'admin', screen: 'admin-inventory', frame: '.desktop', file: 'admin-inventory.png' },
    { surface: 'admin', screen: 'admin-td', frame: '.desktop', file: 'admin-testdrive-config.png' },
    { surface: 'emp', screen: 'emp-sched', frame: '.phone', file: 'employee-schedule.png' },
    { surface: 'emp', screen: 'emp-conduct', frame: '.phone', file: 'employee-conduct-drive.png' },
    { surface: 'emp', screen: 'emp-leads', frame: '.phone', file: 'employee-leads.png' },
  ];

  for (const shot of shots) {
    await clickSurface(page, shot.surface);
    if (shot.screen) await goToScreen(page, shot.screen);
    const activeView = await page.$(`.surface-view.active ${shot.frame}`);
    if (activeView) {
      await activeView.screenshot({ path: join(OUT_DIR, shot.file), type: 'png' });
      console.log(`  ✓ ${shot.file}`);
    } else {
      console.warn(`  ⚠ Failed: ${shot.file}`);
    }
  }

  await page.close();
  server.close();
}

async function captureInspectionMock(browser) {
  const { server, port } = await startServer(join(__dirname));
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/inspection-mock.html`, { waitUntil: 'networkidle0' });
  await page.setViewport({ width: 500, height: 920 });

  const screens = [
    { tab: 0, file: 'inspection-checklist.png' },
    { tab: 1, file: 'inspection-capture.png' },
    { tab: 2, file: 'inspection-report.png' },
  ];

  for (const s of screens) {
    await page.evaluate((idx) => {
      document.querySelectorAll('.tabs button')[idx].click();
    }, s.tab);
    await delay(300);
    const phone = await page.$('.phone');
    if (phone) {
      await phone.screenshot({ path: join(OUT_DIR, s.file), type: 'png' });
      console.log(`  ✓ ${s.file}`);
    }
  }

  await page.close();
  server.close();
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log('Capturing screenshots...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    console.log('Prototype surfaces:');
    await capturePrototype(browser);
    console.log('\nInspection App mock:');
    await captureInspectionMock(browser);
    const files = await stat(OUT_DIR);
    console.log(`\nDone. Screenshots saved to public/assets/screenshots/`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
