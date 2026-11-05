"""Build the actual Defined Detail cards locally, without a generation call."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
R=Path(__file__).resolve().parent;O=R/'output';O.mkdir(exist_ok=True)
fonts=Path('/opt/ctn-new-hire-video/facebook-v1/assets')
logo=Image.open('/opt/videobase/.videobase/assets/defined-detail/logo.png').convert('RGBA')
def ft(n,w='Bold'):return ImageFont.truetype(str(fonts/f'Poppins-{w}.ttf'),n)
def text(d,s,y,n,color=(247,245,240),weight='Bold'):
 f=ft(n,weight)
 while d.textlength(s,font=f)>900:n-=1;f=ft(n,weight)
 d.text((540,y),s,font=f,fill=color,anchor='mt')
for profile,h in [('reels',1920),('feed',1350)]:
 im=Image.new('RGB',(1080,h),(16,17,18));d=ImageDraw.Draw(im)
 d.line((100,295 if profile=='reels' else 70,980,295 if profile=='reels' else 70),fill=(215,25,32),width=4)
 ly=345 if profile=='reels' else 115
 lg=logo.resize((360,180),Image.Resampling.LANCZOS);im.paste(lg,(360,ly),lg)
 t=625 if profile=='reels' else 400
 text(d,"THAT IS",t,88);text(d,"YOUR CAR.",t+108,88,(239,53,60))
 text(d,'Car cleaning & detailing',t+273,39,weight='SemiBold')
 text(d,'Telford',t+334,29,(170,170,165),weight='Regular')
 y=1070 if profile=='reels' else 845
 d.rounded_rectangle((220,y,860,y+92),radius=5,fill=(215,25,32))
 text(d,'Message Defined Detail',y+26,35,weight='SemiBold')
 text(d,'facebook.com/DefinedDetail',y+134,30,weight='Regular')
 im.save(O/f'endcard-{profile}.png')
