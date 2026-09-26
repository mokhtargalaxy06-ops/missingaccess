import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.DATA_DIR = mkdtempSync(path.join(os.tmpdir(), 'missing-access-test-'));
const { db } = require('../lib/db') as typeof import('../lib/db');
const { addContribution, reviewContribution, getRequest, audioMime, listRequests } = require('../lib/workflow') as typeof import('../lib/workflow');
const { passwordHash, verifyPassword, checkOrigin } = require('../lib/security') as typeof import('../lib/security');
const volunteer = { id: 'volunteer', name: 'Volunteer', email: 'volunteer@test.example', role: 'volunteer' as const };
const reviewer = { id: 'reviewer', name: 'Reviewer', email: 'reviewer@test.example', role: 'reviewer' as const };
const another = { id: 'another', name: 'Another', email: 'another@test.example', role: 'volunteer' as const };
for (const user of [volunteer, reviewer, another]) db().prepare('INSERT INTO users(id,name,email,password,role) VALUES (?,?,?,?,?)').run(user.id,user.name,user.email,passwordHash('long-test-password'),user.role);
after(()=>{db().close();});

test('passwords are salted and verified',()=>{
  const first=passwordHash('long-password'),second=passwordHash('long-password');
  assert.notEqual(first,second); assert.equal(verifyPassword('long-password',first),true); assert.equal(verifyPassword('wrong-password',first),false);
});
test('board contains sourced Quran content and keeps legacy records out of the active app',()=>{
  const rows=listRequests();
  assert.equal(rows.length,6);
  for(const row of rows){
    assert.equal(row.source_kind,'quran');
    assert.match(row.source_arabic,/[\u0600-\u06ff]/);
    assert.match(row.source_url,/^https:\/\/quranenc\.com\//);
    assert.ok(row.source_text.length>0);
  }
  db().prepare("INSERT INTO requests(id,title,description,language,category,source_text,source_label,source_kind) VALUES ('legacy','Old community request','Preserved historical data','English','Community','Original community text','Original','community')").run();
  assert.equal(listRequests().some(r=>r.id==='legacy'),false);
  assert.throws(()=>getRequest('legacy'),/not found/);
  assert.ok(db().prepare("SELECT 1 FROM requests WHERE id='legacy'").get());
});
test('cross-site mutations are refused',()=>{
  assert.throws(()=>checkOrigin(new Request('http://localhost:3000/api/auth',{headers:{origin:'https://untrusted.example'}})),/different website/);
  assert.doesNotThrow(()=>checkOrigin(new Request('http://localhost:3000/api/auth',{headers:{origin:'http://localhost:3000'}})));
});
test('origin validation uses the browser host and preserves strict origin boundaries',()=>{
  const previous = process.env.APP_ORIGIN;
  delete process.env.APP_ORIGIN;
  const request = (origin: string, extra: Record<string,string> = {}) => new Request('http://localhost:3000/api/auth', { headers: { host: '127.0.0.1:3000', origin, ...extra } });
  try {
    assert.doesNotThrow(()=>checkOrigin(request('http://127.0.0.1:3000')));
    assert.throws(()=>checkOrigin(request('https://untrusted.example')),/different website/);
    assert.throws(()=>checkOrigin(request('http://127.0.0.1:3001')),/different website/);
    assert.throws(()=>checkOrigin(request('http://127.0.0.1:3000',{'sec-fetch-site':'cross-site'})),/Cross-site/);
    process.env.APP_ORIGIN = 'https://community.example';
    assert.doesNotThrow(()=>checkOrigin(request('https://community.example')));
    assert.throws(()=>checkOrigin(request('http://127.0.0.1:3000')),/different website/);
  } finally {
    if (previous === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = previous;
  }
});
test('only one active contribution is accepted and volunteer cannot review',()=>{
  const id=addContribution(volunteer,'quran-french_montada-1-1','file-one','audio/wav','');
  assert.equal(getRequest('quran-french_montada-1-1').status,'review');
  assert.throws(()=>addContribution(another,'quran-french_montada-1-1','file-two','audio/wav',''),/already has a recording/);
  assert.throws(()=>reviewContribution(volunteer,id,'approved',''),/Reviewer access/);
  assert.equal(getRequest('quran-french_montada-1-1').status,'review');
  reviewContribution(reviewer,id,'approved','Clear and accurate.');
  assert.equal(getRequest('quran-french_montada-1-1').status,'completed');
  assert.equal(listRequests().find(r=>r.id==='quran-french_montada-1-1')?.audio_id,id);
  assert.throws(()=>reviewContribution(reviewer,id,'rejected','Please change this.'),/already been reviewed/);
});
test('reviewer cannot approve their own audio',()=>{
  const id=addContribution(reviewer,'quran-english_rwwad-1-2','file-three','audio/wav','');
  assert.throws(()=>reviewContribution(reviewer,id,'approved',''),/different reviewer/);
  assert.equal(getRequest('quran-english_rwwad-1-2').status,'review');
});
test('changes need feedback and reopen the request for a new recording',()=>{
  const id=addContribution(volunteer,'quran-french_montada-94-5','file-four','audio/wav','');
  assert.throws(()=>reviewContribution(reviewer,id,'rejected',''),/Review note/);
  reviewContribution(reviewer,id,'rejected','Please read the last sentence again.');
  assert.equal(getRequest('quran-french_montada-94-5').status,'open');
  assert.equal(db().prepare('SELECT status FROM contributions WHERE id=?').get(id)?.status,'rejected');
  const second=addContribution(volunteer,'quran-french_montada-94-5','file-five','audio/wav','Corrected.');
  reviewContribution(reviewer,second,'approved','');
  assert.equal(getRequest('quran-french_montada-94-5').status,'completed');
});
test('audio signature validation refuses renamed text and supports WAV',()=>{
  assert.equal(audioMime(Buffer.from('<html>fake recording</html>')),null);
  const wav=Buffer.alloc(44);wav.write('RIFF',0);wav.write('WAVE',8);
  assert.equal(audioMime(wav),'audio/wav');
  assert.equal(audioMime(Buffer.alloc(0)),null);
});
