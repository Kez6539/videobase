import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recordPlayback,playedSeconds,type PlaybackRange} from '../web/evidence.ts';
test('replaying one fragment cannot inflate review coverage',()=>{
 let ranges:PlaybackRange[]=[];
 for(let i=0;i<10;i++)ranges=recordPlayback(ranges,0,1,10);
 assert.equal(playedSeconds(ranges),1);
});
test('seek jumps do not count as listening',()=>{
 assert.deepEqual(recordPlayback([],0,8,10),[]);
});
test('normal adjacent playback accumulates once and stays inside the media duration',()=>{
 let ranges:PlaybackRange[]=[];for(let i=0;i<10;i++)ranges=recordPlayback(ranges,i,i+1,9.5);
 assert.equal(playedSeconds(ranges),9.5);
});
test('overlapping fragments merge without double counting',()=>{
 let ranges=recordPlayback([],1,2,10);ranges=recordPlayback(ranges,1.5,2.5,10);
 assert.equal(playedSeconds(ranges),1.5);
});
