import {creativeAudit,promptPack} from './creative.ts';
import path from 'node:path';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {projectSchema,reviewSchema,stageHash,reviewStatus,stages,audit,generationBlockers,timelineDuration,type Stage} from './project.ts';
import {loadProject,saveJson,fileDigest,verifyAssets} from './io.ts';
import {reserveRequest,recordTask} from './spend.ts';
import {digest} from './project.ts';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

async function main():Promise<void>{
  const [command,file,...args]=process.argv.slice(2);
  if(!command||command==='help'){console.log(`VideoBase (no generation calls)\n\n  npm run vb -- creative-audit examples/defined-detail-colour.json\n  npm run vb -- prompt-pack examples/defined-detail-colour.json\n  npm run vb -- audit examples/defined-detail.json\n  npm run vb -- plan examples/defined-detail.json\n  npm run vb -- review-hashes examples/defined-detail.json\n  npm run vb -- import-review examples/defined-detail.json review.json\n  npm run vb -- import-asset examples/defined-detail.json asset-id path/to/file\n  npm run vb -- attach-voice examples/your-project.json recording.mp3 https://host/recording.mp3\n  npm run vb -- verify-assets examples/defined-detail.json\n  npm run vb -- render examples/defined-detail.json reels|feed draft|candidate\n  npm run vb -- release examples/your-project.json\n  npm run vb -- reserve examples/defined-detail.json\n  npm run vb -- record-task <request-id> <provider-task-id> [actual-credits]\n\nFFMPEG_PATH and FFPROBE_PATH may point to installed executables.\nMedia, ledgers and renders stay in ignored .videobase/.`);return;}
  if(command==='record-task'){if(!file||!args[0])throw Error('Missing request/task id');await recordTask(process.cwd(),file,args[0],args[1]===undefined?undefined:Number(args[1]));console.log('Task receipt recorded.');return;}
  if(!file)throw Error('A project JSON file is required');const p=await loadProject(file);
  if(command==='creative-audit'){console.log(JSON.stringify(creativeAudit(p),null,2));return;}
  if(command==='prompt-pack'){console.log(JSON.stringify(promptPack(p),null,2));return;}
  if(command==='audit'){console.log(JSON.stringify({id:p.id,duration:timelineDuration(p),findings:await audit(p),generationBlockers:await generationBlockers(p)},null,2));return;}
  if(command==='plan'){let start=0;console.log(JSON.stringify({project:p.name,timeline:p.timeline.map(s=>{const item={...s,start,end:start+s.duration};start+=s.duration;return item;}),duration:start,creditsRequested:p.generation?.quote.credits??0,paidCallsMade:0},null,2));return;}
  if(command==='review-hashes'){for(const stage of stages)console.log(stage,await stageHash(p,stage),await reviewStatus(p,stage));return;}
  if(command==='import-review'){
    if(!args[0])throw Error('Missing review receipt');const bundle=JSON.parse(await readFile(args[0],'utf8')) as {projectId?:unknown;reviews?:unknown};if(bundle.projectId!==p.id)throw Error('Review receipt belongs to a different project');
    if(!Array.isArray(bundle.reviews)||!bundle.reviews.length)throw Error('No review decisions');
    const reviews=bundle.reviews.map(r=>reviewSchema.parse(r));for(const review of reviews){if(review.inputHash!==await stageHash(p,review.stage))throw Error('Review is stale: '+review.stage);if(Date.parse(review.at)>Date.now()+60_000)throw Error('Review date is in the future');}
    await saveJson(file,projectSchema.parse({...p,reviews:[...p.reviews,...reviews]}));console.log('Imported review decisions, bound to these exact inputs.');return;
  }
  if(command==='import-asset'){
    const [assetId,source]=args;if(!assetId||!source)throw Error('Asset id and source file are required');const asset=p.assets.find(a=>a.id===assetId);if(!asset)throw Error('Unknown asset');
    const target=path.resolve(asset.path);const root=path.resolve('.videobase','assets');if(!target.startsWith(root+path.sep))throw Error('Imported assets must be inside .videobase/assets/');await mkdir(path.dirname(target),{recursive:true});await copyFile(source,target);asset.sha256=fileDigest(await readFile(target));await saveJson(file,p);console.log('Imported '+assetId+'. Earlier reviews affected by its contents are stale.');return;
  }
  if(command==='attach-voice'){
    const [source,url]=args;if(!source||!url)throw Error('Supply the recording file and its public HTTPS preview URL');
    const bytes=await readFile(source);const sha256=fileDigest(bytes);const ext=path.extname(source).toLowerCase();if(!['.mp3','.wav','.m4a','.aac','.ogg'].includes(ext))throw Error('Use an audio recording');
    const {stdout}=await promisify(execFile)(process.env['FFPROBE_PATH']??'ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',path.resolve(source)],{windowsHide:true});const duration=Number(stdout.trim());if(!Number.isFinite(duration)||duration<=0)throw Error('Could not measure the voice recording');
    const relative=`.videobase/assets/${p.id}/voice-${sha256.slice(0,16)}${ext}`;
    const next=projectSchema.parse({...p,assets:[...p.assets.filter(a=>a.id!=='brand-voice'),{id:'brand-voice',path:relative,sha256,kind:'audio'}],voice:{...p.voice,recordingAsset:'brand-voice',recordingUrl:url,recordingDuration:duration,recordingScriptHash:await digest(p.script.closingCopy)}});
    await mkdir(path.dirname(relative),{recursive:true});await copyFile(source,relative);await saveJson(file,next);console.log('Actual recording attached and timed. It still needs a listening review.');return;
  }
  if(command==='verify-assets'){console.log(await verifyAssets(process.cwd(),p));return;}
  if(command==='render'){const profile=args[0]??'reels';const mode=args[1]??'draft';if(!['reels','feed'].includes(profile)||!['draft','candidate'].includes(mode))throw Error('Use reels|feed and draft|candidate');const {render}=await import('./render.ts');const result=await render(process.cwd(),p,profile as 'reels'|'feed',mode as 'draft'|'candidate');if(mode==='draft'){p.preview.animaticInputHash=result.inputHash;await saveJson(file,p);}if(mode==='candidate'){const artifacts=(p.delivery?.artifacts??[]).filter(a=>a.profile!==profile);artifacts.push({profile:profile as 'reels'|'feed',path:path.relative(process.cwd(),result.file).replaceAll('\\','/'),sha256:result.sha256});p.delivery={artifacts,technicalChecks:['full-decode','dimensions','duration','audio-48khz']};await saveJson(file,p);}console.log(JSON.stringify(result,null,2));return;}
  if(command==='release'){const {release}=await import('./render.ts');console.log(await release(process.cwd(),p));return;}
  if(command==='reserve'){console.log(JSON.stringify(await reserveRequest(process.cwd(),p),null,2));return;}
  throw Error('Unknown command: '+command);
}
main().catch((error:unknown)=>{console.error(error instanceof Error?error.message:String(error));process.exitCode=1;});
