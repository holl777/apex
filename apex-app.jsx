// ============================================================
// APEX -- Always Pursuing Excellence
// Stack : React + Firebase Auth + Firestore
// npm install firebase
// ============================================================

import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendEmailVerification,
  updateProfile,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

// ─── REMPLACE PAR TES CLÉS FIREBASE ──────────────────────────────────────────
const firebaseConfig = {
  apiKey: "VOTRE_API_KEY",
  authDomain: "VOTRE_PROJECT.firebaseapp.com",
  projectId: "VOTRE_PROJECT_ID",
  storageBucket: "VOTRE_PROJECT.appspot.com",
  messagingSenderId: "VOTRE_SENDER_ID",
  appId: "VOTRE_APP_ID",
};
// ─────────────────────────────────────────────────────────────────────────────

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// ─── CONSTANTES ──────────────────────────────────────────────────────────────
const LEVELS = [
  { name: "RECRUE", min: 0, max: 200, color: "#888", icon: "🎯" },
  { name: "CHASSEUR", min: 200, max: 600, color: "#00e5ff", icon: "🏹" },
  { name: "PRÉDATEUR", min: 600, max: 1200, color: "#7c4dff", icon: "⚡" },
  { name: "APEX", min: 1200, max: 2500, color: "#ff6d00", icon: "🔥" },
  { name: "LÉGENDE", min: 2500, max: 99999, color: "#ffd600", icon: "👑" },
];

const OBJECTIONS = [
  { label: "Pas intéressé", key: "not_interested" },
  { label: "Trop cher", key: "too_expensive" },
  { label: "Déjà un fournisseur", key: "has_provider" },
  { label: "Pas le bon moment", key: "bad_timing" },
  { label: "Pas décideur", key: "not_decision_maker" },
  { label: "Pas de budget", key: "no_budget" },
];

const OBJECTION_RESPONSES = {
  not_interested: [
    "Un non aujourd'hui, c'est souvent un oui mal informé. Tu as planté une graine. 🌱",
    "Les plus grandes ventes commencent par un refus. Tu t'en approches. 💪",
    "Chaque non te rapproche du prochain oui. Continue à avancer.",
  ],
  too_expensive: [
    "Le prix n'est jamais le vrai problème -- c'est la valeur perçue. Travaille ton angle. 💡",
    "Ils comparent le coût à zéro. Ton job c'est de leur montrer le coût de ne rien faire.",
    "Un prospect qui parle de prix, c'est un prospect encore dans la conversation. C'est bon signe! 🔥",
  ],
  has_provider: [
    "Parfait -- ça veut dire qu'ils savent qu'ils ont besoin du service. Tu es à 50% du chemin. ⚡",
    "Les clients insatisfaits ne le disent pas toujours. Plante la graine, reviens dans 3 mois.",
    "Tout le monde a un fournisseur jusqu'au jour où il en trouve un meilleur. Sois ce meilleur.",
  ],
  bad_timing: [
    "Il n'y a jamais un bon moment -- sauf quand le problème devient urgent. Note-le et reviens. 📅",
    "Mauvais timing aujourd'hui = appel planifié demain. Tu as fait du progrès.",
    "Le moment parfait n'existe pas. Mais ta persistance, elle, ça compte. 💯",
  ],
  not_decision_maker: [
    "C'est une victoire -- tu as trouvé un allié interne potentiel. Demande une intro. 🤝",
    "Chaque contact est une porte vers le décideur. Continue à cartographier.",
    "L'influenceur d'aujourd'hui est souvent le décideur de demain. Cultive cette relation.",
  ],
  no_budget: [
    "Pas de budget = pas de priorité. Ton job c'est de créer l'urgence qui libère le budget. 💰",
    "Le budget existe toujours pour ce qui est prioritaire. Travaille sur la douleur.",
    "Ils n'ont pas de budget jusqu'au jour où ça coûte plus cher de ne rien faire. 🎯",
  ],
};

const BADGES = [
  { id: "first_call", icon: "📞", name: "Premier Appel", desc: "Ton tout premier appel", threshold: 1, type: "calls" },
  { id: "ten_calls", icon: "🔟", name: "Dix Combats", desc: "10 appels complétés", threshold: 10, type: "calls" },
  { id: "hundred_calls", icon: "💯", name: "Centurion", desc: "100 appels complétés", threshold: 100, type: "calls" },
  { id: "first_yes", icon: "✅", name: "Premier Oui", desc: "Première vente fermée", threshold: 1, type: "closes" },
  { id: "five_yes", icon: "🏆", name: "Série Gagnante", desc: "5 ventes fermées", threshold: 5, type: "closes" },
  { id: "streak_3", icon: "🔥", name: "En Feu", desc: "3 jours de streak", threshold: 3, type: "streak" },
  { id: "streak_7", icon: "⚡", name: "Inarrêtable", desc: "7 jours de streak", threshold: 7, type: "streak" },
  { id: "script_written", icon: "📝", name: "Stratège", desc: "Premier script créé", threshold: 1, type: "scripts" },
];

const DAILY_QUESTS = [
  { id: "q1", text: "Faire 5 appels aujourd'hui", target: 5, xpReward: 50, type: "calls" },
  { id: "q2", text: "Logger 1 objection", target: 1, xpReward: 30, type: "objections" },
  { id: "q3", text: "Planifier 3 tâches", target: 3, xpReward: 40, type: "tasks" },
];

// ─── COMPOSANTS UI ─────────────────────────────────────────────────────────

const GlowText = ({ children, color = "#00e5ff", size = "1rem", weight = "700", style = {} }) => (
  <span style={{
    color, fontSize: size, fontWeight: weight,
    textShadow: `0 0 10px ${color}88, 0 0 20px ${color}44`,
    fontFamily: "'Orbitron', monospace", ...style
  }}>{children}</span>
);

const NeonBorder = ({ children, color = "#00e5ff", style = {}, onClick }) => (
  <div onClick={onClick} style={{
    border: `1px solid ${color}55`, borderRadius: "8px",
    background: "linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 100%)",
    boxShadow: `0 0 15px ${color}22, inset 0 0 15px ${color}05`,
    padding: "16px", position: "relative", overflow: "hidden",
    cursor: onClick ? "pointer" : "default", transition: "all 0.2s ease", ...style
  }}>
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, height: "1px",
      background: `linear-gradient(90deg, transparent, ${color}88, transparent)`
    }} />
    {children}
  </div>
);

const XPBar = ({ current, max, color = "#00e5ff" }) => (
  <div style={{ width: "100%", height: "8px", background: "#1a1a2e", borderRadius: "4px", overflow: "hidden" }}>
    <div style={{
      width: `${Math.min((current / max) * 100, 100)}%`, height: "100%",
      background: `linear-gradient(90deg, ${color}88, ${color})`,
      boxShadow: `0 0 8px ${color}`, borderRadius: "4px",
      transition: "width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)"
    }} />
  </div>
);

const Modal = ({ open, onClose, children, title }) => {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, backdropFilter: "blur(4px)"
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#0a0a14", border: "1px solid #00e5ff44",
        borderRadius: "12px", padding: "24px", maxWidth: "480px", width: "90%",
        boxShadow: "0 0 40px #00e5ff22", maxHeight: "80vh", overflowY: "auto"
      }}>
        {title && <GlowText size="1.1rem" style={{ display: "block", marginBottom: "16px" }}>{title}</GlowText>}
        {children}
      </div>
    </div>
  );
};

const FloatingParticles = () => (
  <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
    {[...Array(12)].map((_, i) => (
      <div key={i} style={{
        position: "absolute",
        width: `${2 + (i % 3)}px`, height: `${2 + (i % 3)}px`,
        borderRadius: "50%",
        background: i % 2 === 0 ? "#00e5ff" : "#7c4dff",
        left: `${(i * 8.3) % 100}%`, top: `${(i * 7.7) % 100}%`,
        opacity: 0.3,
        animation: `float-${i % 3} ${6 + (i % 4) * 2}s ease-in-out infinite`,
        animationDelay: `${(i * 0.7) % 5}s`
      }} />
    ))}
  </div>
);

const inputStyle = {
  width: "100%", padding: "11px 14px",
  background: "#0a0a14", border: "1px solid #00e5ff22",
  borderRadius: "6px", color: "#e0e0ff", fontSize: "0.9rem",
  fontFamily: "monospace", outline: "none", boxSizing: "border-box",
};

const btnPrimary = (color = "#00e5ff") => ({
  width: "100%", padding: "13px",
  background: `${color}15`, border: `1px solid ${color}`,
  borderRadius: "6px", color, cursor: "pointer",
  fontFamily: "'Orbitron', monospace", fontSize: "0.8rem",
  letterSpacing: "0.12em", transition: "all 0.2s",
});

// ─── FIREBASE HELPERS ─────────────────────────────────────────────────────────

async function loadUserData(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

async function saveUserData(uid, data) {
  await setDoc(doc(db, "users", uid), data, { merge: true });
}

async function loadCalls(uid) {
  const q = query(collection(db, "calls"), where("uid", "==", uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function addCallDb(uid, call) {
  return await addDoc(collection(db, "calls"), { ...call, uid, createdAt: serverTimestamp() });
}

async function loadTasks(uid) {
  const q = query(collection(db, "tasks"), where("uid", "==", uid), orderBy("date", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function addTaskDb(uid, task) {
  return await addDoc(collection(db, "tasks"), { ...task, uid, createdAt: serverTimestamp() });
}

async function loadScripts(uid) {
  const q = query(collection(db, "scripts"), where("uid", "==", uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function addScriptDb(uid, script) {
  return await addDoc(collection(db, "scripts"), { ...script, uid, createdAt: serverTimestamp() });
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState("");

  const handleEmailAuth = async () => {
    setError(""); setVerifyMsg("");
    if (!email || !password || (isRegister && !displayName)) {
      setError("Remplis tous les champs.");
      return;
    }
    setLoading(true);
    try {
      if (isRegister) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName });
        await sendEmailVerification(cred.user);
        await saveUserData(cred.user.uid, {
          displayName, email, xp: 0, streak: 0,
          lastActiveDate: new Date().toDateString(),
          earnedBadges: [], totalCalls: 0, totalCloses: 0, totalScripts: 0,
        });
        setVerifyMsg("Compte créé! Vérifie ton courriel avant de te connecter. 📬");
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        if (!cred.user.emailVerified) {
          setError("Vérifie ton courriel avant de te connecter.");
          await signOut(auth);
          setLoading(false);
          return;
        }
        onLogin(cred.user);
      }
    } catch (e) {
      const msgs = {
        "auth/email-already-in-use": "Ce courriel est déjà utilisé.",
        "auth/wrong-password": "Mot de passe incorrect.",
        "auth/user-not-found": "Aucun compte avec ce courriel.",
        "auth/weak-password": "Mot de passe trop faible (6 car. min).",
        "auth/invalid-email": "Format de courriel invalide.",
      };
      setError(msgs[e.code] || "Erreur: " + e.message);
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setError("");
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const existing = await loadUserData(cred.user.uid);
      if (!existing) {
        await saveUserData(cred.user.uid, {
          displayName: cred.user.displayName || cred.user.email,
          email: cred.user.email, xp: 0, streak: 0,
          lastActiveDate: new Date().toDateString(),
          earnedBadges: [], totalCalls: 0, totalCloses: 0, totalScripts: 0,
        });
      }
      onLogin(cred.user);
    } catch (e) {
      setError("Erreur Google: " + e.message);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#050508", position: "relative", overflow: "hidden"
    }}>
      <FloatingParticles />
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: "400px", padding: "0 16px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "3.5rem", marginBottom: "8px" }}>⚡</div>
          <GlowText size="2.5rem" style={{ display: "block", letterSpacing: "0.3em" }}>APEX</GlowText>
          <div style={{ color: "#555", fontSize: "0.65rem", letterSpacing: "0.2em", marginTop: "6px", fontFamily: "monospace" }}>
            ALWAYS PURSUING EXCELLENCE
          </div>
        </div>
        <NeonBorder>
          <div style={{ display: "flex", marginBottom: "20px", gap: "8px" }}>
            {["Connexion", "Inscription"].map((t, i) => (
              <button key={t} onClick={() => { setIsRegister(i === 1); setError(""); setVerifyMsg(""); }} style={{
                flex: 1, padding: "8px",
                background: isRegister === (i === 1) ? "#00e5ff15" : "transparent",
                border: `1px solid ${isRegister === (i === 1) ? "#00e5ff" : "#333"}`,
                borderRadius: "4px",
                color: isRegister === (i === 1) ? "#00e5ff" : "#666",
                cursor: "pointer", fontSize: "0.8rem",
                fontFamily: "monospace", letterSpacing: "0.05em"
              }}>{t}</button>
            ))}
          </div>

          {isRegister && (
            <input placeholder="Ton prénom ou surnom" value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              style={{ ...inputStyle, marginBottom: "10px" }} />
          )}
          <input placeholder="Courriel" value={email} type="email"
            onChange={e => setEmail(e.target.value)}
            style={{ ...inputStyle, marginBottom: "10px" }} />
          <input placeholder="Mot de passe" value={password} type="password"
            onChange={e => setPassword(e.target.value)}
            style={{ ...inputStyle, marginBottom: "16px" }}
            onKeyDown={e => e.key === "Enter" && handleEmailAuth()} />

          {error && <div style={{ color: "#ff5555", fontSize: "0.8rem", marginBottom: "10px" }}>{error}</div>}
          {verifyMsg && <div style={{ color: "#69ff47", fontSize: "0.8rem", marginBottom: "10px" }}>{verifyMsg}</div>}

          <button onClick={handleEmailAuth} disabled={loading} style={btnPrimary()}>
            {loading ? "..." : isRegister ? "CRÉER MON COMPTE" : "ENTRER DANS L'ARÈNE"}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "14px 0" }}>
            <div style={{ flex: 1, height: "1px", background: "#222" }} />
            <span style={{ color: "#444", fontSize: "0.7rem" }}>ou</span>
            <div style={{ flex: 1, height: "1px", background: "#222" }} />
          </div>

          <button onClick={handleGoogle} style={{
            ...btnPrimary("#ffffff"),
            display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
            background: "#ffffff08", border: "1px solid #ffffff22", color: "#ccc",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuer avec Google
          </button>
        </NeonBorder>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function ApexApp() {
  const [authUser, setAuthUser] = useState(undefined); // undefined = loading
  const [userData, setUserData] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [calls, setCalls] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [scripts, setScripts] = useState([]);
  const [modal, setModal] = useState(null);
  const [showXPPop, setShowXPPop] = useState(null);
  const [newTask, setNewTask] = useState({ title: "", date: "", time: "" });
  const [newScript, setNewScript] = useState({ title: "", content: "" });
  const [loading, setLoading] = useState(false);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setAuthUser(user);
        await refreshUserData(user.uid);
        await refreshCalls(user.uid);
        await refreshTasks(user.uid);
        await refreshScripts(user.uid);
        await updateStreak(user.uid);
      } else {
        setAuthUser(null);
        setUserData(null);
      }
    });
    return unsub;
  }, []);

  const refreshUserData = async (uid) => {
    const data = await loadUserData(uid);
    if (data) setUserData(data);
  };

  const refreshCalls = async (uid) => {
    const data = await loadCalls(uid);
    setCalls(data);
  };

  const refreshTasks = async (uid) => {
    const data = await loadTasks(uid);
    setTasks(data);
  };

  const refreshScripts = async (uid) => {
    const data = await loadScripts(uid);
    setScripts(data);
  };

  const updateStreak = async (uid) => {
    const data = await loadUserData(uid);
    if (!data) return;
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    let newStreak = data.streak || 0;
    if (data.lastActiveDate === today) return;
    if (data.lastActiveDate === yesterday) newStreak += 1;
    else newStreak = 1;
    await saveUserData(uid, { streak: newStreak, lastActiveDate: today });
    await refreshUserData(uid);
  };

  const addXP = async (amount, label) => {
    if (!authUser || !userData) return;
    const newXP = (userData.xp || 0) + amount;
    const updated = { ...userData, xp: newXP };
    setUserData(updated);
    await saveUserData(authUser.uid, { xp: newXP });
    setShowXPPop({ amount, label });
    setTimeout(() => setShowXPPop(null), 2500);
    checkBadges(updated);
  };

  const checkBadges = async (ud) => {
    if (!authUser) return;
    const earned = ud.earnedBadges || [];
    const newBadges = [];
    for (const b of BADGES) {
      if (earned.includes(b.id)) continue;
      let val = 0;
      if (b.type === "calls") val = ud.totalCalls || 0;
      if (b.type === "closes") val = ud.totalCloses || 0;
      if (b.type === "streak") val = ud.streak || 0;
      if (b.type === "scripts") val = ud.totalScripts || 0;
      if (val >= b.threshold) newBadges.push(b.id);
    }
    if (newBadges.length > 0) {
      const allBadges = [...earned, ...newBadges];
      await saveUserData(authUser.uid, { earnedBadges: allBadges });
      setUserData(prev => ({ ...prev, earnedBadges: allBadges }));
    }
  };

  const logCall = async (outcome, objectionKey) => {
    if (!authUser) return;
    const call = {
      outcome, objectionKey: objectionKey || null,
      time: new Date().toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" }),
      date: new Date().toLocaleDateString("fr-CA")
    };
    await addCallDb(authUser.uid, call);
    const xpGain = outcome === "yes" ? 100 : 25;
    const newTotalCalls = (userData.totalCalls || 0) + 1;
    const newTotalCloses = outcome === "yes" ? (userData.totalCloses || 0) + 1 : (userData.totalCloses || 0);
    const updated = { ...userData, totalCalls: newTotalCalls, totalCloses: newTotalCloses };
    setUserData(updated);
    await saveUserData(authUser.uid, { totalCalls: newTotalCalls, totalCloses: newTotalCloses });
    await addXP(xpGain, outcome === "yes" ? "+100 XP VENTE FERMÉE! 🔥" : "+25 XP Appel logué");
    await refreshCalls(authUser.uid);
    if (outcome === "objection" && objectionKey) {
      const responses = OBJECTION_RESPONSES[objectionKey];
      setModal({ type: "objection", msg: responses[Math.floor(Math.random() * responses.length)] });
    }
  };

  const handleAddTask = async () => {
    if (!newTask.title || !authUser) return;
    setLoading(true);
    await addTaskDb(authUser.uid, { ...newTask, done: false });
    setNewTask({ title: "", date: "", time: "" });
    await addXP(15, "+15 XP Tâche planifiée");
    await refreshTasks(authUser.uid);
    setLoading(false);
  };

  const handleAddScript = async () => {
    if (!newScript.title || !newScript.content || !authUser) return;
    setLoading(true);
    await addScriptDb(authUser.uid, newScript);
    const newTotal = (userData.totalScripts || 0) + 1;
    await saveUserData(authUser.uid, { totalScripts: newTotal });
    setUserData(prev => ({ ...prev, totalScripts: newTotal }));
    setNewScript({ title: "", content: "" });
    await addXP(50, "+50 XP Script créé! 📝");
    await refreshScripts(authUser.uid);
    setLoading(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  // Loading screen
  if (authUser === undefined) {
    return (
      <div style={{
        minHeight: "100vh", background: "#050508",
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <GlowText size="1.5rem" style={{ letterSpacing: "0.3em", animation: "pulse 1.5s ease infinite" }}>
          ⚡ APEX
        </GlowText>
      </div>
    );
  }

  if (!authUser) return <LoginScreen onLogin={u => setAuthUser(u)} />;

  const xp = userData?.xp || 0;
  const streak = userData?.streak || 0;
  const earnedBadges = userData?.earnedBadges || [];
  const totalCalls = userData?.totalCalls || 0;
  const totalCloses = userData?.totalCloses || 0;
  const currentLevel = LEVELS.find(l => xp >= l.min && xp < l.max) || LEVELS[0];
  const nextLevel = LEVELS[LEVELS.indexOf(currentLevel) + 1];
  const displayName = userData?.displayName || authUser.displayName || authUser.email?.split("@")[0] || "Guerrier";

  // Quest progress
  const todayStr = new Date().toLocaleDateString("fr-CA");
  const todayCalls = calls.filter(c => c.date === todayStr).length;
  const todayObjec = calls.filter(c => c.date === todayStr && c.outcome === "objection").length;
  const todayTasks = tasks.filter(t => t.date === todayStr).length;
  const questProg = { calls: todayCalls, objections: todayObjec, tasks: todayTasks };

  const tabs = [
    { id: "dashboard", label: "HQ", icon: "⚡" },
    { id: "calls", label: "Appels", icon: "📞" },
    { id: "calendar", label: "Agenda", icon: "📅" },
    { id: "scripts", label: "Scripts", icon: "📝" },
    { id: "badges", label: "Badges", icon: "🏆" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#050508", color: "#e0e0ff", fontFamily: "monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
        @keyframes float-0{0%,100%{transform:translateY(0)}50%{transform:translateY(-20px)}}
        @keyframes float-1{0%,100%{transform:translateY(0)}50%{transform:translateY(15px)}}
        @keyframes float-2{0%,100%{transform:translateY(-10px)}50%{transform:translateY(10px)}}
        @keyframes xppop{0%{opacity:0;transform:translateY(0) scale(0.8)}30%{opacity:1;transform:translateY(-30px) scale(1.1)}70%{opacity:1;transform:translateY(-50px)}100%{opacity:0;transform:translateY(-70px)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-track{background:#0a0a14;}
        ::-webkit-scrollbar-thumb{background:#00e5ff33;border-radius:2px;}
        input,textarea{outline:none;}
        button:hover{filter:brightness(1.15);}
      `}</style>

      <FloatingParticles />

      {/* XP Pop */}
      {showXPPop && (
        <div style={{
          position: "fixed", top: "80px", right: "20px", zIndex: 9999,
          animation: "xppop 2.5s ease forwards",
          fontFamily: "'Orbitron', monospace", fontSize: "0.9rem",
          color: "#00e5ff", textShadow: "0 0 15px #00e5ff",
          pointerEvents: "none", whiteSpace: "nowrap"
        }}>{showXPPop.label}</div>
      )}

      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "#050508dd", backdropFilter: "blur(12px)",
        borderBottom: "1px solid #00e5ff22", padding: "10px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <GlowText size="1.1rem" style={{ letterSpacing: "0.2em" }}>⚡ APEX</GlowText>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
              <span style={{ fontSize: "0.7rem", color: currentLevel.color, fontFamily: "'Orbitron', monospace" }}>
                {currentLevel.icon} {currentLevel.name}
              </span>
              <span style={{ fontSize: "0.75rem", color: "#00e5ff" }}>{xp} XP</span>
            </div>
            {nextLevel && <XPBar current={xp - currentLevel.min} max={nextLevel.min - currentLevel.min} color={currentLevel.color} />}
          </div>
          <button onClick={handleLogout} style={{
            background: "none", border: "1px solid #333",
            borderRadius: "50%", width: "34px", height: "34px",
            color: "#666", cursor: "pointer", fontSize: "0.75rem",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Orbitron', monospace"
          }} title="Déconnexion">
            {displayName[0].toUpperCase()}
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "16px", maxWidth: "600px", margin: "0 auto", paddingBottom: "90px", position: "relative", zIndex: 1 }}>

        {/* DASHBOARD */}
        {tab === "dashboard" && (
          <div>
            <div style={{ color: "#555", fontSize: "0.7rem", marginBottom: "16px", letterSpacing: "0.1em" }}>
              BON RETOUR, <span style={{ color: "#00e5ff" }}>{displayName.toUpperCase()}</span>
            </div>

            <NeonBorder color="#ff6d00" style={{ marginBottom: "12px", textAlign: "center", padding: "12px" }}>
              <div style={{ fontSize: "2rem" }}>🔥</div>
              <GlowText color="#ff6d00" size="1.8rem">{streak} JOUR{streak > 1 ? "S" : ""}</GlowText>
              <div style={{ color: "#888", fontSize: "0.72rem", marginTop: "4px" }}>
                {streak >= 7 ? "Tu es INARRÊTABLE! ⚡" : streak >= 3 ? "Continue, tu es en feu!" : "Lance ta série!"}
              </div>
            </NeonBorder>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "12px" }}>
              {[
                { label: "Appels", value: totalCalls, color: "#00e5ff" },
                { label: "Ventes", value: totalCloses, color: "#69ff47" },
                { label: "Badges", value: earnedBadges.length, color: "#ffd600" },
              ].map(s => (
                <NeonBorder key={s.label} color={s.color} style={{ textAlign: "center", padding: "12px 8px" }}>
                  <GlowText color={s.color} size="1.6rem">{s.value}</GlowText>
                  <div style={{ color: "#555", fontSize: "0.65rem", marginTop: "2px" }}>{s.label}</div>
                </NeonBorder>
              ))}
            </div>

            <NeonBorder color="#7c4dff" style={{ marginBottom: "12px" }}>
              <GlowText color="#7c4dff" size="0.72rem" style={{ display: "block", marginBottom: "12px", letterSpacing: "0.15em" }}>
                QUÊTES DU JOUR
              </GlowText>
              {DAILY_QUESTS.map(q => {
                const prog = questProg[q.type] || 0;
                const done = prog >= q.target;
                return (
                  <div key={q.id} style={{ marginBottom: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "0.78rem", color: done ? "#69ff47" : "#ccc" }}>
                        {done ? "✅" : "⬜"} {q.text}
                      </span>
                      <span style={{ fontSize: "0.68rem", color: "#7c4dff" }}>+{q.xpReward} XP</span>
                    </div>
                    <XPBar current={prog} max={q.target} color={done ? "#69ff47" : "#7c4dff"} />
                    <div style={{ fontSize: "0.62rem", color: "#444", marginTop: "2px" }}>{prog}/{q.target}</div>
                  </div>
                );
              })}
            </NeonBorder>

            <NeonBorder>
              <GlowText size="0.72rem" style={{ display: "block", marginBottom: "12px", letterSpacing: "0.15em" }}>
                LOGGER UN APPEL
              </GlowText>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <button onClick={() => logCall("yes")} style={{
                  padding: "14px", background: "#69ff4715", border: "1px solid #69ff47",
                  borderRadius: "6px", color: "#69ff47", cursor: "pointer",
                  fontSize: "0.85rem", fontFamily: "monospace"
                }}>
                  ✅ FERMÉ!<br /><span style={{ fontSize: "0.62rem", color: "#69ff4788" }}>+100 XP</span>
                </button>
                <button onClick={() => setModal({ type: "log_objection" })} style={{
                  padding: "14px", background: "#ff444415", border: "1px solid #ff4444",
                  borderRadius: "6px", color: "#ff4444", cursor: "pointer",
                  fontSize: "0.85rem", fontFamily: "monospace"
                }}>
                  ❌ OBJECTION<br /><span style={{ fontSize: "0.62rem", color: "#ff444488" }}>+25 XP</span>
                </button>
              </div>
            </NeonBorder>
          </div>
        )}

        {/* CALLS */}
        {tab === "calls" && (
          <div>
            <GlowText size="0.75rem" style={{ display: "block", marginBottom: "16px", letterSpacing: "0.15em" }}>
              HISTORIQUE -- {calls.length} APPELS
            </GlowText>
            <button onClick={() => setModal({ type: "log_objection" })} style={{
              ...btnPrimary(), marginBottom: "16px"
            }}>+ LOGGER UN APPEL</button>
            {calls.length === 0 && (
              <div style={{ textAlign: "center", color: "#444", padding: "40px 0", fontSize: "0.85rem" }}>
                Aucun appel encore. Lance-toi! 🚀
              </div>
            )}
            {calls.map(c => (
              <NeonBorder key={c.id} color={c.outcome === "yes" ? "#69ff47" : "#ff5555"}
                style={{ marginBottom: "8px", padding: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: "1rem", marginRight: "8px" }}>
                      {c.outcome === "yes" ? "✅" : "❌"}
                    </span>
                    <span style={{ fontSize: "0.82rem", color: c.outcome === "yes" ? "#69ff47" : "#ff8888" }}>
                      {c.outcome === "yes" ? "VENTE FERMÉE" :
                        OBJECTIONS.find(o => o.key === c.objectionKey)?.label || "Non intéressé"}
                    </span>
                  </div>
                  <span style={{ fontSize: "0.68rem", color: "#444" }}>{c.date} {c.time}</span>
                </div>
              </NeonBorder>
            ))}
          </div>
        )}

        {/* CALENDAR */}
        {tab === "calendar" && (
          <div>
            <GlowText size="0.75rem" style={{ display: "block", marginBottom: "16px", letterSpacing: "0.15em" }}>
              PLANIFICATION
            </GlowText>
            <NeonBorder style={{ marginBottom: "16px" }}>
              <GlowText size="0.7rem" style={{ display: "block", marginBottom: "12px" }}>NOUVELLE TÂCHE</GlowText>
              <input placeholder="Description de la tâche..." value={newTask.title}
                onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
                style={{ ...inputStyle, marginBottom: "8px" }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
                <input type="date" value={newTask.date}
                  onChange={e => setNewTask(p => ({ ...p, date: e.target.value }))}
                  style={inputStyle} />
                <input type="time" value={newTask.time}
                  onChange={e => setNewTask(p => ({ ...p, time: e.target.value }))}
                  style={inputStyle} />
              </div>
              <button onClick={handleAddTask} disabled={loading} style={btnPrimary()}>
                {loading ? "..." : "PLANIFIER +15 XP"}
              </button>
            </NeonBorder>
            {tasks.length === 0 && (
              <div style={{ textAlign: "center", color: "#444", padding: "30px 0", fontSize: "0.85rem" }}>
                Aucune tâche planifiée. Organise ta journée!
              </div>
            )}
            {tasks.map(t => (
              <NeonBorder key={t.id} style={{ marginBottom: "8px", padding: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.85rem" }}>📌 {t.title}</span>
                  <span style={{ fontSize: "0.68rem", color: "#555" }}>{t.date} {t.time}</span>
                </div>
              </NeonBorder>
            ))}
          </div>
        )}

        {/* SCRIPTS */}
        {tab === "scripts" && (
          <div>
            <GlowText size="0.75rem" style={{ display: "block", marginBottom: "16px", letterSpacing: "0.15em" }}>
              MES SCRIPTS D'APPEL
            </GlowText>
            <NeonBorder color="#7c4dff" style={{ marginBottom: "16px" }}>
              <GlowText color="#7c4dff" size="0.7rem" style={{ display: "block", marginBottom: "12px" }}>CRÉER UN SCRIPT</GlowText>
              <input placeholder="Titre (ex: Cold call PME)" value={newScript.title}
                onChange={e => setNewScript(p => ({ ...p, title: e.target.value }))}
                style={{ ...inputStyle, borderColor: "#7c4dff22", marginBottom: "8px" }} />
              <textarea placeholder="Écris ton script ici..." value={newScript.content}
                onChange={e => setNewScript(p => ({ ...p, content: e.target.value }))}
                rows={6} style={{
                  ...inputStyle, borderColor: "#7c4dff22",
                  marginBottom: "12px", resize: "vertical", lineHeight: "1.6"
                }} />
              <button onClick={handleAddScript} disabled={loading} style={btnPrimary("#7c4dff")}>
                {loading ? "..." : "SAUVEGARDER +50 XP"}
              </button>
            </NeonBorder>
            {scripts.length === 0 && (
              <div style={{ textAlign: "center", color: "#444", padding: "30px 0", fontSize: "0.85rem" }}>
                Crée ton premier script et gagne 50 XP! 📝
              </div>
            )}
            {scripts.map(s => (
              <NeonBorder key={s.id} color="#7c4dff" style={{ marginBottom: "8px" }}
                onClick={() => setModal({ type: "view_script", script: s })}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.88rem" }}>📝 {s.title}</span>
                  <span style={{ fontSize: "0.68rem", color: "#7c4dff" }}>VOIR ▶</span>
                </div>
              </NeonBorder>
            ))}
          </div>
        )}

        {/* BADGES */}
        {tab === "badges" && (
          <div>
            <GlowText size="0.75rem" style={{ display: "block", marginBottom: "16px", letterSpacing: "0.15em" }}>
              SALLE DES TROPHÉES -- {earnedBadges.length}/{BADGES.length}
            </GlowText>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {BADGES.map(b => {
                const owned = earnedBadges.includes(b.id);
                return (
                  <NeonBorder key={b.id} color={owned ? "#ffd600" : "#2a2a2a"}
                    style={{ textAlign: "center", opacity: owned ? 1 : 0.4, padding: "14px 10px" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "6px",
                      filter: owned ? "drop-shadow(0 0 8px #ffd600)" : "none" }}>
                      {b.icon}
                    </div>
                    <div style={{
                      fontSize: "0.68rem", fontFamily: "'Orbitron', monospace",
                      color: owned ? "#ffd600" : "#444", marginBottom: "4px"
                    }}>{b.name}</div>
                    <div style={{ fontSize: "0.62rem", color: "#444" }}>{b.desc}</div>
                    {owned && <div style={{ fontSize: "0.6rem", color: "#ffd60066", marginTop: "4px" }}>DÉBLOQUÉ ✓</div>}
                  </NeonBorder>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "#050508f0", backdropFilter: "blur(12px)",
        borderTop: "1px solid #00e5ff22",
        display: "flex", justifyContent: "space-around",
        padding: "8px 0 12px", zIndex: 100
      }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: "none", border: "none", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: "2px",
            padding: "4px 10px"
          }}>
            <span style={{ fontSize: "1.2rem", filter: tab === t.id ? "drop-shadow(0 0 8px #00e5ff)" : "grayscale(0.8)" }}>
              {t.icon}
            </span>
            <span style={{
              fontSize: "0.52rem", letterSpacing: "0.05em",
              color: tab === t.id ? "#00e5ff" : "#333",
              fontFamily: "'Orbitron', monospace"
            }}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* MODALS */}
      <Modal open={modal?.type === "objection"} onClose={() => setModal(null)} title="TIENS BON, GUERRIER">
        <div style={{ textAlign: "center", padding: "8px 0" }}>
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}>💪</div>
          <div style={{ color: "#ccc", fontSize: "0.9rem", lineHeight: "1.7", marginBottom: "20px" }}>
            {modal?.msg}
          </div>
          <button onClick={() => setModal(null)} style={btnPrimary()}>
            BACK IN THE GAME ⚡
          </button>
        </div>
      </Modal>

      <Modal open={modal?.type === "log_objection"} onClose={() => setModal(null)} title="TYPE D'APPEL?">
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <button onClick={() => { logCall("yes"); setModal(null); }} style={{
            padding: "14px", background: "#69ff4715", border: "1px solid #69ff47",
            borderRadius: "6px", color: "#69ff47", cursor: "pointer",
            fontFamily: "monospace", fontSize: "0.9rem", textAlign: "left"
          }}>✅ VENTE FERMÉE -- +100 XP 🔥</button>
          {OBJECTIONS.map(obj => (
            <button key={obj.key} onClick={() => { logCall("objection", obj.key); setModal(null); }} style={{
              padding: "11px", background: "#ff444410", border: "1px solid #ff444433",
              borderRadius: "6px", color: "#ff8888", cursor: "pointer",
              fontFamily: "monospace", fontSize: "0.8rem", textAlign: "left"
            }}>❌ {obj.label} -- +25 XP</button>
          ))}
        </div>
      </Modal>

      <Modal open={modal?.type === "view_script"} onClose={() => setModal(null)}
        title={modal?.script?.title}>
        <div style={{
          whiteSpace: "pre-wrap", color: "#ccc", fontSize: "0.85rem",
          lineHeight: "1.7", background: "#0a0a14", padding: "12px",
          borderRadius: "6px", border: "1px solid #7c4dff22"
        }}>
          {modal?.script?.content}
        </div>
      </Modal>
    </div>
  );
}
