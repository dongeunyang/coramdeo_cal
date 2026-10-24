(() => {
'use strict';
const PREVIEW = new URLSearchParams(location.search).get('preview') === '1';
const config = window.DECEMBER_FIREBASE || {};
const configured = !!(config.apiKey && config.authDomain && config.projectId && config.appId && !String(config.apiKey).includes('여기에'));
const DEMO = PREVIEW || !configured;
const STORE = PREVIEW ? 'coram-advent-2026-preview-firebase' : 'coram-advent-2026-local-firebase';
// Firebase SDK is dynamically imported only in live mode. ?preview=1 works without credentials or network.
const SDK = 'https://www.gstatic.com/firebasejs/13.1.0/';
let fb=null, auth=null, db=null, authAPI=null, activeProfile=null, adminEnabled=false;
let adminEntries=[],adminFiltered=[],adminProfiles=new Map();
const gifts = [
  {n:1,icon:'🎄',kind:'write',short:'첫 감사',title:'12월의 첫 번째 인사',tag:'우리의 따뜻한 시작',question:'올해 찬양팀과 함께하면서 가장 감사했던 순간은 언제였나요?',placeholder:'그날의 장면을 한두 문장으로 남겨 보세요…'},
  {n:2,icon:'🎵',kind:'quiz',short:'음악 퀴즈',title:'첫 번째 음악 퀴즈',tag:'가볍게 풀고 웃어봐요',question:'오선지에는 줄이 몇 개 있을까요?',options:['4개','5개','6개','7개'],answer:1,explain:'맞아요! 오선지는 다섯 개의 줄과 네 개의 칸으로 이루어져 있어요.'},
  {n:3,icon:'☕',kind:'poll',short:'취향 투표',title:'리허설 시작 전 필수템',tag:'나는 이런 팀원이야!',question:'찬양팀 연습 전에 딱 하나만 챙길 수 있다면?',options:['따끈한 커피 ☕','시원한 물 💧','목 풀기 🎤','마음을 모으는 기도 🙏']},
  {n:4,icon:'⛄',kind:'write',short:'웃긴 추억',title:'우리 팀 레전드 순간',tag:'웃음이 선물이 된 날',question:'올해 찬양팀에서 가장 웃겼던 순간이나 잊지 못할 에피소드를 적어 주세요.',placeholder:'생각만 해도 피식 웃음이 나는 그 장면은…'},
  {n:5,icon:'🎹',kind:'quiz',short:'악보 퀴즈',title:'악보 속 작은 암호',tag:'알면 쓸모 있는 음악 상식',question:'악보에 표시된 p (piano)는 무슨 뜻일까요?',options:['빠르게','여리게','세게','점점 느리게'],answer:1,explain:'정답은 여리게! p는 피아노(piano), f는 포르테(forte)랍니다.'},
  {n:6,icon:'🎁',kind:'mission',short:'깜짝 미션',title:'작은 친절 뽑기',tag:'작은 행동이 커다란 선물',question:'아래 버튼으로 오늘 실천할 작은 친절을 뽑아 보세요.',missions:['팀원 한 명에게 고마웠던 일을 구체적으로 말하기','연습 후 자리를 먼저 정리해 보기','오늘 함께한 사람을 위해 짧게 기도하기','평소 말을 많이 못 나눈 팀원에게 먼저 인사하기','누군가의 수고를 발견하고 칭찬하기']},
  {n:7,icon:'💛',kind:'write',short:'주일 이야기',title:'함께라서 더 특별한 주일',tag:'작은 순간의 의미',question:'예배를 준비하며 “함께여서 참 좋다”고 느꼈던 순간은?',placeholder:'연습실의 공기, 작은 말 한마디, 함께 맞춘 한 소절…'},
  {n:8,icon:'🧤',kind:'check',short:'공감 빙고',title:'찬양팀 공감 빙고',tag:'몇 개나 공감되나요?',question:'올해 경험해 본 항목을 골라 보세요.',items:['악보를 마지막 순간에 다시 본 적 있다','연습 중 배고픔을 참은 적 있다','찬양이 끝난 후에도 멜로디가 맴돌았다','눈빛만으로 팀원과 통했다','장비나 케이블을 찾느라 분주했다','예배 전 서로 기도했다','멋진 애드리브에 놀란 적 있다','함께 웃느라 잠시 연습이 멈췄다','끝나고도 팀원들과 한참 이야기했다']},
  {n:9,icon:'🎼',kind:'poll',short:'선호 투표',title:'마음이 움직이는 찬양',tag:'우리의 취향 탐구',question:'요즘 가장 끌리는 찬양 분위기는?',options:['잔잔한 고백','신나는 기쁨','묵직한 선포','어쿠스틱한 따뜻함']},
  {n:10,icon:'📖',kind:'write',short:'배움 한 줄',title:'찬양팀이 가르쳐 준 것',tag:'함께하면서 자란 마음',question:'올해 찬양팀을 섬기며 새롭게 배운 것이 있다면 무엇인가요?',placeholder:'음악이든, 사람에 대한 마음이든, 믿음이든 괜찮아요.'},
  {n:11,icon:'🥁',kind:'quiz',short:'리듬 퀴즈',title:'BPM은 무슨 뜻?',tag:'연습실에서 듣던 그 단어',question:'음악에서 BPM은 무엇의 약자일까요?',options:['Beats Per Minute','Band Practice Mode','Balance Piano Melody','Bass Pulse Measure'],answer:0,explain:'BPM은 Beats Per Minute! 1분 동안의 박자 수를 뜻해요.'},
  {n:12,icon:'✨',kind:'write',short:'예배의 순간',title:'마음에 남은 한 장면',tag:'오래 기억하고 싶은 하루',question:'올해 예배나 찬양 시간 중 특별히 마음에 남은 순간을 적어 주세요.',placeholder:'그때 어떤 마음이었나요?'},
  {n:13,icon:'🧣',kind:'poll',short:'소소한 투표',title:'리허설 끝나고 뭐 할래?',tag:'취향이 드러나는 선택',question:'모든 일정이 끝나고 함께할 수 있다면 가장 좋은 건?',options:['맛있는 식사','카페에서 수다','보드게임 한판','각자 푹 쉬기']},
  {n:14,icon:'🌟',kind:'write',short:'말씀 묵상',title:'기쁨으로 노래하는 이유',tag:'시편 100편 2절을 생각하며',question:'“기쁨으로 섬긴다”는 말이 나에게 어떤 의미인가요? 이번 주의 한 가지 다짐도 좋아요.',placeholder:'오늘 마음에 떠오른 문장을 남겨 보세요.'},
  {n:15,icon:'🔔',kind:'quiz',short:'악보 퀴즈',title:'처음부터 다시!',tag:'연습실에서 쓰는 표현',question:'악보에 적힌 D.C. (Da Capo)는 무슨 뜻일까요?',options:['바로 끝내기','처음으로 돌아가기','한 옥타브 올리기','속도를 두 배로'],answer:1,explain:'정답! D.C.는 악곡의 처음으로 돌아가라는 뜻이에요.'},
  {n:16,icon:'💌',kind:'write',short:'미래 편지',title:'2027년의 나에게',tag:'미래의 나에게 보내는 한 문장',question:'내년에도 꼭 잃지 않았으면 하는 마음, 혹은 이루고 싶은 작은 바람은?',placeholder:'2027년의 나에게, ...'},
  {n:17,icon:'🎲',kind:'mission',short:'친절 뽑기',title:'오늘의 작은 사랑',tag:'랜덤 미션 두 번째!',question:'버튼을 누르고 오늘의 조그만 미션을 뽑아 보세요.',missions:['오늘 누군가를 진심으로 응원하기','고마운 팀원의 장점 세 가지 떠올리기','연습이나 준비를 돕는 작은 일을 먼저 해 보기','찬양 한 곡을 들으며 짧게 감사 기도하기','말없이 수고한 사람에게 고맙다고 말하기']},
  {n:18,icon:'🎺',kind:'quiz',short:'박자 퀴즈',title:'기본 박자 맞히기',tag:'음악 상식 10초 챌린지',question:'4/4박자에서 4분음표 하나의 길이는 몇 박일까요?',options:['반 박','한 박','두 박','네 박'],answer:1,explain:'4/4박자에서 4분음표는 기본적으로 한 박이에요.'},
  {n:19,icon:'🏠',kind:'write',short:'첫 만남',title:'처음 이 팀에 왔던 날',tag:'우리가 함께하게 된 시작',question:'처음 찬양팀에 들어왔던 날의 기억이나 당시의 첫인상이 떠오르나요?',placeholder:'낯설었지만 설렜던 순간, 첫 연습의 기억…'},
  {n:20,icon:'🍪',kind:'poll',short:'간식 투표',title:'연말 간식 이상형',tag:'가장 맛있는 선택',question:'연말 모임에 하나만 준비한다면?',options:['케이크 🍰','붕어빵 🐟','치킨 🍗','따뜻한 음료 ☕']},
  {n:21,icon:'🎧',kind:'write',short:'올해의 찬양',title:'2026 나의 찬양 플레이리스트',tag:'마음에 남은 멜로디',question:'올해 가장 사랑했던 찬양 3곡을 적어 주세요. 이유도 함께 남기면 더 좋아요.',placeholder:'1.\n2.\n3.'},
  {n:22,icon:'🕯️',kind:'write',short:'기도 한 줄',title:'함께 기억할 기도',tag:'조용히 마음을 모으는 날',question:'지금 내 삶과 공동체를 위해 드리고 싶은 짧은 기도를 적어 주세요. 일반 팀원에게는 공개되지 않지만 관리자에게는 내용과 작성자가 표시됩니다.',placeholder:'하나님, ...'},
  {n:23,icon:'❄️',kind:'check',short:'추억 체크',title:'우리 팀의 작은 기쁨들',tag:'올해의 행복한 장면 찾기',question:'올해 있었던 행복한 순간에 체크해 보세요.',items:['함께한 연습이 즐거웠다','새로운 곡을 완성해 뿌듯했다','팀원에게 위로받았다','누군가에게 작은 도움이 되었다','함께 웃는 시간이 있었다','좋은 예배를 준비할 수 있었다','서로를 더 이해하게 되었다','기억에 남는 사진을 남겼다','내년에도 함께하고 싶은 마음이 생겼다']},
  {n:24,icon:'🌙',kind:'write',short:'성탄 전야',title:'고요한 밤의 감사',tag:'크리스마스 이브의 작은 기도',question:'성탄을 앞두고 올해를 돌아보며 가장 감사한 것 한 가지를 남겨 주세요.',placeholder:'오늘, 특별히 감사한 것은…'},
  {n:25,icon:'🌠',kind:'finale',short:'마지막 선물',title:'우리들의 12월, 마지막 페이지',tag:'메리 크리스마스! 🎄',question:'25일 동안 남긴 나의 이야기들을 한 장의 연말 기록으로 돌아보세요.'}
];
const $ = id => document.getElementById(id);
const dialog = $('giftDialog');
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state = {};
if(DEMO) { try{ state = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; }catch{ state={}; } }
let user = null, serverReady = false, currentOpenDay = null, toastTimeout = null;
const record = n => state[n] || null;
const nicknameKey = 'coram-advent-display-name-v2';
let nickname = ''; try { nickname = localStorage.getItem(nicknameKey) || ''; } catch {}

function setStatus(message,status='loading') {
 const el = $('connectionState'); if(el){el.textContent=message;el.dataset.status=status;}
}
function showToast(message){
 const el=$('toast');el.textContent=message;el.hidden=false;
 if(toastTimeout)clearTimeout(toastTimeout);
 toastTimeout=setTimeout(()=>{el.hidden=true;},3800);
}
function fromServer(r){
 if(!r)return null;
 const out={type:r.kind, savedAt:r.updatedAt?.toMillis?.() || Date.now()};
 if(r.kind==='write'){out.text=r.answerText||'';out.shared=!!r.shared;out.displayName=r.displayName||'익명';}
 if(r.kind==='poll'||r.kind==='quiz')out.choice=r.choice;
 if(r.kind==='check')out.checked=r.checked||[];
 if(r.kind==='mission')out.mission=r.mission;
 return out;
}
function ownPath(n){return fb.doc(db,'privateEntries',user.uid,'days',String(n));}
function storyPath(n){return fb.doc(db,'publicStories',String(n),'posts',user.uid);}
function votePath(n){return fb.doc(db,'polls',String(n),'votes',user.uid);}
function hasGoogleLogin(){return !!(user && !user.isAnonymous && user.providerData?.some(x=>x.providerId==='google.com'));}
function updateAccountUI(){
 const btn=$('accountBtn'),admin=$('adminBtn'),name=$('memberName'),panel=$('identityPanel');
 if(!btn||!panel)return;
 if(DEMO){btn.textContent='체험 모드';btn.disabled=true;admin.hidden=true;panel.innerHTML='🎄 <b>미리보기 모드</b>에서는 Google 로그인이나 서버 저장 없이 25일의 콘텐츠를 체험할 수 있어요.';return;}
 btn.disabled=!authAPI;
 if(!hasGoogleLogin()){
  btn.textContent='Google 로그인';admin.hidden=true;name.hidden=true;
  panel.innerHTML='<b>👋 찬양팀원 여러분!</b> 참여하려면 Google 로그인 후 이름을 등록해 주세요. <strong>모든 제출 내용(퀴즈 답, 투표, 비공개 글·기도문 포함)과 작성자 이름·Google 이메일은 관리자에게 보입니다.</strong> 다른 일반 참가자는 공개 동의한 글과 투표 집계만 볼 수 있어요.';
 }else{
  btn.textContent='로그아웃';name.hidden=false;name.textContent=(activeProfile?.name||'이름 등록 필요')+'님';admin.hidden=!adminEnabled;
  panel.innerHTML='<b>🔐 기록 안내:</b> 관리자에게는 <strong>모든 퀴즈 선택·정답 여부, 투표 선택, 글·기도문·미션, 작성자 이름·Google 이메일</strong>이 보여요. 일반 팀원에게는 공개 동의한 글만 표시됩니다.';
 }
}
async function initDatabase(){
 if(DEMO){setStatus(PREVIEW?'미리보기 · 데이터는 이 브라우저에만 저장됩니다':'체험 모드 · Firebase 정보가 필요합니다','demo');updateAccountUI();updateUI();return;}
 try{
  const [a,b,c]=await Promise.all([import(SDK+'firebase-app.js'),import(SDK+'firebase-auth.js'),import(SDK+'firebase-firestore.js')]);
  fb={...c};authAPI=b;
  const app=a.initializeApp(config);auth=b.getAuth(app);db=c.getFirestore(app);
  await auth.authStateReady();user=auth.currentUser;
  if(hasGoogleLogin())await loadAccount();
  else{serverReady=false;setStatus('Google 로그인 후 이름을 등록해 주세요','demo');}
  updateAccountUI();updateUI();
 }catch(err){serverReady=false;setStatus('Firebase 연결 실패 · 설정을 확인해 주세요','error');updateAccountUI();showToast('연결 실패: '+(err.message||'알 수 없는 오류'));console.error(err);}
}
async function googleLogin(){
 if(!authAPI||!auth||DEMO)return;
 const button=$('accountBtn');button.disabled=true;button.textContent='로그인 중…';
 try{
  const provider=new authAPI.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
  if(auth.currentUser?.isAnonymous){
   try{await authAPI.linkWithPopup(auth.currentUser,provider);}
   catch(e){
    if(['auth/credential-already-in-use','auth/email-already-in-use','auth/provider-already-linked'].includes(e.code)){
     // A pre-existing Google account cannot be linked to a new anonymous UID.
     if(!confirm('이 Google 계정은 이미 다른 사용자로 등록되어 있어요. 이 계정으로 로그인하면 현재 브라우저의 예전 익명 기록은 새 계정에 합쳐지지 않습니다. 계속할까요?'))return;
     await authAPI.signInWithPopup(auth,provider);
    }else throw e;
   }
  }else await authAPI.signInWithPopup(auth,provider);
  user=auth.currentUser;await loadAccount();
 }catch(e){showToast('Google 로그인 실패: '+(e.message||e.code||'알 수 없는 오류'));console.error(e);}
 finally{updateAccountUI();}
}
async function signOutAccount(){
 if(!authAPI||!auth)return;
 await authAPI.signOut(auth);user=null;activeProfile=null;serverReady=false;adminEnabled=false;state={};
 setStatus('Google 로그인 후 참여할 수 있어요','demo');updateAccountUI();updateUI();showToast('로그아웃했어요.');
}
async function loadAccount(){
 if(!hasGoogleLogin()){serverReady=false;updateAccountUI();return;}
 activeProfile=null;serverReady=false;adminEnabled=false;
 try{
  const prof=await fb.getDoc(fb.doc(db,'profiles',user.uid));if(prof.exists())activeProfile=prof.data();
  const adminRef=await fb.getDoc(fb.doc(db,'admins',user.uid));adminEnabled=adminRef.exists()&&adminRef.data().enabled===true;
  if(!activeProfile){setStatus('이름 등록을 완료해 주세요','demo');updateAccountUI();updateUI();showProfileForm();return;}
  await loadMyEntries();
  serverReady=true;setStatus('Firebase 연결됨 · '+activeProfile.name+'님으로 참여 중','online');
 }catch(e){serverReady=false;setStatus('데이터베이스 연결 오류 · 규칙을 확인해 주세요','error');showToast(e.message);console.error(e);}
 updateAccountUI();updateUI();
}
async function loadMyEntries(){
 const snap=await fb.getDocs(fb.collection(db,'privateEntries',user.uid,'days'));
 state={};snap.forEach(d=>{const n=Number(d.id);if(n>=1&&n<=24)state[n]=fromServer(d.data());});
}
function showProfileForm(){
 if(!hasGoogleLogin())return;
 const email=escapeHtml(user.email||'');
 showDialog(`<div class="modal-head"><button class="close" id="modalClose" aria-label="닫기">×</button><div class="modal-day">WELCOME · CORAM DEO</div><div class="modal-emoji">🌟</div><h2 id="modalTitle" class="modal-title">팀원 이름 등록</h2><p class="modal-tagline">처음 한 번만 입력하면 돼요</p></div><div class="modal-body"><p class="prompt">관리자가 누가 참여했는지 확인할 수 있도록 찬양팀에서 사용하는 <b>이름</b>을 입력해 주세요.</p><label for="profileName" class="profile-label">이름 (2~30자)</label><input id="profileName" class="profile-input" maxlength="30" placeholder="예: 김하린" value="${escapeHtml(user.displayName||'')}"><p class="identity-email">Google 계정: ${email}</p><label class="profile-consent"><input id="profileConsent" type="checkbox"><span><b>확인했습니다.</b> 관리자에게는 모든 퀴즈·투표·체크·미션 결과, 공개/비공개 글과 기도문 및 작성자 이름·이메일이 표시됩니다. 일반 참가자에게는 공개 동의한 글만 보입니다.</span></label><div class="form-actions"><button class="primary" id="saveProfile">이름 등록하고 시작하기</button><button class="outlined" id="dismissGift">나중에 하기</button></div><p class="form-error" id="formError" role="alert"></p></div>`);
 wireDismiss();
 $('saveProfile').onclick=()=>submitWithButton($('saveProfile'),async()=>{
   const name=$('profileName').value.trim();
   if(name.length<2||name.length>30)throw new Error('이름은 2~30자로 입력해 주세요.');
   if(!$('profileConsent').checked)throw new Error('개인정보 안내를 확인하고 동의해 주세요.');
   if(!user.email)throw new Error('Google 이메일을 확인할 수 없어요.');
   const data={name,email:user.email,consented:true,updatedAt:fb.serverTimestamp()};
   await fb.setDoc(fb.doc(db,'profiles',user.uid),data);await loadAccount();
 },()=>{if(serverReady)dialog.close();});
}
$('accountBtn').addEventListener('click',()=>{if(hasGoogleLogin())signOutAccount().catch(showError);else googleLogin();});
$('adminBtn').addEventListener('click',()=>openAdmin());
async function save(n,value){
 if(DEMO){state[n]={...value,savedAt:Date.now()};try{localStorage.setItem(STORE,JSON.stringify(state));}catch{}updateUI();return;}
 if(!serverReady||!fb||!user||!activeProfile)throw new Error('Google 로그인과 이름 등록을 먼저 완료해 주세요.');
 if(!unlocked(n)||n<1||n>24)throw new Error('아직 공개되지 않은 날짜예요.');
 const data={
   kind:value.type,
   answerText:value.type==='write'?value.text:null,
   choice:['quiz','poll'].includes(value.type)?value.choice:null,
   checked:value.type==='check'?value.checked:null,
   mission:value.type==='mission'?value.mission:null,
   displayName:value.type==='write'?(value.displayName||'익명'):'익명',
   shared:value.type==='write'&&n!==22&&!!value.shared,
   authorUid:user.uid,authorName:activeProfile.name,authorEmail:user.email,
   updatedAt:fb.serverTimestamp()
 };
 const batch=fb.writeBatch(db);
 batch.set(ownPath(n),data);
 if(value.type==='write'&&n!==22){
  if(data.shared)batch.set(storyPath(n),{displayName:data.displayName,text:data.answerText,updatedAt:fb.serverTimestamp()});
  else batch.delete(storyPath(n));
 }
 if(value.type==='poll')batch.set(votePath(n),{choice:data.choice,updatedAt:fb.serverTimestamp()});
 await batch.commit();
 state[n]={...value,savedAt:Date.now()};updateUI();
}
async function erase(n){
 if(DEMO){delete state[n];try{localStorage.setItem(STORE,JSON.stringify(state));}catch{}updateUI();return;}
 if(!serverReady||!fb||!user||!activeProfile)throw new Error('Google 로그인과 이름 등록이 필요해요.');
 const kind=gifts[n-1]?.kind;
 const batch=fb.writeBatch(db);
 batch.delete(ownPath(n));
 if(kind==='write'&&n!==22)batch.delete(storyPath(n));
 if(kind==='poll')batch.delete(votePath(n));
 await batch.commit();
 delete state[n];updateUI();
}
function kstParts(){const result={};new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).forEach(p=>{if(p.type!=='literal')result[p.type]=Number(p.value)});return result;}
function unlocked(n){if(PREVIEW)return true;const k=kstParts();if(k.year>2026)return true;if(k.year<2026||k.month<12)return false;if(k.year===2026&&k.month===12)return k.day>n||(k.day===n&&k.hour>=8);return false;}
function todayNumber(){const k=kstParts();return k.year===2026&&k.month===12&&k.day>=1&&k.day<=25?k.day:0;}
function nextCountdown(){const k=kstParts();let nextDay;if(k.year<2026||(k.year===2026&&k.month<12))nextDay=1;else if(k.year===2026&&k.month===12&&k.day<=25)nextDay=k.hour<8?k.day:k.day+1;else nextDay=26;if(nextDay>25)return null;const target=Date.parse(`2026-12-${String(nextDay).padStart(2,'0')}T08:00:00+09:00`);const ms=Math.max(0,target-Date.now()),d=Math.floor(ms/86400000),h=Math.floor(ms%86400000/3600000),m=Math.floor(ms%3600000/60000);return{n:nextDay,label:d>0?`${d}일 ${h}시간`:`${h}시간 ${m}분`};}
function updateUI(){
 const count=gifts.filter(g=>unlocked(g.n)).length,done=gifts.filter(g=>record(g.n)).length,current=todayNumber(),next=nextCountdown();
 $('previewBanner').classList.toggle('show',PREVIEW);
 if(PREVIEW)$('previewBanner').innerHTML='✦ 미리보기 모드 — 25일 전체를 체험할 수 있어요. 이 모드에서는 <b>서버로 제출하지 않고 이 브라우저에만 저장</b>합니다. 실제 공개 때 주소의 <b>?preview=1</b>을 제거하세요.';
 $('calendarGrid').innerHTML=gifts.map(g=>{const open=unlocked(g.n),isToday=current===g.n&&open,done=!!record(g.n),cls=['tile',open?'':'locked',isToday?'today':'',done?'done':''].filter(Boolean).join(' ');return `<button type="button" class="${cls}" data-day="${g.n}" aria-label="12월 ${g.n}일 ${open?(done?'참여 완료':'선물 열기'):'아직 열리지 않음'}"><span class="daynum">${g.n}</span><span class="art" aria-hidden="true">${g.icon}</span><small>${open?escapeHtml(g.short):'???'}</small>${!open?'<span class="lock-icon" aria-hidden="true">🔒</span>':''}${done?'<span class="done-marker" aria-hidden="true">✓</span>':''}</button>`}).join('');
 $('progressTitle').textContent=count===25?'25개의 선물이 모두 열렸어요!':count===0?'우리의 이야기가 곧 시작돼요':`${count}개의 선물 공개 · 나의 참여 ${done}개`;
 $('progressCount').textContent=`${count} / 25 OPEN`;$('progressFill').style.width=`${count/25*100}%`;
 document.querySelector('.progress-bar').setAttribute('aria-valuenow',String(count));
 let lead,title,sub,btn,handler;
 if(PREVIEW){lead='✶ 전체 미리보기 모드';title='25개의 작은 선물 모두 체험하기';sub='어떤 날짜든 눌러 콘텐츠를 확인할 수 있어요.';btn='캘린더 둘러보기 →';handler=scrollCalendar;}
 else if(current&&unlocked(current)){lead=`DECEMBER ${current} · TODAY'S GIFT`;title='오늘의 선물이 도착했어요!';sub=`${gifts[current-1].title} — 오늘의 칸을 열어 보세요.`;btn=`${current}일의 선물 열기 →`;handler=()=>openGift(current);}
 else if(count===25){lead='MERRY CHRISTMAS';title='우리의 12월이 완성됐어요';sub=`나의 참여 기록 ${done}개 · 언제든 다시 살펴볼 수 있어요.`;btn='마지막 선물 열기 →';handler=()=>openGift(25);}
 else if(next){lead='COMING SOON · 08:00 KST';title=`첫 번째 선물까지 ${next.label}`;sub=`12월 ${next.n}일 오전 8시에 다음 선물이 열려요. 기대해 주세요!`;btn='캘린더 구경하기 →';handler=scrollCalendar;}
 else{lead='OUR LITTLE DECEMBER';title='올해의 기록을 다시 펼쳐요';sub='지난 날짜의 이야기를 다시 열어볼 수 있어요.';btn='캘린더 보기 →';handler=scrollCalendar;}
 $('todayBox').innerHTML=`<div class="mini-label">${lead}</div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(sub)}</p><button class="primary" id="todayAction">${escapeHtml(btn)}</button>`;
 $('todayAction').onclick=handler;
}
function scrollCalendar(){$('calendar').scrollIntoView({behavior:'smooth',block:'start'});}
function showDialog(html){$('modalContent').innerHTML=html;if(!dialog.open)dialog.showModal();$('modalClose')?.addEventListener('click',()=>dialog.close());}
function baseModal(g,inner){return `<div class="modal-head"><button class="close" id="modalClose" aria-label="닫기">×</button><div class="modal-day">DECEMBER ${String(g.n).padStart(2,'0')} · A LITTLE GIFT</div><div class="modal-emoji" aria-hidden="true">${g.icon}</div><h2 id="modalTitle" class="modal-title">${escapeHtml(g.title)}</h2><p class="modal-tagline">${escapeHtml(g.tag)}</p></div><div class="modal-body fade-in">${inner}</div>`;}
function buttonSave(label='내 이야기 저장하기'){return `<div class="form-actions"><button class="primary" id="saveGift">${label}</button><button class="outlined" id="dismissGift">나중에 할게요</button></div><p class="form-error" id="formError" role="alert"></p>`;}
function wireDismiss(){$('dismissGift')?.addEventListener('click',()=>dialog.close());}
function showError(err){const message=err?.message||String(err)||'알 수 없는 오류';const target=$('formError');if(target)target.textContent='저장하지 못했어요: '+message;else showToast('저장 실패: '+message);console.error(err);}
async function submitWithButton(button,task,after){if(!button)return;button.disabled=true;const old=button.textContent;button.textContent='저장하는 중…';try{await task();showToast(DEMO?'이 기기에 저장했어요':'클라우드에 저장했어요');if(after)after();}catch(e){showError(e);}finally{button.disabled=false;button.textContent=old;}}
function showLocked(n){showDialog(`<div class="modal-head"><button class="close" id="modalClose" aria-label="닫기">×</button><div class="modal-day">DECEMBER ${String(n).padStart(2,'0')}</div><div class="modal-emoji">🔒</div><h2 class="modal-title" id="modalTitle">아직 비밀이에요!</h2><p class="modal-tagline">조금만 더 기대해 주세요 ♡</p></div><div class="modal-body"><p class="prompt">이 선물은 12월 ${n}일 오전 8시(KST)에 열려요.</p><button class="primary" id="dismissGift">알겠어요</button></div>`);wireDismiss();}
function storySection(n){
 if(n===22)return '<p class="feedback neutral">🔒 22일의 기도문은 일반 팀원에게 공개되지 않지만 관리자에게는 작성자·내용이 보여요.</p>';
 return `<section class="community"><div class="utility-row"><h3>📜 함께 나눈 이야기</h3><button class="small-action" id="refreshShared" type="button">새로고침 ↻</button></div><p class="community-desc">공개에 동의한 팀원들의 글만 보입니다. 약 25초마다 자동으로 새로고침돼요.</p><div id="sharedArea" aria-live="polite">불러오는 중...</div></section>`;
}
function pollSection(){return `<section class="community"><div class="utility-row"><h3>📊 우리 팀 투표 결과</h3><button class="small-action" id="refreshPoll" type="button">새로고침 ↻</button></div><p class="community-desc">Google 계정당 한 표로 집계돼요. 투표한 사람만 결과를 볼 수 있어요.</p><div id="pollArea" aria-live="polite">집계 중...</div></section>`;}
async function loadStories(day){
 const target=$('sharedArea');if(!target||!dialog.open||currentOpenDay!==day)return;
 if(DEMO){target.innerHTML='<div class="empty-state">체험 모드에서는 다른 사람의 글을 볼 수 없어요. Firebase 연결 후에 팀원들의 공개 이야기가 모여요.</div>';return;}
 if(!serverReady){target.innerHTML='<div class="empty-state">서버가 연결되지 않았어요.</div>';return;}
 try{
  const q=fb.query(fb.collection(db,'publicStories',String(day),'posts'),fb.orderBy('updatedAt','desc'),fb.limit(80));
  const snap=await fb.getDocs(q);
  if(!dialog.open||currentOpenDay!==day||!$('sharedArea'))return;
  const data=snap.docs.map(d=>d.data());
  $('sharedArea').innerHTML=data.length?data.map(item=>{
   const date=item.updatedAt?.toDate?.()||new Date();
   const dateStr=Number.isNaN(date.getTime())?'':new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric'}).format(date);
   return `<article class="story-note"><div class="note-author">${escapeHtml(item.displayName||'익명')}<time>${dateStr}</time></div><p>${escapeHtml(item.text||'')}</p></article>`;
  }).join(''):'<div class="empty-state">아직 공개된 이야기가 없어요. 첫 번째 이야기를 남겨 볼까요? ✨</div>';
 }catch(e){if($('sharedArea'))$('sharedArea').innerHTML=`<p class="form-error">공동 글을 불러오지 못했어요: ${escapeHtml(e.message)}</p>`;}
}
async function loadPoll(day){
 const area=$('pollArea');if(!area||!dialog.open||currentOpenDay!==day)return;
 if(DEMO){area.innerHTML='<div class="empty-state">체험 모드에서는 공동 투표 결과를 볼 수 없어요. Firebase 연결 후 표시됩니다.</div>';return;}
 if(!serverReady){area.innerHTML='<div class="empty-state">서버가 연결되지 않았어요.</div>';return;}
 if(record(day)?.choice===undefined){area.innerHTML='<div class="empty-state">먼저 투표해 주세요.</div>';return;}
 try{
  const votes=fb.collection(db,'polls',String(day),'votes');
  // Aggregations transmit only counts, never other participants' individual choices.
  const snapshots=await Promise.all([0,1,2,3].map(i=>fb.getCountFromServer(fb.query(votes,fb.where('choice','==',i)))));
  if(!dialog.open||currentOpenDay!==day||!$('pollArea'))return;
  const counts=snapshots.map(s=>s.data().count),total=counts.reduce((a,b)=>a+b,0),g=gifts[day-1],mine=record(day)?.choice;
  $('pollArea').innerHTML=`<p class="poll-total">전체 <strong>${total}표</strong> 참여 · 내 선택은 녹색으로 표시돼요.</p>`+g.options.map((option,i)=>{
   const pct=total?Math.round(100*counts[i]/total):0;
   return `<div class="poll-stat ${mine===i?'mine':''}"><div class="poll-stat-top"><span>${mine===i?'✓ ':''}${escapeHtml(option)}</span><strong>${pct}% · ${counts[i]}표</strong></div><div class="poll-track"><div class="poll-fill" style="width:${pct}%"></div></div></div>`;
  }).join('');
 }catch(e){if($('pollArea'))$('pollArea').innerHTML=`<p class="form-error">투표 결과를 불러오지 못했어요: ${escapeHtml(e.message)}</p>`;}
}
function openGift(n){
 if(!unlocked(n)){showLocked(n);return;}
 if(!DEMO&&!serverReady){if(hasGoogleLogin()&&!activeProfile){showProfileForm();return;}showDialog(`<div class="modal-head"><button class="close" id="modalClose">×</button><h2 id="modalTitle" class="modal-title">로그인 후 참여하기</h2></div><div class="modal-body"><p class="prompt">퀴즈·투표·모든 답변은 관리자에게 작성자 정보와 함께 저장돼요.</p><button id="modalGoogle" class="primary">Google 계정으로 로그인</button></div>`);$('modalGoogle').onclick=async()=>{dialog.close();await googleLogin();};return;}
 currentOpenDay=n;
 const g=gifts[n-1],saved=record(n);let inner=`<p class="prompt">${escapeHtml(g.question)}</p>`;
 if(g.kind==='write'){
  const shareable=n!==22;
  inner+=`<textarea id="writeAnswer" aria-label="오늘의 이야기" maxlength="1200" placeholder="${escapeHtml(g.placeholder)}">${escapeHtml(saved?.text||'')}</textarea>`;
  if(shareable){
   inner+=`<div class="share-config"><label for="displayName">표시할 이름 (실명 대신 별명도 가능)</label><input type="text" id="displayName" maxlength="20" placeholder="예: 익명의 코람데오" value="${escapeHtml(saved?.displayName||nickname)}"><label class="share-choice"><input id="sharePublic" type="checkbox" ${saved?.shared?'checked':''}><span><strong>이 글을 찬양팀과 공유하기</strong><br/>체크한 경우에만 다른 방문자에게 글과 표시 이름이 보여요.</span></label><div class="share-caption">체크하지 않으면 일반 팀원에게만 비공개예요. <b>관리자는 모든 글과 작성자 정보를 볼 수 있어요.</b> 공개한 내용은 사이트 방문자도 볼 수 있습니다.</div></div>`;
  }else inner+='<div class="feedback neutral">이날 작성한 기도는 일반 팀원에게 비공개지만 <b>관리자는 작성자와 기도문을 볼 수 있어요.</b></div>';
  inner+=saved?'<div class="result-pill">✓ 저장한 답변을 불러왔어요</div>':'';
  inner+=buttonSave(saved?'수정한 내용 저장하기':'내 이야기 저장하기');
  if(saved)inner+='<button type="button" class="small-action" id="deleteGift">내 답변 삭제하기</button>';
  inner+=storySection(n);
  showDialog(baseModal(g,inner));wireDismiss();
  $('saveGift').onclick=()=>{const text=$('writeAnswer').value.trim();if(!text){$('writeAnswer').focus();$('formError').textContent='한 글자 이상 작성해 주세요.';return;}
   const displayName=shareable?($('displayName').value.trim().slice(0,20)||'익명'):'익명',shared=shareable&&$('sharePublic').checked;
   submitWithButton($('saveGift'),async()=>{await save(n,{type:'write',text,displayName,shared});if(shareable){nickname=displayName;try{localStorage.setItem(nicknameKey,nickname)}catch{}}},()=>openGift(n));};
  if(saved)$('deleteGift').onclick=async()=>{if(!confirm('작성한 답변을 삭제할까요? 공개한 글도 함께 사라져요.'))return;const btn=$('deleteGift');await submitWithButton(btn,()=>erase(n),()=>openGift(n));};
  if(shareable){$('refreshShared').onclick=()=>loadStories(n);loadStories(n);}
 }else if(g.kind==='quiz'){
  inner+=`<div class="choices">${g.options.map((t,i)=>`<button class="choice ${saved?.choice===i?'selected':''}" data-choice="${i}" ${saved?.choice!==undefined?'disabled':''}><span class="circle">${saved?.choice===i?'✓':''}</span>${escapeHtml(t)}</button>`).join('')}</div><div id="quizFeedback">${saved?.choice!==undefined?feedbackQuiz(g,saved.choice):'<p class="hint">한 번 제출하면 정답을 바꿀 수 없어요. 관리자는 누가 맞혔는지 확인할 수 있어요.</p>'}</div>`;
  showDialog(baseModal(g,inner));
  if(saved?.choice===undefined)document.querySelectorAll('[data-choice]').forEach(x=>x.onclick=()=>submitWithButton(x,()=>save(n,{type:'quiz',choice:Number(x.dataset.choice)}),()=>openGift(n)));
 }else if(g.kind==='poll'){
  inner+=`<div class="choices">${g.options.map((t,i)=>`<button class="choice ${saved?.choice===i?'selected':''}" data-choice="${i}"><span class="circle">${saved?.choice===i?'✓':''}</span>${escapeHtml(t)}</button>`).join('')}</div>${saved?.choice!==undefined?'<div class="feedback">✦ 선택이 저장됐어요. 다시 선택하면 내 한 표가 바뀌어요.</div>':'<p class="hint">하나를 선택하고 전체 투표 결과를 확인하세요.</p>'}`;
  if(saved?.choice!==undefined)inner+=pollSection();
  showDialog(baseModal(g,inner));
  document.querySelectorAll('[data-choice]').forEach(x=>x.onclick=()=>submitWithButton(x,()=>save(n,{type:'poll',choice:Number(x.dataset.choice)}),()=>openGift(n)));
  if(saved?.choice!==undefined){$('refreshPoll').onclick=()=>loadPoll(n);loadPoll(n);}
 }else if(g.kind==='check'){
  const selected=saved?.checked||[];
  inner+=`<div class="activity-options">${g.items.map((t,i)=>`<label class="check-row"><input type="checkbox" value="${i}" ${selected.includes(i)?'checked':''}><span>${escapeHtml(t)}</span></label>`).join('')}</div><p class="hint" id="checkCount">${selected.length} / ${g.items.length}개 선택했어요.</p>${buttonSave('체크한 기록 저장하기')}`;
  showDialog(baseModal(g,inner));wireDismiss();
  document.querySelectorAll('.check-row input').forEach(x=>x.onchange=()=>{$('checkCount').textContent=`${document.querySelectorAll('.check-row input:checked').length} / ${g.items.length}개 선택했어요.`;});
  $('saveGift').onclick=()=>{const checked=[...document.querySelectorAll('.check-row input:checked')].map(el=>Number(el.value));if(!checked.length){$('checkCount').textContent='최소 한 개를 선택해 주세요.';return;}submitWithButton($('saveGift'),()=>save(n,{type:'check',checked}),()=>dialog.close());};
 }else if(g.kind==='mission'){
  let choice=saved?.mission??null;
  inner+=`<div class="empty-state" id="missionText">${choice!==null?'🎯 '+escapeHtml(g.missions[choice]):'🎲 어떤 미션이 나올까요? 버튼을 눌러 보세요!'}</div><div class="form-actions"><button class="outlined" id="rollMission">${choice!==null?'다시 뽑기':'랜덤 미션 뽑기'} 🎲</button><button class="primary" id="saveGift" ${choice===null?'disabled':''}>이 미션으로 결정!</button></div><p id="formError" class="form-error"></p><p class="hint">오늘의 작은 친절을 하나 골라 실천해 봐요.</p>`;
  showDialog(baseModal(g,inner));$('rollMission').onclick=()=>{choice=Math.floor(Math.random()*g.missions.length);$('missionText').textContent='🎯 '+g.missions[choice];$('saveGift').disabled=false;};
  $('saveGift').onclick=()=>{if(choice===null)return;submitWithButton($('saveGift'),()=>save(n,{type:'mission',mission:choice}),()=>dialog.close());};
 }else if(g.kind==='finale'){
  const valid=gifts.filter(x=>x.n<25&&record(x.n));inner+=`<div class="result-pill">✧ ${valid.length}개의 내 기록이 모였어요</div>`;
  if(valid.length)inner+=valid.map(x=>{const r=record(x.n);let ans='';if(r.type==='write')ans=r.text;else if(r.type==='quiz')ans=`${x.options[r.choice]} ${r.choice===x.answer?'(정답)':'(다시 도전!)'}`;else if(r.type==='poll')ans=x.options[r.choice];else if(r.type==='check')ans=r.checked.map(i=>x.items[i]).join(' · ');else if(r.type==='mission')ans=x.missions[r.mission];return `<div class="story-section"><strong>12월 ${x.n}일 · ${escapeHtml(x.title)}</strong><p>${escapeHtml(ans)}</p></div>`;}).join('');
  else inner+='<div class="empty-state">아직 남긴 기록이 없어요. 지나간 선물을 열고 작은 이야기를 남겨 보세요.</div>';
  inner+=`<p class="hint">우리의 12월을 돌아보며 함께해 준 사람들과 하나님께 감사의 마음을 전해요. 메리 크리스마스! 🎄</p><div class="form-actions"><button class="primary" id="exportGift">내 기록 텍스트로 저장하기 ↓</button><button class="outlined" id="dismissGift">닫기</button></div>`;
  showDialog(baseModal(g,inner));wireDismiss();$('exportGift').onclick=()=>{
   const lines=['우리들의 12월 · 2026','코람데오 찬양팀','— 나의 연말 기록 —',''];
   valid.forEach(x=>{const r=record(x.n);let ans='';if(r.type==='write')ans=r.text;else if(r.type==='quiz'||r.type==='poll')ans=x.options[r.choice];else if(r.type==='check')ans=r.checked.map(i=>x.items[i]).join(', ');else if(r.type==='mission')ans=x.missions[r.mission];lines.push(`12월 ${x.n}일 / ${x.title}`,ans,'');});
   lines.push('함께한 찬양이 우리의 선물이었어.');const blob=new Blob(['\ufeff'+lines.join('\n')],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='우리들의_12월_나의기록.txt';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
 }
}
function feedbackQuiz(g,choice){return `<div class="feedback ${choice===g.answer?'':'wrong'}">${choice===g.answer?'🎉 정답이에요!':'🌱 아쉽지만 괜찮아요!'}<br/>${escapeHtml(g.explain)}</div>`;}
$('calendarGrid').addEventListener('click',e=>{const tile=e.target.closest('[data-day]');if(tile)openGift(Number(tile.dataset.day));});
$('howBtn').addEventListener('click',()=>{
 currentOpenDay=null;
 showDialog(`<div class="modal-head"><button class="close" id="modalClose" aria-label="닫기">×</button><div class="modal-day">HOW TO PLAY</div><div class="modal-emoji">🗓️</div><h2 id="modalTitle" class="modal-title">우리들의 12월 사용법</h2><p class="modal-tagline">딱 1~3분이면 충분해요</p></div><div class="modal-body"><p class="prompt">매일 새로운 칸이 열리는 찬양팀의 작은 연말 이벤트예요.</p><p class="hint">① 12월 1~25일, 매일 오전 8시(한국 시간)에 하나씩 선물이 열려요.<br/>② 날짜를 눌러 퀴즈·투표·짧은 글쓰기에 참여해 보세요.<br/>③ 글쓰기는 기본 비공개예요. <b>팀원들과 공유하기</b>를 체크하면 표시 이름과 글이 웹사이트 방문자에게 보여요.<br/>④ 투표 결과는 투표한 뒤부터 확인할 수 있고 약 25초마다 새로고침돼요.<br/>⑤ 관리자에게는 퀴즈 선택·정답 여부·투표·글·기도문·미션 등 모든 기록과 이름·Google 이메일이 보여요. 일반 팀원에게는 비공개 글과 기도문을 공개하지 않아요.<br/>⑥ 25일에는 내가 남긴 기록을 텍스트 파일로 내려받을 수 있어요.<br/><br/><b>계정 안내:</b> Google 로그인과 최초 1회 이름 등록이 필요해요. 같은 Google 계정으로 다른 기기에서도 내 기록을 이어볼 수 있어요.<br/><br/><b>개인정보 안내:</b> 관리자만 모든 기록과 작성자 이름·Google 이메일을 볼 수 있어요. 공개에 동의한 글은 사이트를 방문하는 사람에게 표시됩니다. 사적인 내용은 신중하게 작성해 주세요.</p><button class="primary" id="dismissGift">시작할게요 ✨</button></div>`);wireDismiss();
});
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
dialog.addEventListener('close',()=>{currentOpenDay=null;});

const adminDialog=$('adminDialog');
function adminAnswer(d){
 const n=Number(d.day),g=gifts[n-1],v=d.data;
 if(!g)return '(알 수 없는 날짜)';
 if(v.kind==='write')return v.answerText||'';
 if(v.kind==='quiz'||v.kind==='poll')return g.options?.[v.choice]||'(응답 없음)';
 if(v.kind==='check')return (v.checked||[]).map(i=>g.items?.[i]).filter(Boolean).join(' · ');
 if(v.kind==='mission')return g.missions?.[v.mission]||'';
 return '';
}
function adminRows(){
 const search=$('adminSearch')?.value.trim().toLowerCase()||'',day=$('adminDay')?.value||'',kind=$('adminKind')?.value||'';
 adminFiltered=adminEntries.filter(e=>{
  const d=e.data,meta=adminProfiles.get(e.uid)||{},name=d.authorName||meta.name||'이전 익명 계정',email=d.authorEmail||meta.email||'';
  return (!day||e.day===day)&&(!kind||d.kind===kind)&&(!search||[name,email,adminAnswer(e),e.day,String(e.uid)].some(x=>String(x).toLowerCase().includes(search)));
 });
 adminFiltered.sort((a,b)=>(b.data.updatedAt?.toMillis?.()||0)-(a.data.updatedAt?.toMillis?.()||0));
 const quizzes=adminFiltered.filter(x=>x.data.kind==='quiz'),correct=quizzes.filter(x=>x.data.choice===gifts[Number(x.day)-1]?.answer).length;
 $('adminStats').innerHTML=`<div><strong>${adminFiltered.length}</strong><span>조회 기록</span></div><div><strong>${new Set(adminFiltered.map(x=>x.uid)).size}</strong><span>참여 계정</span></div><div><strong>${correct} / ${quizzes.length}</strong><span>퀴즈 정답</span></div>`;
 $('adminTableBody').innerHTML=adminFiltered.length?adminFiltered.map(e=>{
  const d=e.data,g=gifts[Number(e.day)-1],meta=adminProfiles.get(e.uid)||{},name=d.authorName||meta.name||'이전 익명 계정',email=d.authorEmail||meta.email||'이메일 미등록',answer=adminAnswer(e);
  const date=d.updatedAt?.toDate?.();const dateStr=date?date.toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}):'—';
  const state=d.kind==='quiz'?(d.choice===g?.answer?'✓ 정답':'✕ 오답'):(d.kind==='write'?(d.shared?'공개':'비공개'):'저장됨');
  return `<tr><td>12/${escapeHtml(e.day)}<br/><small>${escapeHtml(g?.short||'')}</small></td><td><strong>${escapeHtml(name)}</strong><br/><small>${escapeHtml(email)}</small></td><td><span class="record-kind">${escapeHtml(d.kind)}</span> · ${escapeHtml(state)}<br/><span class="record-answer">${escapeHtml(answer)}</span></td><td><small>${escapeHtml(dateStr)}</small></td></tr>`;
 }).join(''):'<tr><td colspan="4" class="empty-admin">조건에 맞는 기록이 없어요.</td></tr>';
 $('adminCount').textContent=`총 ${adminFiltered.length}건 표시`;
}
async function openAdmin(){
 if(DEMO||!serverReady||!adminEnabled||!hasGoogleLogin()){showToast('관리자 전용 기능이에요.');return;}
 if(!adminDialog.open)adminDialog.showModal();$('adminStatus').textContent='기록을 안전하게 불러오는 중…';$('adminTableBody').innerHTML='';
 try{
  const profiles=await fb.getDocs(fb.collection(db,'profiles'));adminProfiles=new Map();profiles.forEach(doc=>adminProfiles.set(doc.id,doc.data()));
  adminEntries=[];let cursor=null;let page=0;
  while(true){
   const constraints=[fb.limit(200)];if(cursor)constraints.push(fb.startAfter(cursor));
   const snap=await fb.getDocs(fb.query(fb.collectionGroup(db,'days'),...constraints));
   snap.forEach(d=>{const uid=d.ref.parent.parent?.id;adminEntries.push({day:d.id,uid,data:d.data()});});
   page++;$('adminStatus').textContent=`${adminEntries.length}건 불러옴…`;
   if(snap.size<200)break;
   cursor=snap.docs[snap.docs.length-1];
  }
  $('adminStatus').textContent=`전체 ${adminEntries.length}건 불러왔어요. 이 화면은 관리자에게만 열립니다.`;
  adminRows();
 }catch(e){$('adminStatus').textContent='조회 오류: '+e.message+' (Firestore Rules 및 관리자 UID를 확인해 주세요.)';console.error(e);}
}
$('adminClose').onclick=()=>adminDialog.close();
adminDialog.addEventListener('click',e=>{if(e.target===adminDialog)adminDialog.close();});
['adminSearch','adminDay','adminKind'].forEach(id=>$(id).addEventListener(id==='adminSearch'?'input':'change',adminRows));
$('adminRefresh').onclick=()=>openAdmin();
function csvCell(v){let s=String(v??'');if(/^[\s\u0000-\u001F]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
$('adminExport').onclick=()=>{
 if(!adminEnabled||!serverReady)return;
 const head=['날짜','종류','이름','Google 이메일','UID','제출내용','정오답/공개여부','KST 제출시각'];
 const rows=adminFiltered.map(e=>{const d=e.data,g=gifts[Number(e.day)-1],meta=adminProfiles.get(e.uid)||{};
  const verdict=d.kind==='quiz'?(d.choice===g?.answer?'정답':'오답'):(d.kind==='write'?(d.shared?'공개':'비공개'):'기록됨');
  return [e.day,d.kind,d.authorName||meta.name||'이전 익명 계정',d.authorEmail||meta.email||'',e.uid,adminAnswer(e),verdict,d.updatedAt?.toDate?.().toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})||''];
 });
 const csv='\ufeff'+[head,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n');
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='우리들의_12월_관리자기록_'+new Date().toISOString().slice(0,10)+'.csv';a.click();URL.revokeObjectURL(url);
};

updateAccountUI();updateUI();initDatabase();setInterval(updateUI,60000);
setInterval(()=>{const n=currentOpenDay;if(n&&dialog.open&&serverReady){const kind=gifts[n-1]?.kind;if(kind==='write'&&n!==22)loadStories(n);if(kind==='poll'&&record(n))loadPoll(n);}},25000);
})();
