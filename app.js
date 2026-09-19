'use strict';
const $=id=>document.getElementById(id);
const KEY='wordQuestProfile_v2';
const day=()=>new Date().toLocaleDateString('sv-SE');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rand=n=>Math.floor(Math.random()*n);
const shuffled=list=>{const a=[...list];for(let i=a.length-1;i>0;i--){const j=rand(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
const mon=id=>POKEMON.find(p=>p.id===id)||POKEMON.find(p=>p.id===1);
const img=(id,back=false)=>`assets/${id}-${back?'back':'front'}.png`;
const TYPE_CN={normal:'一般',fire:'火',water:'水',electric:'电',grass:'草',ice:'冰',fighting:'格斗',poison:'毒',ground:'地面',flying:'飞行',psychic:'超能力',bug:'虫',rock:'岩石',ghost:'幽灵',dragon:'龙',dark:'恶',steel:'钢'};
const typeName=type=>TYPE_CN[type]||type;
const moveName=key=>MOVE_CN[key]||MOVE_DATA.moves[key]?.zh||key;
const integer=(n,max=10000000)=>Number.isSafeInteger(n)?Math.max(0,Math.min(max,n)):0;
const blank=()=>({version:2,name:'小训练家',xp:0,gems:0,combo:0,cleared:[],owned:[1],active:1,bag:{'poke-ball':5,'great-ball':0,'ultra-ball':0,potion:2},review:[],learned:[],today:0,date:day(),daily:'',battles:0});
function normalize(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('存档格式不正确');
 const base=blank(), unique=(a,p)=>Array.isArray(a)?[...new Set(a.filter(p))]:[];
 base.name=typeof raw.name==='string'&&raw.name.trim()?raw.name.trim().slice(0,12):base.name;
 for(const k of ['xp','gems','today','battles'])base[k]=integer(raw[k]);
 base.combo=integer(raw.combo,5);
 base.cleared=unique(raw.cleared,x=>Number.isInteger(x)&&x>=0&&x<WORDS.length);
 base.review=unique(raw.review,x=>Number.isInteger(x)&&x>=0&&x<WORDS.length);
 base.learned=unique(raw.learned,x=>Number.isInteger(x)&&x>=0&&x<WORDS.length);
 base.owned=unique([1,...(Array.isArray(raw.owned)?raw.owned:[])],x=>POKEMON.some(p=>p.id===x));
 base.active=base.owned.includes(raw.active)?raw.active:1;
 if(raw.bag&&typeof raw.bag==='object')for(const item of ITEMS)base.bag[item.id]=integer(raw.bag[item.id],9999);
 base.date=typeof raw.date==='string'?raw.date:day();base.daily=typeof raw.daily==='string'?raw.daily:'';
 if(base.date!==day()){base.date=day();base.today=0;}
 return base;
}
let storageError=false;
function load(){try{const v2=localStorage.getItem(KEY);if(v2)return normalize(JSON.parse(v2));const old=JSON.parse(localStorage.getItem('wordQuestProfile_v1')||'null');if(old){const b=blank();b.name=old.name;b.xp=integer(old.xp);b.gems=integer(old.gems);b.cleared=Array.from({length:integer(old.cleared,12)},(_,i)=>i);return normalize(b);}}catch(e){storageError=true;}return blank();}
let state=load(),unit=0,view='map',category='legend',dexFilter='all',battle=null,padIndex=0,toastTimer;
function save(){if(state.date!==day()){state.date=day();state.today=0;}try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){toast('浏览器无法保存，请在“我的”导出存档。');}renderStatus();}
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,2800);}
function feedback(text,type=''){$('feedback').textContent=text;$('feedback').className='feedback '+type;}
function showInfo(title,html){$('infoTitle').textContent=title;$('infoContent').innerHTML=html;if(!$('infoDialog').open)$('infoDialog').showModal();}
function closeDialogs(){document.querySelectorAll('dialog[open]').forEach(d=>d.close());}
function renderStatus(){
 $('nickname').textContent=state.name;$('level').textContent=1+Math.floor(state.xp/100);$('xp').textContent=state.xp%100;$('gems').textContent=state.gems;$('shopBalance').textContent=state.gems;
 $('companionImage').src=img(state.active);$('companionImage').alt=mon(state.active).name;
}
const available=id=>id===0||state.cleared.includes(id)||state.cleared.includes(id-1);
function renderMap(){
 const chapter=CHAPTERS[unit],count=chapter.words.filter(w=>state.cleared.includes(w.id)).length;
 $('chapterSubtitle').textContent=`第 ${unit+1} 单元 · ${chapter.english}`;
 $('unitPicker').textContent=chapter.icon+' '+chapter.name;$('chapterProgress').textContent=count+'/12 关';
 $('prevUnit').disabled=unit===0;$('nextUnit').disabled=unit===CHAPTERS.length-1;
 $('wordList').innerHTML=chapter.words.map((w,j)=>{const done=state.cleared.includes(w.id),active=available(w.id),icon=unit===0?['🏆','🔄','🎁','⚔️','💪','🎯','📈','🌟','🚀','🧭','📋','✅'][j]:chapter.icon;return `<button class="word-card ${done?'done':active?'current':'locked'}" data-level="${w.id}" aria-label="${w.word}，${w.meaning}，${done?'已完成':active?'开始闯关':'未解锁'}"><span class="circle">${done?'✓':active?'⚔️':'🔒'}</span><span class="word-text"><strong>${icon} ${w.word}</strong><small>${w.meaning}</small></span><span class="word-status">${done?'可复习':active?'挑战':'未解锁'}</span></button>`;}).join('');
 $('totalProgress').textContent=`已通关 ${state.cleared.length} / ${WORDS.length} · 收集 ${state.owned.length} 只宝可梦`;
}
function renderCourses(){ $('courseList').innerHTML=CHAPTERS.map((c,i)=>`<button class="course-card" data-unit="${i}"><span class="course-icon">${c.icon}</span><div><strong>第 ${i+1} 单元 · ${c.name}</strong><p>${c.english}</p><small>${c.words.filter(w=>state.cleared.includes(w.id)).length} / 12 关完成${available(i*12)?'':' · 通关前面的单元后解锁'}</small></div><span>›</span></button>`).join(''); }
function requiredLevels(p){return p.category==='legend'?36:p.category==='rare'?12:0;}
function unlockText(p){const required=requiredLevels(p);return required?`先通关 ${required} 个单词关卡（当前 ${state.cleared.length} 关），再花 ${p.cost} 积分在商店解锁，或在野外使用精灵球捕捉。`:`花 ${p.cost} 积分在商店解锁，或在野外使用精灵球捕捉。`;}
function renderPets(){
 $('collectionCount').textContent=`已收集 ${state.owned.length} / ${POKEMON.length} 只 · 未拥有的精灵也可查看解锁条件`;
 document.querySelectorAll('[data-dex]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.dex===dexFilter)));
 const list=POKEMON.filter(p=>dexFilter==='all'||(dexFilter==='owned')===state.owned.includes(p.id));
 $('petList').innerHTML=list.map(p=>{const owned=state.owned.includes(p.id),need=requiredLevels(p);return `<button class="pet-card ${owned&&state.active===p.id?'selected':''} ${owned?'':'dex-locked'}" data-pet="${p.id}" aria-label="${p.name}，${owned?'已拥有':`未拥有，${unlockText(p)}`}"><span class="dex-no">No.${String(p.id).padStart(3,'0')}</span><img src="${img(p.id)}" alt="" loading="lazy"><strong>${p.name}</strong><small>${owned?(state.active===p.id?'正在出战':'点击设为出战伙伴'):need&&state.cleared.length<need?`🔒 通关 ${need} 关解锁`:`🔒 商店 💎${p.cost} 或捕捉`}</small></button>`;}).join('');
}
function showDex(id){const p=mon(id),owned=state.owned.includes(id),set=MOVE_DATA.pokemon[id],names=set?[...set.basic.map(m=>moveName(m.key)),moveName(set.advanced.key)]:[];showInfo(`图鉴 No.${String(id).padStart(3,'0')} · ${p.name}`,`<div class="dex-detail"><img src="${img(id)}" alt="${p.name}"><div><p><strong>属性：</strong>${set.types.map(typeName).join(' / ')}</p><p><strong>基础技能：</strong>${names.slice(0,2).join('、')}</p><p><strong>进阶技能：</strong>${names[2]}</p><p>${owned?'已获得，可设为出战伙伴。':`🔒 ${unlockText(p)}`}</p></div></div>${owned?`<button data-equip="${id}">${state.active===id?'正在出战':'设为出战伙伴'}</button>`:''}`);}
function renderReview(){ $('reviewList').innerHTML=state.review.length?state.review.map(id=>`<article class="review-card"><div><strong>${WORDS[id].word}</strong><p>${WORDS[id].meaning}</p></div><button data-review="${id}">再练一次</button></article>`).join(''):'<div class="empty"><span>🌱</span>暂时没有错题<br>冒险中拼错的单词会自动来到这里。<br><button class="green" data-action="wild">去随机练习</button></div>'; }
function renderProfile(){ $('nameInput').value=state.name;$('profileStats').innerHTML=`<span><b>${state.learned.length}</b>练习过的词</span><span><b>${state.today}</b>今日答对</span><span><b>${state.battles}</b>完成冒险</span>`; }
function go(next){if(next==='game'&&!battle){startBattle(null);return;}view=next;document.querySelectorAll('.view').forEach(el=>el.hidden=el.id!==next+'View');document.querySelectorAll('[data-view]').forEach(el=>el.classList.toggle('active',el.dataset.view===next));({map:renderMap,courses:renderCourses,pets:renderPets,review:renderReview,profile:renderProfile}[next]||(()=>{}))();window.scrollTo({top:0,behavior:'instant'});}
function renderShop(){
 $('shopBalance').textContent=state.gems;document.querySelectorAll('[data-category]').forEach(b=>b.setAttribute('aria-selected',b.dataset.category===category));
 const list=category==='balls'?ITEMS:POKEMON.filter(p=>p.category===category);
 $('shopGrid').innerHTML=list.map(p=>{const owned=category!=='balls'&&state.owned.includes(p.id),need=category==='balls'?0:requiredLevels(p),locked=need>state.cleared.length&&!owned;return `<article class="shop-card ${locked?'shop-locked':''}"><img src="${category==='balls'?'assets/'+p.id+'.png':img(p.id)}" alt="${p.name}" loading="lazy"><div><h3>${p.name}</h3><button data-buy="${p.id}" ${owned||locked?'disabled':''} aria-label="${locked?`通关 ${need} 关后解锁`:owned?'已拥有':`花费 ${p.cost} 积分购买`}${p.name}">${owned?'已拥有':locked?`🔒 ${need} 关解锁`:'💎 '+p.cost}</button></div></article>`;}).join('');
}
function shop(){renderShop();if(!$('shopDialog').open)$('shopDialog').showModal();}
function buy(id){const item=ITEMS.find(p=>p.id===id)||POKEMON.find(p=>String(p.id)===id);if(!item)return;if(typeof item.id==='number'&&state.owned.includes(item.id))return;if(typeof item.id==='number'&&state.cleared.length<requiredLevels(item)){toast(`先通关 ${requiredLevels(item)} 个单词关卡。`);return;}if(state.gems<item.cost){toast('积分不足，答对单词就能获得积分。');return;}state.gems-=item.cost;if(typeof item.id==='number')state.owned.push(item.id);else state.bag[item.id]=Math.min(9999,state.bag[item.id]+1);save();renderShop();toast(item.name+'已加入背包！');}
function pickEnemy(){const roll=Math.random(),rarity=roll<.05&&state.cleared.length>=36?'legend':roll<.25&&state.cleared.length>=12?'rare':'normal',pool=POKEMON.filter(p=>p.category===rarity);return pool[rand(pool.length)];}
function requestStart(id,review=false){if(battle&&['answering','moveChoice','answered'].includes(battle.phase)){showInfo('开始新的遭遇？','<p>当前战斗将结束，已经获得的积分保留。</p><button id="confirmNewBattle">开始新的遭遇</button><button id="cancelNewBattle">继续当前战斗</button>');$('confirmNewBattle').onclick=()=>{closeDialogs();startBattle(id,review);};$('cancelNewBattle').onclick=()=>{closeDialogs();go('game');};return;}startBattle(id,review);}
function startBattle(id=null,review=false){
 if(id!==null&&(!Number.isInteger(id)||!WORDS[id]))return;
 if(id!==null&&!review&&!available(id)){toast('先完成前一关，再来挑战这个单词。');return;}
 closeDialogs();const enemy=pickEnemy();let questions;
 if(id!==null)questions=[{word:WORDS[id],mode:'spell'},{word:WORDS[id],mode:'choice'},{word:WORDS[id],mode:'recall'}];
 else{const words=shuffled(CHAPTERS[unit].words).slice(0,3),modes=shuffled(['spell','choice','recall']);questions=words.map((word,i)=>({word,mode:modes[i]}));}
 battle={id,review,enemy,questions,index:0,phase:'answering',playerHp:100,enemyHp:100,used:[],letters:[],hinted:false,failedWords:[],caught:false,catchAttempts:0,partner:state.active,rewarded:false,shield:0,powerUp:0,lastDamage:0,pp:{}};
 $('enemyName').textContent=enemy.name;$('enemyLevel').textContent='Lv.'+(2+Math.floor((id??unit*12)/12)+rand(3));$('enemySprite').src=img(enemy.id);$('enemySprite').alt=enemy.name;$('enemySprite').className='enemy-sprite pixel';
 $('playerSprite').src=img(battle.partner,true);$('playerSprite').alt=mon(battle.partner).name+'背面';$('playerName').textContent=mon(battle.partner).name;$('playerLevel').textContent='Lv.'+(1+Math.floor(state.xp/100));
 $('battleMessage').textContent=`野生的${enemy.name}出现了！${enemy.category==='legend'?'竟然是传说中的宝可梦！':''}`;renderQuestion();go('game');
}
function renderBattle(){if(!battle)return;$('enemyHp').value=battle.enemyHp;$('playerHp').value=battle.playerHp;$('catchButton').disabled=battle.phase!=='won'||battle.caught;$('catchButton').textContent=battle.caught?'✓ 已捕获':'◉ 捕捉';$('nextQuestion').disabled=['answering','moveChoice'].includes(battle.phase);$('nextQuestion').textContent=['lost','fled'].includes(battle.phase)?'重新挑战':battle.phase==='won'?'下一关 ▶':'继续 ▶';$('battleProgress').textContent=(battle.id!==null?'第 '+(battle.id+1)+' 关':'随机遭遇')+' · '+(battle.index+1)+'/'+Math.max(3,battle.questions.length)+' · ⚡'+state.combo+'/5';}
function renderQuestion(){
 const q=battle.questions[battle.index];battle.phase='answering';battle.used=[];battle.hinted=false;battle.letters=shuffled(q.word.word.split(''));padIndex=0;
 $('questionCaption').textContent={spell:'点击字母，拼出对应英文',choice:'选择这个单词的正确含义',recall:'最后一击 · 不看字母，独立拼写'}[q.mode];$('meaning').textContent=q.mode==='choice'?q.word.word:q.word.meaning;
 $('answerArea').innerHTML=q.mode==='spell'?'<div class="answer-slots" id="answerSlots" aria-label="已拼写的答案"></div>':q.mode==='recall'?'<input class="recall-input" id="recallInput" placeholder="输入英文" autocomplete="off" autocapitalize="none" spellcheck="false" aria-label="英文答案">':'';
 if(q.mode==='choice'){const others=shuffled(WORDS.filter(w=>w.id!==q.word.id)).slice(0,3);$('answerOptions').innerHTML='<div class="choice-options">'+shuffled([q.word,...others]).map(w=>`<button data-choice="${w.id}">${w.meaning}</button>`).join('')+'</div>';}
 else if(q.mode==='spell'){$('answerOptions').innerHTML='<div class="keyboard">'+battle.letters.map((l,i)=>`<button class="letter" data-letter="${i}" aria-label="字母 ${l}">${l}</button>`).join('')+'</div>';renderSlots();}
 else $('answerOptions').innerHTML='';
 $('undoAnswer').disabled=q.mode==='choice';$('checkAnswer').hidden=q.mode==='choice';$('hintAnswer').disabled=false;$('movePanel').hidden=true;feedback('答对后选择一招，让伙伴发动攻击。');renderBattle();
 if($('recallInput'))$('recallInput').addEventListener('keydown',e=>{if(e.key==='Enter')submitAnswer();});
}
function renderSlots(){const q=battle.questions[battle.index];if(q.mode!=='spell')return;const answer=battle.used.map(i=>battle.letters[i]);$('answerSlots').innerHTML=q.word.word.split('').map((_,i)=>`<span class="slot ${answer[i]?'filled':''}">${answer[i]||''}</span>`).join('');document.querySelectorAll('[data-letter]').forEach(b=>{b.classList.toggle('used',battle.used.includes(Number(b.dataset.letter)));b.disabled=battle.used.includes(Number(b.dataset.letter))||battle.phase!=='answering';});}
function addLetter(i){if(!battle||battle.phase!=='answering'||battle.used.includes(i)||!battle.letters[i])return;if(battle.used.length>=battle.questions[battle.index].word.word.length)return;battle.used.push(i);renderSlots();if(battle.used.length===battle.questions[battle.index].word.word.length)submitAnswer();}
function undo(){if(!battle||battle.phase!=='answering')return;const input=$('recallInput');if(input){input.value=input.value.slice(0,-1);input.focus();}else{battle.used.pop();renderSlots();}}
function hint(){if(!battle||battle.phase!=='answering')return;battle.hinted=true;const q=battle.questions[battle.index];feedback(`记一记：${q.word.word} — ${q.word.meaning}。本题答对不计连击。`);if(!state.review.includes(q.word.id))state.review.push(q.word.id);save();}
function submitAnswer(choice){
 if(!battle||battle.phase!=='answering')return;
 const q=battle.questions[battle.index],answer=q.mode==='choice'?choice:q.mode==='spell'?battle.used.map(i=>battle.letters[i]).join(''):$('recallInput').value.trim().toLowerCase();
 if(answer===undefined||answer===''){feedback('先完成答案，再发动攻击。');return;}
 const correct=q.mode==='choice'?Number(answer)===q.word.id:answer===q.word.word;
 if(!correct){state.combo=0;const damage=Math.max(0,20-battle.shield);battle.shield=0;battle.lastDamage=damage;battle.playerHp=Math.max(0,battle.playerHp-damage);if(!state.review.includes(q.word.id))state.review.push(q.word.id);if(!battle.failedWords.includes(q.word.id))battle.failedWords.push(q.word.id);feedback('还差一点！可撤销修改，或点提示再记一遍。连击已清零。','error');$('battleMessage').textContent=`${mon(battle.partner).name}受到反击！HP −${damage}，再试一次。`;$('playerSprite').classList.remove('shake');void $('playerSprite').offsetWidth;$('playerSprite').classList.add('shake');if(!battle.playerHp){battle.phase='lost';feedback('伙伴需要休息了。可以重新挑战，错题已保存。','error');$('battleMessage').textContent='这次先回营地休息，准备好再来挑战！';document.querySelectorAll('#answerOptions button').forEach(b=>b.disabled=true);}save();renderBattle();return;}
 battle.phase='moveChoice';state.combo=battle.hinted?0:Math.min(5,state.combo+1);state.xp+=5;state.gems+=5;if(state.date!==day()){state.date=day();state.today=0;}state.today++;
 if(!state.learned.includes(q.word.id))state.learned.push(q.word.id);
 if(q.mode==='recall'&&!battle.hinted)state.review=state.review.filter(id=>id!==q.word.id);
 feedback(`答对了！+5 积分 · +5 经验。选择一招释放。`,'success');$('battleMessage').textContent=`答对了！现在为${mon(battle.partner).name}选择技能。`;
 document.querySelectorAll('#answerOptions button').forEach(b=>b.disabled=true);if($('recallInput'))$('recallInput').disabled=true;$('hintAnswer').disabled=true;
 save();renderMoves();renderBattle();
}
function moveDescription(move){if(move.power)return `威力 ${move.power}`;const effects={'splash':'无效果','teleport':'撤离战斗','roar':'吹走对手','whirlwind':'吹走对手','growl':'降低反击伤害','harden':'提高防御','defense-curl':'提高防御','counter':'反弹所受伤害','mirror-coat':'反弹所受伤害','heal-bell':'恢复伙伴HP','leech-seed':'寄生并回复HP','hypnosis':'阻止下次反击','sing':'阻止下次反击'};return effects[move.name]||'状态变化';}
function renderMoves(){if(!battle||battle.phase!=='moveChoice'){$('movePanel').hidden=true;return;}const set=MOVE_DATA.pokemon[battle.partner],list=[...set.basic.map(m=>({...m,advanced:false})),{...set.advanced,advanced:true}];$('movePanel').hidden=false;$('chargeLabel').textContent=`连对 ${state.combo} / 5`;$('moveList').innerHTML=list.map(({key,advanced})=>{const m=MOVE_DATA.moves[key],remaining=battle.pp[key]??m.pp,locked=advanced&&state.combo<5;return `<button class="move-card ${advanced?'advanced':''}" data-move="${key}" data-advanced="${advanced}" ${locked||!remaining?'disabled':''}><span class="move-name">${advanced?'✦ ':''}${moveName(key)} <small>${typeName(m.type)}</small></span><span class="move-detail">${locked?`还差 ${5-state.combo} 连对`:moveDescription(m)} · PP ${remaining}/${m.pp}</span></button>`;}).join('');$('moveHint').textContent='每题只能选一招。招式、属性与PP来自原作资料；伤害按背词玩法简化。';}
function typeMultiplier(move,enemy){return (MOVE_DATA.pokemon[enemy.id]?.types||['normal']).reduce((factor,type)=>factor*(TYPE_CHART[move.type]?.[type]??1),1);}
function useMove(key,advanced){
 if(!battle||battle.phase!=='moveChoice')return;const set=MOVE_DATA.pokemon[battle.partner];if(!(advanced?set.advanced.key===key:set.basic.some(m=>m.key===key)))return;if(advanced&&state.combo<5)return;
 const move=MOVE_DATA.moves[key],remaining=battle.pp[key]??move.pp;if(!remaining)return;
 battle.phase='answered';battle.pp[key]=remaining-1;if(advanced)state.combo=0;
 let damage=0,detail='',missed=move.accuracy!==null&&Math.random()*100>move.accuracy;
 if(missed)detail='招式没有命中！';
 else if(move.power){const stab=set.types.includes(move.type)?1.2:1,effect=typeMultiplier(move,battle.enemy),boost=battle.powerUp?1.25:1;battle.powerUp=0;damage=effect===0?0:Math.max(1,Math.round((18+move.power*.46)*stab*effect*boost));battle.enemyHp=Math.max(battle.index>=2?0:1,battle.enemyHp-damage);detail=effect===0?'对目标无效！':effect>1?'效果拔群！':effect<1?'效果不太理想。':'';}
 else if(key==='counter'||key==='mirror-coat'){damage=battle.lastDamage*2;battle.enemyHp=Math.max(battle.index>=2?0:1,battle.enemyHp-damage);battle.lastDamage=0;detail=damage?`反击造成 ${damage} 点伤害！`:'目前没有受到的伤害可反击。';}
 else if(key==='splash')detail='但是，什么都没有发生。';
 else if(key==='teleport'||key==='roar'||key==='whirlwind'){battle.phase='fled';detail=key==='teleport'?'伙伴脱离了这次战斗。':'对手离开了战场，本关尚未完成。';}
 else if(['growl','harden','defense-curl','amnesia','safeguard','scary-face','sand-attack','string-shot','supersonic','hypnosis','sing','disable','sweet-scent'].includes(key)){battle.shield=Math.min(20,battle.shield+10);detail='已削弱下次答错时受到的反击。';}
 else if(['leech-seed','heal-bell','mega-drain'].includes(key)){battle.playerHp=Math.min(100,battle.playerHp+20);detail='伙伴恢复了 20 HP。';}
 else if(['leer','tail-whip','screech','howl','transform','water-sport','helping-hand','destiny-bond'].includes(key)){battle.powerUp=1;detail='下一次攻击将更有力。';}
 else{battle.shield=Math.min(20,battle.shield+10);detail='状态改变，下次反击减弱。';}
 $('movePanel').hidden=true;$('battleMessage').textContent=`${mon(battle.partner).name}使用了${moveName(key)}！${detail}`;
 if(damage){$('enemySprite').classList.remove('hit');void $('enemySprite').offsetWidth;$('enemySprite').classList.add('hit');}
 if(battle.index>=2&&battle.enemyHp===0)finishBattle();else if(battle.index>=8&&battle.phase==='answered'){battle.phase='fled';$('battleMessage').textContent='战斗结束，对手撤退了。继续复习，再来挑战！';}
 save();renderBattle();
}
function finishBattle(){if(battle.rewarded)return;battle.rewarded=true;battle.phase='won';state.battles++;let bonus=5+rand(11);state.gems+=bonus;if(battle.id!==null&&!battle.review&&!state.cleared.includes(battle.id)){state.cleared.push(battle.id);bonus+=10;state.gems+=10;}const dropped=Math.random()<.35;if(dropped)state.bag['poke-ball']++;$('battleMessage').textContent=`挑战成功！奖励 💎 ${bonus}${dropped?'，发现一个精灵球！':'！'}现在可以尝试捕捉${battle.enemy.name}。`;}
function next(){if(!battle)return;if(battle.phase==='answered'){battle.index++;if(!battle.questions[battle.index]){const word=battle.id!==null?WORDS[battle.id]:CHAPTERS[unit].words[rand(12)];battle.questions.push({word,mode:['spell','choice','recall'][rand(3)]});}renderQuestion();$('meaning').scrollIntoView({block:'center',behavior:'smooth'});}else if(battle.phase==='won'){if(battle.id!==null&&!battle.review&&battle.id+1<WORDS.length){unit=WORDS[battle.id+1].unit;startBattle(battle.id+1);}else startBattle(null);}else if(['lost','fled'].includes(battle.phase))startBattle(battle.id,battle.review);}
function bag(capture=false){if(capture&&(!battle||battle.phase!=='won'||battle.caught))return;showInfo(capture?'选择精灵球':'🎒 精灵球背包',ITEMS.map(item=>`<div class="bag-item"><img src="assets/${item.id}.png" alt=""><span>${item.name}<br><small>持有 ${state.bag[item.id]} 个${capture&&item.chance?' · 成功率 '+Math.round(catchChance(item)*100)+'%':''}</small></span><button data-use="${item.id}" ${(!state.bag[item.id]||(capture&&item.id==='potion'))?'disabled':''}>${item.id==='potion'?'恢复 HP':capture?'投出':'使用'}</button></div>`).join('')+'<p class="muted">至少答对三道题并击败对手后可以捕捉。伤药恢复 40 HP，每次使用消耗 1 个。</p>');}
function catchChance(item){return Math.max(.1,item.chance-(battle?.enemy.category==='legend'?.3:battle?.enemy.category==='rare'?.1:0));}
function useItem(id){const item=ITEMS.find(i=>i.id===id);if(!item||!state.bag[id])return;
 if(id==='potion'){if(!battle||battle.phase!=='answering'||battle.playerHp>=100){toast('战斗中伙伴受伤后，才需要使用伤药。');return;}state.bag[id]--;battle.playerHp=Math.min(100,battle.playerHp+40);save();renderBattle();closeDialogs();feedback('使用伤药，伙伴恢复了 40 HP。');return;}
 if(!battle||battle.phase!=='won'||battle.caught){toast('先完成战斗，再尝试捕捉。');return;}if(!state.owned.includes(battle.enemy.id)&&state.cleared.length<requiredLevels(battle.enemy)){toast(`还需通关 ${requiredLevels(battle.enemy)} 关才能捕捉它。`);return;}state.bag[id]--;battle.catchAttempts++;const caught=Math.random()<catchChance(item);if(caught){battle.caught=true;if(!state.owned.includes(battle.enemy.id))state.owned.push(battle.enemy.id);$('enemySprite').classList.add('caught');$('battleMessage').textContent=`成功捕获${battle.enemy.name}！已放入图鉴，可以设为出战伙伴。`;}else $('battleMessage').textContent=`${battle.enemy.name}挣脱了精灵球！还可以换个球再试试。`;save();renderBattle();closeDialogs();}
function daily(){if(state.date!==day()){state.date=day();state.today=0;save();}const claimed=state.daily===day(),ready=state.today>=10;showInfo('🎁 每日学习奖励',`<p>今天已答对 <strong>${state.today}</strong> 题。</p><p>每日答对 10 题，可领取 💎 30 积分和一个随机精灵球。</p><button id="claimDaily" ${claimed||!ready?'disabled':''}>${claimed?'今日已领取':ready?'领取奖励':'还需答对 '+(10-state.today)+' 题'}</button>`);$('claimDaily').onclick=()=>{if(state.daily===day()||state.today<10)return;state.daily=day();state.gems+=30;const item=ITEMS[rand(3)];state.bag[item.id]++;save();showInfo('奖励已领取',`<p>获得 💎 30 积分和 1 个${item.name}！明天继续加油。</p>`);};}
function voice(){if(!battle)return;if(!('speechSynthesis'in window)){toast('当前浏览器不支持语音朗读。');return;}const speech=new SpeechSynthesisUtterance(battle.questions[battle.index].word.word);speech.lang='en-US';speech.rate=.8;window.speechSynthesis.cancel();window.speechSynthesis.speak(speech);}
function pad(action){if(!battle)return;if(action==='hint'){hint();return;}if(action==='voice'){voice();return;}if(action==='b'){undo();return;}if(action==='select'){bag();return;}if(action==='start'){battle.phase==='answering'?submitAnswer():next();return;}const options=[...document.querySelectorAll(battle.phase==='moveChoice'?'#moveList button:not(:disabled)':'#answerOptions button:not(:disabled):not(.used)')];if(action==='a'){if(!['answering','moveChoice'].includes(battle.phase)){next();return;}if(options.length)options[padIndex%options.length].click();else if(battle.phase==='answering')submitAnswer();return;}if(options.length){padIndex=(padIndex+(['left','up'].includes(action)?-1:1)+options.length)%options.length;options.forEach((b,i)=>b.classList.toggle('pad-selected',i===padIndex));}}
function exportSave(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='单词冒险存档-'+day()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b||b.disabled)return;const d=b.dataset;
 if('view'in d){go(d.view);return;}if('level'in d){requestStart(Number(d.level));return;}if('unit'in d){unit=Number(d.unit);go('map');return;}
 if('buy'in d){buy(d.buy);return;}if('category'in d){category=d.category;renderShop();return;}if('close'in d){b.closest('dialog').close();return;}
 if('letter'in d){addLetter(Number(d.letter));return;}if('choice'in d){submitAnswer(Number(d.choice));return;}if('move'in d){useMove(d.move,d.advanced==='true');return;}if('pad'in d){pad(d.pad);return;}if('use'in d){useItem(d.use);return;}
 if('dex'in d){dexFilter=d.dex;renderPets();return;}if('equip'in d){const id=Number(d.equip);if(state.owned.includes(id)){state.active=id;save();closeDialogs();renderPets();toast(mon(id).name+'将陪你参加下一场战斗。');}return;}
 if('review'in d){requestStart(Number(d.review),true);return;}if('pet'in d){showDex(Number(d.pet));return;}
 if('action'in d)({shop,pets:()=>go('pets'),bag:()=>bag(),daily,wild:()=>requestStart(null)}[d.action]||(()=>{}))();
});
$('prevUnit').onclick=()=>{unit=Math.max(0,unit-1);renderMap();};$('nextUnit').onclick=()=>{unit=Math.min(11,unit+1);renderMap();};$('unitPicker').onclick=()=>go('courses');$('profileLink').onclick=()=>go('profile');$('companionLink').onclick=()=>go('pets');$('topShop').onclick=shop;
$('wildStart').onclick=()=>requestStart(null);$('randomEncounter').onclick=()=>requestStart(null);$('backMap').onclick=()=>go('map');$('undoAnswer').onclick=undo;$('hintAnswer').onclick=hint;$('checkAnswer').onclick=()=>submitAnswer();$('nextQuestion').onclick=next;$('catchButton').onclick=()=>bag(true);$('voiceButton').onclick=voice;$('battleMenu').onclick=()=>showInfo('冒险菜单','<p>每答对一个词，选择一招基础技能；连对五次可选一次进阶技能。至少答对三道题并击败对手后可捕捉。答错会受到反击，伤药可以恢复 HP。</p><button data-action="bag">打开背包</button><button data-action="daily">每日奖励</button>');
$('saveName').onclick=()=>{const name=$('nameInput').value.trim();if(!name){toast('先给自己取个昵称吧。');return;}state.name=name.slice(0,12);save();toast('昵称已保存。');};$('exportSave').onclick=exportSave;
$('importSave').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>100000)throw Error('存档文件太大');const raw=JSON.parse(await file.text());if(raw.version!==2)throw Error('请选择本网站导出的新版存档');const imported=normalize(raw);showInfo('导入存档',`<p>将切换到 <strong>${esc(imported.name)}</strong> 的存档：${imported.cleared.length} 关、${imported.gems} 积分。</p><p>原存档会自动导出备份。</p><button id="confirmImport">备份当前存档并导入</button>`);$('confirmImport').onclick=()=>{exportSave();state=imported;battle=null;save();closeDialogs();go('profile');toast('存档已导入。');};}catch(error){toast('无法导入：'+error.message);}e.target.value='';};
$('creditsButton').onclick=()=>showInfo('素材与存档说明','<p>这是独立制作的学习网页，战斗为网页实现，不包含游戏 ROM，也不代表宝可梦官方。</p><p>像素素材来自 <a href="https://github.com/PokeAPI/sprites" target="_blank" rel="noopener">PokéAPI/sprites</a>，相关权利归原权利人所有。</p><p><a href="credits.html" target="_blank" rel="noopener">查看完整素材来源与说明</a></p>');
document.addEventListener('keydown',e=>{if(e.key==='Escape')return;if(view!=='game'||document.querySelector('dialog[open]')||e.target.matches('input'))return;const actions={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',Enter:'a',Backspace:'b'};if(actions[e.key]){e.preventDefault();pad(actions[e.key]);}});
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target!==d)return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}));
// Render the supplied GBA tilemap using its source tiles, including flip flags.
async function renderTerrain(){try{const response=await fetch('assets/grass-map.bin');if(!response.ok)throw Error('terrain');const map=new DataView(await response.arrayBuffer());const tiles=new Image();tiles.src='assets/grass-tiles.png';await tiles.decode();const canvas=document.createElement('canvas');canvas.width=240;canvas.height=112;canvas.setAttribute('aria-hidden','true');canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated';const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;for(let y=0;y<14;y++)for(let x=0;x<30;x++){const value=map.getUint16((y*32+x)*2,true),id=value&1023;ctx.save();ctx.translate(x*8+(value&1024?8:0),y*8+(value&2048?8:0));ctx.scale(value&1024?-1:1,value&2048?-1:1);ctx.drawImage(tiles,(id%16)*8,Math.floor(id/16)*8,8,8,0,0,8,8);ctx.restore();}$('battleStage').prepend(canvas);}catch(e){/* Keep the plain green battlefield when a browser cannot load terrain. */}}
renderStatus();renderMap();renderTerrain();if(storageError)toast('旧存档无法读取，已保留原数据；本次启用新档。');
// Optional structured read-only access for browsers implementing WebMCP.
if(document.modelContext?.registerTool){const life=new AbortController();try{Promise.resolve(document.modelContext.registerTool({name:'read_learning_progress',title:'查看学习进度',description:'读取当前浏览器的学习进度，不改变存档。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute(input){if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw Error('Expected empty object');return {completedLevels:state.cleared.length,totalLevels:WORDS.length,learnedWords:state.learned.length,reviewWords:state.review.length,collection:state.owned.length};}},{signal:life.signal})).catch(()=>{});}catch(e){}window.addEventListener('pagehide',()=>life.abort(),{once:true});}
