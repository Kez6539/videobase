import path from 'node:path';
import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile,copyFile} from 'node:fs/promises';
import sharp,{type OverlayOptions} from 'sharp';
import {audit,reviewStatus,stageHash,developmentAuthorized,candidateCoverage,dialogueHash,type Project} from './project.ts';
import {fileDigest,verifyAssets,assetPath,saveJson} from './io.ts';

export const profiles={reels:{width:1080,height:1920,captionBottom:720,safe:[65,269,1015,1248]},feed:{width:1080,height:1350,captionBottom:155,safe:[70,60,1010,1290]}} as const;
async function run(program:string,args:string[],cwd:string):Promise<string>{return new Promise((resolve,reject)=>{const child=spawn(program,args,{cwd,windowsHide:true,stdio:['ignore','pipe','pipe']});let output='';child.stdout.on('data',(b:Buffer)=>output+=b.toString());child.stderr.on('data',(b:Buffer)=>output+=b.toString());child.on('error',reject);child.on('close',code=>code===0?resolve(output):reject(Error(program+' failed:\n'+output.slice(-5000))));});}
const xml=(v:string)=>v.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function lines(value:string,max=30):string[]{const result:string[]=[''];for(const word of value.split(/\s+/)){const last=result.at(-1)!;if(last&&(last+' '+word).length>max)result.push(word);else result[result.length-1]=last?last+' '+word:word;}if(result.length>2)throw Error('Shorten the end-card text to two lines: '+value);return result;}
export async function card(p:Project,profile:'reels'|'feed',output:string,root:string):Promise<void>{
  const h=profiles[profile].height;const safe=profiles[profile].safe;
  const fontAsset=p.brand.fontAsset?p.assets.find(a=>a.id===p.brand.fontAsset):undefined;
  if(p.brand.fontAsset&&(!fontAsset||fontAsset.kind!=='font'))throw Error('The brand font must be a verified font asset.');
  const fontfile=fontAsset?await assetPath(root,fontAsset.path):undefined;
  const layers:OverlayOptions[]=[];const bounds:Array<{kind:string;x:number;y:number;width:number;height:number}>=[];
  function bound(kind:string,x:number,y:number,width:number,height:number):void{
    if(x<safe[0]||y<safe[1]||x+width>safe[2]||y+height>safe[3])throw Error(profile+' '+kind+' exceeds the placement guide.');
    bounds.push({kind,x,y,width,height});
  }
  async function put(value:string,y:number,size:number,color:string,kind:string):Promise<void>{
    let image:Buffer;let w:number;let height:number;
    for(;;){
      image=await sharp({text:{text:'<span foreground="'+color+'">'+xml(value)+'</span>',font:(p.brand.fontFamily??'Arial')+' Bold '+size,...(fontfile?{fontfile}:{}),rgba:true}}).png().toBuffer();
      const m=await sharp(image).metadata();w=m.width??0;height=m.height??0;
      if(w<=880||size<=18)break;size--;
    }
    const x=Math.round((1080-w)/2);bound(kind,x,y,w,height);layers.push({input:image,left:x,top:y});
  }
  const top=profile==='reels'?320:110;
  if(p.brand.logo){
    const file=await assetPath(root,p.brand.logo);const image=await sharp(file).resize({width:420,height:210,fit:'inside'}).png().toBuffer();
    const m=await sharp(image).metadata();const w=m.width??420;const lh=m.height??210;const x=Math.round((1080-w)/2);
    bound('logo',x,top,w,lh);layers.push({input:image,left:x,top});
  }else await put(p.brand.name,top+70,62,p.brand.ink,'business');
  const headlineY=profile==='reels'?600:405;
  for(const [i,value] of lines(p.brand.headline,26).entries())await put(value,headlineY+i*90,76,p.brand.ink,'headline');
  const serviceY=profile==='reels'?845:650;
  for(const [i,value] of lines(p.brief.product,42).entries())await put(value,serviceY+i*46,38,p.brand.ink,'service');
  const ctaY=profile==='reels'?990:790;
  const bar=Buffer.from('<svg width="1080" height="'+h+'"><rect x="155" y="'+ctaY+'" width="770" height="94" rx="6" fill="'+p.brand.accent+'"/></svg>');
  bound('action background',155,ctaY,770,94);layers.push({input:bar,left:0,top:0});
  await put(p.brand.cta,ctaY+24,38,'#ffffff','action');
  await put(p.brand.destination,profile==='reels'?1140:950,30,p.brand.ink,'destination');
  await sharp({create:{width:1080,height:h,channels:4,background:p.brand.background}}).composite(layers).png().toFile(output);
  await saveJson(output+'.bounds.json',{profile,safe,bounds});
}
function stamp(seconds:number):string{const cs=Math.round(seconds*100);return `${Math.floor(cs/360000)}:${String(Math.floor(cs/6000)%60).padStart(2,'0')}:${String(Math.floor(cs/100)%60).padStart(2,'0')}.${String(cs%100).padStart(2,'0')}`;}
function captions(p:Project,profile:'reels'|'feed',draft:boolean):string{
  const cfg=profiles[profile];const cardStart=p.timeline.slice(0,-1).reduce((n,s)=>n+s.duration,0);const family=(p.brand.fontFamily??'Arial').replace(/[,\r\n]/g,'');const rows=p.script.captions.filter(c=>(!draft||!!p.voice.recordingAsset||c.kind==='dialogue')&&(c.kind==='dialogue'||c.start<cardStart)).map(line=>`Dialogue: 0,${stamp(line.start)},${stamp(line.kind==='narration'?Math.min(line.end,cardStart):line.end)},Caption,,0,0,0,,${line.text.replaceAll('{','').replaceAll('}','').replaceAll('\n','\\N')}`);
  if(draft)rows.push('Dialogue: 1,0:00:00.00,0:59:59.00,Draft,,0,0,0,,PACING STUDY  /  '+(p.voice.recordingAsset?'REVIEW COPY':'NARRATOR NOT RECORDED'));
  return `[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: ${cfg.height}\nWrapStyle: 0\nScaledBorderAndShadow: yes\n[V4+ Styles]\nFormat: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding\nStyle: Caption,${family},72,&H00FFFFFF,&H00FFFFFF,&H00151515,&H00151515,-1,0,0,0,100,100,0,0,1,3,0,2,90,90,${cfg.captionBottom},1\nStyle: Draft,Arial,25,&H00FFFFFF,&H00FFFFFF,&H00151515,&H00151515,0,0,0,0,100,100,0,0,3,9,0,8,55,55,${profile==='reels'?280:70},1\n[Events]\nFormat: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text\n${rows.join('\n')}\n`;
}
export async function render(root:string,p:Project,profile:'reels'|'feed',mode:'draft'|'candidate'):Promise<{file:string;sha256:string;report:string;inputHash:string}>{
  if(mode==='candidate'){
    if(!developmentAuthorized(p))for(const stage of ['brief','script','voice','animatic'] as const)if(await reviewStatus(p,stage)!=='approved')throw Error('Candidate render requires current '+stage+' approval');
    const blockers=[...(await audit(p)),...candidateCoverage(p)].filter(f=>f.level==='block');if(blockers.length)throw Error(blockers.map(f=>f.message).join('\n'));
  }
  if(mode==='candidate'&&p.creative){
    const hash=await dialogueHash(p);
    for(const shot of p.timeline.filter(s=>s.spoken)){
      if(p.assets.find(a=>a.id===shot.assetId)?.scriptHash!==hash)throw Error('The spoken source is not bound to this exact character script.');
    }
  }
  const files=await verifyAssets(root,p);const ff=process.env['FFMPEG_PATH']??'ffmpeg';const probe=process.env['FFPROBE_PATH']??'ffprobe';
  const key=(await stageHash(p,'animatic')).slice(0,16);const dir=path.join(root,'.videobase','renders',p.id,key,profile,mode);await mkdir(dir,{recursive:true});
  if(p.brand.fontAsset){const a=p.assets.find(x=>x.id===p.brand.fontAsset);if(!a||a.kind!=='font')throw Error('Missing brand font');await mkdir(path.join(dir,'fonts'),{recursive:true});await copyFile(await assetPath(root,a.path),path.join(dir,'fonts','brand.ttf'));}
  const height=profiles[profile].height;const encoded:string[]=[];let total=0;
  for(const [i,shot] of p.timeline.entries()){
    const out=path.join(dir,`shot-${i}.mp4`);const duration=shot.duration;
    let source=shot.assetId?files[shot.assetId]:undefined;const still=shot.kind!=='video';
    if(shot.kind==='card'){source=path.join(dir,'endcard.png');await card(p,profile,source,root);}
    if(!source)throw Error('Missing asset for '+shot.label);
    const args=['-hide_banner','-loglevel','error','-y'];if(still)args.push('-loop','1');else args.push('-ss',String(shot.sourceStart));args.push('-i',source,'-f','lavfi','-i','anullsrc=r=48000:cl=stereo');
    // Fit the complete source frame in the review draft; subject crops are a separate editorial choice.
    const fit=`scale=1080:${height}:force_original_aspect_ratio=decrease,pad=1080:${height}:(ow-iw)/2:(oh-ih)/2:color=${p.brand.background},setsar=1,fps=30`;
    const crop=shot.framing?.[profile];
    const composed=crop?'crop='+crop.width+':'+crop.height+':'+crop.x+':'+crop.y+',scale=1080:'+height+',setsar=1,fps=30':fit;
    const vf=(shot.speed!==1?`setpts=(PTS-STARTPTS)/${shot.speed},`:'')+composed;
    const logo=p.brand.sceneLogo?.[profile];
    if(logo&&shot.kind!=='card'&&p.brand.logo){
      const file=await assetPath(root,p.brand.logo);
      const m=await sharp(file).metadata();const lh=Math.round(logo.width*(m.height??1)/(m.width??1));const safe=profiles[profile].safe;
      if(logo.x<safe[0]||logo.y<safe[1]||logo.x+logo.width>safe[2]||logo.y+lh>safe[3])throw Error('Scene logo is outside the placement guide.');
      args.push('-loop','1','-i',file,'-filter_complex','[0:v]'+vf+'[scene];[2:v]scale='+logo.width+':-1[logo];[scene][logo]overlay='+logo.x+':'+logo.y+':shortest=1[v]','-map','[v]');
    }else args.push('-vf',vf,'-map','0:v:0');
    args.push('-map',!still&&shot.audioUntil>0?'0:a:0':'1:a:0');
    if(!still&&shot.audioUntil>0)args.push('-af',`atrim=duration=${Math.min(duration,shot.audioUntil)},apad,aresample=48000`);
    args.push('-t',String(duration),'-c:v','libx264','-preset','fast','-threads','2','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-ar','48000','-ac','2','-b:a','192k',out);
    await run(ff,args,dir);encoded.push(`file 'shot-${i}.mp4'`);total+=duration;
  }
  const vtt=(t:number)=>{const n=Math.round(t*1000);return String(Math.floor(n/3600000)).padStart(2,'0')+':'+String(Math.floor(n/60000)%60).padStart(2,'0')+':'+String(Math.floor(n/1000)%60).padStart(2,'0')+'.'+String(n%1000).padStart(3,'0');};
  await writeFile(path.join(dir,'captions.vtt'),'WEBVTT\n\n'+p.script.captions.map(c=>vtt(c.start)+' --> '+vtt(c.end)+'\n'+c.text).join('\n\n')+'\n');
  await writeFile(path.join(dir,'parts.txt'),encoded.join('\n'));await writeFile(path.join(dir,'captions.ass'),captions(p,profile,mode==='draft'));
  await run(ff,['-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i','parts.txt','-c','copy','joined.mp4'],dir);
  const output=path.join(dir,p.id+'-'+profile+'-'+mode+'.mp4');const args=['-hide_banner','-loglevel','error','-y','-i','joined.mp4'];
  let af='loudnorm=I=-16:TP=-1.5:LRA=8,aresample=48000';
  if(p.voice.recordingAsset){const voice=files[p.voice.recordingAsset];if(!voice)throw Error('Voice file missing');args.push('-i',voice,'-filter_complex',`[1:a]adelay=${Math.round(p.policy.voiceStart*1000)}:all=1[v];[0:a][v]amix=inputs=2:normalize=0,${af}[out]`,'-map','0:v','-map','[out]');}
  else args.push('-af',af);
  args.push('-vf','ass=captions.ass:fontsdir=fonts','-t',String(total),'-c:v','libx264','-preset','fast','-threads','2','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-ar','48000','-ac','2','-b:a','192k','-movflags','+faststart',output);
  await run(ff,args,dir);await run(ff,['-hide_banner','-loglevel','error','-i',output,'-f','null','-'],dir);
  const metadata=JSON.parse(await run(probe,['-v','error','-show_streams','-show_format','-of','json',output],dir)) as {streams:Array<{codec_type:string;width?:number;height?:number;sample_rate?:string}>,format:{duration:string}};
  if(!metadata.streams.some(s=>s.codec_type==='video'&&s.width===1080&&s.height===height)||!metadata.streams.some(s=>s.codec_type==='audio'&&s.sample_rate==='48000')||Math.abs(Number(metadata.format.duration)-total)>.25)throw Error('Output metadata does not match the timeline');
  const sha256=fileDigest(await readFile(output));const report=path.join(dir,'report.json');await saveJson(report,{project:p.id,mode,profile,seconds:Number(metadata.format.duration),sha256,paidCalls:0,fullDecode:true,metadata,creativeApproval:mode==='draft'?'Not requested: timing study only':'Pending final review'});
  return {file:output,sha256,report,inputHash:await stageHash(p,'animatic')};
}
export async function release(root:string,p:Project):Promise<string>{
  if(await reviewStatus(p,'final')!=='approved')throw Error('The exact candidate files need final human approval');
  if(!developmentAuthorized(p))for(const stage of ['brief','script','voice','animatic'] as const)if(await reviewStatus(p,stage)!=='approved')throw Error('Stale '+stage+' review');
  if(!p.delivery?.artifacts.length)throw Error('No candidate artifacts');
  const destination=path.join(root,'.videobase','releases',p.id,(await stageHash(p,'final')).slice(0,16));await mkdir(destination,{recursive:true});
  for(const artifact of p.delivery.artifacts){const source=await assetPath(root,artifact.path);if(fileDigest(await readFile(source))!==artifact.sha256)throw Error('Candidate changed after review');await copyFile(source,path.join(destination,p.id+'-'+artifact.profile+'.mp4'));}
  await saveJson(path.join(destination,'release.json'),{project:p.id,reviews:p.reviews,artifacts:p.delivery.artifacts});return destination;
}
