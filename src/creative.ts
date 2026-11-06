import {z} from 'zod';

const line = z.object({
  speaker:z.string(), text:z.string(), performance:z.string(),
  start:z.number().nonnegative(), end:z.number().positive()
}).strict();
export const creativeSchema=z.object({
  version:z.literal(1),
  serviceTruth:z.string(),
  audienceRecognition:z.string(),
  visualStyle:z.string(),
  continuity:z.string(),
  references:z.array(z.object({name:z.string(),url:z.url(),lesson:z.string()}).strict()),
  rejectedLessons:z.array(z.object({name:z.string(),reason:z.string(),evidence:z.string()}).strict()),
  concepts:z.array(z.object({
    id:z.string().regex(/^[a-z0-9-]+$/),title:z.string(),
    firstFrame:z.string(),premise:z.string(),punchline:z.string(),
    serviceConnection:z.string(),visualPayoff:z.string(),risk:z.string(),
    recommendation:z.enum(['develop','alternative','reject']),
    displayCopy:z.array(z.object({text:z.string(),start:z.number().nonnegative(),end:z.number().positive()}).strict()).optional(),dialogue:z.array(line)
  }).strict()).min(3).max(8),
  selectedId:z.string().nullable(),
  selectionReason:z.string(),
  coverage:z.array(z.object({
    id:z.string(),role:z.enum(['process','result']),description:z.string(),
    duration:z.number().positive(),reference:z.string()
  }).strict()),
  spokenClose:z.object({businessName:z.string(),service:z.string(),action:z.string()}).strict()
}).strict();
export type Creative=z.infer<typeof creativeSchema>;
export type CreativeContext={
  brief:{business:string;product:string;tone:string};
  brand:{name:string;cta:string;destination:string};
  script:{format?:'dialogue'|'caption-led'|undefined;displayCopy?:Array<{text:string;start:number;end:number}>|undefined;lines:Array<z.infer<typeof line>>;closingCopy:string};
  voice:{referenceName:string;voiceId:string};
  creative?:Creative|undefined;
};
export type CreativeFinding={code:string;level:'block'|'note';message:string};
const normal=(s:string)=>s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function closingCopy(c:Creative):string{
  return [c.spokenClose.businessName,c.spokenClose.service,c.spokenClose.action]
    .map(s=>s.trim().replace(/[.!?]+$/,'')).filter(Boolean).join('. ')+'.';
}
export function creativeAudit(p:CreativeContext):CreativeFinding[]{
  const c=p.creative;
  if(!c)return [{code:'creative-missing',level:'block',message:'Develop several ideas and the service payoff before writing a filming prompt.'}];
  const out:CreativeFinding[]=[];
  const block=(code:string,message:string)=>out.push({code,level:'block',message});
  const ids=c.concepts.map(x=>x.id);
  if(new Set(ids).size!==ids.length)block('concept-duplicate','Each concept needs its own identity.');
  const chosen=c.concepts.find(x=>x.id===c.selectedId);
  if(!chosen)block('concept-selection','Choose a developed concept and explain the decision.');
  if(!c.selectionReason.trim())block('selection-reason','Explain why this idea is stronger than the alternatives.');
  for(const [key,label] of [['serviceTruth','service truth'],['audienceRecognition','recognisable audience situation'],['continuity','continuity reference']] as const){
    if(!c[key].trim())block('creative-'+key,'Write the '+label+'.');
  }
  if(chosen){
    if(chosen.recommendation!=='develop')block('concept-not-developed','This concept is marked as an alternative or rejected. Resolve its creative problem before production.');
    for(const [key,label] of [['firstFrame','opening image'],['punchline','punchline'],['serviceConnection','reason the joke belongs to this service'],['visualPayoff','visible service payoff'],['risk','likely failure to inspect']] as const){
      if(!chosen[key].trim())block('concept-'+key,'Describe the '+label+'.');
    }
    if(p.script.format!=='caption-led'&&(!chosen.dialogue.length||chosen.dialogue.some(x=>!x.text.trim()||x.end<=x.start)))block('concept-dialogue','Write the actual dialogue and leave room for its performance.');
    if(p.script.format==='caption-led'){
      if(chosen.dialogue.length||p.script.lines.length)block('caption-dialogue','A caption-led cut must not imply an unproduced spoken exchange.');
      if(!chosen.displayCopy?.length||JSON.stringify(chosen.displayCopy)!==JSON.stringify(p.script.displayCopy))block('caption-copy','The selected visible copy must match the caption-led script.');
    }
    if(JSON.stringify(chosen.dialogue.map(x=>[x.speaker,x.text]))!==JSON.stringify(p.script.lines.map(x=>[x.speaker,x.text])))block('concept-script-mismatch','The selected concept and production dialogue disagree. Keep one exact script.');
  }
  for(const role of ['process','result'] as const){
    if(!c.coverage.some(s=>s.role===role&&s.description.trim()&&s.reference.trim()))block('coverage-'+role,'Plan a concrete '+role+' shot with a continuity reference.');
  }
  if(normal(c.spokenClose.businessName)!==normal(p.brand.name))block('closing-business','The spoken close must name this business.');
  if(!c.spokenClose.service.trim()||!c.spokenClose.action.trim())block('closing-content','Write the actual service and one action in the spoken close.');
  if(normal(p.script.closingCopy)!==normal(closingCopy(c)))block('closing-copy','The narration must match the complete business, service and action. An unrelated reused sentence is insufficient.');
  out.push({code:'editorial-judgment',level:'note',message:'These checks establish a complete editorial case. They do not score humour, performance or voice quality.'});
  return out;
}
export function promptPack(p:CreativeContext){
  const findings=creativeAudit(p);const blocks=findings.filter(x=>x.level==='block');
  if(blocks.length)throw Error(blocks.map(x=>x.message).join('\n'));
  const c=p.creative!;const selected=c.concepts.find(x=>x.id===c.selectedId)!;
  const scene=[
    'Create a naturalistic British comedy advert for '+p.brief.business+'.',
    p.script.format==='caption-led'?'Caption-led opening still. The visible copy is graphic text, not character speech. Do not imply lip-synced dialogue.':'One continuous medium two-shot of people speaking on camera with clearly audible, synchronised dialogue. Keep both speakers and the car visible. No montage inside this conversation.',
    'Opening image: '+selected.firstFrame,
    'Situation: '+selected.premise,
    'Photographic direction: '+c.visualStyle,
    'Continuity: '+c.continuity,
    p.script.format==='caption-led'?'Displayed copy: '+(p.script.displayCopy??[]).map(c=>c.text).join(' / '):'Use only these exact character lines, in order, one speaker at a time:',
    ...p.script.lines.map(l=>l.speaker+' ('+l.start+'-'+l.end+'s): "'+l.text+'" Direction: '+l.performance),
    'Keep every spoken word at its natural speed. Leave a quiet reaction after the last line.',
    'Quiet native room tone only. No narrator, music, captions, logos or generated lettering. Branding and narration are separate edit elements.'
  ].join('\n');
  return {
    version:1,business:p.brand.name,concept:selected.title,
    editorialCase:{opening:selected.firstFrame,punchline:selected.punchline,serviceConnection:selected.serviceConnection,visiblePayoff:selected.visualPayoff,selectionReason:c.selectionReason,inspect:selected.risk},
    scene,
    coverage:c.coverage.map(s=>({id:s.id,role:s.role,duration:s.duration,prompt:[s.description,'Photographic direction: '+c.visualStyle,'Continuity: '+c.continuity,'Reference: '+s.reference,'Physically plausible contact, water and reflections. No captions, logos, narration or invented customer proof.'].join('\n')})),
    voice:{text:p.script.closingCopy,referenceName:p.voice.referenceName,referenceVoiceId:p.voice.voiceId,direction:'Warm, conversational British read. State the business clearly. Record the whole actual script; retain its natural delivery. A reference recreation must be labelled as such. Never silently substitute a preset or an unrelated old line.'},
    assembly:{cta:p.brand.cta,destination:p.brand.destination,requirements:['Keep the character reaction before narration.','Show the cleaning process and the visibly clean result.','Hold the close for the actual recording plus a readable tail.','Compose Reels and Feed separately.','Record technical checks separately from creative acceptance.']},
    notice:'This pack makes zero generation calls. Its editorial case remains open to review.'
  };
}
export function emptyCreative(business:string,product:string):Creative{
 return {version:1,serviceTruth:product,audienceRecognition:'',visualStyle:'Naturalistic British commercial photography.',continuity:'',references:[],rejectedLessons:[],concepts:[1,2,3].map(n=>({id:'idea-'+n,title:'Idea '+n,firstFrame:'',premise:'',punchline:'',serviceConnection:'',visualPayoff:'',risk:'',recommendation:'alternative' as const,dialogue:[]})),selectedId:null,selectionReason:'',coverage:[],spokenClose:{businessName:business,service:product,action:''}};
}
