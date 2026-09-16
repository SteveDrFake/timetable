const STORAGE_KEY = "tku_timetable_v4";

const DAYS = [
  {key:1,name:"一"},{key:2,name:"二"},{key:3,name:"三"},
  {key:4,name:"四"},{key:5,name:"五"},{key:6,name:"六"},{key:7,name:"日"}
];

const PERIODS = [
  [1,"08:10–09:00"],[2,"09:10–10:00"],[3,"10:10–11:00"],[4,"11:10–12:00"],
  [5,"12:10–13:00"],[6,"13:10–14:00"],[7,"14:10–15:00"],[8,"15:10–16:00"],
  [9,"16:10–17:00"],[10,"17:10–18:00"],[11,"18:10–19:00"],[12,"19:10–20:00"],
  [13,"20:10–21:00"],[14,"21:10–22:00"]
].map(([number,time])=>({number,time}));

const DEFAULT_DISPLAY = {
  days:{1:true,2:true,3:true,4:true,5:true,6:false,7:false},
  periods:{1:true,2:true,3:true,4:true,5:true,6:true,7:true,8:true,9:true,10:true,11:false,12:false,13:false,14:false},
  showSeat:true
};

const DEMO = {
  version:4,
  semester:"115-1 範例",
  student:{name:"範例學生",studentId:"DEMO0000"},
  display:structuredClone(DEFAULT_DISPLAY),
  courses:[
    {
      id:"2952",name:"高等微積分",customName:"",department:"TSNXB",grade:"2",className:"A",
      credits:"3",requiredType:"A",seatNumber:"033",
      pdf:"http://ap09.emis.tku.edu.tw/115_1/115_1_2952.PDF",
      description:"同一門課多個上課時段共用同一座號。",
      times:[
        {day:1,periods:[1,2],room:"S 420",teacher:"余"},
        {day:3,periods:[1],room:"S 420",teacher:"余"},
        {day:3,periods:[2],room:"S 420",teacher:"助教"}
      ],
      note:"",journal:[]
    },
    {
      id:"2951",name:"代數學（一）",customName:"",department:"TSNXB",grade:"2",className:"A",
      credits:"3",requiredType:"A",seatNumber:"040",
      pdf:"http://ap09.emis.tku.edu.tw/115_1/115_1_2951.PDF",
      description:"同一門課固定座號 040。",
      times:[
        {day:2,periods:[8,9],room:"S 420",teacher:"王"},
        {day:5,periods:[3],room:"S 420",teacher:"王"},
        {day:5,periods:[7],room:"S 420",teacher:"助教"}
      ],
      note:"",journal:[]
    },
    {
      id:"2954",name:"機率論",customName:"",department:"TSNXB",grade:"2",className:"A",
      credits:"3",requiredType:"A",seatNumber:"044",
      pdf:"http://ap09.emis.tku.edu.tw/115_1/115_1_2954.PDF",
      description:"機率論範例。",
      times:[
        {day:4,periods:[5,6],room:"C 013",teacher:"黃"},
        {day:5,periods:[4],room:"C 013",teacher:"黃"},
        {day:5,periods:[6],room:"C 002",teacher:"助教"}
      ],
      note:"",journal:[]
    },
    {
      id:"1458",name:"哲學專題",customName:"",department:"TNUVB",grade:"0",className:"C",
      credits:"2",requiredType:"A",seatNumber:"016",
      pdf:"http://ap09.emis.tku.edu.tw/115_1/115_1_1458.PDF",
      description:"哲學專題範例。",
      times:[{day:4,periods:[9,10],room:"E 414",teacher:"林"}],
      note:"",journal:[]
    }
  ]
};

let state = loadData();
let currentWeekOffset = 0;
let currentCourseId = null;

function clone(x){ return JSON.parse(JSON.stringify(x)); }

function normaliseState(data){
  const result = data && typeof data === "object" ? data : clone(DEMO);
  result.display = {
    ...clone(DEFAULT_DISPLAY),
    ...(result.display || {}),
    days:{...DEFAULT_DISPLAY.days,...(result.display?.days || {})},
    periods:{...DEFAULT_DISPLAY.periods,...(result.display?.periods || {})}
  };
  result.student = result.student || {name:"",studentId:""};
  result.courses = Array.isArray(result.courses) ? result.courses : [];
  return result;
}

function loadData(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return clone(DEMO);
    return normaliseState(JSON.parse(raw));
  }catch{
    return clone(DEMO);
  }
}

function saveData(){
  localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
}

function esc(text){
  return String(text ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;")
    .replaceAll(">","&gt;").replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function uid(){
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function todayText(){
  const d=new Date();
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`;
}

function monday(offset=0){
  const d=new Date(),day=d.getDay(),diff=day===0?-6:1-day;
  d.setHours(0,0,0,0);
  d.setDate(d.getDate()+diff+offset*7);
  return d;
}

function fmtDate(d){
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`;
}

function visibleDays(){
  return DAYS.filter(d=>state.display.days[d.key]);
}

function visiblePeriods(){
  return PERIODS.filter(p=>state.display.periods[p.number]);
}

function displayName(course){
  return course.customName?.trim() || course.name || "未命名課程";
}

function getCourse(id){
  return state.courses.find(c=>c.id===id);
}

function renderHeader(){
  document.getElementById("semesterText").textContent =
    state.semester ? `學期：${state.semester}` : "尚未同步";

  document.getElementById("studentName").textContent =
    state.student?.name || "尚未登入";

  document.getElementById("studentInfo").textContent =
    state.student?.studentId ? `學號：${state.student.studentId}` : "目前使用本機課表";

  document.getElementById("settingStudentName").textContent =
    state.student?.name || "尚未取得";

  document.getElementById("settingStudentId").textContent =
    state.student?.studentId || "尚未取得";

  const mon=monday(currentWeekOffset);
  const sun=new Date(mon);
  sun.setDate(mon.getDate()+6);

  document.getElementById("weekText").textContent =
    `${fmtDate(mon)} ～ ${fmtDate(sun)}`;
}

function setScheduleGridColumns(){
  const schedule=document.getElementById("schedule");
  const days=visibleDays();
  const count=days.length;

  if(count===0){
    schedule.style.gridTemplateColumns="1fr";
    return;
  }

  const minColumn=window.innerWidth<=720 ? "145px" : "minmax(0,1fr)";
  schedule.style.gridTemplateColumns=`54px repeat(${count}, ${minColumn})`;
}

function renderSchedule(){
  const grid=document.getElementById("schedule");
  grid.innerHTML="";

  const days=visibleDays();
  const periods=visiblePeriods();

  if(days.length===0 || periods.length===0){
    setScheduleGridColumns();

    const message=document.createElement("div");
    message.className="empty-schedule";
    message.textContent="目前沒有顯示中的星期或節次，請到設定開啟。";
    grid.appendChild(message);
    return;
  }

  const corner=document.createElement("div");
  corner.className="day-header";
  corner.textContent="節次";
  grid.appendChild(corner);

  for(const day of days){
    const h=document.createElement("div");
    h.className="day-header";
    h.textContent=`星期${day.name}`;
    grid.appendChild(h);
  }

  for(const period of periods){
    const label=document.createElement("div");
    label.className="period-label";
    label.innerHTML=`<strong>第${period.number}節</strong>${period.time}`;
    grid.appendChild(label);

    for(const day of days){
      const slot=document.createElement("div");
      slot.className="schedule-slot";

      const items=[];

      for(const course of state.courses){
        for(const time of(course.times || [])){
          if(Number(time.day)===day.key && (time.periods || []).includes(period.number)){
            items.push({course,time});
          }
        }
      }

      if(!items.length){
        slot.innerHTML=`<div class="empty-slot">—</div>`;
      }else{
        for(const item of items){
          const button=document.createElement("button");
          button.className="course-card";
          button.type="button";

          const seat=state.display.showSeat && item.course.seatNumber
            ? `<div class="course-seat">座號 ${esc(item.course.seatNumber)}</div>`
            : "";

          button.innerHTML=`
            <div class="course-name">${esc(displayName(item.course))}</div>
            <div class="course-meta">${esc(item.time.teacher || "")}　${esc(item.time.room || "")}</div>
            ${seat}
          `;

          button.addEventListener("click",()=>openCourse(item.course.id));
          slot.appendChild(button);
        }
      }

      grid.appendChild(slot);
    }
  }

  setScheduleGridColumns();
}

function renderSettings(){
  const dayChecks=document.getElementById("dayChecks");
  dayChecks.innerHTML="";

  for(const d of DAYS){
    const label=document.createElement("label");
    label.className="check-item";
    label.innerHTML=`<span>星期${d.name}</span><input type="checkbox" ${state.display.days[d.key]?"checked":""}>`;

    label.querySelector("input").addEventListener("change",e=>{
      state.display.days[d.key]=e.target.checked;
      saveData();
      renderSchedule();
    });

    dayChecks.appendChild(label);
  }

  const periodChecks=document.getElementById("periodChecks");
  periodChecks.innerHTML="";

  for(const p of PERIODS){
    const label=document.createElement("label");
    label.className="check-item";
    label.innerHTML=`
      <span>第 ${p.number} 節<br><small>${p.time}</small></span>
      <input type="checkbox" ${state.display.periods[p.number]?"checked":""}>
    `;

    label.querySelector("input").addEventListener("change",e=>{
      state.display.periods[p.number]=e.target.checked;
      saveData();
      renderSchedule();
    });

    periodChecks.appendChild(label);
  }

  document.getElementById("showSeat").checked=!!state.display.showSeat;
}

function render(){
  renderHeader();
  renderSchedule();
  renderSettings();
}

function openCourse(id){
  const course=getCourse(id);
  if(!course) return;

  currentCourseId=id;

  document.getElementById("courseTitle").textContent=displayName(course);
  document.getElementById("courseSubtitle").textContent=`${course.department || ""} · ${course.className || ""}`;

  document.getElementById("customName").value=course.customName || "";
  document.getElementById("schoolName").textContent=course.name || "—";
  document.getElementById("courseIdText").textContent=course.id || "—";
  document.getElementById("seatNumber").textContent=course.seatNumber || "—";
  document.getElementById("credits").textContent=course.credits || "—";
  document.getElementById("department").textContent=course.department || "—";
  document.getElementById("gradeClass").textContent=`${course.grade || "—"} / ${course.className || "—"}`;
  document.getElementById("description").value=course.description || "";
  document.getElementById("note").value=course.note || "";

  const timesList=document.getElementById("timesList");
  timesList.innerHTML="";

  for(const time of(course.times || [])){
    const day=DAYS.find(d=>d.key===Number(time.day));
    const div=document.createElement("div");
    div.className="time-item";
    div.innerHTML=`
      <div class="time-title">星期${esc(day?.name || time.day)} · 第 ${esc((time.periods || []).join("、"))} 節</div>
      <div class="time-sub">教室：${esc(time.room || "—")}</div>
      <div class="time-teacher">授課：${esc(time.teacher || "—")}</div>
    `;
    timesList.appendChild(div);
  }

  document.getElementById("courseLinks").innerHTML=
    course.pdf
      ? `<a href="${esc(course.pdf)}" target="_blank" rel="noopener">查看淡江課程 PDF ↗</a>`
      : "";

  renderJournal(course);
  document.getElementById("courseDialog").showModal();
}

function renderJournal(course){
  const list=document.getElementById("journalList");
  list.innerHTML="";

  if(!course.journal?.length){
    list.innerHTML=`<div class="muted">尚無記事。</div>`;
    return;
  }

  for(const journal of course.journal){
    const div=document.createElement("div");
    div.className="journal-item";
    div.innerHTML=`<div class="journal-date">${esc(journal.date)}</div><div>${esc(journal.text)}</div>`;
    list.appendChild(div);
  }
}

function saveCourse(){
  const course=getCourse(currentCourseId);
  if(!course) return;

  course.customName=document.getElementById("customName").value.trim();
  course.note=document.getElementById("note").value;

  saveData();
  render();
  document.getElementById("courseDialog").close();
}

function addJournal(){
  const course=getCourse(currentCourseId);
  if(!course) return;

  const text=prompt("請輸入記事：");
  if(!text?.trim()) return;

  course.journal ||= [];
  course.journal.push({
    id:uid(),
    date:todayText(),
    text:text.trim()
  });

  saveData();
  renderJournal(course);
}

function clearCoursesOnly(){
  if(!confirm(
    "確定要清除目前同步的課表嗎？\n\n" +
    "自訂課名、備註、記事與顯示設定會保留。"
  )) return;

  state.courses=[];
  state.semester="";

  saveData();
  render();
  alert("課表已清除。");
}

function logoutApp(){
  if(!confirm(
    "確定要登出並清除這台手機上的個人資料嗎？\n\n"+
    "會刪除：\n"+
    "• 學生資料\n"+
    "• 課表\n"+
    "• 自訂課名\n"+
    "• 備註\n"+
    "• 記事\n\n"+
    "顯示設定也會恢復預設值。"
  )) return;

  localStorage.removeItem(STORAGE_KEY);

  state={
    version:4,
    semester:"",
    student:{name:"",studentId:""},
    display:clone(DEFAULT_DISPLAY),
    courses:[]
  };

  saveData();
  render();
  alert("已登出 App，並清除本機個人資料。");
}

function exportJSON(){
  const blob=new Blob(
    [JSON.stringify(state,null,2)],
    {type:"application/json"}
  );

  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download="tku-timetable.json";
  a.click();
  URL.revokeObjectURL(url);
}

async function importJSON(file){
  try{
    const imported=normaliseState(JSON.parse(await file.text()));
    state=imported;
    saveData();
    render();
    alert("匯入成功。");
  }catch(error){
    alert(`匯入失敗：${error.message}`);
  }
}

function loadDemo(){
  if(!confirm("載入範例課表並取代目前本機資料？")) return;
  state=clone(DEMO);
  saveData();
  render();
}

/*
 * SSO：
 * 目前使用同一個視窗導向淡江官方 SSO。
 * 這樣登入完畢時由淡江控制後續導向。
 *
 * 我們目前不自行讀取淡江 Cookie / Session，
 * 也不把帳號密碼交給 GitHub Pages。
 */
function openTKUSSO(){
  window.location.href="https://sso.tku.edu.tw/NEAI/loginrwd.jsp";
}

function logoutTKUSSO(){
  window.location.href="https://sinfo.ais.tku.edu.tw/emisE/eTMW_OUT.aspx";
}

function updateNetwork(){
  document.getElementById("networkStatus").textContent=
    navigator.onLine ? "目前有網路" : "離線可用";
}

document.getElementById("prevWeek").addEventListener("click",()=>{
  currentWeekOffset--;
  renderHeader();
});

document.getElementById("nextWeek").addEventListener("click",()=>{
  currentWeekOffset++;
  renderHeader();
});

document.getElementById("todayButton").addEventListener("click",()=>{
  currentWeekOffset=0;
  renderHeader();
});

document.getElementById("settingsButton").addEventListener("click",()=>{
  renderSettings();
  document.getElementById("settingsDialog").showModal();
});

document.getElementById("closeSettings").addEventListener("click",()=>{
  document.getElementById("settingsDialog").close();
});

document.getElementById("closeCourse").addEventListener("click",()=>{
  document.getElementById("courseDialog").close();
});

document.getElementById("cancelCourse").addEventListener("click",()=>{
  document.getElementById("courseDialog").close();
});

document.getElementById("courseForm").addEventListener("submit",event=>{
  event.preventDefault();
  saveCourse();
});

document.getElementById("addJournal").addEventListener("click",addJournal);

document.getElementById("showSeat").addEventListener("change",event=>{
  state.display.showSeat=event.target.checked;
  saveData();
  renderSchedule();
});

document.getElementById("loadDemo").addEventListener("click",loadDemo);

document.getElementById("clearCoursesButton").addEventListener(
  "click",clearCoursesOnly
);

document.getElementById("logoutAppButton").addEventListener(
  "click",logoutApp
);

document.getElementById("exportData").addEventListener(
  "click",exportJSON
);

document.getElementById("importData").addEventListener("change",event=>{
  const file=event.target.files?.[0];
  if(file) importJSON(file);
  event.target.value="";
});

document.getElementById("tkuLoginButton").addEventListener(
  "click",openTKUSSO
);

document.getElementById("tkuLogoutButton").addEventListener(
  "click",logoutTKUSSO
);

window.addEventListener("online",updateNetwork);
window.addEventListener("offline",updateNetwork);
window.addEventListener("resize",setScheduleGridColumns);

if("serviceWorker" in navigator){
  window.addEventListener("load",()=>{
    navigator.serviceWorker.register("service-worker.js").catch(console.error);
  });
}

render();
updateNetwork();
