import React, { useEffect, useMemo, useState } from "react";

const button = { border: "1px solid #d0d5dd", background: "#fff", borderRadius: 7, padding: "5px 8px", font: "600 11px system-ui", color: "#344054", cursor: "pointer" };
const primary = { ...button, borderColor: "#7c3aed", background: "#7c3aed", color: "#fff" };

export function Phase6Controls({ bridge, snapshot, lifecycle, appSessionNonce, platform, selection }) {
  const initial = snapshot.documents[0];
  const [documentId] = useState(initial?.doc_id || null);
  const [revision, setRevision] = useState(initial?.document_revision || null);
  const [proposals, setProposals] = useState([]);
  const [sendPreview, setSendPreview] = useState(null);
  const [status, setStatus] = useState("Phase 6：pending proposal 与发送均需人工点击");
  const selectedNodeIds = useMemo(() => selection?.kind === "node" ? [selection.id] : [], [selection]);
  const base = { openAttemptId: snapshot.openAttemptId, widgetInstanceId: lifecycle.widgetInstanceId, appSessionNonce };
  const callApi = (action, args = {}) => bridge.callServerTool("agent_context_map_widget_api", { ...base, action, ...args });

  async function refreshProposals() {
    const result = await callApi("list_proposals", { documentId });
    if (result?.isError) throw new Error(result.structuredContent?.error?.message || "无法读取待采纳建议");
    setProposals(result.structuredContent.data.proposals || []);
  }

  useEffect(() => { void refreshProposals().catch((error) => setStatus(error.message)); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function acceptProposal(proposal) {
    const prepared = await callApi("prepare_commit", { proposalId: proposal.proposalId, expectedRevision: proposal.baseRevision });
    if (prepared?.isError) throw new Error(prepared.structuredContent?.error?.message || "建议预览已失效");
    const data = prepared.structuredContent.data;
    const operationCount = proposal.normalizedOperations?.length || 0;
    if (!window.confirm(`确认把此 pending proposal 写入正式项目文件？\n${operationCount} 个增量操作；base ${String(proposal.baseRevision || "create").slice(0, 12)}`)) return;
    const committed = await bridge.callServerTool("commit_acm_proposal", {
      ...base, proposalId: proposal.proposalId, expectedRevision: proposal.baseRevision,
      previewDigest: data.previewDigest, userGestureNonce: data.userGestureNonce,
    });
    if (committed?.isError) throw new Error(committed.structuredContent?.error?.message || "提交失败");
    setRevision(committed.structuredContent.data.newRevision);
    setStatus("proposal 已原子写入；请重新打开 Widget 以加载正式文件最新状态。");
    await refreshProposals();
  }

  async function commitManualEdit() {
    const document = platform.widgetApi.getWorkingDocument(documentId);
    const clientMutationId = crypto.randomUUID();
    const prepared = await callApi("prepare_manual_commit", { documentId, expectedRevision: revision, clientMutationId, document });
    if (prepared?.isError) throw new Error(prepared.structuredContent?.error?.message || "人工编辑预览失败");
    const data = prepared.structuredContent.data;
    if (!window.confirm("确认把当前 Widget 人工编辑写入正式项目文件？删除或覆盖内容已包含在本次 Diff 预览中。")) return;
    const committed = await bridge.callServerTool("commit_manual_edit", {
      ...base, documentId, expectedRevision: revision, clientMutationId, document,
      previewDigest: data.previewDigest, userGestureNonce: data.userGestureNonce,
    });
    if (committed?.isError) throw new Error(committed.structuredContent?.error?.message || "人工编辑提交失败");
    setRevision(committed.structuredContent.data.newRevision);
    setStatus("人工编辑已原子写入正式项目文件。");
  }

  async function previewSend(mode) {
    if (!selectedNodeIds.length) throw new Error("请先在画布中显式选择一个节点。");
    const result = await callApi("preview_send", { documentId, expectedRevision: revision, mode, selectedNodeIds, includeContains: false, userNote: "" });
    if (result?.isError) throw new Error(result.structuredContent?.error?.message || "发送预览失败");
    setSendPreview(result.structuredContent.data);
    setStatus("服务器已重建发送正文；仍未发送。请核对预览后再次点击确认。");
  }

  async function confirmSend() {
    const authorized = await callApi("authorize_send", { documentId, expectedRevision: revision, mode: sendPreview.mode, selectedNodeIds: sendPreview.selectedNodeIds, includeContains: false, userNote: "", previewDigest: sendPreview.previewDigest });
    if (authorized?.isError) throw new Error(authorized.structuredContent?.error?.message || "发送授权失败");
    const gesture = authorized.structuredContent.data;
    const sent = await bridge.callServerTool("send_acm_context", {
      ...base, mode: sendPreview.mode, documentId, expectedRevision: revision,
      selectedNodeIds: sendPreview.selectedNodeIds, includeContains: false, userNote: "",
      previewDigest: sendPreview.previewDigest, userGestureNonce: gesture.userGestureNonce,
    });
    if (sent?.isError) throw new Error(sent.structuredContent?.error?.message || "发送校验失败");
    await bridge.sendMessage(sent.structuredContent.data.message);
    setSendPreview(null);
    setStatus("已把经服务器重建和 digest 校验的正文发送到当前任务。");
  }

  const run = (work) => void work().catch((error) => setStatus(error.message));
  return (
    <aside className="acm-phase6-controls" aria-label="Phase 6 proposal and send controls">
      <div className="acm-phase6-row"><strong>安全操作</strong><span>{status}</span></div>
      <div className="acm-phase6-row">
        <button style={button} onClick={() => run(refreshProposals)}>刷新待采纳 ({proposals.length})</button>
        {proposals[0] && <button style={primary} onClick={() => run(() => acceptProposal(proposals[0]))}>预览并采纳首条</button>}
        <button style={button} onClick={() => run(commitManualEdit)}>提交人工编辑</button>
        <button style={button} onClick={() => run(() => previewSend("selected_context"))}>发送选中</button>
        <button style={button} onClick={() => run(() => previewSend("related_subgraph"))}>发送相关</button>
        <button style={button} onClick={() => run(() => previewSend("execution_prompt"))}>生成执行提示</button>
      </div>
      {sendPreview && <div className="acm-phase6-preview">
        <div><b>最终发送预览</b> · {sendPreview.nodeCount} nodes / {sendPreview.edgeCount} edges · digest {sendPreview.previewDigest.slice(0, 12)}</div>
        <pre>{sendPreview.message}</pre>
        <div className="acm-phase6-row"><button style={primary} onClick={() => run(confirmSend)}>确认并发送</button><button style={button} onClick={() => setSendPreview(null)}>取消</button></div>
      </div>}
    </aside>
  );
}
