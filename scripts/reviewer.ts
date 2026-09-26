import { db } from '../lib/db';
const email = process.argv[2]?.trim().toLowerCase();
if (!email) { console.error('Usage: npm run reviewer -- your@email.com (create the account in the app first)'); process.exit(1); }
const result = db().prepare("UPDATE users SET role='reviewer' WHERE email=?").run(email);
if (!result.changes) { console.error('Account not found. Register in the app first.'); process.exit(1); }
console.log('Reviewer access granted. Refresh the app to see the review queue.');
