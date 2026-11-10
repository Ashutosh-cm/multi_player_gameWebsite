import fs from 'node:fs';
import {parseEnv} from 'node:util';

const path = fs.existsSync('.env.local') ? '.env.local' : '.env.example';
const env = parseEnv(fs.readFileSync(path, 'utf8'));
const url = env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const key = env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error('Supabase configuration is incomplete.');
const host = new URL(url);
if (host.protocol !== 'https:') throw new Error('Expected an HTTPS Supabase URL.');
if (key.startsWith('sb_secret_')) throw new Error('A secret key was supplied. Replace it with the public publishable key.');
if (key.startsWith('eyJ')) {
  let claims;
  try { claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()); }
  catch { throw new Error('The configured JWT key is malformed.'); }
  if (claims.role !== 'anon') throw new Error('Expected the public anon key, not a privileged key.');
} else if (!key.startsWith('sb_publishable_')) {
  throw new Error('The value does not look like a Supabase public key.');
}
console.log('Public client configuration: valid format');
if (process.argv.includes('--configure') && path !== '.env.local') {
  fs.writeFileSync('.env.local', `VITE_SUPABASE_URL=${url}\nVITE_SUPABASE_ANON_KEY=${key}\n`, {flag:'wx'});
  console.log('Created .env.local for Vite (excluded from Git).');
}
const headers = {apikey:key,'Content-Type':'application/json'};
if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;
let failures = 0;
async function check(label, endpoint, options={}, expected=200) {
  try {
    const response = await fetch(url + endpoint, {...options,headers:{...headers,...options.headers},signal:AbortSignal.timeout(15000)});
    const data = await response.json().catch(()=>null);
    if (response.status !== expected) {
      failures++;
      const detail = String(data?.message || data?.error_description || data?.error || data?.code || 'unexpected response').replaceAll(key,'[redacted]').slice(0,200);
      console.log(`${label}: FAIL (HTTP ${response.status}; ${detail})`);
      return;
    }
    if(label==='Game endpoint rejects unauthenticated requests' && !['Sign in to submit results','Invalid or expired session'].includes(data?.error)) {
      failures++;
      console.log('Game endpoint: NOT VERIFIED (request rejected before the application handler)');
      return;
    }
    console.log(`${label}: PASS (HTTP ${response.status})`);
    if(label==='Game catalog') console.log('Games: '+(Array.isArray(data)?data.map(g=>`${g.id} (${g.is_active?'active':'disabled'})`).join(', '):'unexpected payload'));
    if(label==='Authentication settings') console.log(`Email login enabled: ${data?.external?.email === true}; email auto-confirm: ${data?.mailer_autoconfirm === true}`);
    return data;
  } catch(error) {failures++;console.log(`${label}: FAIL (${error.cause?.code || error.name})`);}
}
await check('Game catalog','/rest/v1/games?select=id,is_active');
await check('Achievements catalog','/rest/v1/achievements?select=id');
await check('Leaderboard function','/rest/v1/rpc/get_leaderboard',{method:'POST',body:JSON.stringify({p_game:null,p_weekly:false})});
await check('Authentication settings','/auth/v1/settings');
await check('Game endpoint rejects unauthenticated requests','/functions/v1/game-api',{method:'POST',body:JSON.stringify({action:'start',game_id:'snake'})},401);
console.log('No account was created and no game data was changed.');
process.exitCode=failures?1:0;
