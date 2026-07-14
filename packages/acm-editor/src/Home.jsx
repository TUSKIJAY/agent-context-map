// Home.jsx — start page shown on launch (instead of booting into the demo).
// Lists recent documents from the local store and offers new / sample / import.
import React from "react";
import { DOMAIN_PROFILE_META, PROFILE_LABELS } from "./data.js";

function relTime(iso) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return "刚刚";
  if (s < 3600) return `${Math.floor(s / 60)} 分钟前`;
  if (s < 86400) return `${Math.floor(s / 3600)} 小时前`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} 天前`;
  return new Date(iso).toLocaleDateString();
}

const profileLabel = (id) => (DOMAIN_PROFILE_META[id] && DOMAIN_PROFILE_META[id].label) || "通用逻辑";

export function Home({
  recent, onNew, onViewSample, onOpenRecent, onDeleteRecent, onImport,
  persistenceMode, projectInfo, projectDiagnostics, onSelectProject, onMigrateLegacy,
  accent = "#6366f1",
}) {
  const ActionCard = ({ glyph, title, desc, onClick, primary }) => (
    <button onClick={onClick}
      style={{ textAlign: "left", display: "flex", alignItems: "center", gap: 13, padding: "14px 16px",
        border: "1px solid " + (primary ? accent : "#e7e9ee"), background: primary ? accent : "#fff",
        color: primary ? "#fff" : "#1d2433", borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
        boxShadow: primary ? `0 10px 24px -12px ${accent}` : "none", width: "100%" }}
      onMouseEnter={(e) => { if (!primary) e.currentTarget.style.borderColor = "#cdd2dc"; }}
      onMouseLeave={(e) => { if (!primary) e.currentTarget.style.borderColor = "#e7e9ee"; }}>
      <span style={{ width: 34, height: 34, flex: "0 0 34px", borderRadius: 9, display: "grid", placeItems: "center",
        fontSize: 17, background: primary ? "rgba(255,255,255,.18)" : "#f2f4f7", color: primary ? "#fff" : "#475467" }}>{glyph}</span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 13.5, fontWeight: 700 }}>{title}</span>
        <span style={{ display: "block", fontSize: 11.5, marginTop: 2, color: primary ? "rgba(255,255,255,.82)" : "#98a2b3" }}>{desc}</span>
      </span>
    </button>
  );

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "auto", background: "#f7f8fa", display: "flex", justifyContent: "center" }}>
      <div style={{ width: 760, maxWidth: "92vw", padding: "8vh 0 60px" }}>
        {/* brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 28 }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, background: accent, color: "#fff",
            display: "grid", placeItems: "center", fontSize: 22, fontWeight: 800, boxShadow: `0 10px 24px -12px ${accent}` }}>◈</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#1d2433", letterSpacing: "-.01em" }}>Agent Context Map</div>
            <div style={{ fontSize: 12, color: "#98a2b3", marginTop: 2 }}>协议驱动的逻辑上下文图谱编辑器 · ACM-MD v0.1</div>
          </div>
        </div>

        {/* primary actions */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 26 }}>
          <ActionCard primary glyph="＋" title="新建图谱" desc="选择领域模板，从最小合法文档开始" onClick={() => onNew()} />
          <ActionCard glyph="↧" title="导入 ACM-MD" desc="打开已有 .acm.md / .md 文件" onClick={onImport} />
          <ActionCard glyph="◇" title="查看示例" desc="载入内置示例图谱，了解结构" onClick={onViewSample} />
          <ActionCard glyph="⊞" title="空白快速开始" desc="使用「通用逻辑」模板直接新建" onClick={() => onNew("generic")} />
        </div>

        {persistenceMode === "project" && (
          <div style={{ marginBottom: 20, padding: "12px 14px", border: "1px solid #e4e7ec", borderRadius: 11, background: "#fff" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#344054" }}>
                  {projectInfo ? `当前项目：${projectInfo.name}` : "尚未选择项目文件夹"}
                </div>
                <div style={{ fontSize: 11, color: "#98a2b3", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {projectInfo ? projectInfo.root : "桌面版只会把正式图谱写入你明确选择的 .acm/documents。"}
                </div>
              </div>
              <button onClick={onSelectProject}
                style={{ border: "1px solid #d0d5dd", background: "#fff", color: "#344054", borderRadius: 8, padding: "7px 11px", cursor: "pointer", fontFamily: "inherit", fontSize: 11.5 }}>
                {projectInfo ? "切换项目" : "选择项目"}
              </button>
              <button onClick={onMigrateLegacy}
                style={{ border: "1px solid #d0d5dd", background: "#fff", color: "#344054", borderRadius: 8, padding: "7px 11px", cursor: "pointer", fontFamily: "inherit", fontSize: 11.5 }}>
                迁移旧 SQLite
              </button>
            </div>
            <div style={{ marginTop: 8, fontSize: 10.5, color: "#b06b00" }}>
              ACM-MD 可能包含敏感信息；应用不会修改 .gitignore，也不会自动 git add、commit 或 push。
            </div>
          </div>
        )}

        {projectDiagnostics?.invalid?.length > 0 && (
          <div style={{ marginBottom: 16, padding: "10px 12px", border: "1px solid #fecaca", borderRadius: 9, background: "#fff7f7", color: "#b42318", fontSize: 11.5 }}>
            项目中有 {projectDiagnostics.invalid.length} 份无法严格校验的 ACM-MD。它们已保留原样，索引不会用缓存覆盖这些文件。
          </div>
        )}
        {projectDiagnostics?.recovery?.length > 0 && (
          <div style={{ marginBottom: 16, padding: "10px 12px", border: "1px solid #fed7aa", borderRadius: 9, background: "#fffaf5", color: "#9a3412", fontSize: 11.5 }}>
            检测到 {projectDiagnostics.recovery.length} 项未确认的临时文件或锁。应用没有自动清理或覆盖，请先检查恢复证据。
          </div>
        )}

        {/* recent */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "0 2px 10px" }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "#475467", letterSpacing: ".02em" }}>最近打开</span>
          <span style={{ fontSize: 11, color: "#b3bac6" }}>{recent.length ? `${recent.length} 个图谱` : ""}</span>
        </div>

        {recent.length === 0 ? (
          <div style={{ border: "1px dashed #dfe3ea", borderRadius: 12, padding: "30px 20px", textAlign: "center",
            color: "#98a2b3", fontSize: 12.5, background: "#fff" }}>
            {persistenceMode === "project" && !projectInfo
              ? "请先选择项目文件夹；应用不会猜测最近项目作为写入目标。"
              : "还没有保存过的图谱。点「新建图谱」或「查看示例」开始。"}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recent.map((r) => (
              <div key={r.doc_id}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", background: "#fff",
                  border: "1px solid #ebedf1", borderRadius: 11, cursor: "pointer" }}
                onClick={() => onOpenRecent(r.doc_id)}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#cdd2dc")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#ebedf1")}>
                <span style={{ width: 30, height: 30, flex: "0 0 30px", borderRadius: 8, background: "#f2f4f7",
                  display: "grid", placeItems: "center", fontSize: 14, color: "#667085" }}>◈</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1d2433", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.title || "未命名图谱"}
                    {r.dirty ? <span title="有未保存为新版的修改" style={{ marginLeft: 7, width: 6, height: 6, display: "inline-block", borderRadius: 9, background: "#d97706", verticalAlign: "middle" }} /> : null}
                  </div>
                  <div style={{ fontSize: 11, color: "#98a2b3", marginTop: 2 }}>
                    {profileLabel(r.domain_profile)} · {relTime(r.updated_at)}
                  </div>
                </div>
                <button title={persistenceMode === "project" ? "删除正式项目文件（会先确认并保留本机恢复副本）" : "从最近列表删除（同时删除本地记录）"}
                  onClick={(e) => { e.stopPropagation(); onDeleteRecent(r.doc_id); }}
                  style={{ border: "1px solid transparent", background: "transparent", color: "#b3bac6", borderRadius: 7,
                    width: 28, height: 28, cursor: "pointer", fontSize: 14, flex: "0 0 28px" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#fef2f2"; e.currentTarget.style.color = "#e11d48"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#b3bac6"; }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {persistenceMode === "local" && (
          <div style={{ marginTop: 24, fontSize: 11, color: "#b3bac6", textAlign: "center" }}>
            浏览器预览模式：数据只暂存于本地缓存，不是项目事实源，也不会与桌面项目同步。
          </div>
        )}
        {persistenceMode === "project" && projectInfo && (
          <div style={{ marginTop: 24, fontSize: 11, color: "#98a2b3", textAlign: "center" }}>
            桌面业务内容单真源：{projectInfo.name}/.acm/documents/*.acm.md
          </div>
        )}
      </div>
    </div>
  );
}
