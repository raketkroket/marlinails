// Creates the secrets for the website editor. The password itself is never stored or printed:
// only its scrypt hash, which goes into the Vercel environment variable ADMIN_PASSWORD_HASH.
// Usage: npm run admin:wachtwoord   (asks for the password twice, hidden)
import { randomBytes } from 'node:crypto';
import { stdin, stdout } from 'node:process';
import { hashPassword } from '../api/_lib/auth.js';

// Piped input (no terminal): read all lines once.
let piped = null;
async function pipedLine() {
  if (!piped) {
    let data = '';
    stdin.setEncoding('utf8');
    for await (const chunk of stdin) data += chunk;
    piped = data.split(/\r?\n/);
  }
  return piped.shift() ?? '';
}

function ask(question) {
  if (!stdin.isTTY) {
    stdout.write(question);
    return pipedLine().then(line => { stdout.write('\n'); return line; });
  }
  return new Promise(resolve => {
    stdout.write(question);
    let answer = '';
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    const onKey = key => {
      if (key === '\u0003') { stdout.write('\n'); process.exit(1); }
      if (key === '\r' || key === '\n') {
        stdin.setRawMode(false); stdin.pause(); stdin.off('data', onKey); stdout.write('\n'); resolve(answer); return;
      }
      if (key === '\u007f' || key === '\b') { answer = answer.slice(0, -1); return; }
      answer += key;
    };
    stdin.on('data', onKey);
  });
}

const password = await ask('Nieuw wachtwoord voor het beheer (minimaal 12 tekens): ');
if (password.length < 12) {
  console.error('Het wachtwoord moet minimaal 12 tekens lang zijn.');
  process.exit(1);
}
if (password !== await ask('Herhaal het wachtwoord: ')) {
  console.error('De wachtwoorden zijn niet gelijk.');
  process.exit(1);
}
console.log(`
Zet deze waarden in Vercel → Project → Settings → Environment Variables (Production),
en klik daarna op Redeploy. Deel ze met niemand en zet ze niet in de code.

ADMIN_PASSWORD_HASH=${await hashPassword(password)}
ADMIN_SESSION_SECRET=${randomBytes(32).toString('base64url')}

(ADMIN_SESSION_SECRET hoeft bij een nieuw wachtwoord niet te veranderen. Een nieuw
wachtwoord logt automatisch alle bestaande sessies uit.)`);
