import {z} from 'zod';

const id=z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
const local=z.string().min(1).refine(p=>!p.includes('..')&&!p.includes('\\')&&!p.startsWith('/')&&!/^[A-Za-z]:/.test(p),'Use a relative asset path without traversal');
const https=z.url().refine(v=>v.startsWith('https://')&&!/[?&](_jwt|token|key|signature)=/i.test(v),'Use a public HTTPS URL without credentials');
const hash=z.string().regex(/^[a-f0-9]{64}$/);
export const stages=['brief','script','voice','animatic','spend','final'] as const;
export type Stage=typeof stages[number];
export const reviewSchema=z.object({stage:z.enum(stages),inputHash:hash,decision:z.enum(['approved','changes']),reviewer:z.string().min(2),at:z.iso.datetime(),note:z.string().min(5),evidence:z.array(z.string().min(1)).min(1)}).strict();
export const projectSchema=z.object({
  version:z.literal(1),id,name:z.string().min(1),status:z.enum(['development','in-review','approved','rejected']),
  brief:z.object({business:z.string().min(1),product:z.string().min(1),audience:z.string().min(1),problem:z.string().min(1),promise:z.string().min(1),action:z.string().min(1),proof:z.array(z.object({claim:z.string(),source:https})),tone:z.string(),avoid:z.array(z.string())}).strict(),
  brand:z.object({name:z.string(),headline:z.string(),background:z.string().regex(/^#[a-f\d]{6}$/i),accent:z.string().regex(/^#[a-f\d]{6}$/i),ink:z.string().regex(/^#[a-f\d]{6}$/i),logo:local.optional(),cta:z.string(),destination:z.string()}).strict(),
  script:z.object({premise:z.string(),whyFunny:z.string(),lines:z.array(z.object({speaker:z.string(),text:z.string().min(1),performance:z.string(),start:z.number().nonnegative(),end:z.number().positive()}).strict()),captions:z.array(z.object({kind:z.enum(['dialogue','narration']),text:z.string().min(1),start:z.number().nonnegative(),end:z.number().positive()}).strict()),closingCopy:z.string(),closingDelivery:z.string(),pronunciation:z.record(z.string(),z.string())}).strict(),
  voice:z.object({referenceName:z.string(),referenceUrl:https,voiceId:z.string(),direction:z.string(),auditions:z.array(z.object({id,name:z.string(),voiceId:z.string().optional(),url:https,script:z.string(),selected:z.boolean()})),recordingAsset:id.optional(),recordingUrl:https.optional(),recordingDuration:z.number().positive().optional(),recordingScriptHash:hash.optional()}).strict(),
  assets:z.array(z.object({id,path:local,sha256:hash,kind:z.enum(['video','audio','image']),sourceUrl:https.optional()}).strict()),
  timeline:z.array(z.object({id,label:z.string(),kind:z.enum(['video','still','card']),assetId:id.optional(),sourceStart:z.number().nonnegative().default(0),duration:z.number().positive(),audioUntil:z.number().nonnegative().default(0),spoken:z.boolean().default(false),speed:z.number().min(.5).max(2).default(1),purpose:z.string(),voicePlaceholder:z.boolean().default(false)}).strict()).min(1),
  policy:z.object({minEndcardSeconds:z.number().positive(),maxSpokenWpm:z.number().positive(),maxNarrationWpm:z.number().positive().default(135),minReactionSeconds:z.number().nonnegative(),maxCredits:z.number().int().nonnegative(),voiceStart:z.number().nonnegative()}).strict(),
  generation:z.object({enabled:z.boolean(),tool:z.literal('mcp__codex_apps__runway_generate_video'),workspaceId:z.number().int().positive(),arguments:z.object({model:z.string(),promptText:z.string().min(1),duration:z.number().int().positive(),ratio:z.enum(['9:16','16:9','1:1']),resolution:z.string(),generateAudio:z.boolean()}).strict(),quote:z.object({credits:z.number().int().positive(),checkedAt:z.iso.datetime(),source:https,notes:z.string()}).strict()}).strict().nullable(),
  reviews:z.array(reviewSchema),
  delivery:z.object({artifacts:z.array(z.object({profile:z.enum(['reels','feed']),path:local,sha256:hash})),technicalChecks:z.array(z.string())}).strict().nullable().default(null),
  comparison:z.object({referenceLabel:z.string(),referenceUrl:https,rejectedLabel:z.string(),rejectedUrl:https,notes:z.array(z.object({topic:z.string(),reference:z.string(),rejected:z.string(),rule:z.string()}))}).strict(),
  preview:z.object({animaticUrl:z.string(),animaticInputHash:hash.optional(),animaticNote:z.string(),referencePoster:https,rejectedPoster:https,candidates:z.array(z.object({profile:z.enum(['reels','feed']),url:https,sha256:hash})).optional()}).strict()
}).strict().superRefine((p,ctx)=>{
  const ids=new Set<string>(); for(const a of p.assets){if(ids.has(a.id))ctx.addIssue({code:'custom',message:'Duplicate asset id: '+a.id});ids.add(a.id);}
  const shots=new Set<string>();for(const s of p.timeline){if(shots.has(s.id))ctx.addIssue({code:'custom',message:'Duplicate shot id: '+s.id});shots.add(s.id);if(s.kind!=='card'&&(!s.assetId||!ids.has(s.assetId)))ctx.addIssue({code:'custom',message:'Missing shot asset: '+s.id});if(s.spoken&&s.speed!==1)ctx.addIssue({code:'custom',message:'Do not time-stretch spoken performances: '+s.id});}
  for(const line of p.script.lines)if(line.end<=line.start)ctx.addIssue({code:'custom',message:'Dialogue end must follow start'});
  for(const cue of p.script.captions)if(cue.end<=cue.start)ctx.addIssue({code:'custom',message:'Caption end must follow start'});
  if(p.voice.recordingAsset&&!ids.has(p.voice.recordingAsset))ctx.addIssue({code:'custom',message:'Voice recording asset is missing'});
});
export type Project=z.infer<typeof projectSchema>;
export type Review=z.infer<typeof reviewSchema>;

export function canonical(value:unknown):string {
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value!==null&&typeof value==='object')return '{'+Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+canonical(v)).join(',')+'}';
  return JSON.stringify(value)??'null';
}
export function stageInput(p:Project,stage:Stage):unknown {
  const brief={brief:p.brief,brand:p.brand};
  const script={...brief,script:p.script};
  const voice={...script,voice:p.voice,recording:p.assets.find(a=>a.id===p.voice.recordingAsset)??null};
  const animatic={...voice,timeline:p.timeline,assets:p.assets,policy:p.policy};
  if(stage==='brief')return brief;
  if(stage==='script')return script;
  if(stage==='voice')return voice;
  if(stage==='animatic')return animatic;
  return {...animatic,generation:p.generation,...(stage==='final'?{delivery:p.delivery}:{}),stage};
}
export async function digest(value:unknown):Promise<string>{
  const bytes=new TextEncoder().encode(canonical(value));
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
}
export async function stageHash(p:Project,stage:Stage):Promise<string>{return digest(stageInput(p,stage));}
export async function reviewStatus(p:Project,stage:Stage):Promise<'approved'|'changes'|'stale'|'pending'>{
  const review=p.reviews.filter(r=>r.stage===stage).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)).at(-1);if(!review)return 'pending';
  if(Date.parse(review.at)>Date.now()+60_000)return 'stale';
  if(review.inputHash!==await stageHash(p,stage))return 'stale';
  return review.decision;
}
export function timelineDuration(p:Project):number{return p.timeline.reduce((sum,s)=>sum+s.duration,0);}
export function words(text:string):number{return text.trim().split(/\s+/).filter(Boolean).length;}
export type Finding={code:string;level:'block'|'note';message:string};
export async function audit(p:Project):Promise<Finding[]>{
  const findings:Finding[]=[];
  if(Object.values(p.brand).some(v=>typeof v==='string'&&/^\[.*\]$/.test(v)))findings.push({code:'brand-incomplete',level:'block',message:'Write the business-specific closing line, action and destination.'});
  if(p.brand.headline.length>60||p.brand.cta.length>45||p.brand.destination.length>60)findings.push({code:'endcard-copy',level:'block',message:'Shorten the end-card copy so it can be read clearly on a phone.'});
  if(Object.values(p.brief).some(v=>typeof v==='string'&&(!v.trim()||/^\[.*\]$/.test(v))))findings.push({code:'brief-incomplete',level:'block',message:'Complete the business brief before production.'});
  if(!p.brief.proof.length)findings.push({code:'proof-missing',level:'block',message:'Add a source for the service or product being advertised.'});
  if(!p.script.premise.trim()||!p.script.whyFunny.trim()||!p.script.lines.length||!p.script.closingCopy.trim())findings.push({code:'script-incomplete',level:'block',message:'Write the premise, character lines, reason the idea works and closing copy.'});
  const close=p.timeline.at(-1);if(close?.kind!=='card'||close.duration<p.policy.minEndcardSeconds)findings.push({code:'endcard',level:'block',message:'The closing card must hold for at least '+p.policy.minEndcardSeconds+' seconds.'});
  for(const line of p.script.lines){const wpm=words(line.text)/(line.end-line.start)*60;if(wpm>p.policy.maxSpokenWpm)findings.push({code:'rushed-line',level:'block',message:line.speaker+' is planned at '+Math.round(wpm)+' words/minute. Re-perform or extend the shot; do not speed up dialogue.'});}
  const lastLine=p.script.lines.reduce((end,line)=>Math.max(end,line.end),0);
  if(p.policy.voiceStart-lastLine<p.policy.minReactionSeconds)findings.push({code:'reaction',level:'block',message:'The narration crowds the final character reaction.'});
  if(!p.voice.recordingAsset||!p.voice.recordingDuration||!p.voice.recordingScriptHash)findings.push({code:'voice-missing',level:'block',message:'No business-specific voice recording has been auditioned. A reference voice is not an approved recording.'});
  else{
    if(words(p.script.closingCopy)/p.voice.recordingDuration*60>p.policy.maxNarrationWpm)findings.push({code:'narration-rushed',level:'block',message:'The recorded narration exceeds this project’s chosen pace. Re-perform it or rewrite the copy; do not slow it artificially.'});
    const normalize=(s:string)=>s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
    if(normalize(p.script.captions.filter(c=>c.kind==='narration').map(c=>c.text).join(' '))!==normalize(p.script.closingCopy))findings.push({code:'narration-captions',level:'block',message:'Time the narration captions to the actual recording before production.'});
    if(p.voice.recordingScriptHash!==await digest(p.script.closingCopy))findings.push({code:'voice-script',level:'block',message:'The voice recording belongs to an earlier closing script.'});
    if(p.policy.voiceStart+p.voice.recordingDuration>timelineDuration(p)-.6)findings.push({code:'voice-fit',level:'block',message:'The recorded voice does not fit with a natural tail. Extend the edit; do not squeeze the recording.'});
  }
  findings.push({code:'human-judgment',level:'note',message:'Decode, transcript and loudness checks cannot judge whether a voice sounds good or a joke lands.'});
  return findings;
}
export async function generationBlockers(p:Project,now=new Date()):Promise<string[]>{
  const reasons:string[]=[];
  for(const stage of ['brief','script','voice','animatic','spend'] as const){const state=await reviewStatus(p,stage);if(state!=='approved')reasons.push(stage+': '+state);}
  reasons.push(...(await audit(p)).filter(f=>f.level==='block').map(f=>f.message));
  if(!p.generation?.enabled)reasons.push('Paid generation is disabled.');
  if(p.generation){
    if(p.generation.quote.credits>p.policy.maxCredits)reasons.push('Quote exceeds the project credit cap.');
    const age=now.getTime()-Date.parse(p.generation.quote.checkedAt);
    if(age<0||age>24*60*60*1000)reasons.push('Refresh the generation quote before approving spend.');
  }
  return reasons;
}
