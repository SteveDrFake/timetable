const DB_NAME = "tku-course-app";
const DB_VERSION = 1;
const STORE = "app";
const DAYS = ["一", "二", "三", "四", "五"];
const PERIODS = [
  { n: 1, time: "08:10–09:00" },
  { n: 2, time: "09:10–10:00" },
  { n: 3, time: "10:10–11:00" },
  { n: 4, time: "11:10–12:00" },
  { n: 5, time: "12:10–13:00" },
  { n: 6, time: "13:10–14:00" },
  { n: 7, time: "14:10–15:00" },
  { n: 8, time: "15:10–16:00" },
  { n: 9, time: "16:10–17:00" },
  { n: 10, time: "17:10–18:00" },
  { n: 11, time: "18:10–19:00" },
  { n: 12, time: "19:10–20:00" },
  { n: 13, time: "20:10–21:00" },
  { n: 14, time: "21:10–22:00" }
];

let db;
let state = {
  student: null,
  semester: "",
  courses: [],
  weekOffset: 0,
  currentCourseId: null
};

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE)) {
        database.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => {
      db = request.result;
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

function dbGet(key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbSet(key, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function dbDelete(key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function saveState() {
  await dbSet("student", state.student);
  await dbSet("semester", state.semester);
  await dbSet("courses", state.courses);
}

async function loadState() {
  state.student = await dbGet("student");
  state.semester = (await dbGet("semester")) || "";
  state.courses = (await dbGet("courses")) || [];
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() :
    Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function mondayOfWeek(offset = 0) {
  const d = new Date();
  const day = d.getDay(); // 0 Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + diff + offset * 7);
  return d;
}

function formatDate(d) {
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`;
}

function renderHeader() {
  document.getElementById("semesterLabel").textContent =
    state.semester ? `學期：${state.semester}` : "尚未同步";

  document.getElementById("studentName").textContent =
    state.student?.name || "尚未登入校務系統";

  document.getElementById("studentId").textContent =
    state.student?.studentId || "可先使用內建範例資料測試";

  const mon = mondayOfWeek(state.weekOffset);
  const fri = new Date(mon);
  fri.setDate(mon.getDate() + 4);
  document.getElementById("weekLabel").textContent =
    `${formatDate(mon)} ～ ${formatDate(fri)}`;
}

function renderSchedule() {
  const grid = document.getElementById("scheduleGrid");
  grid.innerHTML = "";

  const corner = document.createElement("div");
  corner.className = "day-head";
  corner.textContent = "節次";
  grid.appendChild(corner);

  DAYS.forEach(day => {
    const el = document.createElement("div");
    el.className = "day-head";
    el.textContent = `星期${day}`;
    grid.appendChild(el);
  });

  for (const period of PERIODS) {
    const label = document.createElement("div");
    label.className = "period-label";
    label.innerHTML = `<strong>第${period.n}節</strong><br>${period.time}`;
    grid.appendChild(label);

    for (let day = 1; day <= 5; day++) {
      const slot = document.createElement("div");
      slot.className = "slot";

      const courses = state.courses.filter(c =>
        Number(c.day) === day &&
        Number(c.startPeriod) <= period.n &&
        Number(c.endPeriod) >= period.n
      );

      if (courses.length === 0) {
        slot.innerHTML = `<div class="empty">—</div>`;
      } else {
        for (const course of courses) {
          const btn = document.createElement("button");
          btn.className = "course-card";
          btn.dataset.id = course.id;
          const displayName = course.customName || course.name || "未命名課程";
          btn.innerHTML = `
            <div class="course-name">${esc(displayName)}</div>
            <div class="course-room">${esc(course.room || "")}</div>
            <div class="course-teacher">${esc(course.teacher || "")}</div>
          `;
          btn.addEventListener("click", () => openCourse(course.id));
          slot.appendChild(btn);
        }
      }

      grid.appendChild(slot);
    }
  }
}

function render() {
  renderHeader();
  renderSchedule();
}

function showNotice(message) {
  const el = document.getElementById("notice");
  el.textContent = message;
  el.classList.remove("hidden");
  clearTimeout(showNotice.timer);
  showNotice.timer = setTimeout(() => el.classList.add("hidden"), 6000);
}

function getCourse(id) {
  return state.courses.find(c => c.id === id);
}

function renderJournal(course) {
  const list = document.getElementById("journalList");
  list.innerHTML = "";

  if (!course.journal?.length) {
    list.innerHTML = `<div class="muted">還沒有記事。</div>`;
    return;
  }

  for (const item of course.journal) {
    const box = document.createElement("div");
    box.className = "journal-item";
    box.innerHTML = `
      <div class="journal-date">${esc(item.date)}</div>
      <div>${esc(item.text)}</div>
    `;
    list.appendChild(box);
  }
}

function openCourse(id) {
  const course = getCourse(id);
  if (!course) return;

  state.currentCourseId = id;

  document.getElementById("dialogTitle").textContent =
    course.customName || course.name || "課程";

  document.getElementById("dialogSchoolName").textContent =
    `${course.name || ""} · ${course.room || ""}`;

  document.getElementById("courseId").value = course.id;
  document.getElementById("customName").value = course.customName || "";
  document.getElementById("schoolName").value = course.name || "";
  document.getElementById("teacher").value = course.teacher || "";
  document.getElementById("room").value = course.room || "";
  document.getElementById("description").value = course.description || "";
  document.getElementById("note").value = course.note || "";

  renderJournal(course);
  document.getElementById("courseDialog").showModal();
}

async function saveCourseForm(event) {
  event.preventDefault();

  const id = document.getElementById("courseId").value;
  const course = getCourse(id);
  if (!course) return;

  course.customName = document.getElementById("customName").value.trim();
  course.note = document.getElementById("note").value;

  await saveState();
  document.getElementById("courseDialog").close();
  render();
  showNotice("課程資料已儲存到本機。");
}

async function addJournal() {
  const course = getCourse(state.currentCourseId);
  if (!course) return;

  const text = prompt("輸入記事內容：");
  if (!text?.trim()) return;

  course.journal ??= [];
  course.journal.push({
    id: uid(),
    date: formatDate(new Date()),
    text: text.trim()
  });

  await saveState();
  renderJournal(course);
}

async function deleteCurrentCourse() {
  const course = getCourse(state.currentCourseId);
  if (!course) return;

  const ok = confirm(`確定刪除「${course.name}」的本機課程資料嗎？`);
  if (!ok) return;

  state.courses = state.courses.filter(c => c.id !== course.id);
  await saveState();

  document.getElementById("courseDialog").close();
  render();
  showNotice("已刪除本機課程。下一次同步可能重新出現。");
}

function demoCourses() {
  return [
    {
      id: uid(),
      code: "DEMO001",
      name: "程式設計",
      customName: "",
      teacher: "王老師",
      room: "T511",
      day: 1,
      startPeriod: 1,
      endPeriod: 2,
      description: "範例課程。同步淡江資料後會被正式資料取代。",
      note: "",
      journal: []
    },
    {
      id: uid(),
      code: "DEMO002",
      name: "資料庫系統",
      customName: "我的資料庫",
      teacher: "李老師",
      room: "B101",
      day: 3,
      startPeriod: 3,
      endPeriod: 4,
      description: "資料庫課程範例。",
      note: "記得帶筆電",
      journal: [
        { id: uid(), date: formatDate(new Date()), text: "這是範例記事。" }
      ]
    },
    {
      id: uid(),
      code: "DEMO003",
      name: "英文",
      customName: "",
      teacher: "陳老師",
      room: "D302",
      day: 5,
      startPeriod: 5,
      endPeriod: 6,
      description: "英文課程範例。",
      note: "",
      journal: []
    }
  ];
}

async function loadDemo() {
  state.student = { studentId: "DEMO0000", name: "範例學生" };
  state.semester = "範例學期";
  state.courses = demoCourses();
  await saveState();
  render();
  showNotice("已載入範例課表。");
}

function exportJSON() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    student: state.student,
    semester: state.semester,
    courses: state.courses
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tku-course-backup.json";
  a.click();
  URL.revokeObjectURL(url);
}

async function importJSON(file) {
  const text = await file.text();
  const payload = JSON.parse(text);

  if (!Array.isArray(payload.courses)) {
    throw new Error("JSON 缺少 courses 陣列。");
  }

  state.student = payload.student || null;
  state.semester = payload.semester || "";
  state.courses = payload.courses.map(c => ({
    id: c.id || uid(),
    name: c.name || "",
    customName: c.customName || "",
    code: c.code || "",
    teacher: c.teacher || "",
    room: c.room || "",
    day: Number(c.day || 1),
    startPeriod: Number(c.startPeriod || 1),
    endPeriod: Number(c.endPeriod || c.startPeriod || 1),
    description: c.description || "",
    note: c.note || "",
    journal: Array.isArray(c.journal) ? c.journal : []
  }));

  await saveState();
  render();
  showNotice("JSON 匯入完成。");
}

async function clearAll() {
  const ok = confirm("確定要刪除全部本機課表、備註與記事嗎？");
  if (!ok) return;

  await dbDelete("student");
  await dbDelete("semester");
  await dbDelete("courses");

  state.student = null;
  state.semester = "";
  state.courses = [];
  render();
  showNotice("本機資料已清除。");
}

async function triggerSync() {
  showNotice(
    "同步功能需要先啟動專案內的 sync-tku.js，再在淡江官方 SSO 頁面自行登入。網站本身不會要求你輸入淡江密碼。"
  );
}

window.addEventListener("online", () => {
  document.getElementById("onlineStatus").textContent = "目前有網路";
});

window.addEventListener("offline", () => {
  document.getElementById("onlineStatus").textContent = "離線可用";
});

document.getElementById("prevWeek").addEventListener("click", () => {
  state.weekOffset--;
  render();
});

document.getElementById("nextWeek").addEventListener("click", () => {
  state.weekOffset++;
  render();
});

document.getElementById("todayBtn").addEventListener("click", () => {
  state.weekOffset = 0;
  render();
});

document.getElementById("courseForm").addEventListener("submit", saveCourseForm);
document.getElementById("addJournalBtn").addEventListener("click", addJournal);
document.getElementById("deleteCourseBtn").addEventListener("click", deleteCurrentCourse);
document.getElementById("settingsBtn").addEventListener("click", () => {
  document.getElementById("settingsDialog").showModal();
});
document.getElementById("syncBtn").addEventListener("click", triggerSync);

document.getElementById("loadDemoBtn").addEventListener("click", async () => {
  await loadDemo();
  document.getElementById("settingsDialog").close();
});

document.getElementById("exportBtn").addEventListener("click", exportJSON);

document.getElementById("importFile").addEventListener("change", async e => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    await importJSON(file);
  } catch (err) {
    alert(`匯入失敗：${err.message}`);
  }

  e.target.value = "";
});

document.getElementById("clearBtn").addEventListener("click", async () => {
  await clearAll();
  document.getElementById("settingsDialog").close();
});

(async function init() {
  try {
    await openDB();
    await loadState();
    render();

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("service-worker.js").catch(() => {});
    }
  } catch (err) {
    console.error(err);
    alert("初始化失敗，請使用本機網站伺服器開啟，而不是直接雙擊 HTML。");
  }
})();
