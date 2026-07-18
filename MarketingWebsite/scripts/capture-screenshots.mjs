#!/usr/bin/env node
/**
 * Captures screenshots from prototype/ and inspection mock for the marketing site.
 */
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile, mkdir } from 'node:fs/promises';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const REPO = join(ROOT, '..');
const PROTOTYPE_DIR = join(REPO, 'prototype');
const OUT_DIR = join(ROOT, 'public', 'assets', 'screenshots');
const CHROME_FALLBACKS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
];

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
    { surface: 'admin', screen: 'admin-res', frame: '.desktop', file: 'admin-reservations.png' },
    { surface: 'admin', screen: 'admin-reserveform', frame: '.desktop', file: 'admin-reserve-form.png' },
    { surface: 'emp', screen: 'emp-sched', frame: '.phone', file: 'employee-schedule.png' },
    { surface: 'emp', screen: 'emp-conduct', frame: '.phone', file: 'employee-conduct-drive.png' },
    { surface: 'emp', screen: 'emp-leads', frame: '.phone', file: 'employee-leads.png' },
    { surface: 'emp', screen: 'emp-reservations', frame: '.phone', file: 'employee-reservation-followup.png' },
    { surface: 'insp', screen: 'insp-checklist', frame: '.phone', file: 'inspection-checklist.png' },
    { surface: 'insp', screen: 'insp-capture', frame: '.phone', file: 'inspection-capture.png' },
    { surface: 'insp', screen: 'insp-report', frame: '.phone', file: 'inspection-report.png' },
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

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log('Capturing screenshots...\n');

  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || CHROME_FALLBACKS.find((path) => existsSync(path));
  const browser = await puppeteer.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    console.log('Prototype surfaces:');
    await capturePrototype(browser);
    console.log(`\nDone. Screenshots saved to public/assets/screenshots/`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
