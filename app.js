const STORAGE_KEY = "tku_timetable_data_v1";


const DAYS = [
    "一",
    "二",
    "三",
    "四",
    "五"
];


const PERIODS = [

    {
        number: 1,
        time: "08:10–09:00"
    },

    {
        number: 2,
        time: "09:10–10:00"
    },

    {
        number: 3,
        time: "10:10–11:00"
    },

    {
        number: 4,
        time: "11:10–12:00"
    },

    {
        number: 5,
        time: "12:10–13:00"
    },

    {
        number: 6,
        time: "13:10–14:00"
    },

    {
        number: 7,
        time: "14:10–15:00"
    },

    {
        number: 8,
        time: "15:10–16:00"
    },

    {
        number: 9,
        time: "16:10–17:00"
    },

    {
        number: 10,
        time: "17:10–18:00"
    },

    {
        number: 11,
        time: "18:10–19:00"
    },

    {
        number: 12,
        time: "19:10–20:00"
    },

    {
        number: 13,
        time: "20:10–21:00"
    },

    {
        number: 14,
        time: "21:10–22:00"
    }

];


let data = {


    student: {

        name: "範例學生",

        studentId: "DEMO0000"

    },


    semester: "範例學期",


    courses: [


        {

            id: "course-1",

            name: "程式設計",

            customName: "",

            teacher: "王老師",

            room: "T511",

            day: 1,

            startPeriod: 1,

            endPeriod: 2,

            description:
                "這是一門範例課程。之後會由淡江 eMis 自動取得。",

            note: "",

            journal: []

        },


        {

            id: "course-2",

            name: "資料庫系統",

            customName: "我的資料庫",

            teacher: "李老師",

            room: "B101",

            day: 3,

            startPeriod: 3,

            endPeriod: 4,

            description:
                "資料庫系統範例課程。",

            note: "記得帶筆電",

            journal: [

                {

                    id: "journal-1",

                    date: getToday(),

                    text: "這是第一筆範例記事。"

                }

            ]

        },


        {

            id: "course-3",

            name: "英文",

            customName: "",

            teacher: "陳老師",

            room: "D302",

            day: 5,

            startPeriod: 5,

            endPeriod: 6,

            description:
                "英文課程範例。",

            note: "",

            journal: []

        }

    ]

};


let currentWeekOffset = 0;

let currentCourseId = null;


/* ==================================================
   工具
================================================== */


function getToday() {

    const date = new Date();

    return (

        date.getFullYear()

        + "/"

        + String(date.getMonth() + 1).padStart(2, "0")

        + "/"

        + String(date.getDate()).padStart(2, "0")

    );

}


function createId() {

    return (

        Date.now().toString(36)

        + "-"

        + Math.random().toString(36).slice(2)

    );

}


function escapeHTML(text) {

    return String(text ?? "")

        .replaceAll("&", "&amp;")

        .replaceAll("<", "&lt;")

        .replaceAll(">", "&gt;")

        .replaceAll('"', "&quot;")

        .replaceAll("'", "&#039;");

}


/* ==================================================
   本機資料
================================================== */


function saveData() {

    localStorage.setItem(

        STORAGE_KEY,

        JSON.stringify(data)

    );

}


function loadData() {

    const saved =

        localStorage.getItem(STORAGE_KEY);


    if (!saved) {

        saveData();

        return;

    }


    try {

        const parsed = JSON.parse(saved);


        if (

            parsed &&

            Array.isArray(parsed.courses)

        ) {

            data = parsed;

        }

    }

    catch {

        console.log(
            "本機資料讀取失敗，使用預設資料。"
        );

    }

}


/* ==================================================
   日期
================================================== */


function getMonday(offset = 0) {

    const date = new Date();

    const day = date.getDay();


    const difference =

        day === 0

            ? -6

            : 1 - day;


    date.setHours(0, 0, 0, 0);


    date.setDate(

        date.getDate()

        + difference

        + offset * 7

    );


    return date;

}


function formatDate(date) {

    return (

        date.getFullYear()

        + "/"

        + String(date.getMonth() + 1).padStart(2, "0")

        + "/"

        + String(date.getDate()).padStart(2, "0")

    );

}


/* ==================================================
   顯示星期
================================================== */


function renderWeekHeader() {

    const monday = getMonday(
        currentWeekOffset
    );


    const friday = new Date(monday);


    friday.setDate(

        monday.getDate() + 4

    );


    document.getElementById(
        "weekText"
    ).textContent =

        formatDate(monday)

        + " ～ "

        + formatDate(friday);

}


/* ==================================================
   課表
================================================== */


function renderSchedule() {

    const schedule =

        document.getElementById(
            "schedule"
        );


    schedule.innerHTML = "";


    // 左上角
    const corner = document.createElement(
        "div"
    );


    corner.className = "day-header";

    corner.textContent = "節次";

    schedule.appendChild(corner);


    // 星期
    for (const day of DAYS) {

        const header = document.createElement(
            "div"
        );


        header.className = "day-header";

        header.textContent =
            `星期${day}`;


        schedule.appendChild(header);

    }


    // 每一節
    for (const period of PERIODS) {


        // 節次
        const periodLabel =
            document.createElement(
                "div"
            );


        periodLabel.className =
            "period-label";


        periodLabel.innerHTML =

            `<strong>
                第${period.number}節
            </strong>
            ${period.time}`;


        schedule.appendChild(
            periodLabel
        );


        // 星期一到五
        for (let day = 1; day <= 5; day++) {


            const slot =
                document.createElement(
                    "div"
                );


            slot.className =
                "schedule-slot";


            const courses =
                data.courses.filter(
                    course =>

                        Number(course.day) === day &&

                        Number(course.startPeriod)
                            <= period.number &&

                        Number(course.endPeriod)
                            >= period.number
                );


            if (courses.length === 0) {


                const empty =
                    document.createElement(
                        "div"
                    );


                empty.className =
                    "empty-slot";


                empty.textContent = "—";


                slot.appendChild(empty);

            }


            else {


                for (const course of courses) {


                    const button =
                        document.createElement(
                            "button"
                        );


                    button.type = "button";

                    button.className =
                        "course-card";


                    const displayName =

                        course.customName

                        || course.name

                        || "未命名課程";


                    button.innerHTML =

                        `
                        <div class="course-name">
                            ${escapeHTML(displayName)}
                        </div>

                        <div class="course-room">
                            ${escapeHTML(course.room)}
                        </div>

                        <div class="course-teacher">
                            ${escapeHTML(course.teacher)}
                        </div>
                        `;


                    button.addEventListener(
                        "click",
                        () => openCourse(course.id)
                    );


                    slot.appendChild(button);

                }

            }


            schedule.appendChild(slot);

        }

    }

}


/* ==================================================
   顯示學生
================================================== */


function renderStudent() {

    document.getElementById(
        "studentName"
    ).textContent =

        data.student?.name

        || "尚未登入";


    document.getElementById(
        "studentInfo"
    ).textContent =

        data.student?.studentId

        ? `學號：${data.student.studentId}`

        : "目前使用範例課表";


    document.getElementById(
        "settingsStudentName"
    ).textContent =

        data.student?.name

        || "尚未取得";


    document.getElementById(
        "settingsStudentId"
    ).textContent =

        data.student?.studentId

        || "尚未取得";

}


/* ==================================================
   Render
================================================== */


function render() {

    renderStudent();

    renderWeekHeader();

    renderSchedule();

}


/* ==================================================
   課程詳細資料
================================================== */


function findCourse(id) {

    return data.courses.find(
        course => course.id === id
    );

}


function openCourse(id) {

    const course = findCourse(id);

    if (!course) {
        return;
    }


    currentCourseId = id;


    document.getElementById(
        "courseTitle"
    ).textContent =

        course.customName

        || course.name;


    document.getElementById(
        "courseOriginalName"
    ).textContent =

        course.name;


    document.getElementById(
        "customName"
    ).value =

        course.customName || "";


    document.getElementById(
        "schoolName"
    ).textContent =

        course.name || "—";


    document.getElementById(
        "teacher"
    ).textContent =

        course.teacher || "—";


    document.getElementById(
        "room"
    ).textContent =

        course.room || "—";


    document.getElementById(
        "courseTime"
    ).textContent =

        `星期${DAYS[course.day - 1]}
         第${course.startPeriod}～${course.endPeriod}節`;


    document.getElementById(
        "description"
    ).value =

        course.description || "";


    document.getElementById(
        "note"
    ).value =

        course.note || "";


    renderJournal(course);


    document.getElementById(
        "courseDialog"
    ).showModal();

}


/* ==================================================
   記事
================================================== */


function renderJournal(course) {

    const list =

        document.getElementById(
            "journalList"
        );


    list.innerHTML = "";


    if (
        !course.journal
        ||
        course.journal.length === 0
    ) {

        list.innerHTML =

            `
            <div class="settings-description">
                尚無記事。
            </div>
            `;

        return;

    }


    for (
        const journal of course.journal
    ) {


        const item =
            document.createElement(
                "div"
            );


        item.className =
            "journal-item";


        item.innerHTML =

            `
            <div class="journal-date">
                ${escapeHTML(journal.date)}
            </div>

            <div>
                ${escapeHTML(journal.text)}
            </div>
            `;


        list.appendChild(item);

    }

}


/* ==================================================
   儲存課程
================================================== */


function saveCourse() {

    const course =
        findCourse(currentCourseId);


    if (!course) {
        return;
    }


    course.customName =

        document.getElementById(
            "customName"
        ).value.trim();


    course.note =

        document.getElementById(
            "note"
        ).value;


    saveData();

    render();

    document.getElementById(
        "courseDialog"
    ).close();

}


/* ==================================================
   新增記事
================================================== */


function addJournal() {

    const course =
        findCourse(currentCourseId);


    if (!course) {
        return;
    }


    const text =
        prompt("請輸入記事：");


    if (!text || !text.trim()) {
        return;
    }


    if (!course.journal) {
        course.journal = [];
    }


    course.journal.push({

        id: createId(),

        date: getToday(),

        text: text.trim()

    });


    saveData();

    renderJournal(course);

}


/* ==================================================
   範例資料
================================================== */


function loadDemo() {

    const confirmed =

        confirm(
            "要載入範例課表嗎？目前的本機資料會被取代。"
        );


    if (!confirmed) {
        return;
    }


    data = {

        student: {

            name: "範例學生",

            studentId: "DEMO0000"

        },


        semester: "115-1 範例",


        courses: [

            {

                id: "demo-1",

                name: "程式設計",

                customName: "",

                teacher: "王老師",

                room: "T511",

                day: 1,

                startPeriod: 1,

                endPeriod: 2,

                description:
                    "這是程式設計的範例資料。",

                note: "",

                journal: []

            },


            {

                id: "demo-2",

                name: "資料庫系統",

                customName: "我的資料庫",

                teacher: "李老師",

                room: "B101",

                day: 3,

                startPeriod: 3,

                endPeriod: 4,

                description:
                    "這是資料庫系統的範例資料。",

                note: "記得帶筆電",

                journal: [

                    {

                        id: createId(),

                        date: getToday(),

                        text:
                            "第一堂課要記得自我介紹。"

                    }

                ]

            },


            {

                id: "demo-3",

                name: "英文",

                customName: "",

                teacher: "陳老師",

                room: "D302",

                day: 5,

                startPeriod: 5,

                endPeriod: 6,

                description:
                    "這是英文課的範例資料。",

                note: "",

                journal: []

            }

        ]

    };


    saveData();

    render();

    closeSettings();

}


/* ==================================================
   匯出
================================================== */


function exportData() {

    const json =

        JSON.stringify(
            data,
            null,
            2
        );


    const blob =
        new Blob(
            [json],
            {
                type:
                    "application/json"
            }
        );


    const url =
        URL.createObjectURL(blob);


    const a =
        document.createElement(
            "a"
        );


    a.href = url;


    a.download =
        "tku-timetable-backup.json";


    a.click();


    URL.revokeObjectURL(url);

}


/* ==================================================
   匯入
================================================== */


async function importData(file) {

    try {

        const text =
            await file.text();


        const imported =
            JSON.parse(text);


        if (
            !imported
            ||
            !Array.isArray(
                imported.courses
            )
        ) {

            throw new Error(
                "這不是有效的課表資料。"
            );

        }


        data = imported;


        saveData();

        render();

        alert("匯入成功。");

    }

    catch (error) {

        alert(
            "匯入失敗：" + error.message
        );

    }

}


/* ==================================================
   清除
================================================== */


function clearData() {

    const confirmed =

        confirm(
            "確定要刪除手機裡的課表、備註與記事嗎？"
        );


    if (!confirmed) {
        return;
    }


    localStorage.removeItem(
        STORAGE_KEY
    );


    location.reload();

}


/* ==================================================
   設定
================================================== */


function openSettings() {

    document.getElementById(
        "settingsDialog"
    ).showModal();

}


function closeSettings() {

    document.getElementById(
        "settingsDialog"
    ).close();

}


/* ==================================================
   網路狀態
================================================== */


function updateNetworkStatus() {

    const element =
        document.getElementById(
            "networkStatus"
        );


    if (navigator.onLine) {

        element.textContent =
            "目前有網路";

    }

    else {

        element.textContent =
            "離線可用";

    }

}


/* ==================================================
   事件
================================================== */


document.getElementById(
    "previousWeek"
).addEventListener(

    "click",

    () => {

        currentWeekOffset--;

        render();

    }

);


document.getElementById(
    "nextWeek"
).addEventListener(

    "click",

    () => {

        currentWeekOffset++;

        render();

    }

);


document.getElementById(
    "todayButton"
).addEventListener(

    "click",

    () => {

        currentWeekOffset = 0;

        render();

    }

);


document.getElementById(
    "settingsButton"
).addEventListener(

    "click",

    openSettings

);


document.getElementById(
    "closeSettingsButton"
).addEventListener(

    "click",

    closeSettings

);


document.getElementById(
    "closeCourseButton"
).addEventListener(

    "click",

    () => {

        document.getElementById(
            "courseDialog"
        ).close();

    }

);


document.getElementById(
    "cancelCourseButton"
).addEventListener(

    "click",

    () => {

        document.getElementById(
            "courseDialog"
        ).close();

    }

);


document.getElementById(
    "courseForm"
).addEventListener(

    "submit",

    event => {

        event.preventDefault();

        saveCourse();

    }

);


document.getElementById(
    "addJournalButton"
).addEventListener(

    "click",

    addJournal

);


document.getElementById(
    "loadDemoButton"
).addEventListener(

    "click",

    loadDemo

);


document.getElementById(
    "exportButton"
).addEventListener(

    "click",

    exportData

);


document.getElementById(
    "clearButton"
).addEventListener(

    "click",

    clearData

);


document.getElementById(
    "importFile"
).addEventListener(

    "change",

    event => {

        const file =
            event.target.files?.[0];


        if (file) {

            importData(file);

        }


        event.target.value = "";

    }

);


window.addEventListener(
    "online",
    updateNetworkStatus
);


window.addEventListener(
    "offline",
    updateNetworkStatus
);


/* ==================================================
   啟動
================================================== */


loadData();

render();

updateNetworkStatus();


/* Service Worker */

if (
    "serviceWorker"
    in navigator
) {

    window.addEventListener(
        "load",

        () => {

            navigator.serviceWorker
                .register(
                    "service-worker.js"
                )
                .catch(
                    error =>
                        console.log(
                            "Service Worker:",
                            error
                        )
                );

        }

    );

}

document.getElementById(
    "tkuLoginButton"
).addEventListener(
    "click",
    () => {

        window.open(
            "https://sso.tku.edu.tw/NEAI/loginrwd.jsp",
            "_blank"
        );

    }
);
