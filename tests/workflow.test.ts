import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import data from '../examples/defined-detail.json' with {type:'json'};
import {projectSchema,stageHash,reviewStatus,generationBlockers,candidateCoverage,dialogueHash,audit,digest,type Project,type Stage} from '../src/project.ts';
import {reserveRequest,recordTask,committedCredits} from '../src/spend.ts';
import {assetPath} from '../src/io.ts';

function fresh():Project{return projectSchema.parse(structuredClone(data));}
async function approve(p:Project,stage:Stage,at=new Date().toISOString()):Promise<void>{p.reviews.push({stage,inputHash:await stageHash(p,stage),decision:'approved',reviewer:'Test reviewer',at,note:'Test fixture only. Never shipped as approval.',evidence:['Fixture review']});}
async function ready():Promise<Project>{const p=fresh();p.assets.push({id:'voice',path:'.videobase/assets/voice.wav',kind:'audio',sha256:'a'.repeat(64)});p.voice.recordingAsset='voice';p.voice.recordingUrl='https://example.com/voice.wav';p.voice.recordingDuration=6.5;p.voice.recordingScriptHash=await digest(p.script.closingCopy);p.script.captions.push({kind:'narration',text:p.script.closingCopy,start:12.1,end:18.6});p.policy.maxCredits=100;p.generation={enabled:true,tool:'mcp__codex_apps__runway_generate_video',workspaceId:1,arguments:{model:'example',promptText:'Fixture only',duration:5,ratio:'9:16',resolution:'720p',generateAudio:false},quote:{credits:40,checkedAt:new Date().toISOString(),source:'https://example.com/quote',notes:'Test quote'}};for(const s of ['brief','script','voice','animatic','spend'] as const)await approve(p,s);return p;}
test('the supplied project is blocked, with no prefilled approvals or credit request',async()=>{const p=fresh();assert.equal(p.reviews.length,0);assert.equal(p.policy.maxCredits,0);assert.equal(p.generation,null);assert.ok((await generationBlockers(p)).some(x=>x.includes('voice')));});
test('changing closing copy invalidates script, voice, animatic and spend approvals',async()=>{const p=await ready();p.script.closingCopy+=' Changed.';for(const s of ['script','voice','animatic','spend'] as const)assert.equal(await reviewStatus(p,s),'stale');assert.equal(await reviewStatus(p,'brief'),'approved');});
test('changing the underlying voice file invalidates the voice review',async()=>{const p=await ready();p.assets.find(a=>a.id==='voice')!.sha256='b'.repeat(64);assert.equal(await reviewStatus(p,'voice'),'stale');});
test('retiming the edit invalidates animatic and spend but preserves the voice selection',async()=>{const p=await ready();p.timeline.at(-1)!.duration++;assert.equal(await reviewStatus(p,'animatic'),'stale');assert.equal(await reviewStatus(p,'spend'),'stale');assert.equal(await reviewStatus(p,'voice'),'approved');});
test('an older imported approval cannot override a newer request for changes',async()=>{const p=fresh();const now=Date.now();await approve(p,'script',new Date(now-60_000).toISOString());const r=p.reviews[0]!;p.reviews.push({...r,decision:'changes',at:new Date(now-20_000).toISOString()});p.reviews.push({...r});assert.equal(await reviewStatus(p,'script'),'changes');});
test('a reference voice does not count as a business recording',async()=>{const p=fresh();assert.ok((await audit(p)).some(x=>x.code==='voice-missing'));});
test('a recording of a different script blocks production',async()=>{const p=await ready();p.voice.recordingScriptHash='b'.repeat(64);assert.ok((await audit(p)).some(x=>x.code==='voice-script'));});
test('a long recording requires an extended edit',async()=>{const p=await ready();p.voice.recordingDuration=12;assert.ok((await audit(p)).some(x=>x.code==='voice-fit'));});
test('rushing speech, crowding reactions and short closes are separate blockers',async()=>{const p=fresh();p.script.lines[0]!.text='Please compare the different mobile contracts for our business.';p.script.lines[0]!.end=.5;p.policy.voiceStart=6;p.timeline.at(-1)!.duration=2.5;const codes=(await audit(p)).map(f=>f.code);assert.ok(codes.includes('rushed-line'));assert.ok(codes.includes('reaction'));assert.ok(codes.includes('endcard'));});
test('dialogue may not be time-stretched to fit',()=>{const p=fresh();p.timeline[0]!.speed=1.2;assert.throws(()=>projectSchema.parse(p),/time-stretch/);});
test('signed URLs and traversal paths cannot enter the public project manifest',()=>{const p=fresh();p.voice.referenceUrl='https://example.com/voice?_jwt=private';assert.throws(()=>projectSchema.parse(p));const q=fresh();q.assets[0]!.path='../secret';assert.throws(()=>projectSchema.parse(q));});
test('generation quotes expire and cannot exceed the cap',async()=>{const p=await ready();p.generation!.quote.checkedAt='2020-01-01T00:00:00.000Z';p.generation!.quote.credits=101;const blocks=await generationBlockers(p);assert.ok(blocks.some(x=>x.includes('Refresh')));assert.ok(blocks.some(x=>x.includes('cap')));});
test('only the exact reviewed candidate artifacts can receive final approval',async()=>{const p=await ready();p.delivery={artifacts:[{profile:'reels',path:'.videobase/render.mp4',sha256:'a'.repeat(64)}],technicalChecks:['decode']};await approve(p,'final');p.delivery.artifacts[0]!.sha256='b'.repeat(64);assert.equal(await reviewStatus(p,'final'),'stale');});
test('a duplicate reservation never submits a second request',async()=>{const root=await mkdtemp(path.join(tmpdir(),'videobase-'));try{const p=await ready();await reserveRequest(root,p);await assert.rejects(reserveRequest(root,p),/already has a reservation/);const ledger=JSON.parse(await readFile(path.join(root,'.videobase/ledger.json'),'utf8')) as unknown[];assert.equal(ledger.length,1);}finally{await rm(root,{recursive:true,force:true});}});
test('concurrent reservations cannot both consume the same cap',async()=>{const root=await mkdtemp(path.join(tmpdir(),'videobase-'));try{const p=await ready();const attempts=await Promise.allSettled([reserveRequest(root,p),reserveRequest(root,p)]);assert.equal(attempts.filter(x=>x.status==='fulfilled').length,1);}finally{await rm(root,{recursive:true,force:true});}});
test('task receipts are idempotent and cannot be rebound to another provider task',async()=>{const root=await mkdtemp(path.join(tmpdir(),'videobase-'));try{const p=await ready();const result=await reserveRequest(root,p) as {requestId:string};await recordTask(root,result.requestId,'task-a',39);await recordTask(root,result.requestId,'task-a',39);await assert.rejects(recordTask(root,result.requestId,'task-b',39),/different task/);assert.equal(committedCredits(JSON.parse(await readFile(path.join(root,'.videobase/ledger.json'),'utf8')),p.id),39);}finally{await rm(root,{recursive:true,force:true});}});
test('asset boundary checks reject an existing file outside the workspace',async()=>{const root=await mkdtemp(path.join(tmpdir(),'videobase-'));try{const workspace=path.join(root,'workspace');await mkdir(workspace);await writeFile(path.join(workspace,'inside'),'ok');await writeFile(path.join(root,'outside'),'private');assert.equal(await assetPath(workspace,'inside'),path.join(workspace,'inside'));await assert.rejects(assetPath(workspace,'../outside'),/outside project workspace/);}finally{await rm(root,{recursive:true,force:true});}});
test('separate requests share the same total project cap',async()=>{const root=await mkdtemp(path.join(tmpdir(),'videobase-'));try{const p=await ready();p.policy.maxCredits=60;await approve(p,'animatic');await approve(p,'spend');await reserveRequest(root,p);p.generation!.arguments.promptText='Different take';await approve(p,'spend');await assert.rejects(reserveRequest(root,p),/exceed the project cap/);}finally{await rm(root,{recursive:true,force:true});}});
test('release cannot promote a technically generated but unreviewed candidate',async()=>{const {release}=await import('../src/render.ts');const p=await ready();await assert.rejects(release(process.cwd(),p),/final human approval/);});
test('future-dated approvals are not valid',async()=>{const p=fresh();await approve(p,'script',new Date(Date.now()+3_600_000).toISOString());assert.equal(await reviewStatus(p,'script'),'stale');});


test('an exact narrator requirement rejects a recreated reference while remaining opt-in',()=>{
 const p=fresh();p.voice.recordingProvenance={method:'reference-recreation',referenceVoiceId:p.voice.voiceId};
 assert.ok(!candidateCoverage(p).some(f=>f.code==='voice-exact-selected'));
 p.voice.requireExactSelectedVoice=true;
 const roundtrip=projectSchema.parse(JSON.parse(JSON.stringify(p)));
 assert.equal(roundtrip.voice.requireExactSelectedVoice,true);
 assert.ok(candidateCoverage(roundtrip).some(f=>f.code==='voice-exact-selected'));
 p.voice.requireExactSelectedVoice=false;
 assert.ok(!candidateCoverage(p).some(f=>f.code==='voice-exact-selected'));
});
test('only library or existing recordings of the selected voice satisfy exact identity',()=>{
 const p=fresh();p.voice.requireExactSelectedVoice=true;
 for(const method of ['library','existing-recording'] as const){
  p.voice.recordingProvenance={method,referenceVoiceId:p.voice.voiceId};
  assert.ok(!candidateCoverage(p).some(f=>f.code==='voice-exact-selected'));
  p.voice.recordingProvenance.referenceVoiceId='another-voice';
  assert.ok(candidateCoverage(p).some(f=>f.code==='voice-exact-selected'));
  delete p.voice.recordingProvenance.referenceVoiceId;
  assert.ok(candidateCoverage(p).some(f=>f.code==='voice-exact-selected'));
 }
 p.voice.recordingProvenance={method:'human-recording',referenceVoiceId:p.voice.voiceId};
 assert.ok(candidateCoverage(p).some(f=>f.code==='voice-exact-selected'));
 delete p.voice.recordingProvenance;
 assert.ok(candidateCoverage(p).some(f=>f.code==='voice-exact-selected'));
});
test('exact narrator verification does not change generation reservation eligibility',async()=>{
 const p=await ready();p.voice.requireExactSelectedVoice=true;
 p.voice.recordingProvenance={method:'reference-recreation',referenceVoiceId:p.voice.voiceId};
 for(const stage of ['brief','script','voice','animatic','spend'] as const)await approve(p,stage);
 assert.deepEqual(await generationBlockers(p),[]);
 assert.ok(candidateCoverage(p).some(f=>f.code==='voice-exact-selected'));
});
test('imported current approvals cannot release a recreated voice as the exact selected narrator',async()=>{
 const {release}=await import('../src/render.ts');const p=await ready();
 p.voice.requireExactSelectedVoice=true;
 p.voice.recordingProvenance={method:'reference-recreation',referenceVoiceId:p.voice.voiceId};
 for(const stage of ['brief','script','voice','animatic','spend','final'] as const)await approve(p,stage);
 assert.equal(await reviewStatus(p,'final'),'approved');
 await assert.rejects(release(process.cwd(),p),/exact selected narrator requires a library or existing recording/);
});


test('closing music timing and gain invalidate the edit and final review without changing the voice',async()=>{
 const p=await ready();p.assets.push({id:'music',path:'.videobase/assets/music.mp3',kind:'audio',sha256:'c'.repeat(64)});
 p.music={assetId:'music',start:12.1,volumeDb:-26,fadeIn:.4,fadeOut:.8};
 for(const stage of ['voice','animatic','spend','final'] as const)await approve(p,stage);
 p.music.volumeDb=-23;
 for(const stage of ['animatic','spend','final'] as const)assert.equal(await reviewStatus(p,stage),'stale');
 assert.equal(await reviewStatus(p,'voice'),'approved');
 await approve(p,'animatic');p.music.start+=.1;assert.equal(await reviewStatus(p,'animatic'),'stale');
});
test('closing music cannot enter the character exchange or its reserved reaction',async()=>{
 const p=await ready();p.assets.push({id:'music',path:'.videobase/assets/music.mp3',kind:'audio',sha256:'c'.repeat(64)});
 const earliest=p.script.lines.reduce((end,line)=>Math.max(end,line.end),0)+p.policy.minReactionSeconds;
 p.music={assetId:'music',start:earliest-.01,volumeDb:-26,fadeIn:.4,fadeOut:.8};
 assert.ok((await audit(p)).some(f=>f.code==='music-reaction'));
 p.music.start=earliest;assert.ok(!(await audit(p)).some(f=>f.code==='music-reaction'));
});
test('closing music needs a real audio asset and fades that fit inside the edit',async()=>{
 const p=await ready();p.music={assetId:'missing-music',start:12.1,volumeDb:-26,fadeIn:.4,fadeOut:.8};
 assert.ok((await audit(p)).some(f=>f.code==='music-asset'));
 p.music.assetId=p.assets.find(a=>a.kind!=='audio')!.id;
 assert.ok((await audit(p)).some(f=>f.code==='music-asset'));
 p.music.assetId='voice';p.music.start=p.timeline.reduce((n,s)=>n+s.duration,0)-.5;
 assert.ok((await audit(p)).some(f=>f.code==='music-fit'));
});


test('an ordinary two-word answer receives a listening note without padding its speech window',async()=>{
 const p=fresh();p.script.lines=[{speaker:'Speaker',text:'I do.',performance:'A natural answer.',start:3.42,end:3.92}];
 const original=structuredClone(p.script.lines);const findings=await audit(p);
 const note=findings.find(f=>f.code==='short-line-rate');
 assert.equal(note?.level,'note');assert.match(note!.message,/240 words\/minute/);
 assert.ok(!findings.some(f=>f.code==='rushed-line'));
 assert.deepEqual(p.script.lines,original);
});
test('a nine-word line crammed into two seconds retains the sustained-rate block',async()=>{
 const p=fresh();p.script.lines=[{speaker:'Speaker',text:'Please compare the different mobile contracts for our business.',performance:'A full sentence.',start:0,end:2}];
 const findings=await audit(p);const rushed=findings.find(f=>f.code==='rushed-line');
 assert.equal(rushed?.level,'block');assert.match(rushed!.message,/270 words\/minute/);
 assert.ok(!findings.some(f=>f.code==='short-line-rate'));
});


async function coverageRequest(purpose:'process'|'result'):Promise<Project>{
 const p=await ready();p.brief.format='acted-comedy';
 if(p.generation?.tool!=='mcp__codex_apps__runway_generate_video')throw Error('Video fixture required');
 p.generation.purpose=purpose;
 for(const stage of ['brief','script','voice','animatic','spend'] as const)await approve(p,stage);
 return p;
}
async function bindFixtureScene(p:Project):Promise<void>{
 p.assets.push({id:'fixture-spoken-scene',path:'.videobase/assets/fixture-scene.mp4',kind:'video',sha256:'d'.repeat(64),scriptHash:await dialogueHash(p)});
 p.timeline.unshift({id:'fixture-setup',label:'Fixture spoken setup',role:'setup',kind:'video',assetId:'fixture-spoken-scene',sourceStart:0,duration:10,audioUntil:10,spoken:true,speed:1,purpose:'Test workflow evidence only.',voicePlaceholder:false});
}
async function refreshFixtureReviews(p:Project):Promise<void>{for(const stage of ['brief','script','voice','animatic','spend'] as const)await approve(p,stage);}
test('acted comedy cannot buy process or result coverage before a current script-bound scene',async()=>{
 for(const purpose of ['process','result'] as const){
  const p=await coverageRequest(purpose);
  assert.ok((await generationBlockers(p)).some(x=>x.includes('current script-bound spoken scene')));
  await bindFixtureScene(p);p.script.lines[0]!.text='A changed opening line.';await refreshFixtureReviews(p);
  assert.ok((await generationBlockers(p)).some(x=>x.includes('current script-bound spoken scene')));
 }
});
test('current spoken scene evidence permits coverage without requiring exact narrator provenance',async()=>{
 for(const purpose of ['process','result'] as const){
  const p=await coverageRequest(purpose);await bindFixtureScene(p);
  p.voice.requireExactSelectedVoice=true;p.voice.recordingProvenance={method:'reference-recreation',referenceVoiceId:p.voice.voiceId};
  await refreshFixtureReviews(p);
  assert.deepEqual(await generationBlockers(p),[]);
  assert.ok(candidateCoverage(p).some(f=>f.code==='voice-exact-selected'));
 }
});
test('actor-first coverage evidence does not block an initial scene, reference image or caption-led brief',async()=>{
 const p=await coverageRequest('process');
 if(p.generation?.tool!=='mcp__codex_apps__runway_generate_video')throw Error('Video fixture required');
 p.generation.purpose='scene';p.generation.arguments.generateAudio=true;await refreshFixtureReviews(p);
 assert.deepEqual(await generationBlockers(p),[]);
 p.generation={enabled:true,tool:'mcp__codex_apps__runway_generate_image',purpose:'reference',workspaceId:1,arguments:{model:'fixture',promptText:'One reference image'},quote:{credits:20,checkedAt:new Date().toISOString(),source:'https://example.com/quote',notes:'Test fixture quote'}};
 await refreshFixtureReviews(p);assert.deepEqual(await generationBlockers(p),[]);
 const q=await coverageRequest('result');q.brief.format='caption-led';q.script.format='caption-led';q.script.lines=[];
 q.script.displayCopy=[{text:'A clean car.',start:0,end:1}];q.script.captions=[{kind:'display',...q.script.displayCopy[0]!},...q.script.captions.filter(c=>c.kind==='narration')];
 await refreshFixtureReviews(q);assert.deepEqual(await generationBlockers(q),[]);
});
