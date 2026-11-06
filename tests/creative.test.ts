import {test} from 'node:test';
import assert from 'node:assert/strict';
import latest from '../examples/defined-detail-colour.json' with {type:'json'};
import {projectSchema,stageHash,reviewStatus,generationBlockers,developmentAuthorized,candidateCoverage,type Project} from '../src/project.ts';
import {creativeAudit,promptPack,closingCopy} from '../src/creative.ts';
import {reserveRequest} from '../src/spend.ts';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const fresh=()=>projectSchema.parse(structuredClone(latest));
async function ready():Promise<Project>{
 const p=fresh();p.voice.recordingAsset='fixture-voice';p.voice.recordingDuration=6.5;
 p.assets.push({id:'fixture-voice',path:'.videobase/fixture.wav',kind:'audio',sha256:'a'.repeat(64)});
 const {digest}=await import('../src/project.ts');p.voice.recordingScriptHash=await digest(p.script.closingCopy);
 p.timeline=[{id:'plan',kind:'card',label:'Fixture only',duration:23,sourceStart:0,audioUntil:0,spoken:false,speed:1,purpose:'Unit test fixture, not footage',voicePlaceholder:false}];
 p.script.captions=p.script.captions.filter(c=>c.kind==='dialogue');p.script.captions.push({kind:'narration',text:p.script.closingCopy,start:14,end:20.5});
 p.generation={enabled:true,purpose:'scene',takeLabel:'fixture',tool:'mcp__codex_apps__runway_generate_video',workspaceId:1,arguments:{model:'fixture',promptText:promptPack(p).scene,duration:10,ratio:'9:16',resolution:'1080p',generateAudio:true},quote:{credits:400,checkedAt:new Date().toISOString(),source:'https://example.com/quote',notes:'Fixture only'}};
 return p;
}
test('the featured dossier contains alternatives and no fabricated human approvals',()=>{
 const p=fresh();assert.ok(p.creative!.concepts.length>=5);assert.deepEqual(p.reviews,[]);assert.equal(p.policy.maxCredits,null);
 assert.equal(creativeAudit(p).filter(x=>x.level==='block').length,0);
});
test('a generic Adam sentence cannot replace the actual branded close',()=>{
 const p=fresh();p.script.closingCopy="There's a simpler way.";
 assert.ok(creativeAudit(p).some(x=>x.code==='closing-copy'));
});
test('a spoken close for a different business is blocked',()=>{
 const p=fresh();p.creative!.spokenClose.businessName='Another company';p.script.closingCopy=closingCopy(p.creative!);
 assert.ok(creativeAudit(p).some(x=>x.code==='closing-business'));
});
test('beauty coverage alone does not count as showing the service',()=>{
 const p=fresh();p.creative!.coverage=p.creative!.coverage.filter(x=>x.role==='result');
 assert.ok(creativeAudit(p).some(x=>x.code==='coverage-process'));assert.throws(()=>promptPack(p));
});
test('changing the selected line cannot silently leave the production script behind',()=>{
 const p=fresh();p.creative!.concepts[0]!.dialogue[1]!.text='Different words.';
 assert.ok(creativeAudit(p).some(x=>x.code==='concept-script-mismatch'));assert.throws(()=>promptPack(p));
});
test('the compiled pack preserves exact dialogue and excludes rejected scenes',()=>{
 const p=fresh();const pack=promptPack(p);
 for(const l of p.script.lines)assert.ok(pack.scene.includes('"'+l.text+'"'));
 assert.equal(pack.voice.text,p.script.closingCopy);assert.equal(pack.coverage.length,2);
 assert.ok(!pack.scene.includes('Kitchen'));assert.ok(!pack.scene.includes('fossil'));
});
test('a rejected concept remains blocked even with development authority and no credit ceiling',async()=>{
 const p=await ready();p.creative!.selectedId='funeral';assert.ok((await generationBlockers(p)).some(x=>x.includes('rejected')));
});
test('explicit development authority permits development without manufacturing approvals',async()=>{
 const p=await ready();assert.ok(developmentAuthorized(p));assert.deepEqual(p.reviews,[]);assert.deepEqual(await generationBlockers(p),[]);
});
test('removing development authority restores the review requirements',async()=>{
 const p=await ready();delete p.authorization;assert.ok((await generationBlockers(p)).includes('script: pending'));
});
test('no credit ceiling never disables the current quote or exact-script checks',async()=>{
 const p=await ready();p.generation!.quote.checkedAt='2020-01-01T00:00:00.000Z';p.generation!.arguments.promptText='Unrelated footage';
 const blocks=await generationBlockers(p);assert.ok(blocks.some(x=>x.includes('Refresh')));assert.ok(blocks.some(x=>x.includes('exact selected')));
});
test('an uncapped project retains duplicate-request protection',async()=>{
 const p=await ready();const root=await mkdtemp(path.join(tmpdir(),'videobase-unlimited-'));
 try{await reserveRequest(root,p);await assert.rejects(reserveRequest(root,p),/already has a reservation/);}finally{await rm(root,{recursive:true,force:true});}
});
test('null survives JSON as an explicit unlimited budget rather than becoming zero',()=>{
 const p=fresh();const roundtrip=projectSchema.parse(JSON.parse(JSON.stringify(p)));assert.equal(roundtrip.policy.maxCredits,null);
});
test('a future-dated development grant cannot bypass review',async()=>{
 const p=await ready();p.authorization!.at=new Date(Date.now()+3_600_000).toISOString();assert.equal(developmentAuthorized(p),false);assert.ok((await generationBlockers(p)).some(x=>x.includes('future')));
});
test('a coverage plan cannot masquerade as actual process and result footage',()=>{
 const p=fresh();const blocks=candidateCoverage(p);assert.ok(blocks.some(x=>x.code==='candidate-process'));assert.ok(blocks.some(x=>x.code==='candidate-result'));
});
test('a revised concept invalidates the old script review and final artifact review',async()=>{
 const p=await ready();
 for(const stage of ['script','final'] as const)p.reviews.push({stage,inputHash:await stageHash(p,stage),decision:'approved',reviewer:'Fixture reviewer',at:new Date().toISOString(),note:'Test fixture only, never shipped',evidence:['Unit test']});
 p.creative!.concepts[0]!.visualPayoff='A different outcome';
 assert.equal(await reviewStatus(p,'script'),'stale');assert.equal(await reviewStatus(p,'final'),'stale');
});
test('development authority never acts as final human approval',async()=>{
 const p=await ready();const {release}=await import('../src/render.ts');await assert.rejects(release(process.cwd(),p),/final human approval/);
});

test('refreshing a price quote cannot disguise an identical paid request',async()=>{
 const p=await ready();const root=await mkdtemp(path.join(tmpdir(),'videobase-quote-'));
 try{
  await reserveRequest(root,p);p.generation!.quote.checkedAt=new Date(Date.now()-1000).toISOString();p.generation!.quote.credits=401;
  await assert.rejects(reserveRequest(root,p),/already has a reservation/);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('an intentional additional take is named and accounted for under an uncapped project',async()=>{
 const p=await ready();const root=await mkdtemp(path.join(tmpdir(),'videobase-takes-'));
 try{
  const a=await reserveRequest(root,p) as {requestId:string};
  p.generation!.takeLabel='deliberate second performance';
  const b=await reserveRequest(root,p) as {requestId:string};assert.notEqual(a.requestId,b.requestId);
  const {readFile}=await import('node:fs/promises');const ledger=JSON.parse(await readFile(path.join(root,'.videobase/ledger.json'),'utf8')) as Array<{credits:number}>;
  assert.equal(ledger.reduce((n,x)=>n+x.credits,0),800);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('reference-image requests retain their own typed inputs without scene-dialogue requirements',async()=>{
 const p=await ready();p.generation={enabled:true,purpose:'reference',takeLabel:'clean reference',tool:'mcp__codex_apps__runway_generate_image',workspaceId:1,arguments:{model:'fixture',promptText:'One clean blue car reference',ratio:'9:16',count:1},quote:{credits:41,checkedAt:new Date().toISOString(),source:'https://example.com/quote',notes:'Fixture image quote'}};
 assert.equal(projectSchema.parse(p).generation!.tool,'mcp__codex_apps__runway_generate_image');assert.deepEqual(await generationBlockers(p),[]);
});
test('reference inputs cannot leak a signed provider URL into the public project',()=>{
 const p=fresh();p.generation={enabled:true,purpose:'reference',tool:'mcp__codex_apps__runway_generate_image',workspaceId:1,arguments:{model:'fixture',promptText:'Reference fixture',referenceImages:[{url:'https://example.com/image?_jwt=secret'}]},quote:{credits:1,checkedAt:new Date().toISOString(),source:'https://example.com/quote',notes:'Fixture'}};
 assert.throws(()=>projectSchema.parse(p));
});

test('an honest caption-led cut has no invented character performance',async()=>{
 const {default:visual}=await import('../examples/defined-detail-colour-visual.json',{with:{type:'json'}});
 const p=projectSchema.parse(visual);
 assert.equal(p.script.format,'caption-led');assert.deepEqual(p.script.lines,[]);
 assert.equal(creativeAudit(p).filter(x=>x.level==='block').length,0);
 assert.equal(candidateCoverage(p).filter(x=>x.level==='block').length,0);
});
test('caption-led copy stays bound to the selected concept',async()=>{
 const {default:visual}=await import('../examples/defined-detail-colour-visual.json',{with:{type:'json'}});
 const p=projectSchema.parse(structuredClone(visual));p.script.displayCopy![0]!.text='Different words';
 assert.ok(creativeAudit(p).some(x=>x.level==='block'));
});
test('a still photograph cannot stand in for an acted spoken setup',()=>{
 const p=fresh();
 assert.ok(candidateCoverage(p).some(x=>x.code==='candidate-dialogue'));
});

test('the renderer cannot silently use different visible headlines',async()=>{
 const {default:visual}=await import('../examples/defined-detail-colour-visual.json',{with:{type:'json'}});
 const p=projectSchema.parse(structuredClone(visual));p.script.captions.find(c=>c.kind==='display')!.text='Different headline';
 const {audit}=await import('../src/project.ts');
 assert.ok((await audit(p)).some(x=>x.code==='display-captions'));
});
