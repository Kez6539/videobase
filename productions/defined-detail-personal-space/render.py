from pathlib import Path
import json,subprocess,math,hashlib,zipfile,shutil
R=Path(__file__).resolve().parent;OUT=R/'output';PUB=R/'publish'
SOURCE=R/'edited-source.mp4';LOGO=Path('/opt/videobase/.videobase/assets/defined-detail/logo.png');VOICE=R/'adam-original-line.wav'
FONTS='/opt/ctn-new-hire-video/facebook-v1/assets'
meta=json.loads((R/'edited-metadata.json').read_text());duration=math.ceil(float(meta['format']['duration'])*30)/30
cfg=json.loads((R/'edit.json').read_text());total=duration+6;voice_start=duration+.30

def run(args):
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y',*args],check=True,cwd=OUT)
def stamp(s):
 cs=round(s*100);return f'{cs//360000}:{cs//6000%60:02}:{cs//100%60:02}.{cs%100:02}'
def vtt(s):
 ms=round(s*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02}.{ms%1000:03}'
cues=cfg['captions']+[{'start':voice_start+.16,'end':voice_start+1.9,'text':"There's a simpler way."}]
for profile,height in [('reels',1920),('feed',1350)]:
 margin=720 if profile=='reels' else 135
 ass=f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: {height}
ScaledBorderAndShadow: yes
WrapStyle: 0
[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: Default,Poppins SemiBold,57,&H00FFFFFF,&H00FFFFFF,&H00101010,&H00101010,0,0,0,0,100,100,0,0,1,3,1,2,90,90,{margin},1
[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
"""
 for cue in cues:
  text=cue['text'].replace('\n',r'\N').replace('{','').replace('}','')
  ass+=f"Dialogue: 0,{stamp(cue['start'])},{stamp(cue['end'])},Default,,0,0,0,,{text}\n"
 (OUT/f'captions-{profile}.ass').write_text(ass)
 width=860 if profile=='reels' else 900;picture_h=round(920*width/740/2)*2;top=230 if profile=='reels' else 65;x=(1080-width)//2
 start,end=cfg['footInsert'];local_start=start-1.5;local_end=end-1.5
 crop_y=f'if(between(t,{local_start},{local_end}),650,450)'
 # Mask the incidental generated registration before composing the film.
 filters=[
 '[0:v]fps=30,split=2[platebase][platepatch]',
 '[platepatch]crop=275:165:385:1265,boxblur=18:3[blur]',
 '[platebase][blur]overlay=385:1265,tpad=stop_mode=clone:stop_duration=0.2,split=2[wide][close]',
 f'[wide]trim=duration=1.5,setpts=PTS-STARTPTS,crop=1080:1080:0:430,scale={width}:{width},pad={width}:{picture_h}:0:{(picture_h-width)//2}:color=0x101112,setsar=1[w]',
 f"[close]trim=start=1.5:end={duration},setpts=PTS-STARTPTS,crop=740:920:340:'{crop_y}',scale={width}:{picture_h},setsar=1[c]",
 '[w][c]concat=n=2:v=1:a=0[film]',
 f'color=c=0x101112:s=1080x{height}:r=30:d={duration}[bg]',
 f'[bg][film]overlay={x}:{top}:shortest=1[picture]',
 '[1:v]scale=200:-1[logo]',
 f'[picture][logo]overlay=88:{285 if profile=="reels" else 88}:shortest=1,setsar=1[body]',
 f'[2:v]scale=1080:{height},fps=30,trim=duration=6,setpts=PTS-STARTPTS,setsar=1[card]',
 '[body][card]concat=n=2:v=1:a=0[joined]',
 f'[joined]ass=captions-{profile}.ass:fontsdir={FONTS}[outv]',
 f'[0:a]atrim=duration={duration},asetpts=PTS-STARTPTS,afade=t=out:st={duration-.22}:d=0.22,aresample=48000[native]',
 f'[3:a]adelay={round(voice_start*1000)}:all=1,aresample=48000[brand]',
 f'[native][brand]amix=inputs=2:normalize=0,apad,atrim=duration={total},loudnorm=I=-16:TP=-1.5:LRA=8,aresample=48000[outa]'
 ]
 movie=PUB/f'defined-detail-personal-space-{profile}.mp4'
 if not movie.exists():
  run(['-i',str(SOURCE),'-loop','1','-i',str(LOGO),'-loop','1','-i',str(OUT/f'endcard-{profile}.png'),'-i',str(VOICE),'-filter_complex_threads','2','-filter_complex',';'.join(filters),'-map','[outv]','-map','[outa]','-t',str(total),'-c:v','libx264','-threads','2','-preset','fast','-crf','18','-pix_fmt','yuv420p','-r','30','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-movflags','+faststart',str(movie)])
 run(['-i',str(movie),'-f','null','-'])
 run(['-ss','1','-i',str(movie),'-frames:v','1',str(PUB/f'poster-{profile}.jpg')])
 run(['-ss','0.4','-i',str(movie),'-vf','fps=1/2.5,scale=260:-1,tile=4x2','-frames:v','1',str(OUT/f'finished-{profile}-sheet.jpg')])
 print(profile,'rendered and fully decoded',flush=True)
shutil.copy2(LOGO,PUB/'defined-detail-logo.png');shutil.copy2(VOICE,PUB/'adam-original-line.wav')
(PUB/'captions.vtt').write_text('WEBVTT\n\n'+'\n\n'.join(f"{vtt(c['start'])} --> {vtt(c['end'])}\n{c['text']}" for c in cues)+'\n')
with zipfile.ZipFile(PUB/'defined-detail-personal-space-both.zip','w',zipfile.ZIP_DEFLATED,compresslevel=1) as z:
 for profile in ['reels','feed']:
  name=f'defined-detail-personal-space-{profile}.mp4';z.write(PUB/name,name)
 z.write(PUB/'captions.vtt','captions.vtt')
 z.writestr('START-HERE.txt','Defined Detail / Personal Space\nReels: 1080x1920. Feed: 1080x1350.\nCaptioned review cuts with the original licensed Adam line.\n')
report={'title':'Personal Space','duration':total,'nativePictureSeconds':duration,'endcardSeconds':6,'voiceStart':voice_start,'voice':'Exact original Adam Stone recording, unchanged delivery','voiceCredits':0,'footageCredits':170,'paidTakes':1,'fullDecodePassed':True,'reviewStatus':'New candidate; final creative acceptance remains with Keiron','files':{f.name:{'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in PUB.iterdir() if f.is_file()}}
(R/'export-report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report),flush=True)

