import path from 'node:path';
import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile,copyFile} from 'node:fs/promises';
import sharp from 'sharp';
import {audit,reviewStatus,stageHash,type Project} from './project.ts';
import {fileDigest,verifyAssets,assetPath,saveJson} from './io.ts';

export const profiles={reels:{width:1080,height:1920,captionBottom:720,safe:[65,269,1015,1248]},feed:{width:1080,height:1350,captionBottom:155,safe:[70,60,1010,1290]}} as const;
async function run(program:string,args:string[],cwd:string):Promise<string>{return new Promise((resolve,reject)=>{const child=spawn(program,args,{cwd,windowsHide:true,stdio:['ignore','pipe','pipe']});let output='';child.stdout.on('data',(b:Buffer)=>output+=b.toString());child.stderr.on('data',(b:Buffer)=>output+=b.toString());child.on('error',reject);child.on('close',code=>code===0?resolve(output):reject(Error(program+' failed:\n'+output.slice(-5000))));});}
const xml=(v:string)=>v.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function text(text:string,y:number,size:number,color:string):string{return `<text x="540" y="${y}" text-anchor="middle" font-family="Arial,DejaVu Sans,sans-serif" font-size="${size}" font-weight="600" fill="${color}">${xml(text)}</text>`;}
function lines(value:string,max=30):string[]{const result:string[]=[''];for(const word of value.split(/\s+/)){const last=result.at(-1)!;if(last&&(last+' '+word).length>max)result.push(word);else result[result.length-1]=last?last+' '+word:word;}if(result.length>2)throw Error('Shorten the end-card text to two lines: '+value);return result;}
export async function card(p:Project,profile:'reels'|'feed',output:string,root:string):Promise<void>{
  const h=profiles[profile].height;const top=profile==='reels'?320:160;
  let logo='';if(p.brand.logo){const file=await assetPath(root,p.brand.logo);const png=await sharp(file).resize({width:420,height:220,fit:'inside'}).png().toBuffer();logo=`<image x="330" y="${top}" width="420" height="220" href="data:image/png;base64,${png.toString('base64')}"/>`;}
  const name=logo||text(p.brand.name,top+115,58,p.brand.ink);
  const headline=lines(p.brand.headline).map((s,i)=>text(s,top+305+i*59,49,p.brand.ink)).join('');
  const service=lines(p.brief.product,42).map((s,i)=>text(s,top+430+i*39,33,p.brand.ink)).join('');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="${h}"><rect width="1080" height="${h}" fill="${p.brand.background}"/><rect x="100" y="${top-32}" width="880" height="4" fill="${p.brand.accent}"/>${name}${headline}${service}<rect x="155" y="${top+515}" width="770" height="100" rx="6" fill="${p.brand.accent}"/>${text(p.brand.cta,top+579,38,'#ffffff')}${text(p.brand.destination,top+705,29,p.brand.ink)}</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(output);
}
function stamp(seconds:number):string{const cs=Math.round(seconds*100);return `${Math.floor(cs/360000)}:${String(Math.floor(cs/6000)%60).padStart(2,'0')}:${String(Math.floor(cs/100)%60).padStart(2,'0')}.${String(cs%100).padStart(2,'0')}`;}
function captions(p:Project,profile:'reels'|'feed',draft:boolean):string{
  const cfg=profiles[profile];const rows=p.script.captions.filter(c=>!draft||c.kind==='dialogue').map(line=>`Dialogue: 0,${stamp(line.start)},${stamp(line.end)},Caption,,0,0,0,,${line.text.replaceAll('{','').replaceAll('}','').replaceAll('\n','\\N')}`);
  if(draft)rows.push('Dialogue: 1,0:00:00.00,0:59:59.00,Draft,,0,0,0,,PACING STUDY  /  NARRATOR NOT RECORDED');
  return `[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: ${cfg.height}\nWrapStyle: 0\nScaledBorderAndShadow: yes\n[V4+ Styles]\nFormat: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding\nStyle: Caption,Arial,54,&H00FFFFFF,&H00FFFFFF,&H00151515,&H00151515,-1,0,0,0,100,100,0,0,1,3,0,2,90,90,${cfg.captionBottom},1\nStyle: Draft,Arial,25,&H00FFFFFF,&H00FFFFFF,&H00151515,&H00151515,0,0,0,0,100,100,0,0,3,9,0,8,55,55,${profile==='reels'?280:70},1\n[Events]\nFormat: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text\n${rows.join('\n')}\n`;
}
export async function render(root:string,p:Project,profile:'reels'|'feed',mode:'draft'|'candidate'):Promise<{file:string;sha256:string;report:string}>{
  if(mode==='candidate'){
    for(const stage of ['brief','script','voice','animatic'] as const)if(await reviewStatus(p,stage)!=='approved')throw Error('Candidate render requires current '+stage+' approval');
    const blockers=(await audit(p)).filter(f=>f.level==='block');if(blockers.length)throw Error(blockers.map(f=>f.message).join('\n'));
  }
  const files=await verifyAssets(root,p);const ff=process.env['FFMPEG_PATH']??'ffmpeg';const probe=process.env['FFPROBE_PATH']??'ffprobe';
  const key=(await stageHash(p,'animatic')).slice(0,16);const dir=path.join(root,'.videobase','renders',p.id,key,profile,mode);await mkdir(dir,{recursive:true});
  const height=profiles[profile].height;const encoded:string[]=[];let total=0;
  for(const [i,shot] of p.timeline.entries()){
    const out=path.join(dir,`shot-${i}.mp4`);const duration=shot.duration;
    let source=shot.assetId?files[shot.assetId]:undefined;const still=shot.kind!=='video';
    if(shot.kind==='card'){source=path.join(dir,'endcard.png');await card(p,profile,source,root);}
    if(!source)throw Error('Missing asset for '+shot.label);
    const args=['-hide_banner','-loglevel','error','-y'];if(still)args.push('-loop','1');else args.push('-ss',String(shot.sourceStart));args.push('-i',source,'-f','lavfi','-i','anullsrc=r=48000:cl=stereo');
    // Fit the complete source frame in the review draft; subject crops are a separate editorial choice.
    const fit=`scale=1080:${height}:force_original_aspect_ratio=decrease,pad=1080:${height}:(ow-iw)/2:(oh-ih)/2:color=${p.brand.background},setsar=1,fps=30`;
    const vf=(shot.speed!==1?`setpts=(PTS-STARTPTS)/${shot.speed},`:'')+fit;
    args.push('-map','0:v:0','-map',!still&&shot.audioUntil>0?'0:a:0':'1:a:0','-vf',vf);
    if(!still&&shot.audioUntil>0)args.push('-af',`atrim=duration=${Math.min(duration,shot.audioUntil)},apad,aresample=48000`);
    args.push('-t',String(duration),'-c:v','libx264','-preset','fast','-threads','2','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-ar','48000','-ac','2','-b:a','192k',out);
    await run(ff,args,dir);encoded.push(`file 'shot-${i}.mp4'`);total+=duration;
  }
  await writeFile(path.join(dir,'parts.txt'),encoded.join('\n'));await writeFile(path.join(dir,'captions.ass'),captions(p,profile,mode==='draft'));
  await run(ff,['-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i','parts.txt','-c','copy','joined.mp4'],dir);
  const output=path.join(dir,p.id+'-'+profile+'-'+mode+'.mp4');const args=['-hide_banner','-loglevel','error','-y','-i','joined.mp4'];
  let af='loudnorm=I=-16:TP=-1.5:LRA=8,aresample=48000';
  if(mode==='candidate'&&p.voice.recordingAsset){const voice=files[p.voice.recordingAsset];if(!voice)throw Error('Voice file missing');args.push('-i',voice,'-filter_complex',`[1:a]adelay=${Math.round(p.policy.voiceStart*1000)}:all=1[v];[0:a][v]amix=inputs=2:normalize=0,${af}[out]`,'-map','0:v','-map','[out]');}
  else args.push('-af',af);
  args.push('-vf','ass=captions.ass','-t',String(total),'-c:v','libx264','-preset','fast','-threads','2','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-ar','48000','-ac','2','-b:a','192k','-movflags','+faststart',output);
  await run(ff,args,dir);await run(ff,['-hide_banner','-loglevel','error','-i',output,'-f','null','-'],dir);
  const metadata=JSON.parse(await run(probe,['-v','error','-show_streams','-show_format','-of','json',output],dir)) as {streams:Array<{codec_type:string;width?:number;height?:number;sample_rate?:string}>,format:{duration:string}};
  if(!metadata.streams.some(s=>s.codec_type==='video'&&s.width===1080&&s.height===height)||!metadata.streams.some(s=>s.codec_type==='audio'&&s.sample_rate==='48000')||Math.abs(Number(metadata.format.duration)-total)>.25)throw Error('Output metadata does not match the timeline');
  const sha256=fileDigest(await readFile(output));const report=path.join(dir,'report.json');await saveJson(report,{project:p.id,mode,profile,seconds:Number(metadata.format.duration),sha256,paidCalls:0,fullDecode:true,metadata,creativeApproval:mode==='draft'?'Not requested: timing study only':'Pending final review'});
  return {file:output,sha256,report};
}
export async function release(root:string,p:Project):Promise<string>{
  if(await reviewStatus(p,'final')!=='approved')throw Error('The exact candidate files need final human approval');
  for(const stage of ['brief','script','voice','animatic'] as const)if(await reviewStatus(p,stage)!=='approved')throw Error('Stale '+stage+' review');
  if(!p.delivery?.artifacts.length)throw Error('No candidate artifacts');
  const destination=path.join(root,'.videobase','releases',p.id,(await stageHash(p,'final')).slice(0,16));await mkdir(destination,{recursive:true});
  for(const artifact of p.delivery.artifacts){const source=await assetPath(root,artifact.path);if(fileDigest(await readFile(source))!==artifact.sha256)throw Error('Candidate changed after review');await copyFile(source,path.join(destination,p.id+'-'+artifact.profile+'.mp4'));}
  await saveJson(path.join(destination,'release.json'),{project:p.id,reviews:p.reviews,artifacts:p.delivery.artifacts});return destination;
}
