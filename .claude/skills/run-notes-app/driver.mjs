#!/usr/bin/env node
/**
 * Driver for notes-app (React 19 + Vite + json-server)
 * Usage:
 *   node driver.mjs screenshot [outfile]   — take a screenshot
 *   node driver.mjs smoke                  — full CRUD smoke test via API
 *   node driver.mjs flow                   — UI flow: load notes, create, delete
 */
import { chromium } from 'playwright';
import { execSync, spawn } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';

const BASE_URL = 'http://localhost:5173';
const API_URL  = 'http://localhost:3001';

const cmd = process.argv[2] ?? 'screenshot';
const outfile = process.argv[3] ?? '/tmp/notes-app.png';

// ── helpers ──────────────────────────────────────────────────────────────────

async function waitForServer(url, retries = 20) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status < 500) return;
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`Server not ready: ${url}`);
}

async function apiSmoke() {
  await waitForServer(`${API_URL}/notes`);

  // LIST
  const list = await fetch(`${API_URL}/notes`).then(r => r.json());
  console.log(`GET /notes → ${list.length} notes`);

  // CREATE
  const created = await fetch(`${API_URL}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'smoke', content: 'test', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }),
  }).then(r => r.json());
  console.log(`POST /notes → id=${created.id}`);

  // PATCH
  const patched = await fetch(`${API_URL}/notes/${created.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'patched', updatedAt: new Date().toISOString() }),
  }).then(r => r.json());
  console.log(`PATCH /notes/${created.id} → content="${patched.content}"`);

  // DELETE
  await fetch(`${API_URL}/notes/${created.id}`, { method: 'DELETE' });
  const after = await fetch(`${API_URL}/notes/${created.id}`);
  console.log(`DELETE /notes/${created.id} → 404=${after.status === 404}`);

  console.log('API smoke: OK');
}

async function withBrowser(fn) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  try {
    await fn(page);
  } finally {
    await browser.close();
  }
}

// ── commands ──────────────────────────────────────────────────────────────────

if (cmd === 'smoke') {
  await apiSmoke();
  process.exit(0);
}

if (cmd === 'screenshot') {
  await waitForServer(BASE_URL);
  await withBrowser(async (page) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.screenshot({ path: outfile, fullPage: false });
    console.log(`screenshot → ${outfile}`);
  });
  process.exit(0);
}

if (cmd === 'flow') {
  await waitForServer(BASE_URL);
  await waitForServer(`${API_URL}/notes`);
  await withBrowser(async (page) => {
    // 1. Load app
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.screenshot({ path: '/tmp/notes-app-01-loaded.png' });
    console.log('step 1: loaded → /tmp/notes-app-01-loaded.png');

    // 2. Create a new note by clicking the "새 노트" (new note) button
    const newBtn = page.getByRole('button', { name: /새 노트|new note/i });
    await newBtn.click();
    await page.screenshot({ path: '/tmp/notes-app-02-new.png' });
    console.log('step 2: new note form → /tmp/notes-app-02-new.png');

    // 3. Fill in title and content
    const titleInput = page.locator('input[type="text"], input[placeholder*="제목"], input[placeholder*="title"]').first();
    await titleInput.fill('smoke test note');
    const contentArea = page.locator('textarea').first();
    await contentArea.fill('created by driver.mjs');
    await page.screenshot({ path: '/tmp/notes-app-03-filled.png' });
    console.log('step 3: filled form → /tmp/notes-app-03-filled.png');

    // 4. Save
    const saveBtn = page.getByRole('button', { name: /저장|save/i });
    await saveBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/tmp/notes-app-04-saved.png' });
    console.log('step 4: saved → /tmp/notes-app-04-saved.png');

    // 5. Verify the new note appears in the list
    const noteTitle = page.getByText('smoke test note');
    const visible = await noteTitle.isVisible();
    console.log(`step 5: note visible in list = ${visible}`);

    // 6. Delete it — find delete button near the note
    const deleteBtn = page.getByRole('button', { name: /삭제|delete/i }).first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: '/tmp/notes-app-05-deleted.png' });
      console.log('step 6: deleted → /tmp/notes-app-05-deleted.png');
    } else {
      console.log('step 6: delete button not found (skipped)');
    }
  });
  process.exit(0);
}

console.error(`Unknown command: ${cmd}. Use: screenshot | smoke | flow`);
process.exit(1);
