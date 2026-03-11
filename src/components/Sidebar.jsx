import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    return onAuthStateChanged(auth, u => {
      if (u) setUser(u);
      else setUser(null);
    });
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const navItems = [
    { id: "dashboard", icon: "⊞", label: "Dashboard", path: "/dashboard" },
    { id: "chatbot",   icon: "💬", label: "AI Chatbot", path: "/chatbot" },
    { id: "maps",      icon: "🗺️", label: "Map View", path: "/maps" },
    { id: "data",      icon: "📊", label: "Data Explorer", path: "/data" },
    { id: "history",   icon: "🕐", label: "Chat History", path: "/history" },
    { id: "reports",   icon: "📄", label: "Saved Reports", path: "/reports" },
  ];

  const currentPath = location.pathname;

  return (
    <>
      <style>{`
        .sidebar-nav-item:hover { background: rgba(0,232,162,0.12)!important; color: #00e8a2!important; }
        .sidebar-nav-item.active { background: rgba(0,232,162,0.12)!important; color: #00e8a2!important; border-right: 2px solid #00e8a2!important; }
        .sidebar-btn-logout:hover { background: rgba(232,64,64,0.15)!important; }
        .sidebar-container { width: 220px; flex-shrink: 0; background: #061a14; border-right: 1px solid #163d2e; display: flex; flex-direction: column; height: 100vh; z-index: 1000; }
      `}</style>
      <aside className="sidebar-container">
        <div style={{ padding: "24px 20px", borderBottom: "1px solid #163d2e", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #00b87a, #00e8a2)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Playfair Display', serif", fontWeight: 900, color: "#03100d", fontSize: 14, boxShadow: "0 0 16px rgba(0,232,162,0.2)", cursor: "pointer" }} onClick={() => navigate("/")}>IN</div>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 15, color: "#ddf0e8", lineHeight: 1.2 }}>AquaGuide</div>
              <div style={{ fontSize: 10, color: "#00e8a2", fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em", marginTop: 2 }}>AI ASSISTANT</div>
            </div>
          </div>
        </div>
        
        <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4, overflowY: "auto" }}>
          {navItems.map(n => {
            const isActive = currentPath.startsWith(n.path);
            return (
              <button key={n.id} onClick={() => navigate(n.path)} className={`sidebar-nav-item ${isActive ? "active" : ""}`}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8,
                  border: "none", background: "transparent", color: "#5a8a77", cursor: "pointer",
                  fontSize: 13, fontWeight: 500, fontFamily: "'DM Sans', sans-serif", textAlign: "left",
                  transition: "all 0.2s", width: "100%", borderRight: "2px solid transparent"
                }}>
                <span style={{ fontSize: 15 }}>{n.icon}</span>{n.label}
              </button>
            );
          })}
        </nav>
        
        <div style={{ padding: "16px 12px", borderTop: "1px solid #163d2e", flexShrink: 0 }}>
          {user && (
            <div style={{ marginBottom: 12, padding: "10px 12px", background: "rgba(0,232,162,0.05)", borderRadius: 8, border: "1px solid rgba(0,232,162,0.15)" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#ddf0e8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.displayName || "User"}</div>
              <div style={{ fontSize: 10, color: "#5a8a77", fontFamily: "'DM Mono', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
            </div>
          )}
          <button onClick={handleLogout} className="sidebar-btn-logout"
            style={{
              display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 8, border: "none",
              background: "rgba(232,64,64,0.08)", color: "#fca5a5", cursor: "pointer", fontSize: 12, fontWeight: 500,
              fontFamily: "'DM Sans', sans-serif", width: "100%", transition: "all 0.2s"
            }}>
            🚪 Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
