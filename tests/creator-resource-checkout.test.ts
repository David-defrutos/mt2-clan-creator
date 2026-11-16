import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

test('audited catalog bytes survive a Git checkout with core.autocrlf=true',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'creator-resource-checkout-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const git=(...args:string[])=>execFileSync('git',['-c','core.autocrlf=true',...args],{cwd:root,windowsHide:true,stdio:'pipe'});
 await fs.mkdir(path.join(root,'catalog/examples'),{recursive:true});await fs.copyFile('.gitattributes',path.join(root,'.gitattributes'));
 const bytes=Buffer.from('{\n  "id": "AuditedCard",\n  "amount": 7\n}\n'),file=path.join(root,'catalog/examples/example.json');await fs.writeFile(file,bytes);
 git('init','-q');git('add','.');git('-c','user.name=Creator test','-c','user.email=creator@example.invalid','commit','-qm','resource fixture');await fs.unlink(file);git('checkout','--','catalog/examples/example.json');
 assert.equal(createHash('sha256').update(await fs.readFile(file)).digest('hex'),createHash('sha256').update(bytes).digest('hex'));
});
// 2026-11-16-2209||codex-clan-editor||clan-creator/tests/creator-resource-checkout.test.ts||Probar checkout Git con autocrlf activo para impedir regresión de hashes auditados en Windows
