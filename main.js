// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyBB4ZfrDFm__Y4JzMfoFzsL5kw5GlR8ZCo",
    authDomain: "stackit-client.firebaseapp.com",
    projectId: "stackit-client",
    storageBucket: "stackit-client.appspot.com",
    messagingSenderId: "1080432518234",
    appId: "1:1080432518234:web:674d4239ea72c811f32463",
    measurementId: "G-W8DNFQNTXG"
  };
  
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();
  let currentUser = null;
  
  // Auth Check
  auth.onAuthStateChanged(user => {
    currentUser = user;
    const loginBtn = document.getElementById("loginBtn");
    if (loginBtn) {
      loginBtn.textContent = user ? "Logout" : "Login";
      loginBtn.onclick = () => {
        if (user) auth.signOut();
        else window.location.href = "login.html";
      };
    }
  
    if (user) {
      loadQuestions();
      loadNotifications(user.uid);
    }
  });
  
  // Load Questions to Homepage
  function loadQuestions() {
    const container = document.getElementById("questionsList");
    if (!container) return;
  
    db.collection("questions")
      .orderBy("createdAt", "desc")
      .limit(10)
      .onSnapshot(snapshot => {
        container.innerHTML = "";
        snapshot.forEach(doc => {
          const q = doc.data();
          const div = document.createElement("div");
          div.className = "bg-gray-800 p-4 rounded";
          div.innerHTML = `
            <h2 class="text-xl font-bold text-indigo-400 cursor-pointer" onclick="location.href='question.html?id=${doc.id}'">${q.title}</h2>
            <p class="text-sm text-gray-300 mt-1">${q.excerpt || ''}</p>
            <div class="text-xs text-gray-400 mt-2 flex gap-2 flex-wrap">
              ${q.tags.map(t => `<span class="bg-gray-700 px-2 py-1 rounded">${t}</span>`).join("")}
              <span>by ${q.userEmail || "Anonymous"}</span>
            </div>
            <div class="mt-2 flex gap-2">
              <button onclick="voteQuestion('${doc.id}', 1)" class="bg-green-600 px-2 py-1 rounded">⬆ Upvote</button>
              <button onclick="voteQuestion('${doc.id}', -1)" class="bg-red-600 px-2 py-1 rounded">⬇ Downvote</button>
            </div>
          `;
          container.appendChild(div);
        });
      });
  }
  
  // Vote for a Question
  function voteQuestion(qid, value) {
    if (!currentUser) return alert("Login to vote.");
    const ref = db.collection("votes").doc(`${qid}_${currentUser.uid}`);
    ref.get().then(doc => {
      if (doc.exists) return alert("Already voted.");
      ref.set({
        questionId: qid,
        userId: currentUser.uid,
        value,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      sendNotificationToQuestionOwner(qid, `${currentUser.email} ${value > 0 ? "upvoted" : "downvoted"} your question.`);
    });
  }
  
  // Send Notification to Question Owner
  function sendNotificationToQuestionOwner(questionId, message) {
    db.collection("questions").doc(questionId).get().then(doc => {
      if (doc.exists) {
        const ownerUid = doc.data().userId;
        if (ownerUid && currentUser.uid !== ownerUid) {
          sendNotification(ownerUid, message);
        }
      }
    });
  }
  
  // Send Notification
  function sendNotification(userId, message, type = "info") {
    db.collection("users").doc(userId).collection("notifications").add({
      message,
      type,
      isRead: false,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
  
  // Load Notifications
  function loadNotifications(uid) {
    const badge = document.getElementById("notifCount");
    const dropdown = document.getElementById("notifDropdown");
  
    db.collection("users").doc(uid).collection("notifications")
      .orderBy("timestamp", "desc").limit(10)
      .onSnapshot(snapshot => {
        dropdown.innerHTML = "";
        let unread = 0;
        snapshot.forEach(doc => {
          const n = doc.data();
          if (!n.isRead) unread++;
          const item = document.createElement("div");
          item.className = "p-2 border-b text-sm hover:bg-gray-800 cursor-pointer";
          item.textContent = n.message;
          dropdown.appendChild(item);
        });
  
        if (unread > 0) {
          badge.classList.remove("hidden");
          badge.textContent = unread;
        } else {
          badge.classList.add("hidden");
        }
      });
  }
  