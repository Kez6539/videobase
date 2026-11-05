import {readFile,writeFile,mkdir,realpath,open,rename} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {projectSchema,type Project} from './project.ts';

export async function loadProject(file:string):Promise<Project>{return projectSchema.parse(JSON.parse(await readFile(file,'utf8')));}
export async function saveJson(file:string,value:unknown):Promise<void>{
  await mkdir(path.dirname(file),{recursive:true});const tmp=file+'.'+process.pid+'.tmp';await writeFile(tmp,JSON.stringify(value,null,2)+'\n');await rename(tmp,file);
}
export function fileDigest(bytes:Uint8Array):string{return createHash('sha256').update(bytes).digest('hex');}
export async function assetPath(root:string,relative:string):Promise<string>{
  const base=await realpath(root);const target=await realpath(path.resolve(base,relative));
  const rel=path.relative(base,target);if(rel.startsWith('..')||path.isAbsolute(rel))throw Error('Asset resolves outside project workspace: '+relative);
  return target;
}
export async function verifyAssets(root:string,p:Project):Promise<Record<string,string>>{
  const result:Record<string,string>={};for(const a of p.assets){const file=await assetPath(root,a.path);if(fileDigest(await readFile(file))!==a.sha256)throw Error('Asset hash changed: '+a.id);result[a.id]=file;}return result;
}
export async function withLock<T>(file:string,work:()=>Promise<T>):Promise<T>{
  await mkdir(path.dirname(file),{recursive:true});const handle=await open(file,'wx').catch(()=>{throw Error('Workspace is busy. Inspect the lock before retrying: '+file);});
  try{await handle.writeFile(String(process.pid));return await work();}finally{await handle.close();const {unlink}=await import('node:fs/promises');await unlink(file);}
}
