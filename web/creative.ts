import {creativeAudit,promptPack,emptyCreative,closingCopy} from '../src/creative.ts';
import type {Project} from '../src/project.ts';
const e=(s:unknown)=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
function field(label:string,id:string,value:string,rows=3):string{
 return '<label class="field">'+e(label)+'<textarea id="'+id+'" rows="'+rows+'">'+e(value)+'</textarea></label>';
}
export function creativeView(p:Project):string{
 const c=p.creative;
 if(!c)return '<div class="section-heading"><div><p class="eyebrow">01 / Ideas before filming</p><h2>Start with the service.</h2><p>Develop several situations, a visible service result and the actual branded read.</p></div></div><button class="primary" id="startCreative">Start creative development</button>';
 const findings=creativeAudit(p),blocks=findings.filter(f=>f.level==='block');
 let pack='';try{pack=promptPack(p).scene;}catch{/* The incomplete editorial case is shown above. */}
 return '<div class="section-heading"><div><p class="eyebrow">01 / Ideas before filming</p><h2>Make the service the story.</h2><p>Compare the opening, punchline and visible result. Developing an idea is an editorial choice; it does not approve a finished advert.</p></div><button class="outline" id="exportPromptPack" '+(blocks.length?'disabled':'')+'>Export filming directions</button></div>'+
 '<div class="creative-brief"><div><span class="eyebrow">What this advert must show</span><p>'+e(c.serviceTruth)+'</p><p class="small">'+e(c.audienceRecognition)+'</p></div><div><span class="eyebrow">The decision</span>'+field('Why this idea earns production','selectionReason',c.selectionReason,3)+'<button class="primary" id="saveSelectionReason">Save the reason</button></div></div>'+
 '<div class="concepts-grid">'+c.concepts.map((x,i)=>'<article class="concept-card '+(x.id===c.selectedId?'chosen':'')+'"><div class="concept-heading"><span class="eyebrow">Concept '+String(i+1).padStart(2,'0')+'</span><span class="tag '+(x.recommendation==='reject'?'rejected':'')+'">'+(x.id===c.selectedId?'Selected for development':e(x.recommendation))+'</span></div><h3>'+e(x.title)+'</h3><h4>The first frame</h4><p>'+e(x.firstFrame)+'</p><blockquote>'+e(x.punchline)+'</blockquote><h4>Why it belongs to the service</h4><p>'+e(x.serviceConnection)+'</p><h4>What the viewer sees at the end</h4><p>'+e(x.visualPayoff)+'</p><details><summary>Writing and performance</summary><div class="concept-editor">'+field('Title','title-'+x.id,x.title,1)+field('Opening image','firstFrame-'+x.id,x.firstFrame)+field('Situation','premise-'+x.id,x.premise)+field('Punchline','punchline-'+x.id,x.punchline,2)+field('Connection to the service','serviceConnection-'+x.id,x.serviceConnection)+field('Visible payoff','visualPayoff-'+x.id,x.visualPayoff)+field('Likely failure to inspect','risk-'+x.id,x.risk)+field('Character lines: one Speaker: line per row','dialogue-'+x.id,x.dialogue.map(l=>l.speaker+': '+l.text).join('\n'),4)+'<p class="small">New lines get estimated conversational spacing. Time the captions to the actual performance later.</p><button class="outline" data-save-concept="'+e(x.id)+'">Save this concept</button></div></details><p class="concept-risk"><b>Watch for:</b> '+e(x.risk)+'</p><button class="'+(x.id===c.selectedId?'quiet':'outline')+'" data-develop="'+e(x.id)+'" '+(x.recommendation==='reject'?'disabled':'')+'>'+(x.id===c.selectedId?'Selected':x.recommendation==='reject'?'Rejected direction':'Develop this idea')+'</button></article>').join('')+'</div>'+
 '<section class="editor-card coverage-editor"><h3>Show the work. Then show the result.</h3>'+field('Keep these things consistent','creativeContinuity',c.continuity)+
 ['process','result'].map(role=>{const shot=c.coverage.find(s=>s.role===role);return field(role==='process'?'Cleaning or service in progress':'Visible finished result','coverage-'+role,shot?.description??'');}).join('')+
 '<button class="outline" id="saveCoverage">Save the coverage</button></section>'+
 '<section class="editor-card"><h3>The actual branded ending</h3><div class="brief-grid">'+field('Business name','closeBusiness',c.spokenClose.businessName,1)+field('Service','closeService',c.spokenClose.service,2)+field('One action','closeAction',c.spokenClose.action,2)+'</div><p class="closing-preview">'+e(closingCopy(c))+'</p><button class="outline" id="saveCreativeClose">Save the closing script</button><p class="small">The actual recording must contain this copy. Keeping the same voice does not make an unrelated old sentence a branded ending.</p></section>'+
 '<details><summary>What the references teach us</summary>'+c.references.map(r=>'<p><a href="'+e(r.url)+'" target="_blank" rel="noopener">'+e(r.name)+'</a>: '+e(r.lesson)+'</p>').join('')+'</details>'+
 '<details><summary>Decisions from the rejected cuts</summary>'+c.rejectedLessons.map(r=>'<p><b>'+e(r.name)+'</b>: '+e(r.reason)+'</p><p class="small">'+e(r.evidence)+'</p>').join('')+'</details>'+
 '<div class="findings">'+findings.map(f=>'<p><span class="tag">'+(f.level==='block'?'Needs work':'Editorial judgment')+'</span> '+e(f.message)+'</p>').join('')+'</div>'+
 (pack?'<details><summary>Read the compiled filming direction</summary><pre class="prompt-copy">'+e(pack)+'</pre></details>':'');
}
export function bindCreative(p:Project,changed:(message:string)=>void):void{
 document.getElementById('startCreative')?.addEventListener('click',()=>{p.creative=emptyCreative(p.brand.name,p.brief.product);changed('Creative development started. Write three distinct situations before choosing one.');});
 const c=p.creative;if(!c)return;
 const value=(id:string)=>(document.getElementById(id) as HTMLTextAreaElement).value.trim();
 const syncSelected=():void=>{
  const x=c.concepts.find(x=>x.id===c.selectedId);if(!x)return;
  p.script.premise=x.premise;p.script.whyFunny=x.serviceConnection;p.script.lines=structuredClone(x.dialogue);
  p.script.captions=[...x.dialogue.map(l=>({kind:'dialogue' as const,text:l.text,start:l.start,end:l.end})),...p.script.captions.filter(l=>l.kind==='narration')];
 };
 document.getElementById('saveSelectionReason')?.addEventListener('click',()=>{c.selectionReason=value('selectionReason');changed('Selection reason saved. This is an editorial case, not final approval.');});
 document.querySelectorAll<HTMLButtonElement>('[data-develop]').forEach(b=>b.onclick=()=>{
  const x=c.concepts.find(x=>x.id===b.dataset['develop']);if(!x||x.recommendation==='reject'||c.selectedId===x.id)return;
  const old=c.concepts.find(x=>x.id===c.selectedId);if(old?.recommendation==='develop')old.recommendation='alternative';
  x.recommendation='develop';c.selectedId=x.id;c.selectionReason='';syncSelected();changed('Concept selected for development. Write why it is stronger; previous timing and creative reviews are now stale.');
 });
 document.querySelectorAll<HTMLButtonElement>('[data-save-concept]').forEach(b=>b.onclick=()=>{
  const x=c.concepts.find(x=>x.id===b.dataset['saveConcept']);if(!x)return;
  const rows=value('dialogue-'+x.id).split('\n').map(s=>s.trim()).filter(Boolean);
  if(rows.some(s=>s.indexOf(':')<=0)){changed('Write each character line as Speaker: words.');return;}
  let at=.5;
  x.dialogue=rows.map(row=>{const colon=row.indexOf(':');const text=row.slice(colon+1).trim();const start=at;const duration=Math.max(1.2,text.split(/\s+/).length/2.2);at+=duration+.65;return {speaker:row.slice(0,colon).trim(),text,performance:'Natural conversational delivery; leave the planned beat.',start,end:start+duration};});
  for(const key of ['title','firstFrame','premise','punchline','serviceConnection','visualPayoff','risk'] as const)x[key]=value(key+'-'+x.id);
  if(c.selectedId===x.id)syncSelected();changed('Concept saved. Recheck the exact script and timing before production.');
 });
 document.getElementById('saveCoverage')?.addEventListener('click',()=>{
  c.continuity=value('creativeContinuity');
  for(const role of ['process','result'] as const){
   const shot=c.coverage.find(s=>s.role===role);
   if(shot)shot.description=value('coverage-'+role);
   else c.coverage.push({id:role,role,description:value('coverage-'+role),duration:4,reference:c.continuity});
  }
  changed('Process and result coverage saved.');
 });
 document.getElementById('saveCreativeClose')?.addEventListener('click',()=>{
  c.spokenClose={businessName:value('closeBusiness'),service:value('closeService'),action:value('closeAction')};
  p.script.closingCopy=closingCopy(c);changed('Closing copy saved. An older recording must be replaced and reviewed against these words.');
 });
 document.getElementById('exportPromptPack')?.addEventListener('click',()=>{
  try{
   const blob=new Blob([JSON.stringify(promptPack(p),null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=p.id+'-filming-directions.json';a.click();URL.revokeObjectURL(url);
  }catch(error){changed(error instanceof Error?error.message:'Complete the creative case first.');}
 });
}
