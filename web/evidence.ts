export type PlaybackRange={start:number;end:number};
export function recordPlayback(ranges:PlaybackRange[],start:number,end:number,duration:number):PlaybackRange[]{
 if(!Number.isFinite(duration)||duration<=0||!Number.isFinite(start)||!Number.isFinite(end)||end<=start||end-start>1.5)return ranges;
 const next=[...ranges,{start:Math.max(0,start),end:Math.min(duration,end)}].filter(x=>x.end>x.start).sort((a,b)=>a.start-b.start);
 const merged:PlaybackRange[]=[];
 for(const range of next){const last=merged.at(-1);if(last&&range.start<=last.end+.02)last.end=Math.max(last.end,range.end);else merged.push({...range});}
 return merged;
}
export function playedSeconds(ranges:PlaybackRange[]):number{return ranges.reduce((n,r)=>n+r.end-r.start,0);}
