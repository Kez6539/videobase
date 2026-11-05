"""Render the new clean-car review cut on Hermes. No generation calls."""
from pathlib import Path
import json,subprocess,math,hashlib,shutil,zipfile
R=Path(__file__).resolve().parent
O=R/'output';P=R/'publish';O.mkdir(exist_ok=True);P.mkdir(exist_ok=True)
FONT='/opt/ctn-new-hire-video/facebook-v1/assets'
LOGO=Path('/opt/videobase/.videobase/assets/defined-detail/logo.png')
cfg=json.loads((R/'edit.json').read_text())
body=cfg['bodySeconds'];close=5.5;duration=body+close;brand=cfg['brandStart']
def run(args):
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y',*args],check=True,cwd=O)
def ass_time(t):
 n=round(t*100);return f'{n//360000}:{n//6000%60:02}:{n//100%60:02}.{n%100:02}'
def vtt(t):
 n=round(t*1000);return f'{n//3600000:02}:{n//60000%60:02}:{n//1000%60:02}.{n%1000:03}'
cues=cfg['captions']+[{'start':brand+.19,'end':brand+1.50,'text':"There's a simpler way.",'style':'Brand'}]
music=Path('/opt/ctn-new-hire-video/comedy-v6/assets/music.mp3')
mix=O/'mix.m4a'
music_d=duration-brand
audio=[
 f'[0:a]atrim=duration={body},asetpts=PTS-STARTPTS,aresample=48000,volume=if(gte(t\\,{brand})\\,0.12\\,1):eval=frame,afade=t=out:st={body-.18}:d=0.18[native]',
 f'[1:a]adelay={round(brand*1000)}:all=1,aresample=48000[voice]',
 f'[2:a]atrim=duration={music_d},asetpts=PTS-STARTPTS,volume=0.035,afade=t=in:st=0:d=0.5,afade=t=out:st={music_d-.8}:d=0.8,adelay={round(brand*1000)}:all=1,aresample=48000[music]',
 f'[native][voice][music]amix=inputs=3:normalize=0,apad,atrim=duration={duration},loudnorm=I=-16:TP=-1.5:LRA=8,aresample=48000[out]'
]
run(['-i',str(R/'source.mp4'),'-i',str(R/'adam-original-line.wav'),'-i',str(music),'-filter_complex',';'.join(audio),'-map','[out]','-t',str(duration),'-c:a','aac','-b:a','192k','-ar','48000','-ac','2',str(mix)])
reports={}
for profile,h in [('reels',1920),('feed',1350)]:
 crop=cfg['framing'][profile]['crop'];x,y,w,ch=crop
 logo_x,logo_y=cfg['framing'][profile]['logo']
 margin=cfg['framing'][profile]['captionMarginBottom']
 ass=f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: {h}
ScaledBorderAndShadow: yes
WrapStyle: 0
[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: Default,Poppins,76,&H00FFFFFF,&H00FFFFFF,&H00101010,&H80000000,-1,0,0,0,100,100,0,0,1,3,1,2,85,85,{margin},1
Style: Brand,Poppins SemiBold,58,&H00FFFFFF,&H00FFFFFF,&H00101010,&H80000000,-1,0,0,0,100,100,0,0,1,3,1,2,85,85,{margin},1
[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
"""
 for cue in cues:
  text=cue['text'].replace('\n',r'\N').replace('{','').replace('}','')
  ass+=f"Dialogue: 0,{ass_time(cue['start'])},{ass_time(cue['end'])},{cue.get("style","Default")},,0,0,0,,{text}\n"
 (O/f'{profile}.ass').write_text(ass)
 filters=[
 f'[0:v]fps=30,scale=1080:1920,setsar=1,tpad=stop_mode=clone:stop_duration=0.5,trim=duration={body},setpts=PTS-STARTPTS,crop={w}:{ch}:{x}:{y},scale=1080:{h},setsar=1[scene]',
 '[1:v]scale=210:105[logo]',
 f'[scene][logo]overlay={logo_x}:{logo_y}:shortest=1[body]',
 f'[2:v]fps=30,scale=1080:{h},trim=duration={close},setpts=PTS-STARTPTS,setsar=1[card]',
 '[body][card]concat=n=2:v=1:a=0[joined]',
 f'[joined]ass={profile}.ass:fontsdir={FONT}[video]'
 ]
 file=P/f'defined-detail-kitchens-next-{profile}.mp4'
 run(['-i',str(R/'source.mp4'),'-loop','1','-i',str(LOGO),'-loop','1','-i',str(O/f'endcard-{profile}.png'),'-i',str(mix),'-filter_complex_threads','2','-filter_complex',';'.join(filters),'-map','[video]','-map','3:a:0','-t',str(duration),'-r','30','-c:v','libx264','-threads','2','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','copy','-movflags','+faststart',str(file)])
 run(['-i',str(file),'-f','null','-'])
 run(['-ss','0.8','-i',str(file),'-frames:v','1',str(P/f'poster-{profile}.jpg')])
 run(['-i',str(file),'-vf','fps=1/2.5,scale=216:-1,tile=7x1','-frames:v','1',str(O/f'{profile}-contact.jpg')])
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration:stream=codec_name,width,height,channels,sample_rate,r_frame_rate','-of','json',str(file)]))
 reports[profile]=probe
 print(profile,'rendered and fully decoded',flush=True)
shutil.copy2(LOGO,P/'defined-detail-logo.png');shutil.copy2(R/'adam-original-line.wav',P/'adam-original-line.wav')
(P/'captions.vtt').write_text('WEBVTT\n\n'+'\n\n'.join(f"{vtt(c['start'])} --> {vtt(c['end'])}\n{c['text']}" for c in cues)+'\n')
with zipfile.ZipFile(P/'defined-detail-kitchens-next-both.zip','w',zipfile.ZIP_DEFLATED,compresslevel=1) as z:
 for profile in ['reels','feed']:
  f=P/f'defined-detail-kitchens-next-{profile}.mp4';z.write(f,f.name)
 z.write(P/'captions.vtt','captions.vtt')
 z.writestr('START-HERE.txt',"Defined Detail / Kitchen's Next\nReels: 1080 x 1920. Feed: 1080 x 1350.\nBoth have burned captions and the original selected Adam recording.\n")
report={'title':"Kitchen's Next",'duration':duration,'bodySeconds':body,'endcardSeconds':close,'brandStart':brand,'paidTakes':1,'footageCredits':400,'voiceCredits':0,'voice':'Original selected Adam recording; performance unchanged','renderHost':'Hermes VPS','creativeApproval':None,'fullDecodePassed':True,'metadata':reports,'files':{f.name:{'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in P.iterdir() if f.is_file()}}
(R/'export-report.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report),flush=True)
