import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const SCR_DIR = path.join(process.cwd(), 'guides', 'screenshots');
const BASE_URL = 'http://localhost:3001';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const LOGO_PATH = path.join(process.cwd(), 'src', 'logo.png');
const PROJECT_DIR = process.cwd();

if (!fs.existsSync(SCR_DIR)) fs.mkdirSync(SCR_DIR, { recursive: true });

// Copy logo for use in screenshots
if (fs.existsSync(LOGO_PATH)) {
  fs.copyFileSync(LOGO_PATH, path.join(SCR_DIR, 'logo.png'));
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function clickByText(page, text, tag = 'button') {
  const handles = await page.$$(`${tag}, a`);
  for (const h of handles) {
    const t = await h.evaluate(el => el.textContent.trim());
    if (t.includes(text)) { await h.click(); return true; }
  }
  return false;
}

async function startServer() {
  return new Promise((resolve, reject) => {
    // Kill any existing server on port 3001
    const tsxPath = path.join(PROJECT_DIR, 'node_modules', '.bin', 'tsx');
    const proc = spawn(process.execPath, [tsxPath, 'server/index.ts'], {
      cwd: PROJECT_DIR,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PORT: '3001', HOST: 'localhost' },
    });
    
    let started = false;
    const timeout = setTimeout(() => {
      if (!started) reject(new Error('Server start timeout'));
    }, 30000);

    proc.stdout.on('data', (data) => {
      const text = data.toString();
      console.log('[server]', text.trim());
      if (text.includes('Listening on') || text.includes('listening') || text.includes('3001')) {
        started = true;
        clearTimeout(timeout);
        setTimeout(() => resolve(proc), 2000); // Give it a moment
      }
    });
    proc.stderr.on('data', (data) => {
      const text = data.toString();
      console.log('[server-err]', text.trim());
    });
    proc.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function takeScreenshots() {
  console.log('Starting server...');
  let serverProc;

  // First check if server is already running
  try {
    const resp = await fetch(`${BASE_URL}/`);
    if (resp.ok) {
      console.log('Server already running on port 3001');
    }
  } catch {
    try {
      serverProc = await startServer();
    } catch (e) {
      console.log('Server start failed, trying to connect anyway...');
    }
  }

  // Wait for server to be ready
  for (let i = 0; i < 30; i++) {
    try {
      const resp = await fetch(`${BASE_URL}/`);
      if (resp.ok) { console.log('Server is ready!'); break; }
    } catch {}
    await sleep(1000);
  }

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  async function shot(name, url, waitMs = 4000, waitSelector) {
    try {
      console.log(`  📸 ${name}...`);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
      await sleep(waitMs);
      if (waitSelector) {
        try { await page.waitForSelector(waitSelector, { timeout: 8000 }); } catch {}
        await sleep(500);
      }
      await page.screenshot({ path: path.join(SCR_DIR, `${name}.png`), fullPage: true });
      console.log(`     ✅ ${name}.png`);
    } catch (e) {
      console.log(`     ⚠️  ${name} failed: ${e.message}`);
    }
  }

  async function shotCurrent(name, waitMs = 3000) {
    try {
      console.log(`  📸 ${name}...`);
      await sleep(waitMs);
      await page.screenshot({ path: path.join(SCR_DIR, `${name}.png`), fullPage: true });
      console.log(`     ✅ ${name}.png`);
    } catch (e) {
      console.log(`     ⚠️  ${name} failed: ${e.message}`);
    }
  }

  // ==================== PATIENT ====================
  console.log('\n📱 Patient Platform:');
  await shot('patient-welcome', `${BASE_URL}/`);
  await shot('patient-login', `${BASE_URL}/`);

  // Register a patient
  try {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2', timeout: 10000 });
    await sleep(2000);
    
    // Click "تسجيل جديد" (register link) - it's a button inside a <p>
    await clickByText(page, 'تسجيل جديد');
    await sleep(1000);
    
    // Fill register form
    const testEmail = `test${Date.now()}@test.com`;
    const inputs = await page.$$('input');
    if (inputs.length >= 3) {
      await inputs[0].type('أحمد محمد');
      await inputs[1].type(testEmail);
      await inputs[2].type('test123');
      await sleep(500);
    }
    
    // Click submit button
    await clickByText(page, 'تسجيل');
    await sleep(3000);
    console.log(`     ✅ Registered patient: ${testEmail}`);
  } catch (e) {
    console.log(`     ⚠️  Patient registration failed: ${e.message}`);
  }

  // Home page (just wait on current page after registration)
  await shotCurrent('patient-home', 3000);
  
  // Debug: check page content
  const pageText = await page.evaluate(() => document.body?.innerText?.substring(0, 200));
  console.log(`     📝 Page text: ${pageText?.replace(/\n/g, ' | ')}`);

  // Profile page
  try {
    await clickByText(page, 'الملف الشخصي');
    await sleep(2000);
  } catch {}
  await shotCurrent('patient-profile', 3000);

  // Navigate back to home via full page reload
  try {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'load', timeout: 15000 });
    await sleep(4000); // Wait for app to restore session from localStorage
  } catch {}

  // History
  try {
    await clickByText(page, 'سجل الاستشارات');
    await sleep(2000);
  } catch {}
  await shotCurrent('patient-history', 3000);

  // Navigate back to home via full page reload
  try {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'load', timeout: 15000 });
    await sleep(4000);
  } catch {}

  // Calendar
  try {
    await clickByText(page, 'حجوزاتي');
    await sleep(2000);
  } catch {}
  await shotCurrent('patient-calendar', 3000);

  // Navigate back to home via full page reload
  try {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'load', timeout: 15000 });
    await sleep(4000);
  } catch {}

  // Chat page (new consultation)
  try {
    await clickByText(page, 'بدء استشارة جديدة');
    await sleep(3000);
  } catch {}
  await shotCurrent('patient-chat', 3000);

  // ==================== DOCTOR ====================
  console.log('\n👨‍⚕️ Doctor Platform:');
  
  await shot('doctor-login', `${BASE_URL}/#doctor`, 3000);
  
  // Screenshot doctor register - navigate to doctor portal and click register
  try {
    await page.goto(`${BASE_URL}/#doctor`, { waitUntil: 'networkidle2', timeout: 10000 });
    await sleep(2000);
    await clickByText(page, 'تسجيل طبيب جديد');
    await sleep(1000);
  } catch {}
  await shot('doctor-register', `${BASE_URL}/#doctor`, 3000);

  // ==================== ADMIN ====================
  console.log('\n🔧 Admin Platform:');
  
  // Navigate to admin portal
  await page.goto(`${BASE_URL}/#admin`, { waitUntil: 'networkidle2', timeout: 10000 });
  await sleep(2000);
  
  // Screenshot admin login page
  await shot('admin-login', `${BASE_URL}/#admin`, 2000);

  // Login as admin
  try {
    await page.waitForSelector('input', { timeout: 5000 });
    const inputs = await page.$$('input');
    if (inputs.length >= 2) {
      await inputs[0].type('admin@3yada.ai');
      await inputs[1].type('admin123');
      await sleep(500);
      
      // Click login button (the form's submit button)
      const submitBtn = await page.$('button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
        console.log('     ✅ Admin login submitted');
      }
    }
  } catch (e) {
    console.log(`     ⚠️  Admin login failed: ${e.message}`);
  }

  await sleep(5000);

  // Admin screens after login
  await shotCurrent('admin-dashboard', 4000);
  
  // Click sidebar tabs using clickByText
  async function clickAdminTab(tabText, shotName) {
    try {
      await clickByText(page, tabText);
      await sleep(3000);
      await shotCurrent(shotName, 3000);
    } catch (e) {
      console.log(`     ⚠️  ${shotName} failed: ${e.message}`);
    }
  }
  
  await clickAdminTab('المحادثات', 'admin-conversations');
  await clickAdminTab('الأطباء', 'admin-doctors');
  await clickAdminTab('المرضى', 'admin-patients');
  await clickAdminTab('المواعيد', 'admin-appointments');
  await clickAdminTab('الاشتراكات', 'admin-subscriptions');
  await clickAdminTab('المشرفون', 'admin-admins');

  await browser.close();
  console.log('\n✅ All screenshots complete!');

  if (serverProc) {
    serverProc.kill();
    console.log('Server stopped.');
  }
}

takeScreenshots().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
