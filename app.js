const STORAGE_KEY="tku_timetable_v2";
const DAYS=[{key:1,name:"一"},{key:2,name:"二"},{key:3,name:"三"},{key:4,name:"四"},{key:5,name:"五"},{key:6,name:"六"},{key:7,name:"日"}];
const PERIODS=[[1,"08:10–09:00"],[2,"09:10–10:00"],[3,"10:10–11:00"],[4,"11:10–12:00"],[5,"12:10–13:00"],[6,"13:10–14:00"],[7,"14:10–15:00"],[8,"15:10–16:00"],[9,"16:10–17:00"],[10,"17:10–18:00"],[11,"18:10–19:00"],[12,"19:10–20:00"],[13,"20:10–21:00"],[14,"21:10–22:00"]].map(([number,time])=>({number,time}));
const DEFAULT_DISPLAY={days:{1:true,2:true,3:true,4:true,5:true,6:false,7:false},periods:{1:true,2:true,3:true,4:true,5:true,6:true,7:true,8:true,9:true,10:true,11:false,12:false,13:false,14:false},showSeat:true};

const DEMO={
version:2,semester:"115-1 範例",student:{name:"範例學生",studentId:"DEMO0000"},display:structuredClone(DEFAULT_DISPLAY),
courses:[
{id:"2952",name:"高等微積分",customName:"",department:"TSNXB",grade:"2",className:"A",credits:"3",requiredType:"A",seatNumber:"033",pdf:"http://ap09.emis.tku.edu.tw/115_1/115_1_2952.PDF",description:"同一門課多個上課時段共用同一座號。",times:[{day:1,periods:[1,2],room:"S 420",teacher:"余"},{day:3,periods:[1],room:"S 420",teacher:"余"},{day:3,periods:[2],room:"S 420",teacher:"助教"}],note:"",journal:[]},
{id:"2951",name:"代數學（一）",customName:"",department:"TSNXB",grade:"2",className:"A",credits:"3",requiredType:"A",seatNumber:"040",pdf:"http://ap09.emis.tku.edu.tw/115_1/115_1_2951.PDF",description:"同一門課固定座號 040。",times:[{day:2,periods:[8,9],room:"S 420",teacher:"王"},{day:5,periods:[3],room:"S 420",teacher:"王"},{day:5,periods:[7],room:"S 420",teacher:"助教"}],note:"",journal:[]},
{id:"2954",name:"機率論",customName:"",department:"TSNXB",grade:"2",className:"A",credits:"3",requiredType:"A",seatNumber:"044",pdf:"http://ap09.emis.tku.edu.tw/115_1/115_1_2954.PDF",description:"機率論範例。",times:[{day:4,periods:[5,6],room:"C 013",teacher:"黃"},{day:5,periods:[4],room:"C 013",teacher:"黃"},{day:5,periods:[6],room:"C 002",teacher:"助教"}],note:"",journal:[]},
{id:"1458",name:"哲學專題",customName:"",department:"TNUVB",grade:"0",className:"C",credits:"2",requiredType:"A",seatNumber:"016",pdf:"http://ap09.emis.tku.edu.tw/115_1/115_1_1458.PDF",description:"哲學專題範例。",times:[{day:4,periods:[9,10],room:"E 414",teacher:"林"}],note:"",journal:[]}
]};

let state=loadData(),currentWeekOffset=0,currentCourseId=null;
function clone(x){return JSON.parse(JSON.stringify(x))}
function loadData(){try{const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return clone(DEMO);const p=JSON.parse(raw);p.display={...clone(DEFAULT_DISPLAY),...(p.display||{}),days:{...DEFAULT_DISPLAY.days,...(p.display?.days||{})},periods:{...DEFAULT_DISPLAY.periods,...(p.display?.periods||{})}};p.courses=Array.isArray(p.courses)?p.courses:[];return p}catch{return clone(DEMO)}}
function saveData(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function esc(x){return String(x??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function uid(){return crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random()}`}
function todayText(){const d=new Date();return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`}
function monday(offset=0){const d=new Date(),day=d.getDay(),diff=day===0?-6:1-day;d.setHours(0,0,0,0);d.setDate(d.getDate()+diff+offset*7);return d}
function fmtDate(d){return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`}
function visibleDays(){return DAYS.filter(d=>state.display.days[d.key])}
function visiblePeriods(){return PERIODS.filter(p=>state.display.periods[p.number])}
function displayName(c){return c.customName?.trim()||c.name||"未命名課程"}
function getCourse(id){return state.courses.find(c=>c.id===id)}

function renderHeader(){
  document.getElementById("semesterText").textContent=state.semester?`學期：${state.semester}`:"尚未同步";
  document.getElementById("studentName").textContent=state.student?.name||"尚未登入";
  document.getElementById("studentInfo").textContent=state.student?.studentId?`學號：${state.student.studentId}`:"目前使用本機課表";
  document.getElementById("settingStudentName").textContent=state.student?.name||"尚未取得";
  document.getElementById("settingStudentId").textContent=state.student?.studentId||"尚未取得";
  const mon=monday(currentWeekOffset),sun=new Date(mon);sun.setDate(mon.getDate()+6);
  document.getElementById("weekText").textContent=`${fmtDate(mon)} ～ ${fmtDate(sun)}`;
}

function renderSchedule(){
  const grid=document.getElementById("schedule");grid.innerHTML="";
  const corner=document.createElement("div");corner.className="day-header";corner.textContent="節次";grid.appendChild(corner);
  for(const day of visibleDays()){const h=document.createElement("div");h.className="day-header";h.textContent=`星期${day.name}`;grid.appendChild(h)}
  for(const period of visiblePeriods()){
    const label=document.createElement("div");label.className="period-label";label.innerHTML=`<strong>第${period.number}節</strong>${period.time}`;grid.appendChild(label);
    for(const day of visibleDays()){
      const slot=document.createElement("div");slot.className="schedule-slot";const items=[];
      for(const course of state.courses)for(const t of(course.times||[]))if(Number(t.day)===day.key&&(t.periods||[]).includes(period.number))items.push({course,time:t});
      if(!items.length)slot.innerHTML=`<div class="empty-slot">—</div>`;
      else for(const item of items){const b=document.createElement("button");b.className="course-card";b.type="button";
        b.innerHTML=`<div class="course-name">${esc(displayName(item.course))}</div><div class="course-meta">${esc(item.time.teacher||"")}　${esc(item.time.room||"")}</div>${state.display.showSeat&&item.course.seatNumber?`<div class="course-seat">座號 ${esc(item.course.seatNumber)}</div>`:""}`;
        b.addEventListener("click",()=>openCourse(item.course.id));slot.appendChild(b)}
      grid.appendChild(slot);
    }
  }
}

function renderSettings(){
  const dayChecks=document.getElementById("dayChecks");dayChecks.innerHTML="";
  for(const d of DAYS){const label=document.createElement("label");label.className="check-item";label.innerHTML=`<span>星期${d.name}</span><input type="checkbox" ${state.display.days[d.key]?"checked":""}>`;label.querySelector("input").addEventListener("change",e=>{state.display.days[d.key]=e.target.checked;saveData();renderSchedule()});dayChecks.appendChild(label)}
  const periodChecks=document.getElementById("periodChecks");periodChecks.innerHTML="";
  for(const p of PERIODS){const label=document.createElement("label");label.className="check-item";label.innerHTML=`<span>第 ${p.number} 節<br><small>${p.time}</small></span><input type="checkbox" ${state.display.periods[p.number]?"checked":""}>`;label.querySelector("input").addEventListener("change",e=>{state.display.periods[p.number]=e.target.checked;saveData();renderSchedule()});periodChecks.appendChild(label)}
  document.getElementById("showSeat").checked=!!state.display.showSeat;
}

function render(){renderHeader();renderSchedule();renderSettings()}

function openCourse(id){
  const c=getCourse(id);if(!c)return;currentCourseId=id;
  document.getElementById("courseTitle").textContent=displayName(c);
  document.getElementById("courseSubtitle").textContent=`${c.department||""} · ${c.className||""}`;
  document.getElementById("customName").value=c.customName||"";
  document.getElementById("schoolName").textContent=c.name||"—";
  document.getElementById("courseIdText").textContent=c.id||"—";
  document.getElementById("seatNumber").textContent=c.seatNumber||"—";
  document.getElementById("credits").textContent=c.credits||"—";
  document.getElementById("department").textContent=c.department||"—";
  document.getElementById("gradeClass").textContent=`${c.grade||"—"} / ${c.className||"—"}`;
  document.getElementById("description").value=c.description||"";
  document.getElementById("note").value=c.note||"";
  const list=document.getElementById("timesList");list.innerHTML="";
  for(const t of(c.times||[])){const div=document.createElement("div");div.className="time-item";const d=DAYS.find(x=>x.key===Number(t.day));div.innerHTML=`<div class="time-title">星期${d?.name||t.day} · 第 ${esc((t.periods||[]).join("、"))} 節</div><div class="time-sub">教室：${esc(t.room||"—")}</div><div class="time-teacher">${esc(t.teacher||"—")}</div>`;list.appendChild(div)}
  document.getElementById("courseLinks").innerHTML=c.pdf?`<a href="${esc(c.pdf)}" target="_blank" rel="noopener">查看淡江課程 PDF ↗</a>`:"";
  renderJournal(c);document.getElementById("courseDialog").showModal();
}

function renderJournal(c){
  const list=document.getElementById("journalList");list.innerHTML="";
  if(!c.journal?.length){list.innerHTML=`<div class="muted">尚無記事。</div>`;return}
  for(const j of c.journal){const div=document.createElement("div");div.className="journal-item";div.innerHTML=`<div class="journal-date">${esc(j.date)}</div><div>${esc(j.text)}</div>`;list.appendChild(div)}
}
function saveCourse(){const c=getCourse(currentCourseId);if(!c)return;c.customName=document.getElementById("customName").value.trim();c.note=document.getElementById("note").value;saveData();render();document.getElementById("courseDialog").close()}
function addJournal(){const c=getCourse(currentCourseId);if(!c)return;const text=prompt("請輸入記事：");if(!text?.trim())return;c.journal||=[];c.journal.push({id:uid(),date:todayText(),text:text.trim()});saveData();renderJournal(c)}
function exportJSON(){const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="tku-timetable.json";a.click();URL.revokeObjectURL(url)}
async function importJSON(file){try{const p=JSON.parse(await file.text());if(!Array.isArray(p.courses))throw new Error("缺少 courses");state=p;saveData();render();alert("匯入成功。")}catch(e){alert(`匯入失敗：${e.message}`)}}
function clearData(){if(!confirm("確定刪除本機課表、備註、記事與顯示設定？"))return;localStorage.removeItem(STORAGE_KEY);state=clone(DEMO);saveData();render()}
function updateNetwork(){document.getElementById("networkStatus").textContent=navigator.onLine?"目前有網路":"離線可用"}

document.getElementById("prevWeek").addEventListener("click",()=>{currentWeekOffset--;renderHeader()});
document.getElementById("nextWeek").addEventListener("click",()=>{currentWeekOffset++;renderHeader()});
document.getElementById("todayButton").addEventListener("click",()=>{currentWeekOffset=0;renderHeader()});
document.getElementById("settingsButton").addEventListener("click",()=>{renderSettings();document.getElementById("settingsDialog").showModal()});
document.getElementById("closeSettings").addEventListener("click",()=>document.getElementById("settingsDialog").close());
document.getElementById("closeCourse").addEventListener("click",()=>document.getElementById("courseDialog").close());
document.getElementById("cancelCourse").addEventListener("click",()=>document.getElementById("courseDialog").close());
document.getElementById("courseForm").addEventListener("submit",e=>{e.preventDefault();saveCourse()});
document.getElementById("addJournal").addEventListener("click",addJournal);
document.getElementById("loadDemo").addEventListener("click",()=>{if(confirm("載入範例課表並取代目前本機資料？")){state=clone(DEMO);saveData();render()}});
document.getElementById("exportData").addEventListener("click",exportJSON);
document.getElementById("clearData").addEventListener("click",clearData);
document.getElementById("showSeat").addEventListener("change",e=>{state.display.showSeat=e.target.checked;saveData();renderSchedule()});
document.getElementById("importData").addEventListener("change",e=>{const f=e.target.files?.[0];if(f)importJSON(f);e.target.value=""});
window.addEventListener("online",updateNetwork);window.addEventListener("offline",updateNetwork);

if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js").catch(console.error));
render();updateNetwork();
