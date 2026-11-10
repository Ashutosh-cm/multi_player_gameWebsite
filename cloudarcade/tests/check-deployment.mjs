import { chromium } from '@playwright/test';
const browser = await chromium.launch({headless:true});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('https://cloudarcade-gaming.pages.dev/', {waitUntil:'networkidle'});
  await page.getByRole('heading',{name:/Your next high score/}).waitFor();
  console.log('Live landing page renders: PASS');
  await page.goto('https://cloudarcade-gaming.pages.dev/library', {waitUntil:'networkidle'});
  const cards = await page.locator('.game-card').count();
  console.log(`Live game catalog: ${cards} games`);
  if(cards!==3) throw new Error('Expected three playable games.');
  await page.goto('https://cloudarcade-gaming.pages.dev/play/snake', {waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Start game',exact:true}).click();
  await page.locator('canvas').waitFor();
  console.log('Live guest Snake launches: PASS');
  await page.goto('https://cloudarcade-gaming.pages.dev/auth', {waitUntil:'networkidle'});
  if(!await page.getByRole('button',{name:'Sign in',exact:true}).isEnabled()) throw new Error('Cloud authentication is not configured.');
  console.log('Cloud sign-in form enabled: PASS');
  if(errors.length) throw new Error(errors.join('; '));
  console.log('Browser runtime errors: none');
  console.log('No accounts created or cloud game results submitted.');
} finally {await browser.close();}
