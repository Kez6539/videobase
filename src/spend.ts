import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {digest,generationBlockers,type Project} from './project.ts';
import {saveJson,withLock} from './io.ts';
import {z} from 'zod';

const entry=z.object({requestId:z.string(),projectId:z.string(),credits:z.number().int().positive(),state:z.enum(['reserved','submitted','completed','cancelled']),reservedAt:z.iso.datetime(),taskId:z.string().optional(),actualCredits:z.number().int().nonnegative().optional()});
const ledgerSchema=z.array(entry);
export type Ledger=z.infer<typeof ledgerSchema>;
async function ledger(file:string):Promise<Ledger>{try{return ledgerSchema.parse(JSON.parse(await readFile(file,'utf8')));}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return [];throw e;}}
export async function requestId(p:Project):Promise<string>{return digest({projectId:p.id,request:p.generation});}
export function committedCredits(items:Ledger,projectId:string):number{return items.filter(x=>x.projectId===projectId&&x.state!=='cancelled').reduce((sum,x)=>sum+(x.actualCredits??x.credits),0);}
export async function reserveRequest(root:string,p:Project,now=new Date()):Promise<unknown>{
  const blockers=await generationBlockers(p,now);if(blockers.length)throw Error('Generation locked:\n'+blockers.join('\n'));
  const g=p.generation;if(!g)throw Error('No generation plan');
  const file=path.join(root,'.videobase','ledger.json');
  return withLock(file+'.lock',async()=>{
    const items=await ledger(file);const id=await requestId(p);
    if(items.some(x=>x.requestId===id))throw Error('This request already has a reservation. Inspect its task receipt; never submit a blind retry.');
    if(committedCredits(items,p.id)+g.quote.credits>p.policy.maxCredits)throw Error('Reserved and spent credits would exceed the project cap.');
    const item={requestId:id,projectId:p.id,credits:g.quote.credits,state:'reserved' as const,reservedAt:now.toISOString()};
    const request={...item,workspaceId:g.workspaceId,tool:g.tool,arguments:g.arguments,notice:'A local reservation, not a Runway submission. Submit exactly once through the approved connection, then record the task id. Do not purchase credits automatically.'};
    // Persist the reservation first: an interrupted export cannot create a second spend.
    await saveJson(file,[...items,item]);await saveJson(path.join(root,'.videobase','requests',id+'.json'),request);return request;
  });
}
export async function recordTask(root:string,id:string,taskId:string,actualCredits?:number):Promise<void>{
  if(!/^[a-f\d]{64}$/.test(id)||!taskId.trim())throw Error('A request id and provider task id are required');
  if(actualCredits!==undefined&&(!Number.isInteger(actualCredits)||actualCredits<0))throw Error('Actual credits must be a nonnegative integer');
  const file=path.join(root,'.videobase','ledger.json');
  await withLock(file+'.lock',async()=>{const items=await ledger(file);const item=items.find(x=>x.requestId===id);if(!item)throw Error('No matching reservation');if(item.taskId&&item.taskId!==taskId)throw Error('This request already has a different task id');if(item.state==='cancelled')throw Error('Cancelled request');item.taskId=taskId;item.state=actualCredits===undefined?'submitted':'completed';if(actualCredits!==undefined)item.actualCredits=actualCredits;await saveJson(file,items);});
}
