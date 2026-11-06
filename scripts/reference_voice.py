"""Reference-based voice auditions. No paid provider calls."""
from pathlib import Path
import argparse,json,hashlib,time
def main():
 p=argparse.ArgumentParser()
 p.add_argument('--reference',required=True,type=Path)
 p.add_argument('--reference-text',required=True)
 p.add_argument('--reference-label',required=True)
 p.add_argument('--script',required=True,type=Path)
 p.add_argument('--output',required=True,type=Path)
 p.add_argument('--model',default='Qwen/Qwen3-TTS-12Hz-1.7B-Base')
 p.add_argument('--device',default='cpu')
 p.add_argument('--seed',type=int,default=47)
 a=p.parse_args()
 import torch,soundfile as sf
 from huggingface_hub import HfApi
 from qwen_tts import Qwen3TTSModel
 torch.set_num_threads(4);torch.manual_seed(a.seed)
 text=a.script.read_text().strip()
 if not text:raise ValueError('The business script is empty')
 if a.output.exists():raise FileExistsError('Preserve the prior audition; use a new output name')
 revision=HfApi().model_info(a.model).sha;start=time.monotonic()
 model=Qwen3TTSModel.from_pretrained(a.model,revision=revision,device_map=a.device,dtype=torch.float32,attn_implementation='sdpa')
 wavs,sr=model.generate_voice_clone(text=text,language='English',ref_audio=str(a.reference),ref_text=a.reference_text,x_vector_only_mode=False,max_new_tokens=320,temperature=.7)
 a.output.parent.mkdir(parents=True,exist_ok=True);sf.write(str(a.output),wavs[0],sr)
 report={'method':'Reference recreation; not the original recording or an official library render','referenceLabel':a.reference_label,'referenceSHA256':hashlib.sha256(a.reference.read_bytes()).hexdigest(),'script':text,'model':a.model,'modelRevision':revision,'seed':a.seed,'sampleRate':sr,'duration':len(wavs[0])/sr,'secondsToGenerate':round(time.monotonic()-start,2),'sha256':hashlib.sha256(a.output.read_bytes()).hexdigest(),'paidProviderCredits':0,'creativeApproval':None}
 a.output.with_suffix('.provenance.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
if __name__=='__main__':main()
