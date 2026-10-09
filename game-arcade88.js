'use strict';
const canvas=document.querySelector('#game'),c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
let W=960;const H=540,ZOOM=.86,keys={left:false,right:false,up:false,down:false,attack:false,special:false,ultra:false},img={};
const names=['ultra-trio-pickup-clean','rock-heart-pickup','el-mazo-walk-a','el-mazo-walk-b','el-mazo-walk-c','el-mazo-windup','el-mazo-slam','el-mazo-batter','el-mazo-swing','el-mazo-falling','el-mazo-grounded','wall-band-05-no-stick','wall-door-cymbal-erased','wall-band-09-no-cymbals','wall-bar-02-clean','wall-band-03-contained','wall-band-09-contained','wall-abstract-01','wall-band-03-canon','wall-band-05-canon','wall-poster-07-canon','wall-clean-01','wall-band-03-drums','wall-poster-07-red','wall-ladder-08','wall-band-03','wall-band-05','wall-zonie-06','wall-band-09','kick-punk-gait','kick-punk-reactions-v2','kick-punk-sheet','guitar-hit-flame','guitar-riff-dragon','bass-hit-flame','bass-riff-fire','drums-hit-flame','maria-special-contact','maria-special-clean','marisol-special-clean','maria-hurt-clean','maria-directions','isabel-directions','marisol-directions','rolling-side-can','rolling-fire-can','fire-runners','shocked-lady','fire-watchers','cheering-spectator','crowd-poses','crowd-individuals','mariachi-trio','plaza-floor','route-world','maria-windup','maria-contact','maria-follow','punk-guard','punk-hurt','punk-fall'];
for(const prefix of ['punk-punch'])for(let i=0;i<4;i++)names.push(`${prefix}-${i}`);
for(const who of ['maria','isabel','marisol']){for(const action of ['walk','run'])for(let i=0;i<4;i++)names.push(`${who}-${action}-clean-${i}`)}
for(const frame of [0,1,3])names.push(`isabel-hit-${frame}`);
for(const who of ['isabel','marisol'])for(const action of (who==='marisol'?['hurt']:['attack','hurt']))for(let i=0;i<4;i++)names.push(`${who}-${action}-${i}`);
for(let i=0;i<8;i++){names.push(`punk-step-${i}`);names.push(`punk-ko-${i}`);names.push(`blue-punk-ko-${i}`)}
for(const name of ['punk-guard','punk-hurt','punk-fall',...Array.from({length:4},(_,i)=>`punk-punch-${i}`),...Array.from({length:8},(_,i)=>`punk-step-${i}`)])names.push(`blue-${name}`);
for(const who of ['maria','isabel','marisol'])for(const action of ['tackle'])for(let i=0;i<4;i++)names.push(`${who}-${action}-${i}`);
const webpNames=new Set(["ultra-trio-pickup", "wall-band-05-no-stick", "wall-door-cymbal-erased", "wall-band-09-no-cymbals", "wall-bar-02-clean", "wall-band-03-contained", "wall-band-09-contained", "wall-abstract-01", "wall-band-03-canon", "wall-band-05-canon", "wall-poster-07-canon", "wall-clean-01", "wall-band-03-drums", "wall-poster-07-red", "wall-ladder-08", "wall-band-03", "wall-band-05", "wall-zonie-06", "wall-band-09", "kick-punk-gait", "kick-punk-reactions-v2", "kick-punk-sheet", "guitar-hit-flame", "guitar-riff-dragon", "bass-hit-flame", "bass-riff-fire", "drums-hit-flame", "plaza-floor", "maria-directions", "isabel-directions", "marisol-directions", "maria-special-clean", "marisol-special-clean", "crowd-individuals", "fire-runners", "fire-watchers", "cheering-spectator", "shocked-lady", "maria-hurt-clean", "mariachi-trio", "rolling-side-can", "rolling-fire-can", "crowd-poses"]);
for(const name of names){let a=new Image();a.src=`assets/${name}.${name.startsWith('route-')?'jpg':webpNames.has(name)?'webp':'png'}`;img[name]=a}
const WORLD_END=9600,ROUTE_PANEL=2160,PHASE_TWO_X=1370,PHASE_TWO_END=2360,CLUB_ZONE_X=2700,CLUB_SECOND_X=3070,CLUB_END=3570,ZONIE_X=4440,ZONIE_END=5440;
let viewOffset=0,cameraX=0;
const worldWidth=()=>W/ZOOM,worldHeight=()=>H/ZOOM;
function resize(){let bounds=document.querySelector('#frame').getBoundingClientRect();let ratio=bounds.width/Math.max(1,bounds.height);W=Math.max(810,Math.min(1400,Math.round(H*ratio)));viewOffset=(worldWidth()-960)/2;cameraX=Math.min(cameraX,Math.max(0,WORLD_END-worldWidth()));canvas.width=W;canvas.height=H;c.imageSmoothingEnabled=false}
resize();window.addEventListener('resize',resize);
let introPhase=0,introClock=0,firstWaveStage=0,phaseTwo=0,clubStage=0,zonieStage=0,zonieGate=0,kickSquadSpawned=false,ultraTutorialClock=0,firePanic=false,fireRunners=[],barrels=[],lastMoveX=1,lastMoveY=0;let runHold=0,running=false,runDirection=0,tackleClock=0,tackleUsed=new Set(),runStep=0;let character='guitar',mode='title',clock=0,elapsed=0,heroX=245,heroY=470,heroHP=5,attackClock=0,attackUsed=false,attackResolved=false,attackLanded=false,attackCanHit=false,attackHits=new Set(),specialClock=0,specialUsed=false,specialHits=new Set(),specialWave=0,specialLatch=false,riffMeter=0,hitStreak=0,tackleComboLanded=false,victoryDelay=0,playerHurt=0,invuln=0,shake=0,hitFX=[],impacts=[],score=0,audioContext=null,attackLatch=false,walkClock=0,face=1,moveX=0,moveY=0,enemies=[],ultraMeter=0,ultraClock=0,ultraUsed=false,ultraArea=null,ultraLatch=false,pickups=[],totalKOs=0;
function clampHeroX(x,streetClear){let left=Math.max(175,cameraX+180-viewOffset),right=Math.min(phaseTwo===0?streetClear?WORLD_END-180-viewOffset:850:zonieStage>0&&zonieStage<3?(zonieStage===1?ZONIE_X+430:Math.min(ZONIE_END,zonieGate)):clubStage>0&&clubStage<3?CLUB_END:!streetClear?PHASE_TWO_END:WORLD_END-180-viewOffset,cameraX+worldWidth()-180-viewOffset);return Math.max(left,Math.min(right,x))}
function punk(id,x,y){return {id,x,y,hp:3,hurt:0,punch:0,punchUsed:false,cooldown:id==='blue'?1.3:1.2,walk:0,speed:0,vx:0,vy:0,motion:'approach',motionTime:.45,laneDir:id==='blue'?-1:1,fall:0,koTime:0,moveStyle:{advance:id==='blue'?96:84,sidestep:id==='blue'?65:54,retreat:id==='blue'?58:48}}}
const audioFiles={ultra:'trio-ultra-anthem.wav',guitar:'hit-guitar-rock-v2.wav',bass:'hit-bass-rock-v2.wav',drums:'hit-drums-rock-v2.wav'};
const preloadedAudio=Object.fromEntries(Object.entries(audioFiles).map(([kind,file])=>[kind,fetch(`assets/${file}`).then(r=>{if(!r.ok)throw Error('audio unavailable');return r.arrayBuffer()}).catch(()=>null)]));
function audio(){if(!audioContext){audioContext=new (window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});sfxBus=audioContext.createDynamicsCompressor();sfxBus.threshold.value=-18;sfxBus.knee.value=12;sfxBus.ratio.value=5;sfxBus.attack.value=.002;sfxBus.release.value=.16;concertGain=audioContext.createGain();sfxBus.connect(concertGain);concertGain.connect(audioContext.destination);ultraBufferPromise=preloadedAudio.ultra.then(data=>data?audioContext.decodeAudioData(data):null).catch(()=>null);for(const kind of ['guitar','bass','drums'])preloadedAudio[kind].then(data=>data?audioContext.decodeAudioData(data):null).then(buffer=>{if(buffer)combatBuffers[kind]=buffer}).catch(()=>{})}}
let ultraBufferPromise=null,ultraPending=false;
let sfxBus,concertGain,duckTimer,combatBuffers={};function duckMusic(duration=.22,level=.06){clearTimeout(duckTimer);soundtrack.volume=level;duckTimer=setTimeout(()=>{soundtrack.volume=.48},duration*1000)}
function playCombatHit(kind){duckMusic(.23,.25);let buffer=combatBuffers[kind];if(buffer){let source=audioContext.createBufferSource(),gain=audioContext.createGain();source.buffer=buffer;gain.gain.value=kind==='drums'?.95:.84;source.connect(gain);gain.connect(sfxBus);source.start()}else{thump(kind==='drums'?190:kind==='bass'?135:175,40,.19,.37);noiseBurst(.1,.2,kind==='bass'?'lowpass':'bandpass',kind==='bass'?650:1500)}}
function playAttackCue(kind){let buffer=combatBuffers[kind];if(!buffer)return;let source=audioContext.createBufferSource(),gain=audioContext.createGain();source.buffer=buffer;gain.gain.value=.19;source.connect(gain);gain.connect(sfxBus);source.start(0,0,.045)}
function thump(start,end,duration,volume){let now=audioContext.currentTime,osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type='sine';osc.frequency.setValueAtTime(start,now);osc.frequency.exponentialRampToValueAtTime(end,now+duration);gain.gain.setValueAtTime(volume,now);gain.gain.exponentialRampToValueAtTime(.001,now+duration);osc.connect(gain);gain.connect(sfxBus);osc.start(now);osc.stop(now+duration)}
function tone(freq,dur=.1,vol=.07,type='square',slide=0){if(!audioContext)return;let o=audioContext.createOscillator(),v=audioContext.createGain();o.type=type;o.frequency.setValueAtTime(freq,audioContext.currentTime);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(35,freq+slide),audioContext.currentTime+dur);v.gain.setValueAtTime(vol,audioContext.currentTime);v.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+dur);o.connect(v);v.connect(sfxBus);o.start();o.stop(audioContext.currentTime+dur)}
function noiseBurst(duration,volume,filterType,frequency,when=0){
 if(!audioContext)return;
 let sampleCount=Math.ceil(audioContext.sampleRate*duration),buffer=audioContext.createBuffer(1,sampleCount,audioContext.sampleRate),samples=buffer.getChannelData(0);
 for(let i=0;i<sampleCount;i++)samples[i]=Math.random()*2-1;
 let source=audioContext.createBufferSource(),filter=audioContext.createBiquadFilter(),gain=audioContext.createGain(),time=audioContext.currentTime+when;
 source.buffer=buffer;filter.type=filterType;filter.frequency.value=frequency;
 gain.gain.setValueAtTime(.001,time);gain.gain.linearRampToValueAtTime(volume,time+.008);gain.gain.exponentialRampToValueAtTime(.001,time+duration);
 source.connect(filter);filter.connect(gain);gain.connect(sfxBus);source.start(time);source.stop(time+duration);
}
function enemyImpact(){duckMusic(.28);thump(135,39,.24,.48);tone(95,.21,.18,'square',-52);noiseBurst(.18,.40,'lowpass',760);noiseBurst(.075,.16,'bandpass',1650)}
function specialExplosion(){
 if(!audioContext)return;duckMusic(.8);
 let now=audioContext.currentTime,distortion=audioContext.createWaveShaper(),filter=audioContext.createBiquadFilter(),gain=audioContext.createGain();
 let curve=new Float32Array(1024);for(let i=0;i<curve.length;i++){let x=i/512-1;curve[i]=Math.tanh(x*14)}distortion.curve=curve;
 filter.type='lowpass';filter.frequency.setValueAtTime(4500,now);filter.frequency.exponentialRampToValueAtTime(900,now+.72);
 gain.gain.setValueAtTime(.001,now);gain.gain.linearRampToValueAtTime(.38,now+.02);gain.gain.setValueAtTime(.33,now+.2);gain.gain.exponentialRampToValueAtTime(.001,now+.8);
 distortion.connect(filter);filter.connect(gain);gain.connect(sfxBus);
 // Echo the distorted power chord and let its repeats decay behind the fight.
 let delay=audioContext.createDelay(1),feedback=audioContext.createGain(),wet=audioContext.createGain();delay.delayTime.value=.22;feedback.gain.value=.31;wet.gain.value=.44;
 gain.connect(delay);delay.connect(feedback);feedback.connect(delay);delay.connect(wet);wet.connect(sfxBus);
 for(let f of [82.41,123.47,164.81,247]){let osc=audioContext.createOscillator();osc.type='sawtooth';osc.frequency.setValueAtTime(f*1.09,now);osc.frequency.exponentialRampToValueAtTime(f,now+.14);osc.connect(distortion);osc.start(now);osc.stop(now+.79)}
 thump(210,38,.44,.65);noiseBurst(.5,.55,'bandpass',950);
 for(let i=0;i<16;i++)noiseBurst(.018+i%4*.01,.18,'highpass',1600+i%5*730,i*.034);
 setTimeout(()=>{try{gain.disconnect(delay);feedback.disconnect()}catch(_){}},1700);
}
const soundtrack=new Audio('assets/dragon-street-rock.mp3');soundtrack.loop=true;soundtrack.preload='auto';soundtrack.volume=.48;
const ultraRiff=new Audio('assets/trio-ultra-anthem.wav');ultraRiff.preload='auto';ultraRiff.volume=.96;
function music(){if(mode!=='play'&&!soundtrack.paused){soundtrack.pause();soundtrack.currentTime=0}}
function start(){document.querySelector('#select-screen').classList.add('hidden');audio();if(audioContext.state==='suspended')audioContext.resume();soundtrack.currentTime=0;soundtrack.play().catch(()=>{});mode='play';elapsed=0;introPhase=1;introClock=0;firstWaveStage=0;phaseTwo=0;clubStage=0;zonieStage=0;zonieGate=0;kickSquadSpawned=false;ultraTutorialClock=0;firePanic=false;fireRunners=[];barrels=[makeBarrel(FIRE_X,480)];cameraX=0;heroX=-125;heroY=470;heroHP=5;enemies=[];ultraMeter=ULTRA_TARGET;ultraClock=0;ultraPending=false;ultraUsed=false;ultraArea=null;ultraLatch=false;pickups=[];totalKOs=0;attackClock=0;attackUsed=false;attackResolved=false;attackLanded=false;attackCanHit=false;attackHits.clear();specialClock=0;specialUsed=false;specialHits.clear();specialWave=0;specialLatch=false;riffMeter=0;hitStreak=0;tackleComboLanded=false;victoryDelay=0;playerHurt=0;invuln=0;shake=0;score=0;hitFX=[];impacts=[];attackLatch=false;walkClock=0;face=1;lastMoveX=1;lastMoveY=0;runHold=0;running=false;runDirection=0;tackleClock=0;tackleUsed.clear();runStep=0}
function showImpact(kind,x,y,hit){
 if(kind==='drums')return;impacts.push({kind,x,y,hit,life:hit?.46:.36,max:hit?.46:.36,face});
 if(hit){shake=Math.max(shake,kind==='bass'?.27:.21);const colors=kind==='bass'?['#42e7ff','#a66cff','#f6ffff']:['#ff49bb','#ffd55d','#fff5e8'];for(let i=0;i<26;i++){const angle=i*2.399,velocity=95+(i%5)*33;hitFX.push({x,y,vx:Math.cos(angle)*velocity,vy:Math.sin(angle)*velocity,life:.28+(i%3)*.07,color:colors[i%3]})}}
}
function drawImpacts(){for(const fx of impacts){const age=1-fx.life/fx.max,fade=Math.min(1,fx.life*8),x=fx.x+viewOffset-cameraX,y=fx.y,heavy=fx.kind==='bass';c.save();c.globalAlpha=fade;c.translate(Math.round(x),Math.round(y));c.lineJoin='miter';if(heavy){const radius=26+age*(fx.hit?115:48);for(let ring=0;ring<2;ring++){c.strokeStyle=ring?'#ae65ff':'#57e8ff';c.lineWidth=ring?5:8;c.beginPath();c.ellipse(0,0,radius+ring*19,(radius+ring*19)*.52,0,0,Math.PI*2);c.stroke()}for(let i=-3;i<=3;i++){let xx=i*17,yy=Math.sin(i*1.6+age*3)*19;c.fillStyle=i%2?'#ad76ff':'#e4ffff';c.fillRect(xx-3,yy-14,6,28)}}else{c.strokeStyle='#ff4cba';c.lineWidth=15;c.beginPath();c.moveTo(-82,-57);c.lineTo(65,37);c.stroke();c.strokeStyle='#ffe879';c.lineWidth=6;c.beginPath();c.moveTo(-95,-67);c.lineTo(72,43);c.stroke();for(let i=0;i<8;i++){let a=i*Math.PI/4,r=31+age*83;c.fillStyle=i%2?'#ffec94':'#ff65c9';c.fillRect(Math.round(Math.cos(a)*r)-4,Math.round(Math.sin(a)*r)-4,8,8)}}if(fx.hit){let word=heavy?'BOOM!':'SLAM!';c.font='1000 35px monospace';c.textAlign='center';c.lineWidth=7;c.strokeStyle='#170c32';c.strokeText(word,0,-55-age*29);c.fillStyle=heavy?'#a5f7ff':'#ffe77e';c.fillText(word,0,-55-age*29)}c.restore()}}
// A bounded, layered flame ribbon follows the instrument's actual hit window.
// Screen-side length shrinks near the viewport edge, keeping the entire tip visible.
function drawInstrumentFlame(kind,charged,progress,foreground=false){
 if(!foreground||progress<=0||progress>=1)return;
 const asset=img[kind==='drums'?'drums-hit-flame':kind==='guitar'?(charged?'guitar-riff-dragon':'guitar-hit-flame'):(charged?'bass-riff-fire':'bass-hit-flame')];
 if(!asset?.complete||!asset.naturalWidth)return;
 const x=heroX+viewOffset-cameraX,room=face>0?worldWidth()-x:x;
 const nominal=charged?(kind==='guitar'?505:520):(kind==='guitar'?370:kind==='drums'?405:390);
 const width=Math.min(nominal,Math.max(95,room-56));
 const height=width*asset.naturalHeight/asset.naturalWidth;
 const rise=charged?(kind==='guitar'?330:320):(kind==='guitar'?275:kind==='drums'?185:245);
 const opening=Math.min(1,progress*4),fade=Math.min(1,progress*6,(1-progress)*5);
 const size=.63+.37*opening;
 c.save();c.translate(Math.round(x),Math.round(heroY-rise));c.scale(face,1);
 c.imageSmoothingEnabled=false;c.globalAlpha=fade;
 const dx=32+width*(1-size)*.12,dy=height*(1-size)*.38;
 c.drawImage(asset,Math.round(dx),Math.round(dy),Math.round(width*size),Math.round(height*size));
 if(charged&&progress>.36&&progress<.84){c.globalAlpha=fade*.18;c.globalCompositeOperation='lighter';c.drawImage(asset,Math.round(dx-6),Math.round(dy-4),Math.round(width*size+12),Math.round(height*size+9))}
 c.restore();
}
// The round fire boundary is also the drummer's circular damage radius.
function instrumentReach(kind,charged){
 const x=heroX+viewOffset-cameraX,room=face>0?worldWidth()-x:x;
 const artwork=charged?(kind==='guitar'?505:520):(kind==='guitar'?370:390);
 return Math.max(95,Math.min(artwork-18,room-48));
}
function drumRingRadius(charged){
 const x=heroX+viewOffset-cameraX,y=heroY-85;
 return Math.max(90,Math.min(charged?205:145,x-20,worldWidth()-x-20,y-85,worldHeight()-y-18));
}
function drawDrumRing(charged,progress){
 if(progress<=0||progress>=1)return;
 const x=heroX+viewOffset-cameraX,y=heroY-85,full=drumRingRadius(charged);
 const radius=full*(.36+.64*Math.min(1,progress*4)),fade=Math.min(1,progress*9,(1-progress)*6);
 c.save();c.translate(Math.round(x),Math.round(y));c.globalAlpha=fade;c.globalCompositeOperation='lighter';
 // The inner boundary stays perfectly circular; tongues of violet flame lick outward.
 for(let layer=charged?1:0;layer>=0;layer--){
  let r=radius-layer*(charged?39:0),width=charged?24:20;
  c.beginPath();
  for(let i=0;i<=96;i++){
   let angle=i*Math.PI/48,flame=(Math.sin(i*2.399+clock*27)+1)*5+(i%7===0?9:0);
   let edge=r+width/2+flame,xx=Math.cos(angle)*edge,yy=Math.sin(angle)*edge;
   if(i===0)c.moveTo(xx,yy);else c.lineTo(xx,yy);
  }
  for(let i=96;i>=0;i--){let angle=i*Math.PI/48,edge=r-width/2;c.lineTo(Math.cos(angle)*edge,Math.sin(angle)*edge)}
  c.closePath();c.fillStyle=layer?'#6724d5':'#8120c9';c.shadowColor='#9d27ff';c.shadowBlur=charged?27:18;c.fill();
  c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.strokeStyle='#e770ff';c.lineWidth=charged?11:8;c.stroke();
  c.beginPath();c.arc(0,0,r-2,0,Math.PI*2);c.strokeStyle='#fff2ff';c.lineWidth=3;c.stroke();
  for(let i=0;i<(charged?28:16);i++){
   let angle=i*2.399+clock*(charged?3:2),distance=r+14+(i%4)*7;
   c.fillStyle=i%3?'#da59ff':'#fff3ff';c.fillRect(Math.cos(angle)*distance-2,Math.sin(angle)*distance-2,charged?6:4,charged?6:4);
  }
 }
 c.restore();
}
function swing(){if(mode!=='play'||ultraClock>0||attackClock>0||specialClock>0||tackleClock>0||playerHurt>0)return;playAttackCue(character);const hitButton=document.querySelector('.hit');hitButton.classList.remove('impact');void hitButton.offsetWidth;hitButton.classList.add('impact');setTimeout(()=>hitButton.classList.remove('impact'),420);if(running&&!keys.up&&!keys.down&&keys.left!==keys.right){tackleClock=.64;tackleUsed.clear();tackleComboLanded=false;running=false;runHold=0;return}attackClock=character==='bass'?.74:character==='drums'?.38:.53;attackUsed=false;attackResolved=false;attackLanded=false;attackCanHit=false;attackHits.clear()}
function registerComboHit(){hitStreak=Math.min(3,hitStreak+1);riffMeter=hitStreak>=3?100:hitStreak*100/3}
function riff(){if(mode!=='play'||ultraClock>0||riffMeter<100||specialClock>0||attackClock>0||tackleClock>0||playerHurt>0)return;riffMeter=0;hitStreak=0;const riffButton=document.querySelector('#special');riffButton.classList.add('impact');setTimeout(()=>riffButton.classList.remove('impact'),650);specialClock=character==='drums'?1.35:character==='bass'?1.0:.85;specialUsed=false;specialHits.clear();invuln=Math.max(invuln,.75);if(character==='guitar'){tone(220,.35,.06,'sawtooth',440);tone(329.6,.3,.045,'square',330)}else if(character==='bass'){tone(82,.32,.12,'sawtooth',-42)}else{for(let i=0;i<8;i++)setTimeout(()=>{if(audioContext){thump(190+i*13,55,.1,.25);noiseBurst(.065,.15,'highpass',1900+i*150)}},i*105)}}
const ULTRA_TARGET=8,ULTRA_DURATION=2.8;
async function ultra(){
 if(mode!=='play'||ultraPending||ultraMeter<ULTRA_TARGET||ultraClock>0||specialClock>0||attackClock>0||tackleClock>0||playerHurt>0)return;
 ultraPending=true;let buffer=await ultraBufferPromise;ultraPending=false;
 if(mode!=='play'||ultraMeter<ULTRA_TARGET||ultraClock>0)return;
 if(buffer){let source=audioContext.createBufferSource(),gain=audioContext.createGain();source.buffer=buffer;gain.gain.value=1;source.connect(gain);gain.connect(audioContext.destination);source.start()}
 else{ultraRiff.currentTime=0;ultraRiff.play().catch(()=>{})}
 ultraMeter=0;ultraTutorialClock=0;ultraClock=ULTRA_DURATION;ultraUsed=false;invuln=Math.max(invuln,3);running=false;runHold=0;
 let width=worldWidth()*.75,height=worldHeight()*.75,centerX=heroX+viewOffset-cameraX;
 ultraArea={left:Math.max(0,Math.min(worldWidth()-width,centerX-width/2)),top:Math.max(74,Math.min(worldHeight()-height,heroY-height*.7)),width,height,anchorX:centerX,anchorY:heroY,playable:character==='guitar'?'maria':character==='bass'?'isabel':'marisol'};
 let now=audioContext.currentTime;concertGain.gain.cancelScheduledValues(now);concertGain.gain.setValueAtTime(1.16,now);concertGain.gain.setValueAtTime(1.16,now+2.4);concertGain.gain.linearRampToValueAtTime(1,now+2.85);
 duckMusic(2.85);
}
function collectUltra(amount){ultraMeter=Math.min(ULTRA_TARGET,ultraMeter+amount)}
function pickupLanding(){let center=zonieStage?ZONIE_X+(ZONIE_END-ZONIE_X)/2:clubStage?CLUB_ZONE_X+(CLUB_END-CLUB_ZONE_X)/2:phaseTwo?PHASE_TWO_X+(PHASE_TWO_END-PHASE_TWO_X)/2:500;return {x:Math.max(heroX-22,Math.min(heroX+55,center)),y:Math.max(390,Math.min(505,heroY))}}
function dropPickup(kind,x,y){let landing=pickupLanding();pickups.push({kind,x:landing.x,y:landing.y,fromX:x,fromY:y,flight:.6,collected:false,delay:.6})}
function dropUltraPickup(x,y){dropPickup('ultra',x,y)}
function spawnKickSquad(){if(kickSquadSpawned)return;kickSquadSpawned=true;const colors=['cyan','lime','violet','gold'];colors.forEach((palette,i)=>{let left=i<2,x=left?cameraX-viewOffset-165-i*65:cameraX+worldWidth()-viewOffset+165+(i-2)*65,sign=left?-1:1;let ninja=punk('kick',x,[405,450,485,425][i]);ninja.palette=palette;ninja.entry={target:Math.max(PHASE_TWO_X-170,Math.min(PHASE_TWO_END-125,heroX+sign*(165+(i%2)*100))),speed:390};ninja.hp=4;ninja.maxHp=4;ninja.jump=.9;ninja.cooldown=1.7;ninja.motion='approach';ninja.moveStyle={advance:235,sidestep:115,retreat:220};enemies.push(ninja)});shake=Math.max(shake,.22);tone(360,.22,.11,'sawtooth',-170)}
function burst(x,y,color='#ff4caa'){shake=.13;for(let i=0;i<18;i++){let a=i*2.399;hitFX.push({x,y,vx:Math.cos(a)*(50+i%4*42),vy:Math.sin(a)*(55+i%5*32),life:.2+i%4*.05,color:i%3?color:'#ffdd72'})}}
function hurtPunk(e,damage,knockback=44,color='#ff4caa'){
 if(e.hp<=0)return;
 e.entry=null;e.hp=Math.max(0,e.hp-damage);e.hurt=e.hp>0?.48:0;e.punch=0;e.x=Math.max(85,Math.min(e.zone==='zonie'?ZONIE_END+90:e.id==='club'?CLUB_END+100:phaseTwo?PHASE_TWO_END+100:930,e.x+Math.sign(e.x-heroX||face)*knockback));burst(e.x,e.y-165,color);if(e.id==='lime'&&phaseTwo===1){phaseTwo=2;let kicker=punk('kick',cameraX-viewOffset-145,Math.max(390,Math.min(485,heroY+15)));kicker.entry={target:heroX-190,speed:590};kicker.hp=4;kicker.maxHp=4;kicker.jump=.9;kicker.cooldown=.9;kicker.motion='approach';kicker.moveStyle={advance:235,sidestep:115,retreat:220};enemies.push(kicker);tone(390,.13,.08,'sawtooth',-190)}if(e.hp===0&&e.zone==='zonie'&&zonieStage===1){zonieStage=2;zonieGate=Math.min(ZONIE_END,heroX+260);let mazo=punk('club',cameraX-viewOffset-65,Math.max(390,Math.min(505,heroY+25)));mazo.zone='zonie';mazo.palette='violet';mazo.hp=3.9;mazo.maxHp=3.9;mazo.entry={target:Math.max(ZONIE_X-140,heroX-145),speed:110};mazo.cooldown=2.2;mazo.moveStyle={advance:89,sidestep:31,retreat:68};enemies.push(mazo);tone(175,.22,.09,'sawtooth',-80)}if(e.hp===0){e.fall=e.id==='club'?.86:.65;e.koTime=0;e.koFlip=e.x<heroX;e.koFadeStarted=false;e.speed=0;e.vx=0;e.vy=0;totalKOs++;collectUltra(e.id==='club'?2:1);if(!(e.id==='kick'&&!e.palette)&&Math.random()<.10)dropUltraPickup(e.x,e.y);if(Math.random()<.20)dropPickup('heart',e.x,e.y)}
}
// Shared stop-and-go movement for this encounter and future enemy types.
// Each enemy keeps its own intention, lane choice, momentum, and movement tuning.
function chooseEnemyMotion(e,distance){
 let chance=Math.random();
 if(distance>330)e.motion=chance<.84?'approach':'pause';
 else if(distance>185)e.motion=chance<.58?'approach':chance<.80?'sidestep':'pause';
 else e.motion=chance<.25?'approach':chance<.49?'sidestep':chance<.68?'retreat':'pause';
 e.motionTime=e.motion==='pause'?.22+Math.random()*.32:.35+Math.random()*.55;
 if(e.motion==='sidestep'){let toward=Math.sign(heroY-e.y);e.laneDir=Math.abs(heroY-e.y)>40?toward:(Math.random()<.5?-1:1);if(e.y<392)e.laneDir=1;if(e.y>480)e.laneDir=-1}
}
function updateClubMovement(e,dt){if(e.hp<=0||e.hurt>0||e.punch>0){e.speed=0;return}let dx=heroX-e.x,dy=heroY-e.y,distance=Math.hypot(dx,dy*1.5);e.motionTime-=dt;if(distance>250){e.motion='approach';e.motionTime=.9}else if(distance<120){e.motion='retreat';e.motionTime=.95}else if(e.motionTime<=0){e.motion=e.motion==='retreat'?'approach':'retreat';e.motionTime=e.motion==='retreat'?1.1:1.35}let velocity=e.motion==='retreat'?-e.moveStyle.retreat:e.moveStyle.advance,oldX=e.x,oldY=e.y;e.vx+=(Math.sign(dx||1)*velocity-e.vx)*Math.min(1,dt*3.2);e.vy+=(Math.sign(dy)*Math.min(23,Math.abs(dy))-e.vy)*Math.min(1,dt*2.3);e.x=Math.max(e.zone==='zonie'?ZONIE_X-240:CLUB_ZONE_X-230,Math.min(e.zone==='zonie'?ZONIE_END+40:CLUB_END+35,e.x+e.vx*dt));e.y=Math.max(385,Math.min(505,e.y+e.vy*dt));let traveled=Math.hypot(e.x-oldX,e.y-oldY);e.speed=traveled/dt>7?traveled/dt:0;if(e.speed>0)e.walk+=traveled/84}
function updateEnemyMovement(e,dt){
 if(e.entry){let dx=e.entry.target-e.x,step=Math.min(Math.abs(dx),e.entry.speed*dt);e.x+=Math.sign(dx)*step;e.speed=step/dt;e.walk+=step/(e.slowGait?160:85);if(Math.abs(e.entry.target-e.x)<.5){e.x=e.entry.target;e.entry=null;e.speed=0}return}
 if(e.id==='kick'){updateKickMovement(e,dt);return}if(e.id==='club'){updateClubMovement(e,dt);return}
 if(e.hp<=0||e.hurt>0||e.punch>0){e.vx=0;e.vy=0;e.speed=0;return}
 let dx=heroX-e.x,dy=heroY-e.y,distance=Math.hypot(dx,dy*1.6);
 e.motionTime-=dt;if(e.motionTime<=0||distance>370&&e.motion==='retreat')chooseEnemyMotion(e,distance);
 let desiredX=0,desiredY=0,m=e.moveStyle;
 if(e.motion==='approach'){
  if(distance>115){desiredX=Math.sign(dx)*m.advance;desiredY=Math.sign(dy)*Math.min(m.sidestep,Math.abs(dy)*2)}
 }else if(e.motion==='retreat')desiredX=-Math.sign(dx)*m.retreat;
 else if(e.motion==='sidestep'){
  desiredY=e.laneDir*m.sidestep;
  if(distance>210)desiredX=Math.sign(dx)*m.advance*.42;
 }
 // Keep two enemies from marching on top of each other.
 for(const other of enemies)if(other!==e&&other.hp>0&&Math.abs(e.x-other.x)<85&&Math.abs(e.y-other.y)<45){desiredX+=Math.sign(e.x-other.x|| (e.id==='blue'?-1:1))*25;desiredY+=Math.sign(e.y-other.y||e.laneDir)*16}
 let easing=Math.min(1,dt*6);e.vx+=(desiredX-e.vx)*easing;e.vy+=(desiredY-e.vy)*easing;
 let oldX=e.x,oldY=e.y;e.x=Math.max(e.zone==='zonie'?ZONIE_X-240:e.id==='club'?CLUB_ZONE_X-240:phaseTwo?PHASE_TWO_X-260:85,Math.min(e.zone==='zonie'?ZONIE_END+40:e.id==='club'?CLUB_END+35:phaseTwo?PHASE_TWO_END+30:930,e.x+e.vx*dt));e.y=Math.max(370,Math.min(503,e.y+e.vy*dt));
 let traveled=Math.hypot(e.x-oldX,e.y-oldY);e.speed=traveled/dt>9?traveled/dt:0;if(e.speed>0)e.walk+=traveled/(e.slowGait?125:82);
}
function updateKickMovement(e,dt){
 if(e.hp<=0||e.hurt>0||e.punch>0||e.jump>0){e.speed=0;return}
 let dx=heroX-e.x,dy=heroY-e.y,dist=Math.hypot(dx,dy*1.6);
 e.motionTime-=dt;
 if(e.motionTime<=0){e.motion=dist>245?'approach':Math.random()<.57?'retreat':'approach';e.motionTime=e.motion==='retreat'?.42:.48}
 let pace=e.motion==='retreat'?-220:dist>95?245:0;
 let target=Math.sign(dx||1)*pace;
 e.vx+=(target-e.vx)*Math.min(1,dt*10);
 e.x=Math.max(e.zone==='zonie'?ZONIE_X-240:PHASE_TWO_X-230,Math.min(e.zone==='zonie'?ZONIE_END+40:PHASE_TWO_END+30,e.x+e.vx*dt));
 e.y=Math.max(385,Math.min(510,e.y+Math.sign(dy)*Math.min(100,Math.abs(dy)*2)*dt));
 e.speed=Math.abs(e.vx);e.walk+=Math.abs(e.vx)*dt/75;
}
function update(dt){
 clock+=dt;if(mode!=='play'){music();hitFX=hitFX.filter(p=>(p.life-=dt)>0);return}
 if(introPhase){if(introPhase===1){heroX=Math.min(245,heroX+190*dt);walkClock+=dt;moveX=1;moveY=0;if(heroX>=245){heroX=245;introPhase=2;introClock=2;moveX=0}}else{introClock-=dt;if(introClock<=0)introPhase=0}return}
 elapsed+=dt;music();ultraTutorialClock=Math.max(0,ultraTutorialClock-dt);shake=Math.max(0,shake-dt);invuln=Math.max(0,invuln-dt);playerHurt=Math.max(0,playerHurt-dt);specialWave=Math.max(0,specialWave-dt);
 if(keys.attack&&!attackLatch){swing();attackLatch=true}if(!keys.attack)attackLatch=false;
 if(keys.special&&!specialLatch){riff();specialLatch=true}if(!keys.special)specialLatch=false;
 if(keys.ultra&&!ultraLatch){ultra();ultraLatch=true}if(!keys.ultra)ultraLatch=false;
 moveX=(keys.right?1:0)-(keys.left?1:0);moveY=(keys.down?1:0)-(keys.up?1:0);if(moveX||moveY){lastMoveX=moveX;lastMoveY=moveY}if(moveX&&tackleClock<=0)face=moveX;
 let pureHorizontal=moveX!==0&&moveY===0&&!(keys.left&&keys.right)&&!(keys.up||keys.down);
 if(ultraClock<=0&&tackleClock<=0&&pureHorizontal&&attackClock<=0&&specialClock<=0&&playerHurt<=0){if(runDirection!==moveX){runDirection=moveX;runHold=0;running=false}runHold+=dt;if(runHold>=.65)running=true}else if(tackleClock<=0){runHold=0;running=false;runDirection=0}
 let magnitude=Math.hypot(moveX,moveY)||1,speed=(ultraClock>0?0:specialClock>0?24:attackClock>0?94:running?385:185)*dt;
 if(ultraClock>0){running=false;runHold=0}else if(tackleClock>0){let chargeSpeed=character==='bass'?235:character==='drums'?330:275;heroX+=face*chargeSpeed*dt;tackleClock=Math.max(0,tackleClock-dt);let zone=character==='bass'?{front:205,back:75,lane:80,damage:2}:character==='drums'?{front:190,back:75,lane:78,damage:1}:{front:190,back:75,lane:72,damage:1};
  if(tackleClock<.60&&tackleClock>.05)for(const e of enemies){let ahead=(e.x-heroX)*face;if(e.hp>0&&!tackleUsed.has(e)&&ahead>=-zone.back&&ahead<=zone.front&&Math.abs(e.y-heroY)<=zone.lane){tackleUsed.add(e);if(!tackleComboLanded){tackleComboLanded=true;registerComboHit()}hurtPunk(e,zone.damage,character==='bass'?95:67,character==='bass'?'#55e5ff':'#ff73cc');score+=zone.damage;shake=.22;playCombatHit(character)}}if(tackleClock===0&&!tackleComboLanded){}
 }else{heroX+=moveX/magnitude*speed;heroY=Math.max(385,Math.min(520,heroY+moveY/magnitude*speed*.8))}
 let streetClear=enemies.every(e=>e.hp<=0)&&firstWaveStage!==1&&!(phaseTwo===2&&!kickSquadSpawned);
 if(firstWaveStage===0&&heroX>=370){firstWaveStage=1;let first=punk('first',cameraX+worldWidth()-viewOffset+40,heroY);first.entry={target:Math.min(740,heroX+305),speed:230};first.cooldown=1.5;enemies.push(first);streetClear=false}
 if(phaseTwo===0&&firstWaveStage===2&&streetClear&&heroX>=PHASE_TWO_X){phaseTwo=1;let guard=punk('lime',cameraX+worldWidth()-viewOffset+170,heroY);guard.entry={target:heroX+345,speed:210};guard.hp=4;guard.maxHp=4;guard.cooldown=1.2;enemies.push(guard);streetClear=false;tone(300,.17,.09,'sawtooth',-100)}
 if(phaseTwo===2&&kickSquadSpawned&&clubStage===0&&enemies.every(e=>e.hp<=0)&&heroX>=CLUB_ZONE_X){clubStage=1;let brute=punk('club',cameraX+worldWidth()-viewOffset+95,Math.max(400,heroY-24));brute.palette='cyan';brute.hp=3.9;brute.maxHp=3.9;brute.entry={target:heroX+245,speed:105};brute.cooldown=1.45;brute.moveStyle={advance:86,sidestep:30,retreat:65};enemies.push(brute);streetClear=false;tone(205,.18,.09,'sawtooth',-70)}
 if(clubStage===1&&heroX>=CLUB_SECOND_X){clubStage=2;let brute=punk('club',cameraX+worldWidth()-viewOffset+115,Math.min(500,heroY+32));brute.palette='amber';brute.hp=3.9;brute.maxHp=3.9;brute.entry={target:heroX+255,speed:100};brute.cooldown=1.7;brute.moveStyle={advance:92,sidestep:34,retreat:70};enemies.push(brute);streetClear=false;tone(170,.19,.09,'sawtooth',-60)}
 if(clubStage===2&&enemies.filter(e=>e.id==='club').length===2&&enemies.filter(e=>e.id==='club').every(e=>e.hp<=0))clubStage=3;
 if(clubStage===3&&zonieStage===0&&streetClear&&heroX>=ZONIE_X){zonieStage=1;let punkGuard=punk('lime',cameraX+worldWidth()-viewOffset+80,Math.max(390,heroY-22));punkGuard.zone='zonie';punkGuard.entry={target:heroX+240,speed:165};punkGuard.cooldown=1.8;let ninja=punk('kick',cameraX-viewOffset-130,Math.min(505,heroY+29));ninja.zone='zonie';ninja.palette='gold';ninja.entry={target:heroX-165,speed:370};ninja.hp=4;ninja.maxHp=4;ninja.jump=.9;ninja.cooldown=1.9;ninja.moveStyle={advance:235,sidestep:115,retreat:220};enemies.push(punkGuard,ninja);streetClear=false;tone(315,.14,.09,'sawtooth',-110)}
 if(zonieStage===2&&enemies.filter(e=>e.zone==='zonie').length===3&&enemies.filter(e=>e.zone==='zonie').every(e=>e.hp<=0))zonieStage=3;
 heroX=clampHeroX(heroX,streetClear);
 if(phaseTwo>0||streetClear){let target=Math.max(0,Math.min(WORLD_END-worldWidth(),heroX+viewOffset-worldWidth()*.43));cameraX=Math.max(cameraX,Math.min(target,cameraX+Math.max(260,Math.abs(moveX)*380)*dt))}
 updateFireEncounter(dt);updateBarrels(dt);
 if(moveX||moveY)walkClock+=dt;if(running)runStep+=Math.hypot(moveX,moveY)/magnitude*speed;else runStep=0;
 if(attackClock>0){
  attackClock=Math.max(0,attackClock-dt);
  const contact=character==='bass'?.30:character==='drums'?.25:.28,tail=character==='bass'?.10:character==='drums'?.07:.09;
  if(attackClock<=contact&&attackClock>=tail){
   if(!attackUsed){attackUsed=true;attackCanHit=strikeBarrels()}
   const reach=character==='drums'?drumRingRadius(false):instrumentReach(character,false),lane=character==='bass'?78:70;
   for(const target of enemies){
    if(target.hp<=0||attackHits.has(target))continue;
    const dx=(target.x-heroX)*face,dy=Math.abs(target.y-heroY);
    if(character==='drums'?Math.hypot(target.x-heroX,dy)<=reach+15:dx>=-64&&dx<=reach+22&&dy<=lane) {
     attackHits.add(target);
     if(!attackLanded){attackLanded=true;registerComboHit();playCombatHit(character);shake=Math.max(shake,character==='bass'?.27:.18);if(character!=='drums')showImpact(character,target.x,target.y-153,true)}
     let damage=character==='bass'?2:1;hurtPunk(target,damage,character==='drums'?80:55,character==='drums'?'#cc53ff':'#ff4caa');score+=damage;
    }
   }
  }
  if(attackClock<tail&&attackUsed&&!attackResolved){attackResolved=true;if(!attackLanded){if(!attackCanHit&&character!=='drums')showImpact(character,heroX+face*110,heroY-145,false);tone(420,.05,.016,'triangle')}}
 }
 if(specialClock>0){
  specialClock=Math.max(0,specialClock-dt);
  const contact=character==='drums'?1.02:character==='bass'?.56:.44,tail=character==='drums'?.72:character==='bass'?.28:.18;
  if(specialClock<=contact&&specialClock>=tail){
   if(!specialUsed){
    specialUsed=true;specialWave=character==='drums'?1.1:.48;shake=character==='drums'?.35:.25;
    if(character==='bass'){duckMusic(.95);thump(175,28,.75,.75);for(let i=0;i<5;i++){tone(55+i*4,.5,.17,'sawtooth',-15);noiseBurst(.11,.2,'lowpass',450+i*150,i*.12)}}
    else if(character==='drums'){duckMusic(1.25);for(let i=0;i<10;i++)setTimeout(()=>{if(audioContext){thump(240-i*12,48,.18,.37);noiseBurst(.085,.25,'bandpass',850+i%3*620)}},i*95)}else specialExplosion();
   }
   const reach=character==='drums'?drumRingRadius(true):instrumentReach(character,true);
   for(const target of enemies){
    if(target.hp<=0||specialHits.has(target))continue;
    let dx=(target.x-heroX)*face,dy=Math.abs(target.y-heroY);
    if(character==='drums'?Math.hypot(target.x-heroX,dy)<=reach+15:dx>=-65&&dx<=reach+25&&dy<=(character==='bass'?115:105)){
     specialHits.add(target);let damage=character==='guitar'?2:3;hurtPunk(target,damage,95,character==='drums'?'#c354ff':'#63efff');score+=damage;
    }
   }
  }
 }
 if(ultraClock>0){ultraClock=Math.max(0,ultraClock-dt);shake=Math.max(shake,.15);
  if(!ultraUsed&&ultraClock<=1.3){ultraUsed=true;let a=ultraArea,damage=character==='guitar'?4:6;
   for(const e of enemies)if(e.hp>0&&e.x+viewOffset-cameraX>=a.left-25&&e.x+viewOffset-cameraX<=a.left+a.width+25&&e.y>=a.top&&e.y<=a.top+a.height){hurtPunk(e,damage,115,'#ffe66f');score+=damage}
  }
 }
 for(const item of pickups){item.delay=Math.max(0,item.delay-dt);item.flight=Math.max(0,(item.flight||0)-dt);if(item.delay<=0&&Math.abs(item.x-heroX)<(item.kind==='ultra'?86:60)&&Math.abs(item.y-heroY)<(item.kind==='ultra'?80:65)){if(item.kind==='heart'){if(heroHP<5){heroHP++;item.collected=true;tone(740,.21,.11,'sine',360)}}else if(ultraMeter<ULTRA_TARGET){collectUltra(ULTRA_TARGET);item.collected=true;tone(610,.28,.11,'triangle',460)}}}pickups=pickups.filter(item=>!item.collected);
 for(const e of enemies){if(e.jump>0){e.jump=Math.max(0,e.jump-dt);if(e.jump===0&&e.id==='kick'){e.walk=0;e.motionTime=.32;shake=Math.max(shake,.09);if(audioContext)thump(135,45,.14,.25);for(let i=0;i<6;i++)hitFX.push({x:e.x+(i-3)*11,y:e.y-4,vx:(i-3)*22,vy:-35,life:.22,color:'#eb6688'})}}e.hurt=Math.max(0,e.hurt-dt);let landed=e.hp<=0&&e.fall>0&&e.fall<=dt;e.fall=Math.max(0,e.fall-dt);e.cooldown-=dt;if(e.hp<=0){e.koTime+=dt;if(e.id==='club'&&!e.koFadeStarted&&e.koTime>=2.45){e.koFadeStarted=true;for(let j=0;j<14;j++)hitFX.push({x:e.x+(j-7)*15,y:e.y-35,vx:(j-7)*21,vy:-80-j%4*25,life:.42,color:e.palette==='amber'?'#ffc978':'#63eaff'})}if(landed){if(e.id==='club'){shake=Math.max(shake,.46);thump(65,48,.28,.72);noiseBurst(.18,.26,'lowpass',285);for(let j=0;j<24;j++)hitFX.push({x:e.x+(j-12)*10,y:e.y-4,vx:(j-12)*18,vy:-45-j%5*17,life:.37,color:j%3?'#ad9da8':e.palette==='amber'?'#ffc778':'#69ddf7'})}if(e.id==='kick'&&!e.palette&&!kickSquadSpawned){dropUltraPickup(e.x,e.y);ultraTutorialClock=5;spawnKickSquad()}if(firstWaveStage===1&&e.id==='first'){firstWaveStage=2;let behind=punk('blue',cameraX-viewOffset-65,420),ahead=punk('pink',cameraX+worldWidth()-viewOffset+65,490);behind.entry={target:Math.max(175,heroX-215),speed:120};behind.slowGait=true;behind.moveStyle={advance:78,sidestep:46,retreat:42};ahead.entry={target:Math.min(920,heroX+255),speed:210};enemies.push(behind,ahead)}thump(105,36,.17,.3);noiseBurst(.08,.16,'lowpass',550);for(let i=0;i<9;i++)hitFX.push({x:e.x+(i-4)*9,y:e.y-7,vx:(i-4)*18,vy:-40-i%3*20,life:.25,color:e.id==='blue'?'#64dfff':'#f95fba'})}continue}
  let dx=heroX-e.x,dy=heroY-e.y,dist=Math.hypot(dx,dy*1.6);
  if(ultraClock>0){e.vx=0;e.vy=0;e.speed=0}else updateEnemyMovement(e,dt);
  if(ultraClock<=0&&!e.entry&&e.hurt<=0&&e.cooldown<=0&&Math.abs(dx)<(e.id==='club'?220:e.id==='kick'?185:165)&&Math.abs(dy)<(e.id==='kick'?55:45)&&e.punch<=0){e.punch=e.id==='kick'?.51:e.id==='club'?1.06:.65;e.punchUsed=false;e.attackFace=Math.sign(heroX-e.x)||1;e.cooldown=e.id==='kick'?1.12:e.id==='club'?4.1:2.15;tone(e.id==='kick'?350:e.id==='blue'?220:180,.13,.035,'triangle')}
  if(e.punch>0){e.punch=Math.max(0,e.punch-dt);if(!e.punchUsed&&e.punch<=(e.id==='kick'?.22:e.id==='club'?.50:.39)){e.punchUsed=true;let inFront=(heroX-e.x)*(e.attackFace||1);if(inFront>=-24&&inFront<(e.id==='club'?205:e.id==='kick'?175:155)&&Math.abs(e.y-heroY)<(e.id==='club'?62:e.id==='kick'?55:48)&&invuln<=0){heroHP=Math.max(0,heroHP-(e.id==='club'?2:1));invuln=e.id==='club'?1.05:.85;playerHurt=.58;heroX=clampHeroX(heroX+(heroX<e.x?-24:24),false);burst(heroX+30,heroY-159,e.id==='kick'?'#ff506f':'#6be5ff');enemyImpact();if(heroHP<=0)mode='defeat'}else tone(460,.05,.014,'triangle')}}
 }
 for(let impact of impacts)impact.life-=dt;impacts=impacts.filter(impact=>impact.life>0);
 for(let p of hitFX){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=220*dt;p.life-=dt}hitFX=hitFX.filter(p=>p.life>0);
}
function box(x,y,w,h,fill){c.fillStyle=fill;c.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h))}
function label(t,x,y,size=20,color='#fff',align='left'){c.fillStyle=color;c.textAlign=align;c.font=`900 ${size}px monospace`;c.fillText(t,x,y)}
const spriteFootPadding={"blue-punk-hurt":26,"maria-tackle-1":9,"punk-ko-0":4,"punk-ko-3":4,"marisol-tackle-2":5,"punk-walk-smooth-0":8,"maria-tackle-0":5,"punk-walk-smooth-3":8,"isabel-run-0":4,"blue-punk-step-5":5,"isabel-tackle-3":4,"isabel-tackle-2":5,"maria-hurt-3":29,"punk-ko-4":4,"maria-back-1":19,"isabel-run-1":4,"marisol-run-2":1,"isabel-run-2":4,"blue-punk-ko-1":4,"blue-punk-ko-2":4,"punk-step-4":5,"blue-punk-ko-6":4,"isabel-tackle-1":4,"blue-punk-ko-7":4,"blue-punk-step-2":5,"blue-punk-step-1":5,"blue-punk-ko-3":4,"maria-back-0":19,"punk-step-3":5,"marisol-run-1":1,"punk-walk-smooth-2":8,"blue-punk-step-6":5,"punk-ko-1":4,"punk-step-2":5,"punk-fall":80,"isabel-tackle-0":4,"maria-windup":12,"blue-punk-step-7":5,"blue-punk-guard":26,"blue-punk-ko-5":4,"punk-step-7":5,"maria-run-2":2,"maria-tackle-3":5,"marisol-run-3":1,"punk-walk-2":13,"maria-special-2":32,"maria-hurt-0":29,"blue-punk-step-4":5,"blue-punk-punch-2":13,"marisol-tackle-3":13,"maria-hurt-2":26,"maria-special-1":38,"maria-run-3":2,"punk-walk-1":13,"marisol-run-0":1,"maria-contact":12,"isabel-run-3":1,"maria-hurt-1":29,"punk-hurt":26,"maria-back-2":19,"maria-run-0":2,"maria-back-3":19,"punk-step-1":5,"maria-special-0":38,"blue-punk-fall":80,"punk-walk-0":8,"blue-punk-ko-0":4,"maria-follow":12,"punk-step-6":5,"punk-ko-5":4,"maria-run-1":2,"punk-ko-6":4,"punk-ko-7":4,"blue-punk-step-3":5,"maria-special-3":36,"marisol-tackle-0":2,"punk-step-5":5,"punk-guard":26,"punk-ko-2":4,"punk-punch-2":13,"maria-tackle-2":7,"blue-punk-step-0":5,"marisol-tackle-1":4,"blue-punk-ko-4":4,"punk-walk-smooth-1":8,"punk-step-0":5,"punk-walk-3":13};
spriteFootPadding['isabel-attack-2']=24;
const verdeCache=new Map();
function verdeArt(name){let original=img[name];if(!original?.complete||!original.naturalWidth)return original;let recolored=verdeCache.get(name);if(recolored)return recolored.complete&&recolored.naturalWidth?recolored:original;let layer=document.createElement('canvas');layer.width=original.naturalWidth;layer.height=original.naturalHeight;let context=layer.getContext('2d',{willReadFrequently:true});context.drawImage(original,0,0);let data=context.getImageData(0,0,layer.width,layer.height),pixels=data.data;for(let i=0;i<pixels.length;i+=4){let r=pixels[i],g=pixels[i+1],b=pixels[i+2];if(pixels[i+3]>20&&b>r*1.35&&g>r*1.25&&g>85&&b>95&&g>b*.58){pixels[i]=Math.min(255,Math.round(g*.58));pixels[i+1]=Math.min(255,Math.round(b*1.1));pixels[i+2]=Math.min(255,Math.round(r*.55+15))}}context.putImageData(data,0,0);recolored=new Image();recolored.src=layer.toDataURL('image/png');verdeCache.set(name,recolored);return original}
function sprite(name,x,y,scale=1,flip=false,variant=null){
 // Keep the authored bass swing and glow, with only detached edge debris removed.
 if(/^isabel-attack-[013]$/.test(name))name=name.replace('attack','hit');
 const gait=/^(maria|isabel|marisol)-(walk|run)-([0-3])$/.exec(name);
 const direction=/^(maria|isabel|marisol)-dir-(front|back|front-diag|back-diag)-([0-3])$/.exec(name);
 if(name.startsWith('maria-'))scale*=.77;else if(name.startsWith('punk-')||name.startsWith('blue-punk-'))scale*=.85;
 if(gait){const who=gait[1],action=gait[2],frame=+gait[3],a=img[`${who}-${action}-clean-${frame}`];if(a?.complete&&a.naturalWidth){const width=(who==='maria'?375:400)*scale*(who==='maria'?1:who==='isabel'?.77:.69),phase=runStep/52,bob=action==='run'?Math.max(0,Math.sin(phase*Math.PI*2))*2.5:0;c.save();c.translate(Math.round(x+viewOffset-cameraX),Math.round(y-bob));if(flip)c.scale(-1,1);c.imageSmoothingEnabled=false;c.drawImage(a,-width/2,-width,width,width);c.restore();return}}
 if(name==='maria-special-2'){let a=img['maria-special-contact'];if(a&&a.complete&&a.naturalWidth){let w=300*scale,h=w;c.save();c.translate(Math.round(x+viewOffset-cameraX),Math.round(y));if(flip)c.scale(-1,1);c.imageSmoothingEnabled=false;c.drawImage(a,-w/2,-h,w,h);c.restore();return}}
 if(/^maria-special-[0-3]$/.test(name)){let a=img['maria-special-clean'];if(a&&a.complete&&a.naturalWidth){let step=Number(name.at(-1)),frame=step<2?step:3,cw=a.naturalWidth/2,rh=a.naturalHeight/2,w=300*scale,h=w,pad=frame===3?h*.04:0;c.save();c.translate(Math.round(x+viewOffset-cameraX),Math.round(y));if(flip)c.scale(-1,1);c.imageSmoothingEnabled=false;c.drawImage(a,(frame%2)*cw,Math.floor(frame/2)*rh,cw,rh,-w/2,-h+pad,w,h);c.restore();return}}
 if(/^marisol-special-[0-3]$/.test(name)){let a=img['marisol-special-clean'];if(a&&a.complete&&a.naturalWidth){let frame=Number(name.at(-1)),cw=a.naturalWidth/2,rh=a.naturalHeight/2,w=300*scale,h=w;c.save();c.translate(Math.round(x+viewOffset-cameraX),Math.round(y));if(flip)c.scale(-1,1);c.imageSmoothingEnabled=false;c.drawImage(a,(frame%2)*cw,Math.floor(frame/2)*rh,cw,rh,-w/2,-h,w,h);c.restore();return}}
 if(/^maria-hurt-[0-3]$/.test(name)){let a=img['maria-hurt-clean'];if(a&&a.complete&&a.naturalWidth){let frame=Number(name.at(-1)),cw=a.naturalWidth/2,rh=a.naturalHeight/2,w=300*scale,h=w;c.save();c.translate(Math.round(x+viewOffset-cameraX),Math.round(y));if(flip)c.scale(-1,1);c.imageSmoothingEnabled=false;c.drawImage(a,(frame%2)*cw,Math.floor(frame/2)*rh,cw,rh,-w/2,-h,w,h);c.restore();return}}
 if(direction){const who=direction[1],row={front:0,back:1,'front-diag':2,'back-diag':3}[direction[2]],frame=+direction[3],sheet=img[who+'-directions'];if(sheet&&sheet.complete&&sheet.naturalWidth){let w=300*scale*(who==='maria'?1:who==='isabel'?.77:.69),h=w,cw=sheet.naturalWidth/4,rh=sheet.naturalHeight/4,pad=row===3?h*(who==='maria'?.095:.045):0;c.save();c.translate(Math.round(x+viewOffset-cameraX),Math.round(y));if(flip)c.scale(-1,1);c.imageSmoothingEnabled=false;c.drawImage(sheet,frame*cw,row*rh,cw,rh,-w/2,-h+pad,w,h);c.restore();return}}
 if(gait){const who=gait[1],row=gait[2]==='run'?1:0,frame=+gait[3],sheet=img[who+'-gait'];if(sheet&&sheet.complete&&sheet.naturalWidth){let w=300*scale*(who==='maria'?1:who==='isabel'?.77:.69),h=w,cw=sheet.naturalWidth/4,rh=sheet.naturalHeight/2;
 // Ground only the planted contact frames; airborne feet retain their authored lift.
 let bottoms={maria:[[438,437,438,436],[422,420,424,420]],isabel:[[443,443,443,443],[429,392,428,404]],marisol:[[443,443,443,443],[415,381,414,420]]};let pad=row===0||frame===0||frame===2?(rh-bottoms[who][row][frame])/rh*h:0;
 c.save();c.translate(Math.round(x+viewOffset-cameraX),Math.round(y));if(flip)c.scale(-1,1);c.imageSmoothingEnabled=false;c.drawImage(sheet,frame*cw,row*rh,cw,rh,-w/2,-h+pad,w,h);c.restore();return}}
 let a=variant==='verde'?verdeArt(name):img[name];if(!a||!(a.naturalWidth||a.width))return;let w=300*scale,h=300*scale;if(/^maria-(windup|contact|follow)$/.test(name))w=h=345*scale;else if(name==='isabel-attack-2')w=h=330*scale;else if(/^isabel-hit-[013]$/.test(name))w=h=350*scale;c.save();c.translate(Math.round(x+viewOffset-cameraX),Math.round(y));if(flip)c.scale(-1,1);c.imageSmoothingEnabled=false;c.drawImage(a,-w/2,-h+(spriteFootPadding[name]||0)/(a.naturalHeight||a.height)*h,w,h);c.restore()}

function heroPose(){let prefix=character==='guitar'?'maria':character==='bass'?'isabel':'marisol';if(tackleClock>0)return `${prefix}-tackle-${Math.min(3,Math.floor((.64-tackleClock)/.16))}`;
 if(playerHurt>0)return character==='guitar'?`maria-hurt-${playerHurt>.4?1:playerHurt>.18?2:3}`:`${prefix}-hurt-${Math.min(3,Math.floor((.58-playerHurt)*7))}`;
 if(specialClock>0)return character==='guitar'?`maria-special-${specialClock>.64?0:specialClock>.44?1:specialClock>.18?2:3}`:character==='bass'?`isabel-attack-${specialClock>.68?0:specialClock>.38?2:3}`:`marisol-special-${Math.min(3,Math.floor((1.4-specialClock)*4))}`;
 if(attackClock>0)return character==='guitar'?(attackClock>.39?'maria-windup':attackClock>.23?'maria-contact':'maria-follow'):character==='bass'?`isabel-attack-${attackClock>.44?0:attackClock>.25?1:attackClock>.1?2:3}`:`marisol-special-${attackClock>.3?1:attackClock>.13?2:0}`;
 if(running)return `${prefix}-run-${Math.floor(runStep/52)%4}`;
 let dx=moveX||moveY?moveX:lastMoveX,dy=moveX||moveY?moveY:lastMoveY,frame=moveX||moveY?Math.floor(walkClock*7)%4:0;
 if(dx&&dy)return `${prefix}-dir-${dy>0?'front-diag':'back-diag'}-${frame}`;
 if(dy)return `${prefix}-dir-${dy>0?'front':'back'}-${frame}`;
 return `${prefix}-walk-${frame}`}

const kickPaletteCache=new Map();
const kickColors={cyan:[.12,.88,1],lime:[.55,1,.16],violet:[.69,.29,1],gold:[1,.72,.12]};
function kickPaletteImage(base,palette){
 if(!palette||!base?.complete||!base.naturalWidth)return base;
 let key=palette+':'+base.src,found=kickPaletteCache.get(key);
 if(found)return found.complete&&found.naturalWidth?found:base;
 let layer=document.createElement('canvas');layer.width=base.naturalWidth;layer.height=base.naturalHeight;
 let ctx=layer.getContext('2d',{willReadFrequently:true});ctx.drawImage(base,0,0);
 let data=ctx.getImageData(0,0,layer.width,layer.height),pixels=data.data,target=kickColors[palette];
 for(let i=0;i<pixels.length;i+=4){let red=pixels[i],green=pixels[i+1],blue=pixels[i+2];
  if(pixels[i+3]>25&&red>65&&green<red*.43&&blue<red*.60){
   pixels[i]=Math.min(255,Math.round(red*target[0]+green*.1));
   pixels[i+1]=Math.min(255,Math.round(red*target[1]+green*.1));
   pixels[i+2]=Math.min(255,Math.round(red*target[2]+blue*.08));
  }
 }
 ctx.putImageData(data,0,0);let art=new Image();art.src=layer.toDataURL('image/png');kickPaletteCache.set(key,art);return base
}
function warmKickPalettes(){
 let queue=[];for(const art of ['kick-punk-sheet','kick-punk-gait','kick-punk-reactions-v2'])for(const palette of ['cyan','lime','violet','gold'])queue.push([art,palette]);
 let attempts=0;function next(){let job=queue.shift();if(!job)return;let base=img[job[0]];
  if(base?.complete&&base.naturalWidth)kickPaletteImage(base,job[1]);else if(++attempts<36)queue.push(job);
  if(queue.length)setTimeout(next,70)
 }setTimeout(next,500)
}
window.addEventListener('load',warmKickPalettes,{once:true});
const mazoColorCache=new Map();
function mazoArt(name,palette){let base=img[name];if(!base?.complete||!base.naturalWidth)return null;if(palette!=='amber'&&palette!=='violet')return base;let art=mazoColorCache.get(name);if(art)return art;let layer=document.createElement('canvas');layer.width=base.naturalWidth;layer.height=base.naturalHeight;let ctx=layer.getContext('2d',{willReadFrequently:true});ctx.drawImage(base,0,0);let data=ctx.getImageData(0,0,layer.width,layer.height),p=data.data;let region=name==='el-mazo-grounded'?[1400,220,1774,620]:name==='el-mazo-falling'?[800,30,1320,380]:name==='el-mazo-swing'?[820,0,1320,320]:name==='el-mazo-batter'?[430,70,940,350]:[380,0,920,245];for(let y=region[1];y<Math.min(region[3],layer.height);y++)for(let x=region[0];x<Math.min(region[2],layer.width);x++){let i=(y*layer.width+x)*4,r=p[i],g=p[i+1],b=p[i+2];if(p[i+3]>30&&b>130&&b>r*1.25&&b>g*1.18){let light=Math.min(1,(b+g)/400);p[i]=palette==='violet'?Math.round(90+light*100):Math.min(255,Math.round(125+light*130));p[i+1]=palette==='violet'?Math.round(28+light*45):Math.round(55+light*110);p[i+2]=palette==='violet'?Math.round(145+light*110):Math.round(12+light*39)}}ctx.putImageData(data,0,0);mazoColorCache.set(name,layer);return layer}
function drawMazo(e,y,scale){
 let pose=e.hp<=0?(e.fall>0?'el-mazo-falling':'el-mazo-grounded'):e.hurt>0?'el-mazo-windup':e.punch>0?(e.punch>.52?'el-mazo-batter':'el-mazo-swing'):e.speed>10?(['el-mazo-walk-a','el-mazo-walk-b','el-mazo-walk-c','el-mazo-walk-b'][Math.floor(e.walk*2)%4]):'el-mazo-walk-a',a=mazoArt(pose,e.palette);if(!a)return;
 let x=Math.round(e.x+viewOffset-cameraX),w=440*scale,h=w*2/3,walking=e.hp>0&&e.punch<=0&&e.hurt<=0&&e.speed>10,bob=walking?Math.max(0,Math.sin(e.walk*Math.PI*2))*3:0;
 let flip=pose.startsWith('el-mazo-walk')?e.x>heroX:e.hp<=0?e.koFlip:(e.punch>0?e.attackFace>0:e.x<heroX);
 c.save();c.translate(x,Math.round(y-bob));if(flip)c.scale(-1,1);c.imageSmoothingEnabled=false;
 if(e.hp<=0){
  if(e.fall>0){let t=Math.min(1,e.koTime/.86),lift=(1-t)*45+Math.sin(t*Math.PI)*25;c.translate(0,-lift);c.rotate((1-t)*-.14);c.drawImage(a,-w/2,-h,w,h)}
  else{let groundH=w*a.height/a.width,groundBottom=groundH*858/887;if(e.koTime>2.45)c.globalAlpha=Math.max(0,1-(e.koTime-2.45)/.95);c.drawImage(a,-w/2,-groundBottom,w,groundH);if(e.koTime<1.3){let pulse=(e.koTime-.86)/.44;c.strokeStyle=e.palette==='amber'?'#ffc875bb':'#76e8ffbb';c.lineWidth=3;c.beginPath();c.ellipse(0,-3,68+pulse*100,10+pulse*16,0,0,Math.PI*2);c.stroke()}}
 }else{if(e.hurt>0)c.filter='brightness(1.35)';c.drawImage(a,-w/2,-h,w,h)}c.restore()
}
function drawEnemySprite(e,y,scale){
 if(e.id==='club'){drawMazo(e,y,scale);return}
 if(e.id==='kick'){
  const reacting=e.hp<=0||e.hurt>0,airborne=e.jump>0,attacking=e.punch>0&&!airborne,base=img[reacting?'kick-punk-reactions-v2':airborne||attacking?'kick-punk-sheet':'kick-punk-gait'],a=kickPaletteImage(base,e.palette);if(!a?.complete||!a.naturalWidth)return;
  let frame=e.hp<=0?4+(e.koTime<.16?0:e.koTime<.34?1:e.koTime<.58?2:3):e.hurt>0?(e.hurt>.36?0:e.hurt>.24?1:e.hurt>.12?2:3):airborne?(e.jump>.09?5:7):attacking?4+Math.min(3,Math.floor((.51-e.punch)/.128)):(e.motion==='retreat'?4:0)+(e.motion==='retreat'?3-Math.floor(e.walk*4)%4:Math.floor(e.walk*4)%4);
  let w=(e.hp<=0?270:295)*scale,h=w,cw=a.naturalWidth/4,ch=a.naturalHeight/2,jump=e.jump>0?Math.sin((.9-e.jump)/.9*Math.PI)*108:0;
  c.save();if(airborne){c.globalAlpha=.25;c.fillStyle='#260d25';c.beginPath();c.ellipse(Math.round(e.x+viewOffset-cameraX),Math.round(y-3),44,8,0,0,Math.PI*2);c.fill();c.globalAlpha=1}c.translate(Math.round(e.x+viewOffset-cameraX),Math.round(y-jump));if(e.x>heroX)c.scale(-1,1);
  if(e.hp<=0&&e.koTime>2.35)c.globalAlpha=Math.max(0,1-(e.koTime-2.35)/.85);
  if(e.hurt>0)c.filter='brightness(1.22)';
  c.imageSmoothingEnabled=false;let sourceY=reacting?(e.hp<=0?520:0):Math.floor(frame/4)*ch,sourceH=reacting?(e.hp<=0?a.naturalHeight-520:510):ch;c.drawImage(a,(frame%4)*cw,sourceY,cw,sourceH,-w/2,-h+(e.hp<=0?25:0),w,h);c.restore();return;
 }
 c.save();let flipped=e.hp<=0?e.koFlip:e.x<heroX;sprite(enemyPose(e),e.x,y,scale,flipped,e.id==='lime'?'verde':e.id==='club'?e.palette:null);if(e.id==='club'&&e.hp>0)drawMetalClub(e,y,scale,flipped);c.restore();
}
function enemyPose(e){if(e.id==='kick')return 'kick-punk-sheet';let prefix=e.id==='blue'||e.id==='lime'?'blue-':'';if(e.hp<=0)return `${prefix}punk-ko-${Math.min(7,Math.floor(e.koTime/.105))}`;if(e.hurt>0)return `${prefix}punk-hurt`;if(e.punch>0){let i=e.punch>.46?0:e.punch>.27?1:e.punch>.10?2:3;return `${prefix}punk-punch-${i}`}if(e.speed>0){let name=`${prefix}punk-step-${Math.floor(e.walk*8)%8}`;return img[name]?.naturalWidth?name:`${prefix}punk-guard`};return `${prefix}punk-guard`}
function drawUltraPerformance(){
 let a=ultraArea,t=1-ultraClock/ULTRA_DURATION,fade=Math.min(1,t/.09,(1-t)/.09),colors={isabel:'#43dfff',maria:'#ff39ac',marisol:'#ffe05a'},roles=['isabel','maria','marisol'];
 let others=roles.filter(who=>who!==a.playable),dir=a.anchorX<a.left+a.width*.33?1:a.anchorX>a.left+a.width*.67?-1:0;
 let targetX=dir===1?[a.anchorX+175,a.anchorX+350]:dir===-1?[a.anchorX-350,a.anchorX-175]:[a.anchorX-185,a.anchorX+185];
 targetX=targetX.map(x=>Math.max(180,a.left+135,Math.min(worldWidth()-180,a.left+a.width-135,x)));
 let feet=Math.min(H-9,a.top+a.height*.96),scale=Math.min(1.05,a.width/820);
 c.save();
 // The three instruments light their own lanes before their waves merge.
 for(let i=0;i<3;i++){let role=roles[i],x=role===a.playable?a.anchorX:targetX[others.indexOf(role)];c.fillStyle=colors[role];c.globalAlpha=(.12+.07*Math.sin(t*24+i*2))*fade;c.beginPath();c.moveTo(x-85,a.top);c.lineTo(x+85,a.top);c.lineTo(x+105,feet);c.lineTo(x-105,feet);c.fill()}
 // Bass, guitar and drums send separate colored shockwaves, staggered by the beat.
 for(let i=0;i<3;i++){let role=roles[i],delay=[.17,.29,.41][i],progress=Math.max(0,Math.min(1,(t-delay)/.48));if(!progress)continue;
  let ease=1-Math.pow(1-progress,2),radius=28+ease*a.width*.72,rise=15+ease*a.height*.42;
  c.save();c.globalAlpha=fade*(1-progress*.58);c.shadowBlur=28;c.shadowColor=colors[role];c.strokeStyle=colors[role];
  for(let ring=0;ring<3;ring++){c.lineWidth=(15-ring*4)*(1-progress*.4);c.beginPath();c.ellipse(a.anchorX,feet-85,Math.max(2,radius-ring*28),Math.max(2,rise-ring*8),0,0,Math.PI*2);c.stroke()}
  c.restore();
 }
 // Pixel sparks ride the expanding sound waves without obscuring the three performers.
 for(let i=0;i<42;i++){let phase=(t*1.2+(i%9)*.11)%1,angle=i*2.399+Math.floor(i/9)*.35,spread=phase*a.width*.58;
  c.globalAlpha=fade*(1-phase)*.7;c.fillStyle=['#43dfff','#ff39ac','#ffe05a'][i%3];
  c.fillRect(a.anchorX+Math.cos(angle)*spread,feet-86+Math.sin(angle)*phase*a.height*.42,3+i%3*2,3+i%4*2)
 }
 let jump=Math.min(1,t*ULTRA_DURATION/.27),ease=1-Math.pow(1-jump,3);
 let members=[{who:a.playable,x:a.anchorX,y:feet,lead:true},...others.map((who,i)=>({who,x:Math.max(180,Math.min(worldWidth()-180,targetX[i]+(1-ease)*(i===0?-105:105))),y:feet-(1-ease)*a.height*.72-Math.sin(jump*Math.PI)*33,lead:false}))];
 // The selected María stays put; her bandmates jump into the performance immediately.
 for(let i=0;i<members.length;i++){let m=members[i],beat=Math.sin(t*69+i*2),frame=t<.11&&!m.lead?Math.floor(t*70+i)%4:Math.floor(Math.max(0,t-.1)*30+i)%4;
  c.save();c.globalAlpha=fade;c.shadowColor=colors[m.who];c.shadowBlur=14+8*Math.max(0,beat);let bob=t>.11?Math.max(0,beat)*9:0;
  sprite(`${m.who}-${t<.11&&!m.lead?'run':m.who==='isabel'?'attack':'special'}-${frame}`,m.x-viewOffset+cameraX,m.y-bob,scale,m.who!=='marisol'&&m.x>a.anchorX+30);
  c.restore();
  if(t>.25){c.globalAlpha=.7*fade;c.strokeStyle=colors[m.who];c.lineWidth=3;c.beginPath();c.ellipse(m.x,feet-6,52+Math.max(0,beat)*20,9,0,0,Math.PI*2);c.stroke()}
 }
 // The combined crest crashes outward at the damage beat, then leaves a bright afterglow.
 let crash=Math.max(0,1-Math.abs(t-.55)/.22);if(crash>0){c.globalAlpha=.42*crash*fade;c.fillStyle='#fff6e1';c.fillRect(a.left,a.top,a.width,a.height);
  for(let i=0;i<18;i++){let angle=i*Math.PI/9+Math.sin(i*17)*.08,reach=(.25+crash*.75)*Math.max(a.width,a.height),x=a.anchorX+Math.cos(angle)*reach,y=feet-85+Math.sin(angle)*reach*.7;
   c.strokeStyle=['#43dfff','#ff39ac','#ffe05a'][i%3];c.lineWidth=3+i%3*2;c.beginPath();c.moveTo(a.anchorX,feet-85);c.lineTo(x,y);c.stroke()}}
 c.restore();
}
const FIRE_X=6240;
function makeBarrel(x,y){return {x,y,vx:0,armed:false,fuse:2.4,exploded:false,blast:0,rolling:false,rollAngle:0}}
function strikeBarrels(){let hit=false;for(const b of barrels){let ahead=(b.x-heroX)*face;if(!b.exploded&&ahead>-48&&ahead<175&&Math.abs(b.y-heroY)<72){b.armed=true;b.fuse=2.4;b.vx=face*620;b.rolling=true;hit=true;shake=Math.max(shake,.15);thump(150,42,.18,.43);for(let i=0;i<8;i++)hitFX.push({x:b.x,y:b.y-50,vx:face*(40+i*23),vy:-55-i*9,life:.32,color:i%2?'#ffcf61':'#ef7945'})}}return hit}
function explodeBarrel(b){if(b.exploded)return;b.exploded=true;b.blast=.95;b.vx=0;shake=Math.max(shake,.72);duckMusic(.7,.035);thump(245,35,.38,.95);noiseBurst(.075,.72,'highpass',2200);noiseBurst(.56,.8,'lowpass',680,.035);tone(95,.32,.15,'sawtooth',-52);setTimeout(()=>{if(audioContext){thump(105,29,.28,.5);noiseBurst(.19,.28,'bandpass',540)}},95);for(let i=0;i<55;i++){let a=i*2.399,velocity=120+i%7*37;hitFX.push({x:b.x+Math.cos(a)*20,y:b.y-52+Math.sin(a)*15,vx:Math.cos(a)*velocity,vy:Math.sin(a)*velocity-100,life:.62+Math.random()*.42,color:['#fff1a3','#ffae38','#fd5c48'][i%3]})}for(const e of enemies)if(e.hp>0&&Math.abs(e.x-b.x)<230&&Math.abs(e.y-b.y)<110){hurtPunk(e,3,120,'#ffad4a');score+=3}if(Math.abs(heroX-b.x)<92&&Math.abs(heroY-b.y)<70&&invuln<=0){heroHP--;invuln=.9;playerHurt=.55;heroX+=heroX<b.x?-48:48;if(heroHP<=0)mode='defeat'}}
function updateBarrels(dt){for(const b of barrels){if(b.exploded){b.blast=Math.max(0,b.blast-dt);continue}if(!b.armed)continue;b.fuse-=dt;if(b.vx){b.x+=b.vx*dt;b.rollAngle+=Math.abs(b.vx)*dt/27;b.vx*=Math.max(0,1-dt*.22);if(enemies.some(e=>e.hp>0&&Math.abs(e.x-b.x)<70&&Math.abs(e.y-b.y)<68)){explodeBarrel(b);continue}}if(b.fuse<=0)explodeBarrel(b)}}
function drawBarrel(b){let x=b.x+viewOffset-cameraX,y=b.y,a=img[b.rolling?'rolling-side-can':'rolling-fire-can'];if(x<-180||x>worldWidth()+180||b.exploded)return;c.save();c.globalAlpha=.34;c.fillStyle='#100e1d';c.beginPath();c.ellipse(x,y-3,b.rolling?69:47,8,0,0,Math.PI*2);c.fill();c.restore();if(a.complete&&a.naturalWidth){c.save();c.filter='saturate(.84) brightness(.84) contrast(1.08)';c.imageSmoothingEnabled=false;if(b.rolling){let bob=Math.abs(Math.sin(b.rollAngle))*3;c.translate(x,y-47-bob);c.rotate(Math.sin(b.rollAngle)*.13);c.drawImage(a,75,142,1300,800,-72,-44,144,88)}else c.drawImage(a,0,19,1214,1208,x-52,y-125,104,125);c.restore()}}
function drawBarrelBlasts(){for(const b of barrels)if(b.blast>0){let t=1-b.blast/.95,x=b.x+viewOffset-cameraX,y=b.y-55,fade=Math.min(1,b.blast*3);c.save();c.globalAlpha=fade;c.globalCompositeOperation='lighter';let glow=c.createRadialGradient(x,y,5,x,y,205);glow.addColorStop(0,'#fffbd6');glow.addColorStop(.19,'#ffe36a');glow.addColorStop(.44,'#ff822a');glow.addColorStop(1,'#ff4b1500');c.fillStyle=glow;c.beginPath();c.ellipse(x,y,85+t*160,62+t*102,0,0,Math.PI*2);c.fill();c.strokeStyle='#ffeeb0';c.lineWidth=14*(1-t)+3;c.beginPath();c.ellipse(x,y,24+t*210,18+t*102,0,0,Math.PI*2);c.stroke();c.strokeStyle='#ff6226';c.lineWidth=12*(1-t)+2;c.beginPath();c.ellipse(x,y,42+t*245,27+t*120,0,0,Math.PI*2);c.stroke();for(let i=0;i<18;i++){let a=i*Math.PI*2/18+(i%3)*.08,r=35+t*(125+i%4*23);c.fillStyle=i%3?'#ff9d32':'#fff4a8';c.fillRect(x+Math.cos(a)*r-4,y+Math.sin(a)*r*.55-4,8+t*9,8+t*9)}c.restore()}}
function updateFireEncounter(dt){
 if(!firePanic&&heroX>FIRE_X-420&&heroX<FIRE_X+180){
  firePanic=true;fireRunners=[{x:FIRE_X-143,y:480,id:0},{x:FIRE_X+143,y:480,id:1}];
 }
 if(!firePanic)return;
 for(const runner of fireRunners){
  let lane=heroY<450?(runner.id?500:515):(runner.id?405:390);
  runner.y+=(lane-runner.y)*Math.min(1,dt*9);
  runner.x-=(runner.id?690:630)*dt;
 }
 fireRunners=fireRunners.filter(r=>r.x+viewOffset-cameraX>-220);
}
const spectatorBoxes={
 standing:[[73,64,314,667],[56,45,327,665],[61,97,308,667],[38,55,304,667],[59,121,306,669],[77,64,308,669]],
 poses:[[66,107,256,688],[22,51,299,688],[2,235,326,688],[8,139,301,688],[24,96,362,688],[0,332,319,688]],
 cheer:[[255,156,712,1008],[114,14,574,1007]],
 shocked:[[265,56,677,977],[114,56,519,977]]
};
function drawSpectators(){
 const standing=img['crowd-individuals'],poses=img['crowd-poses'],cheer=img['cheering-spectator'],shocked=img['shocked-lady'],band=img['mariachi-trio'];
 const watchers=[
  [260,1,0,230],[880,3,0,225],[1940,2,0,244],[2860,1,5,227],
  [3740,1,3,223],[4630,0,5,227],[5550,0,1,225],[7000,0,0,230],
  [7900,0,3,225],[8680,0,2,230]
 ];
 for(let i=0;i<watchers.length;i++){
  const [wx,set,who,h]=watchers[i],art=[standing,poses,cheer,shocked][set];
  if(!art.complete||!art.naturalWidth)continue;
  let x=Math.round(wx-cameraX);if(x < -180 || x > worldWidth()+180)continue;
  let phase=i*1.69,frame=set===2?(Math.sin(clock*4.6+phase)>.05?1:0):set===3?(Math.abs(heroX-wx)<600&&Math.sin(clock*3.3)>.15?1:0):who;
  let key=['standing','poses','cheer','shocked'][set],box=spectatorBoxes[key][frame],slot=art.naturalWidth/(set>=2?2:6);
  let [left,top,right,bottom]=box,scale=h/art.naturalHeight,w=(right-left)*scale,visibleH=(bottom-top)*scale,heel=385;
  c.save();c.globalAlpha=.22;c.fillStyle='#171326';c.beginPath();c.ellipse(x,heel-1,w*.35,4,0,0,Math.PI*2);c.fill();c.restore();
  let sway=Math.sin(clock*(.9+(i%4)*.18)+phase),angle=(set===1&&who===5?.003:.007)*sway;
  let faceRight=heroX>wx,baseRight=set===1?who!==3:set===0?who!==5:true;
  let breath=1+.002*Math.sin(clock*(1.2+(i%3)*.2)+phase);
  c.save();c.filter=wx<960?'sepia(.1) saturate(.82) brightness(.91) contrast(.96)':wx<3120?'saturate(.77) brightness(.84) contrast(.96)':'saturate(.73) brightness(.8) contrast(.96)';
  c.translate(x,heel);c.rotate(angle);c.scale(set<2&&faceRight!==baseRight?-1:1,breath);
  c.drawImage(art,frame*slot+left,top,right-left,bottom-top,-w/2,-visibleH,w,visibleH);
  c.restore();
 }
 // Three independent performers rock gently in place behind the curb.
 if(band.complete&&band.naturalWidth){
  let anchor=1250-cameraX,slot=band.naturalWidth/3;
  if(anchor>-360&&anchor<worldWidth()+360)for(let j=0;j<3;j++){
   let x=anchor+(j-1)*128,h=225,w=114,beat=Math.sin(clock*(j===0?4.1:5.4)+j*1.8),solePad=h*[32,0,36][j]/band.naturalHeight;
   c.save();c.globalAlpha=1;c.filter='saturate(.78) brightness(.86) contrast(.96)';
   c.translate(Math.round(x),385);
   c.rotate((j===0?0.004:0.012)*beat);
   c.drawImage(band,j*slot,0,slot,band.naturalHeight,-w/2,-h+solePad,w,h);
   c.restore();
  }
 }
}
function drawFireEncounter(){
 const seated=img['fire-watchers'],runningArt=img['fire-runners'];
 let x=FIRE_X+viewOffset-cameraX,heel=480;
 if(seated.complete&&seated.naturalWidth&&x>-460&&x<worldWidth()+460){
  c.save();c.globalAlpha=.28;c.fillStyle='#171229';c.beginPath();c.ellipse(x,heel-3,155,6,0,0,Math.PI*2);c.fill();c.restore();
  c.save();c.filter='saturate(.83) brightness(.86) contrast(.97)';
  if(!firePanic){
   // Preserve the seated men in their original positions, omitting the barrel region.
   let w=440,h=220,pad=h*(seated.naturalHeight-818)/seated.naturalHeight;
   c.translate(x,heel);if(heroX<FIRE_X)c.scale(-1,1);
   for(const [sourceX,sourceWidth] of [[0,755],[1130,644]])c.drawImage(seated,sourceX,0,sourceWidth,seated.naturalHeight,-w/2+w*sourceX/seated.naturalWidth,-h+pad,w*sourceWidth/seated.naturalWidth,h);
  }
  c.restore();
 }
 if(!firePanic||!runningArt.complete||!runningArt.naturalWidth)return;
 const boxes=[[22,90,543,673],[0,77,539,673],[24,107,535,676],[29,106,501,683]],slot=runningArt.naturalWidth/4;
 for(const r of fireRunners){
  let frame=r.id*2+Math.floor(clock*8+r.id)%2,[l,t,right,bottom]=boxes[frame],scale=.34;
  let sx=r.x+viewOffset-cameraX,sy=r.y,w=(right-l)*scale,h=(bottom-t)*scale;
  c.save();c.globalAlpha=.24;c.fillStyle='#15132a';c.beginPath();c.ellipse(sx,sy-2,38,5,0,0,Math.PI*2);c.fill();c.restore();
  c.save();c.filter='saturate(.83) brightness(.86) contrast(.97)';
  c.drawImage(runningArt,frame*slot+l,t,right-l,bottom-t,sx-w/2,sy-h,w,h);c.restore();
 }
}
let floorSeam=null;
function getFloorSeam(floor){
 if(floorSeam)return floorSeam;
 const h=Math.ceil(worldHeight()-385),w=240,edge=130;
 let seam=document.createElement('canvas');seam.width=w;seam.height=h;
 let sx=seam.getContext('2d');sx.imageSmoothingEnabled=false;
 sx.drawImage(floor,floor.naturalWidth-edge,0,edge,floor.naturalHeight,0,0,w,h);
 let blend=document.createElement('canvas');blend.width=w;blend.height=h;
 let bx=blend.getContext('2d');bx.imageSmoothingEnabled=false;
 bx.drawImage(floor,0,0,edge,floor.naturalHeight,0,0,w,h);
 bx.globalCompositeOperation='destination-in';let fade=bx.createLinearGradient(0,0,w,0);
 fade.addColorStop(0,'#0000');fade.addColorStop(1,'#000');bx.fillStyle=fade;bx.fillRect(0,0,w,h);
 sx.drawImage(blend,0,0);floorSeam=seam;return seam;
}
// Wall artwork is clipped to its plaster panels; soft edges retain the original street seams.
const wallPanels=[
 {name:'wall-abstract-01',tile:0,rect:[800,87,960,350]},
 {name:'wall-bar-02-clean',tile:1,rect:[0,70,290,355]},
 {name:'wall-band-03-contained',tile:2,rect:[0,0,610,365]},
 {name:'wall-band-05-no-stick',tile:4,rect:[455,105,960,343]},
 {name:'wall-poster-07-canon',tile:6,rect:[0,32,225,345]},
 {name:'wall-ladder-08',tile:7,rect:[300,0,580,370]},
 {name:'wall-zonie-06',tile:5,rect:[0,85,355,320]},
 {name:'wall-band-09-no-cymbals',tile:8,rect:[305,0,960,365]},
 {name:'wall-door-cymbal-erased',tile:9,rect:[0,210,100,350]}
];
const wallPatchCache=new Map();
function drawWallPanels(){
 for(const panel of wallPanels){
  let [x0,y0,x1,y1]=panel.rect,worldX=panel.tile*960+x0,screenX=worldX-cameraX;
  if(screenX>worldWidth()+20||screenX+(x1-x0)<-20)continue;
  let art=img[panel.name];if(!art?.complete||!art.naturalWidth)continue;
  let patch=wallPatchCache.get(panel.name);
  if(!patch){
   let w=x1-x0,h=y1-y0;patch=document.createElement('canvas');patch.width=w;patch.height=h;
   let p=patch.getContext('2d'),sx=art.naturalWidth/960,sy=art.naturalHeight/540;
   p.drawImage(art,x0*sx,y0*sy,w*sx,h*sy,0,0,w,h);
   p.globalCompositeOperation='destination-in';
   let edgeX=p.createLinearGradient(0,0,w,0),feather=22;
   edgeX.addColorStop(0,panel.tile===1||panel.tile===9?'#000':'#0000');if(panel.tile!==1&&panel.tile!==9)edgeX.addColorStop(Math.min(.5,feather/w),'#000');edgeX.addColorStop(Math.max(.5,1-feather/w),'#000');edgeX.addColorStop(1,panel.tile===0?'#000':'#0000');
   p.fillStyle=edgeX;p.fillRect(0,0,w,h);
   let edgeY=p.createLinearGradient(0,0,0,h),fade=18,topFade=panel.tile===2||panel.tile===8||panel.tile===7?0:fade;
   edgeY.addColorStop(0,topFade?'#0000':'#000');if(topFade)edgeY.addColorStop(Math.min(.5,topFade/h),'#000');edgeY.addColorStop(Math.max(.5,1-fade/h),'#000');edgeY.addColorStop(1,'#0000');
   p.fillStyle=edgeY;p.fillRect(0,0,w,h);wallPatchCache.set(panel.name,patch);
  }
  c.drawImage(patch,screenX,y0*385/380,x1-x0,(y1-y0)*385/380);
 }
}
function drawIntroBubble(){let x=heroX+viewOffset-cameraX,y=heroY-365;c.save();c.translate(Math.round(x),Math.round(y));
 function shape(dx,dy){c.beginPath();c.moveTo(-198+dx,4+dy);c.lineTo(185+dx,4+dy);c.lineTo(201+dx,18+dy);c.lineTo(195+dx,75+dy);c.lineTo(28+dx,75+dy);c.lineTo(-17+dx,115+dy);c.lineTo(-8+dx,75+dy);c.lineTo(-196+dx,75+dy);c.closePath()}
 c.shadowColor='#ff4aad';c.shadowBlur=14;shape(7,7);c.fillStyle='#ff4bb6';c.fill();c.shadowBlur=0;shape(0,0);c.fillStyle='#fff6df';c.fill();c.lineWidth=6;c.lineJoin='round';c.strokeStyle='#1b0a31';c.stroke();
 c.fillStyle='#bb95db';for(let row=0;row<3;row++)for(let col=0;col<3;col++){c.beginPath();c.arc(160+col*9,16+row*8,1.7,0,Math.PI*2);c.fill()}
 c.fillStyle='#ff4bb6';c.fillRect(-187,14,8,50);c.fillStyle='#27daf0';c.fillRect(-175,14,4,50);
 label('THEY TOOK ESTEFANÍA',0,32,20,'#241039','center');label('THIS WAY!',0,61,23,'#d12682','center');c.restore()}
function draw(){let ultraButton=document.querySelector('#ultra');ultraButton.disabled=ultraMeter<ULTRA_TARGET||mode!=='play'||introPhase>0;ultraButton.classList.toggle('ready',ultraMeter>=ULTRA_TARGET&&mode==='play');let specialButton=document.querySelector('#special');specialButton.disabled=riffMeter<100||mode!=='play'||introPhase>0;specialButton.classList.toggle('ready',riffMeter>=100&&mode==='play');c.save();if(shake>0)c.translate((Math.random()-.5)*8,(Math.random()-.5)*6);box(0,0,W,H,'#160b29');
 c.save();c.scale(ZOOM,ZOOM);c.translate(0,22);
 const route=img['route-world'];
 // Keep the illustrated street and band mural entirely beyond the curb.
 if(route.complete&&route.naturalWidth)c.drawImage(route,cameraX,0,worldWidth(),380,0,0,worldWidth(),385);
 drawWallPanels();
 const floor=img['plaza-floor'];
 if(floor.complete&&floor.naturalWidth){
  const tile=1540,from=Math.max(0,Math.floor(cameraX/tile)-1),to=Math.min(Math.ceil(WORLD_END/tile),Math.ceil((cameraX+worldWidth())/tile)+1);
  for(let i=from;i<to;i++)c.drawImage(floor,i*tile-cameraX,385,tile,worldHeight()-385);
  let seam=getFloorSeam(floor);
  for(let i=Math.max(1,from);i<=to;i++)c.drawImage(seam,i*tile-cameraX-120,385);
 }
 drawSpectators();
 // A single straight curb keeps the crowd behind the entire fighting lane.
 box(0,376,worldWidth(),7,'#19172c');box(0,381,worldWidth(),4,'#6a6380');
 box(0,385,worldWidth(),5,'#171428');
 c.save();let shade=c.createLinearGradient(0,390,0,worldHeight());shade.addColorStop(0,'#1515282a');shade.addColorStop(1,'#0e102249');c.fillStyle=shade;c.fillRect(0,390,worldWidth(),worldHeight()-390);c.restore();
 drawFireEncounter();
 box(0,72,W,H-72,'#080c2310');

 let flame=null;
 if(character==='guitar'||character==='bass'||character==='drums'){
  if(specialClock>0){let start=character==='drums'?1.30:character==='bass'?.84:.66,span=character==='drums'?1.15:character==='bass'?.74:.58;flame={charged:true,progress:(start-specialClock)/span}}
  else if(attackClock>0){let start=character==='drums'?.34:character==='bass'?.47:.42,span=character==='drums'?.29:character==='bass'?.39:.31;flame={charged:false,progress:(start-attackClock)/span}}
  if(flame&&character!=='drums')drawInstrumentFlame(character,flame.charged,flame.progress);
 }
 // Draw everyone in lane depth order, so the blue punk can approach from behind.
 let actors=[...enemies.filter(e=>e.hp>0||e.koTime<(e.id==='club'?3.4:e.id==='kick'?3.2:2.35)).map(e=>({y:e.y,type:'enemy',e})),...barrels.filter(b=>!b.exploded).map(b=>({y:b.y,type:'barrel',b})),{y:heroY,type:'hero'}].sort((a,b)=>a.y-b.y);
 for(const actor of actors)if(actor.type!=='barrel'){let x=(actor.type==='hero'?heroX:actor.e.x)+viewOffset-cameraX,y=actor.y;if(x>-160&&x<worldWidth()+160){c.save();c.globalAlpha=.30;c.fillStyle='#100c25';c.beginPath();c.ellipse(x,y-3,actor.type==='hero'?38:35,7,0,0,Math.PI*2);c.fill();c.restore()}}
 for(let actor of actors){let scale=actor.y<410?.87:actor.y>485?1.04:1;
  if(actor.type==='barrel'){drawBarrel(actor.b)}else if(actor.type==='enemy'){let e=actor.e;if(e.hp<=0&&e.koTime>=(e.id==='club'?3.4:e.id==='kick'?3.2:2.35))continue;let y=e.y,alpha=1;if(e.id!=='kick'&&e.id!=='club'&&e.hp<=0&&e.koTime>=1.05&&e.koTime<1.75&&Math.floor((e.koTime-1.05)/.11)%2===1)alpha=0;if(e.id!=='kick'&&e.id!=='club'&&e.hp<=0&&e.koTime>=1.75)alpha=Math.max(0,1-(e.koTime-1.75)/.6);c.save();c.globalAlpha=alpha;drawEnemySprite(e,y+(e.speed>0?Math.sin(e.walk*12*Math.PI/4)*1.4:0),scale);c.restore();
   if(e.hp>0&&mode==='play'){let hpY=Math.max(105,e.y-315),hpX=e.x+viewOffset-cameraX-65;box(hpX-3,hpY-3,136,19,'#100b28e6');box(hpX,hpY,130,13,'#49213d');box(hpX,hpY,130*e.hp/(e.maxHp||3),13,e.id==='kick'?(e.palette==='cyan'?'#4ee8ff':e.palette==='lime'?'#adf65c':e.palette==='violet'?'#c58aff':e.palette==='gold'?'#ffd661':'#ff4e69'):e.id==='club'?(e.palette==='cyan'?'#54f2ef':e.palette==='violet'?'#c891ff':'#ffc765'):e.id==='lime'?'#a3f245':e.id==='blue'?'#5bdcff':'#ffcf61');label(e.id==='kick'?(e.palette?'PATADA '+e.palette.toUpperCase():'PATADA ROJA'):e.id==='club'?(e.palette==='cyan'?'EL MAZO AZUL':e.palette==='violet'?'EL MAZO VIOLETA':'EL MAZO ÁMBAR'):e.id==='lime'?'VERDE PUNK':e.id==='blue'?'BLUE PUNK':'STREET PUNK',e.x+viewOffset-cameraX,hpY-9,14,e.id==='kick'?(e.palette==='cyan'?'#b5faff':e.palette==='lime'?'#e1ffac':e.palette==='violet'?'#e1bcff':e.palette==='gold'?'#fff0b0':'#ff9cab'):e.id==='club'?(e.palette==='cyan'?'#b8fffb':e.palette==='violet'?'#efd3ff':'#ffe5a3'):e.id==='lime'?'#d1ffa4':e.id==='blue'?'#a5efff':'#ffe8a4','center')}
   if(e.punch>(e.id==='kick'?.22:e.id==='club'?.50:.39)&&mode==='play'){box(e.x+viewOffset-cameraX-75,e.y+3,110,5,'#ff4b73');label('!',e.x+viewOffset-cameraX,e.y-280,31,'#ffdd72','center')}}
  else if(ultraClock<=0&&(invuln<=0||Math.floor(clock*18)%2===0)){let pose=heroPose();sprite(pose,heroX,heroY,scale,face<0&&!/-dir-(front|back)-[0-3]$/.test(pose))}}
 drawBarrelBlasts();
 for(const item of pickups){let t=1-(item.flight||0)/.6,ease=t*t*(3-2*t),x=(item.fromX??item.x)*(1-ease)+item.x*ease+viewOffset-cameraX,y=(item.fromY??item.y)*(1-ease)+item.y*ease-22-Math.sin(t*Math.PI)*65+Math.sin(clock*8)*5;if(item.kind==='heart'){let heart=img['rock-heart-pickup'];if(heart?.complete&&heart.naturalWidth){c.save();c.shadowColor='#ff487d';c.shadowBlur=13;c.imageSmoothingEnabled=false;c.drawImage(heart,x-31,y-43,62,62);c.restore()}}else{let art=img['ultra-trio-pickup-clean'];if(art?.complete&&art.naturalWidth){c.save();c.globalAlpha=.32;c.fillStyle='#d522d8';c.beginPath();c.ellipse(x,y+18,32,7,0,0,Math.PI*2);c.fill();c.restore();c.drawImage(art,127,156,1019,971,x-42,y-73,84,92)}}}
 if(ultraClock>0&&ultraArea)drawUltraPerformance();
 if(introPhase===2)drawIntroBubble()
 if(flame){if(character==='drums')drawDrumRing(flame.charged,flame.progress);else drawInstrumentFlame(character,flame.charged,flame.progress,true)}
 drawImpacts();
 for(let p of hitFX)box(p.x+viewOffset-cameraX,p.y,4,4,p.color);
 if(mode==='play'&&!enemies.every(e=>e.hp<=0)&&heroX>=825)label(phaseTwo?'SECOND WAVE · WATCH BOTH SIDES':'DEFEAT THE THREE PUNKS →',worldWidth()-28,worldHeight()-28,18,'#ffe777','right');
 if(mode==='play'&&heroX>=WORLD_END-viewOffset-155)label('ESTEFANÍA, WE ARE COMING!',worldWidth()/2,worldHeight()-35,20,'#ffe777','center');
 c.restore();
 if(mode==='play'&&ultraTutorialClock>0){box(W/2-170,78,340,34,'#190b2bdc');label(ultraMeter>=ULTRA_TARGET?'TAP ULTRA!':'GRAB THE ULTRA!',W/2,102,20,'#ffe484','center')}box(0,0,W,72,'#0e0926dd');box(0,69,W,3,'#ff4c9a');label(character==='bass'?'ISABEL MARÍA':character==='drums'?'MARISOL ROSAS':'MARÍA',20,27,22,'#fff');label('♥'.repeat(Math.max(0,heroHP)),20,58,24,'#ff6f9a');box(190,43,154,15,'#3e2b53');box(190,43,154*riffMeter/100,15,'#67edff');label(riffMeter>=100?'RIFF READY':'RIFF',352,56,14,riffMeter>=100?'#8dffff':'#b4b2c8');let ultraIcon=img['ultra-trio-pickup-clean'];if(ultraIcon?.complete&&ultraIcon.naturalWidth)c.drawImage(ultraIcon,127,156,1019,971,462,25,34,31);box(497,43,134,15,'#423346');box(497,43,134*ultraMeter/ULTRA_TARGET,15,'#ffe354');label(ultraMeter>=ULTRA_TARGET?'ULTRA READY':'ULTRA',639,56,14,ultraMeter>=ULTRA_TARGET?'#fff2a9':'#d3c7a5');if(running)label('TACKLE READY',497,28,14,'#ffe06b');label(`STREET ${Math.min(10,Math.floor((heroX+viewOffset)/960)+1)}/10`,W-25,34,18,'#ffdc88','right');
 if(mode!=='play'){box(W/2-290,133,580,188,'#100b28e8');box(W/2-286,137,572,180,'#3a1d4fec');let title=mode==='select'?'CHOOSE YOUR MARÍA':mode==='victory'?'PUNKS DOWN!':mode==='defeat'?'MARÍA DOWN':'GET READY';label(title,W/2,205,36,'#ffdb72','center');let sub=mode==='select'?'BASS · GUITAR · DRUMS':mode==='victory'?'THE STRIKE LANDS':mode==='defeat'?'TRY AGAIN':'TWO PUNKS TO BEAT';label(sub,W/2,250,18,'#fff','center');label(mode==='select'?'PICK A FIGHTER':'TAP TO REPLAY',W/2,289,17,'#ff7bac','center')}
 c.restore()}
let previous=performance.now();function frame(t){let dt=Math.min(.04,(t-previous)/1000);previous=t;update(dt);draw();requestAnimationFrame(frame)}requestAnimationFrame(frame);
function enterFullscreen(){if(!document.fullscreenElement&&document.documentElement.requestFullscreen){document.documentElement.requestFullscreen({navigationUI:'hide'}).then(()=>{if(screen.orientation&&screen.orientation.lock)screen.orientation.lock('landscape').catch(()=>{});resize()}).catch(()=>{})}}
document.querySelector('#title-start').addEventListener('click',()=>{document.querySelector('#title-screen').classList.add('hidden');document.querySelector('#select-screen').classList.remove('hidden');mode='select';enterFullscreen()});canvas.addEventListener('pointerdown',()=>{enterFullscreen();if(mode!=='play'&&mode!=='select')start()});document.querySelectorAll('[data-character]').forEach(button=>button.addEventListener('click',()=>{character=button.dataset.character;document.querySelector('.hit').dataset.instrument=character;document.querySelector('#special').dataset.instrument=character;document.querySelector('.hit').setAttribute('aria-label',character==='bass'?'Bass slam attack':character==='guitar'?'Guitar strike attack':'Drum strike attack');enterFullscreen();start()}));document.querySelector('#change').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();mode='select';soundtrack.pause();document.querySelector('#select-screen').classList.remove('hidden')});document.querySelector('#expand').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();enterFullscreen()});document.addEventListener('fullscreenchange',resize);
const keyMap={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',KeyZ:'attack',Space:'attack',KeyX:'special',KeyC:'ultra'};
window.addEventListener('keydown',e=>{if(keyMap[e.code]){keys[keyMap[e.code]]=true;e.preventDefault();audio()}if(e.code==='Enter'&&mode!=='play'&&mode!=='select')start()});window.addEventListener('keyup',e=>{if(keyMap[e.code])keys[keyMap[e.code]]=false});document.addEventListener('visibilitychange',()=>{if(document.hidden)soundtrack.pause();else if(mode==='play')soundtrack.play().catch(()=>{})});window.addEventListener('blur',()=>{for(let k in keys){keys[k]=false;keyboardKeys[k]=false}pointerKeys.clear()});
const pointerKeys=new Map();function syncButtons(){for(let k in keys)keys[k]=[...pointerKeys.values()].some(set=>set.includes(k))||!!keyboardKeys[k]}
const keyboardKeys={left:false,right:false,up:false,down:false,attack:false,special:false,ultra:false};
// Keyboard and multi-touch are merged so releasing one finger does not cancel another direction.
window.addEventListener('keydown',e=>{if(keyMap[e.code]){keyboardKeys[keyMap[e.code]]=true;syncButtons()}});window.addEventListener('keyup',e=>{if(keyMap[e.code]){keyboardKeys[keyMap[e.code]]=false;syncButtons()}});
for(let b of document.querySelectorAll('[data-dir],[data-key]')){let values=(b.dataset.dir||b.dataset.key).split(' ');b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();audio();pointerKeys.set(e.pointerId,values);syncButtons();b.classList.add('pressed');b.setPointerCapture(e.pointerId)});for(let ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,e=>{pointerKeys.delete(e.pointerId);syncButtons();b.classList.remove('pressed')})}
function orientation(){let touch=matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0;document.body.classList.toggle('touch',touch);document.body.classList.toggle('portrait',touch&&innerHeight>innerWidth)}window.addEventListener('resize',orientation);orientation();
