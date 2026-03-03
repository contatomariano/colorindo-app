import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const PIPELINE_STEPS = [
  { key: "avatar_gen", label: "Personagem", icon: "fa-face-smile", desc: "IA" },
  { key: "avatar_approve", label: "Aprovação 1", icon: "fa-check-double", desc: "Ação" },
  { key: "cover_gen", label: "Capa do Livro", icon: "fa-book-open", desc: "IA" },
  { key: "cover_approve", label: "Aprovação 2", icon: "fa-signature", desc: "Ação" },
  { key: "scenes_gen", label: "Cenas do Livro", icon: "fa-images", desc: "IA" },
  { key: "upscale", label: "Alta Resolução", icon: "fa-wand-magic-sparkles", desc: "IA" },
  { key: "pdf_convert", label: "Conversão", icon: "fa-file-export", desc: "Sistema" },
  { key: "pdf_gen", label: "Conclusão", icon: "fa-file-pdf", desc: "Final" },
];

const SCENE_COLORS = [
  "linear-gradient(135deg, #dbeafe, #ede9fe)",
  "linear-gradient(135deg, #d1fae5, #a7f3d0)",
  "linear-gradient(135deg, #fce7f3, #fbcfe8)",
  "linear-gradient(135deg, #fef3c7, #fde68a)",
];

export default function PedidoDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [themeConfig, setThemeConfig] = useState(null);
  const [startingPhase2, setStartingPhase2] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    if (!id) return;

    // Carga inicial
    supabase
      .from("orders")
      .select("*, projects(id, name)")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setOrder(data);
        setLoading(false);
      });

    // Escuta em tempo real usando WebSockets
    const subscription = supabase
      .channel(`order-detail-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          console.log("Realtime Order Update:", payload.new);
          setOrder((prev) => ({ ...prev, ...payload.new }));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [id]);

  // Polling automático para jobs lentos da Kie.ai
  useEffect(() => {
    if (
      !order ||
      (order.status !== "processing" &&
        order.status !== "awaiting_avatar" &&
        order.status !== "awaiting_cover") ||
      !order.error_message?.startsWith("taskId:")
    )
      return;

    const taskId = order.error_message.split(":")[1];
    console.log(`[POLLING FRONTEND] Iniciado para taskId: ${taskId}`);

    const interval = setInterval(async () => {
      try {
        // Envia dica de contexto pro backend não se perder em concorrência
        const checkType =
          order.error_message === "taskId:multi"
            ? "multi"
            : order.error_message === "taskId:scenes"
              ? "scenes"
              : order.error_message === "taskId:upscale"
                ? "upscale"
                : order.error_message === "taskId:pdf_convert"
                  ? "pdf"
                  : !order.character_url
                    ? "avatar"
                    : !order.cover_url
                      ? "cover"
                      : undefined;

        const { data } = await supabase.functions.invoke("generate-book", {
          body: { record: order, action: "check-job", taskId, checkType },
        });

        // Ponto chave: A engine "scenes" salva progresso parcial a cada ping (pending: true tb)
        if (data?.success) {
          // Força o re-fetch do banco para pegar atualizações parciais (ex: cenas pipocando)
          const { data: freshOrder } = await supabase
            .from("orders")
            .select("*, projects(name), themes(name, cover_prompt)")
            .eq("id", order.id)
            .single();

          if (freshOrder) {
            setOrder(freshOrder);
          }

          // Se o job INTEIRO acabou, encerra o loop
          if (!data.pending) {
            console.log("[POLLING FRONTEND] Job finalizado com sucesso!");
            clearInterval(interval);
          }
        }
      } catch (e) {
        console.warn("[POLLING FRONTEND] Erro ao checar status:", e.message);
      }
    }, 12000); // Checa a cada 12 segundos

    return () => clearInterval(interval);
  }, [order?.status, order?.error_message]);

  // Polling DEDICADO à Capa: monitora cover_task_id independente do error_message
  // Isso resolve o bug de corrida (race condition) onde 'scenes' sobrescrevia o taskId da capa.
  useEffect(() => {
    if (!order || !order.cover_task_id || order.cover_url) return;

    console.log(`[POLLING CAPA] Iniciado para cover_task_id: ${order.cover_task_id}`);

    const coverInterval = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke("generate-book", {
          body: { record: order, action: "check-job", taskId: order.cover_task_id, checkType: "cover" },
        });

        if (data?.success && !data.pending) {
          console.log("[POLLING CAPA] Capa pronta! Atualizando ordem...");
          clearInterval(coverInterval);

          // Re-fetch para garantir que cover_url e status estão atualizados
          const { data: freshOrder } = await supabase
            .from("orders")
            .select("*, projects(name), themes(name, cover_prompt)")
            .eq("id", order.id)
            .single();

          if (freshOrder) setOrder(freshOrder);
        }
      } catch (e) {
        console.warn("[POLLING CAPA] Erro ao checar status da capa:", e.message);
      }
    }, 15000); // Checa a cada 15 segundos

    return () => clearInterval(coverInterval);
  }, [order?.cover_task_id, order?.cover_url]);

  async function handleReprocess() {
    if (!order) return;

    // Mostra um estado de carregamento local otimista
    setOrder((prev) => ({
      ...prev,
      status: "processing",
      character_url: null,
      scenes_done: 0,
      error_message: "Reiniciando engine...",
    }));

    // Atualiza base
    await supabase
      .from("orders")
      .update({
        status: "processing",
        character_url: null,
        scenes_done: 0,
        error_message: "Reiniciando engine...",
      })
      .eq("id", id);

    // Dispara ativamente a Edge Function para o Avatar
    try {
      const { data, error } = await supabase.functions.invoke("generate-book", {
        body: { record: order, action: "avatar" },
      });
      if (error) console.error("Falha ao reprocessar avatar:", error);
    } catch (err) {
      console.error("Erro invocando generate-book no reprocess:", err);
    }
  }

  async function handleDownload(imageUrl) {
    if (!imageUrl) return;
    try {
      // Forçar o download contornando CORS se o servidor permitir origins
      const response = await fetch(imageUrl, {
        mode: 'cors',
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      // Nome do arquivo baseado no projeto e id
      const orderShortId = id.split("-")[0].toUpperCase();
      const fileName = `colorindo_${orderShortId}_${new Date().getTime()}.png`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erro ao baixar imagem via Blob:", err);
      // Fallback: abrir em nova aba para o usuário salvar manualmente
      window.open(imageUrl, "_blank");
    }
  }

  async function handleReprocessCover() {
    if (!order) return;

    setOrder((prev) => ({
      ...prev,
      cover_url: null,
      cover_approved: false
    }));

    await supabase
      .from("orders")
      .update({
        cover_url: null,
        cover_approved: false
      })
      .eq("id", id);

    try {
      const { data, error } = await supabase.functions.invoke("generate-book", {
        body: { record: order, action: "cover" },
      });
      if (error) console.error("Falha ao reprocessar capa:", error);
    } catch (err) {
      console.error("Erro invocando generate-book na capa:", err);
    }
  }

  async function handleReprocessScenes() {
    if (!order) return;
    if (!window.confirm("Deseja reenviar a solicitação de geração das cenas?")) return;

    setOrder((prev) => ({
      ...prev,
      status: "processing",
      scenes_done: 0,
      error_message: "Reiniciando geração de cenas...",
    }));

    await supabase
      .from("orders")
      .update({
        status: "processing",
        scenes_done: 0,
        error_message: "Reiniciando geração de cenas...",
      })
      .eq("id", id);

    try {
      const { data, error } = await supabase.functions.invoke("generate-book", {
        body: { record: order, action: "scenes" },
      });
      if (error) console.error("Falha ao reprocessar cenas:", error);
    } catch (err) {
      console.error("Erro invocando generate-book no reprocess cenas:", err);
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        "Tem certeza que deseja DELETAR este pedido permanentemente? A ação não pode ser desfeita.",
      )
    )
      return;
    try {
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) throw error;
      navigate("/pedidos"); // Voltar de forma nativa e rápida pra grid
    } catch (error) {
      console.error(error);
      alert("Falha ao excluir pedido: " + error.message);
    }
  }

  async function handlePause() {
    if (
      !window.confirm(
        "Pausar status do Pedido? A engine vai abortar a próxima imagem da fila.",
      )
    )
      return;
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "paused" })
        .eq("id", id);
      if (error) throw error;
      setOrder((prev) => ({ ...prev, status: "paused" }));
    } catch (error) {
      console.error(error);
      alert("Falha ao pausar pedido.");
    }
  }

  const handleApproveAvatar = async () => {
    setStartingPhase2(true);
    try {
      console.log("Aprovado! Mudando UI e Iniciando Fase 2 (Capa + Cenas)...");

      await supabase
        .from("orders")
        .update({
          status: "processing",
          error_message: "Fase 2: Iniciando Capa e Cenas...",
          cover_approved: false
        })
        .eq("id", order.id);

      setOrder((prev) => ({
        ...prev,
        status: "processing",
        cover_approved: false
      }));

      const { error: invokeErr } = await supabase.functions.invoke(
        "generate-book",
        {
          body: { record: order, action: "phase2-start" },
        },
      );

      const isTransient =
        invokeErr?.message?.toLowerCase().includes("timeout") ||
        invokeErr?.message?.toLowerCase().includes("fetch") ||
        invokeErr?.message?.toLowerCase().includes("request");

      if (invokeErr && !isTransient) {
        console.error("ERRO INVOKE COVER:", invokeErr);
        throw invokeErr;
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao disparar geração de capa!");
    }
    setStartingPhase2(false);
  };

  const handleApproveCover = async () => {
    setStartingPhase2(true);
    try {
      console.log("Capa Aprovada! Definindo flag e retomando UI...");

      // Mantém o status como 'processing' para o UI continuar se desenrolando,
      // já que a engine de cenas continua em paralelo.
      await supabase
        .from("orders")
        .update({
          cover_approved: true,
          status: order.status === "awaiting_cover" ? "processing" : order.status
        })
        .eq("id", order.id);

      setOrder((prev) => ({
        ...prev,
        cover_approved: true,
        status: prev.status === "awaiting_cover" ? "processing" : prev.status
      }));

    } catch (e) {
      console.error(e);
      alert("Erro ao aprovar capa!");
    }
    setStartingPhase2(false);
  };

  const handleApproveFinal = async () => {
    try {
      await supabase
        .from("orders")
        .update({ status: "completed" })
        .eq("id", order.id);
      setOrder((prev) => ({ ...prev, status: "completed" }));
    } catch (e) {
      console.error(e);
      alert("Erro ao finalizar pedido");
    }
  };

  if (loading)
    return (
      <div style={{ textAlign: "center", padding: 80 }}>
        <i
          className="fa-solid fa-circle-notch fa-spin"
          style={{ fontSize: 28 }}
        ></i>
      </div>
    );
  if (!order) return <div style={{ padding: 40 }}>Pedido não encontrado.</div>;

  const pct =
    order.pdf_url
      ? 100
      : order.status === "processing" && order.error_message === "taskId:pdf_convert"
        ? 95
        : order.status === "processing" && order.error_message === "taskId:upscale"
          ? Math.round(70 + (order.upscale_done / (order.scenes_total + 1)) * 25)
          : order.scenes_total > 0
            ? Math.round((order.scenes_done / order.scenes_total) * 70)
            : 0;
  const isDone = ["completed", "delivered"].includes(order.status) || (order.scenes_pdf_url && order.cover_pdf_url);
  const isError = order.status === "error";
  const isQueued = order.status === "queued";
  const isProc = order.status === "processing";
  const isAwaitingAvatar = order.status === "awaiting_avatar";
  const isAwaitingCover = !!(order.cover_url && !order.cover_approved);
  const isReview = order.status === "review";

  const statusBg = isError
    ? "rgba(239,68,68,0.08)"
    : isDone
      ? "rgba(16,185,129,0.08)"
      : "rgba(99,102,241,0.08)";
  const statusBorder = isError
    ? "rgba(239,68,68,0.2)"
    : isDone
      ? "rgba(16,185,129,0.2)"
      : "rgba(99,102,241,0.2)";
  const statusColor = isError
    ? "var(--accent-error)"
    : isDone
      ? "var(--accent-4)"
      : "var(--accent-1)";
  const statusIcon = isError
    ? "fa-triangle-exclamation"
    : isDone
      ? "fa-circle-check"
      : isReview
        ? "fa-eye"
        : "fa-spinner fa-spin";

  // Calcula texto dinâmico superior
  let statusText = order.status;
  let statusLabel = order.status;
  if (isError) {
    statusText = "Erro na Geração";
    statusLabel = "Erro";
  } else if (isDone) {
    statusText = "PDF Entregue";
    statusLabel = "Concluído";
  } else if (isReview) {
    statusLabel = "Revisão Final";
    statusText = "Lote Concluído";
  } else if (isAwaitingAvatar) {
    statusLabel = "Aprovação 1/2";
    statusText = "Aprovação de Personagem Pendente";
  } else if (isAwaitingCover) {
    statusLabel = "Aprovação 2/2";
    statusText = "Aprovação de Capa Pendente";
  } else if (isQueued) {
    statusLabel = "Fila";
    statusText = "Iniciando Motor de IA...";
  } else if (isProc) {
    statusLabel = "Processando";
    statusText = order.error_message === "taskId:pdf_convert"
      ? "IA: Convertendo para PDF (PDF.co)..."
      : order.error_message === "taskId:upscale"
        ? "IA: Aplicando Alta Resolução (Upscale)..."
        : order.character_url
          ? "Criando Capa ou Cenas..."
          : "Criando Personagem (Face)...";
  }

  const getStepStatus = (stepIdx) => {
    const hasChar = !!order.character_url;
    const hasCover = !!order.cover_url;

    switch (stepIdx) {
      case 0: // IA: Criar Personagem
        if (isQueued || (isProc && !hasChar)) return "active";
        if (hasChar) return "done";
        return "pending";
      case 1: // Ação: Aprovar Personagem
        if (isAwaitingAvatar) return "active";
        if (hasChar && !isAwaitingAvatar && !isQueued && !(isProc && !hasChar))
          return "done";
        return "pending";
      case 2: // IA: Criar Capa
        if (isProc && hasChar && !hasCover && !isAwaitingAvatar)
          return "active";
        if (hasCover) return "done";
        return "pending";
      case 3: // Ação: Aprovar Capa
        if (isAwaitingCover) return "active";
        if (
          hasCover &&
          !isAwaitingCover &&
          !isAwaitingAvatar &&
          (isReview || isDone || (isProc && hasCover))
        )
          return "done";
        return "pending";
      case 4: // IA: Páginas do Livro
        if (isProc && hasCover && !isAwaitingCover && !isAwaitingAvatar && order.error_message !== "taskId:upscale")
          return "active";
        if (order.scenes_done >= (order.scenes_total || 7) || order.upscale_done > 0 || isReview || isDone) return "done";
        return "pending";
      case 5: // IA: Upscale
        if (isProc && order.error_message === "taskId:upscale") return "active";
        if (order.upscale_done >= (order.scenes_total + 1) || order.pdf_url || isReview || isDone) return "done";
        return "pending";
      case 6: // IA: Conversão PDF
        if (isProc && order.error_message === "taskId:pdf_convert") return "active";
        if (order.pdf_url || isReview || isDone) return "done";
        return "pending";
      case 7: // Final: Montagem
        if (isReview) return "active";
        if (isDone) return "done";
        return "pending";
      default:
        return "pending";
    }
  };

  const fmt = (iso) => (iso ? new Date(iso).toLocaleString("pt-BR") : "—");

  return (
    <>
      <div className="header" style={{ maxWidth: 1000, margin: "0 auto 32px auto" }}>
        <div>
          <Link
            to="/pedidos"
            style={{
              color: "var(--text-secondary)",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 8,
              textDecoration: "none",
            }}
          >
            <i className="fa-solid fa-arrow-left"></i> Voltar para Pedidos
          </Link>
          <h1>Detalhes do Pedido #{order.id.split("-")[0].toUpperCase()}</h1>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {/* Botão de Pausa só aparece se estiver em processamento / queued / waiting */}
          {["queued", "processing", "awaiting_avatar"].includes(
            order.status,
          ) && (
              <button
                className="btn"
                onClick={handlePause}
                style={{
                  border: "1px solid #fef08a",
                  background: "rgba(234,179,8,0.1)",
                  color: "#ca8a04",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 18px",
                  borderRadius: 10,
                }}
              >
                <i className="fa-solid fa-circle-pause"></i> Pausar
              </button>
            )}

          <Link
            to={`/pedidos/${id}/log`}
            className="btn"
            style={{
              border: "1px solid var(--glass-border)",
              background: "transparent",
              display: "flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
              color: "var(--text-primary)",
              padding: "10px 18px",
              borderRadius: 10,
            }}
          >
            <i className="fa-solid fa-list"></i> Ver Log
          </Link>
          <button className="btn btn-primary" onClick={handleReprocess}>
            <i className="fa-solid fa-rotate-right"></i> Reprocessar
          </button>
          <button
            className="btn"
            onClick={handleDelete}
            title="Excluir Definitivamente"
            style={{
              border: "1px solid #fecaca",
              background: "transparent",
              color: "var(--accent-error)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              borderRadius: 10,
            }}
          >
            <i className="fa-regular fa-trash-can"></i>
          </button>
        </div>
      </div>

      <div
        style={{
          maxWidth: 1000,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {/* Status Banner — oculto quando concluído */}
        {!isDone && <div
          style={{
            background: statusBg,
            border: `1px solid ${statusBorder}`,
            borderRadius: 12,
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: statusBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `1px solid ${statusBorder}`,
              }}
            >
              <i
                className={`fa-solid ${statusIcon}`}
                style={{ color: statusColor }}
              ></i>
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{statusText}</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                {isError
                  ? order.error_message || "Verifique o log para mais detalhes"
                  : isDone
                    ? "Arquivo pronto para download"
                    : "Pipeline em execução"}
              </div>
            </div>
          </div>
          <span
            style={{
              padding: "6px 12px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              background: statusBg,
              color: statusColor,
              border: `1px solid ${statusBorder}`,
            }}
          >
            {statusLabel}
          </span>
        </div>}

        {/* BLOCOS DE APROVAÇÃO COMPARATIVA */}
        {isAwaitingAvatar && (
          <div
            className="glass"
            style={{
              padding: 24,
              border: "2px solid var(--accent-1)",
              background: "rgba(99,102,241,0.03)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 18,
                  color: "var(--accent-1)",
                }}
              >
                <i
                  className="fa-solid fa-wand-magic-sparkles"
                  style={{ marginRight: 10 }}
                ></i>
                Aprovação de Personagem
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  className="btn"
                  style={{
                    background: "white",
                    color: "var(--text-secondary)",
                  }}
                  onClick={() => handleReprocess()}
                >
                  Refazer
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleApproveAvatar}
                  disabled={startingPhase2}
                >
                  {startingPhase2 ? (
                    <i className="fa-solid fa-spinner fa-spin"></i>
                  ) : (
                    "Aprovado! Iniciar Livro"
                  )}
                </button>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: 24,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <img
                  src={order.child_photo_url}
                  style={{
                    width: 260,
                    height: 260,
                    borderRadius: 20,
                    objectFit: "cover",
                    border: "4px solid white",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                  }}
                />
                <div
                  style={{
                    marginTop: 12,
                    fontWeight: 600,
                    fontSize: 13,
                    color: "var(--text-secondary)",
                  }}
                >
                  FOTO ORIGINAL
                </div>
              </div>
              <i
                className="fa-solid fa-chevron-right"
                style={{ fontSize: 24, color: "var(--accent-1)", opacity: 0.5 }}
              ></i>
              <div style={{ textAlign: "center" }}>
                <img
                  src={order.character_url}
                  style={{
                    width: 260,
                    height: 260,
                    borderRadius: 20,
                    objectFit: "cover",
                    border: "4px solid var(--accent-1)",
                    boxShadow: "0 8px 24px rgba(99,102,241,0.2)",
                  }}
                />
                <div
                  style={{
                    marginTop: 12,
                    fontWeight: 700,
                    fontSize: 13,
                    color: "var(--accent-1)",
                  }}
                >
                  PERSONAGEM IA (NANOBANANA)
                </div>
              </div>
            </div>
          </div>
        )}

        {isAwaitingCover && (
          <div
            className="glass"
            style={{
              padding: 24,
              border: "2px solid var(--accent-2)",
              background: "rgba(236,72,153,0.03)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 18,
                  color: "var(--accent-2)",
                }}
              >
                <i
                  className="fa-solid fa-book-open"
                  style={{ marginRight: 10 }}
                ></i>
                Aprovação da Capa
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  className="btn"
                  style={{
                    background: "white",
                    color: "var(--text-secondary)",
                  }}
                  onClick={() => handleReprocessCover()}
                >
                  Refazer
                </button>
                <button
                  className="btn btn-primary"
                  style={{ background: "var(--accent-2)", border: "none" }}
                  onClick={handleApproveCover}
                  disabled={startingPhase2}
                >
                  {startingPhase2 ? (
                    <i className="fa-solid fa-spinner fa-spin"></i>
                  ) : (
                    "Capa Linda! Aprovar"
                  )}
                </button>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: 24,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <img
                  src={order.child_photo_url}
                  style={{
                    width: 360,
                    height: 240,
                    borderRadius: 20,
                    objectFit: "cover",
                    border: "4px solid white",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                  }}
                />
                <div
                  style={{
                    marginTop: 12,
                    fontWeight: 600,
                    fontSize: 13,
                    color: "var(--text-secondary)",
                  }}
                >
                  FOTO ORIGINAL
                </div>
              </div>
              <i
                className="fa-solid fa-plus"
                style={{ fontSize: 24, color: "var(--accent-2)", opacity: 0.5 }}
              ></i>
              <div style={{ textAlign: "center" }}>
                <img
                  src={order.cover_url}
                  style={{
                    width: 360,
                    height: 240,
                    borderRadius: 20,
                    objectFit: "cover",
                    border: "4px solid var(--accent-2)",
                    boxShadow: "0 8px 24px rgba(236,72,153,0.2)",
                  }}
                />
                <div
                  style={{
                    marginTop: 12,
                    fontWeight: 700,
                    fontSize: 13,
                    color: "var(--accent-2)",
                  }}
                >
                  CAPA FINAL IA
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BLOCOS DE REVISÃO FINAL */}
        {(isReview || isDone) && (
          <div
            className="glass"
            style={{
              padding: 24,
              border: "2px solid var(--accent-4)",
              background: "rgba(16,185,129,0.03)",
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 18,
                  color: "var(--accent-4)",
                }}
              >
                <i
                  className="fa-solid fa-circle-check"
                  style={{ marginRight: 10 }}
                ></i>
                {isDone ? "Livro Concluído!" : "Livro Pronto para Entrega!"}
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {order.cover_pdf_url && (
                  <a
                    href={order.cover_pdf_url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn"
                    style={{
                      background: "white",
                      color: "var(--text-secondary)",
                      textDecoration: "none",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <i className="fa-solid fa-file-pdf" style={{ marginRight: 8 }}></i>
                    Baixar Capa
                  </a>
                )}
                {order.scenes_pdf_url && (
                  <a
                    href={order.scenes_pdf_url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn"
                    style={{
                      background: "white",
                      color: "var(--text-secondary)",
                      textDecoration: "none",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <i className="fa-solid fa-file-pdf" style={{ marginRight: 8 }}></i>
                    Baixar Miolo
                  </a>
                )}
                {order.scenes_pdf_url && (
                  <button
                    className="btn"
                    style={{
                      background: "rgba(99,102,241,0.1)",
                      color: "var(--accent-1)",
                      border: "1px solid var(--accent-1)",
                    }}
                    onClick={() => window.open(order.scenes_pdf_url, "_blank")}
                  >
                    <i className="fa-solid fa-book-open" style={{ marginRight: 8 }}></i>
                    Visualizar Miolo
                  </button>
                )}
                {isReview && (
                  <button
                    className="btn btn-primary"
                    style={{ background: "var(--accent-4)", border: "none" }}
                    onClick={handleApproveFinal}
                  >
                    <i className="fa-solid fa-check" style={{ marginRight: 8 }}></i>
                    Confirmar e Concluir Pedido
                  </button>
                )}
              </div>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              {isDone ? (
                <span>O livro foi concluído e os PDFs estão disponíveis para download.</span>
              ) : (
                <span>
                  O livro foi gerado com sucesso e o PDF consolidado está pronto. Ao
                  clicar em <strong>Concluir</strong>, o pedido será finalizado.
                </span>
              )}
            </div>
          </div>
        )}

        {/* Info do Pedido */}
        <div
          className="glass"
          style={{
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 10,
              borderBottom: "1px solid var(--glass-border)",
              paddingBottom: 12,
            }}
          >
            <i
              className="fa-solid fa-receipt"
              style={{ color: "var(--accent-1)" }}
            ></i>{" "}
            Informações Básicas
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 16,
            }}
          >
            <InfoItem
              label="ID"
              value={`#${order.id.split("-")[0].toUpperCase()}`}
              mono
              accent2
            />
            <InfoItem
              label="Criança"
              value={`${order.child_name || "—"} (${order.child_age || "?"}a)`}
            />
            <InfoItem
              label="Projeto"
              value={order.projects?.name || "Avulso"}
              icon="fa-folder"
            />
            <InfoItem
              label="Tema / Estilo"
              value={order.theme || "—"}
              icon="fa-palette"
              accent1
            />
            <InfoItem
              label="Páginas Internas"
              value={`${order.scenes_done ?? 0} / ${order.scenes_total ?? 0}`}
            />
            <InfoItem label="Criado em" value={fmt(order.created_at)} />
          </div>
        </div>

        {/* Progresso do Pipeline */}
        <div
          className="glass"
          style={{
            padding: "24px 32px",
            display: "flex",
            flexDirection: "column",
            gap: 24,
            borderRadius: 20,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 600, display: "flex", alignItems: "center", gap: 10 }}>
              <i className="fa-solid fa-diagram-project" style={{ color: "var(--accent-5)" }}></i>
              Status da Geração
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--accent-1)" }}>
              {pct}% Concluído
            </div>
          </div>

          {/* Linha do Tempo Horizontal */}
          <div style={{ position: "relative", display: "flex", justifyContent: "space-between", margin: "10px 0" }}>

            {/* Barra de Fundo */}
            <div style={{
              position: "absolute",
              top: 20,
              left: 40,
              right: 40,
              height: 4,
              background: "rgba(0,0,0,0.06)",
              borderRadius: 2,
              zIndex: 1
            }}></div>

            {/* Barra de Progresso Fill */}
            <div style={{
              position: "absolute",
              top: 20,
              left: 40,
              width: `calc((100% - 80px) * ${pct / 100})`,
              height: 4,
              background: isError ? "var(--accent-error)" : "linear-gradient(90deg, var(--accent-1), var(--accent-4))",
              borderRadius: 2,
              zIndex: 2,
              transition: "width 0.5s ease-in-out"
            }}></div>

            {/* Nós da Linha do Tempo */}
            {PIPELINE_STEPS.map((step, idx) => {
              const st = getStepStatus(idx);
              const isDoneStep = st === "done";
              const isActiveStep = st === "active";
              const isErrorStep = st === "error";

              let bgColor = "white";
              let iconColor = "#cbd5e1";

              if (isDoneStep) {
                bgColor = "var(--accent-4)";
                iconColor = "white";
              } else if (isActiveStep) {
                bgColor = "var(--accent-1)";
                iconColor = "white";
              } else if (isErrorStep) {
                bgColor = "var(--accent-error)";
                iconColor = "white";
              }

              let dynamicDesc = step.desc;
              if (isActiveStep) {
                if (idx === 4) dynamicDesc = `(${order.scenes_done || 0}/${order.scenes_total})`;
                if (idx === 5) dynamicDesc = `(${order.upscale_done || 0}/${(order.scenes_total || 7) + 1})`;
              }

              return (
                <div key={step.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, zIndex: 3, width: 80 }}>
                  {/* Círculo do Ícone */}
                  <div style={{
                    width: 44,
                    height: 44,
                    minWidth: 44,
                    borderRadius: "50%",
                    background: bgColor,
                    border: `3px solid ${isActiveStep ? "rgba(99,102,241,0.3)" : isDoneStep ? "white" : "white"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: isActiveStep ? "0 0 0 4px rgba(99,102,241,0.15)" : "0 2px 5px rgba(0,0,0,0.05)",
                    transition: "all 0.3s"
                  }}>
                    <i className={`fa-solid ${step.icon} ${isActiveStep ? 'fa-fade' : ''}`} style={{ color: iconColor, fontSize: 16 }}></i>
                  </div>

                  {/* Textos */}
                  <div style={{ textAlign: "center" }}>
                    <div style={{
                      fontSize: 12,
                      fontWeight: isActiveStep ? 700 : 600,
                      color: isActiveStep ? "var(--text-primary)" : isDoneStep ? "var(--text-primary)" : "var(--text-secondary)",
                      lineHeight: 1.2
                    }}>
                      {step.label}
                    </div>
                    <div style={{
                      fontSize: 10,
                      color: isErrorStep ? "var(--accent-error)" : isActiveStep ? "var(--accent-1)" : "var(--text-secondary)",
                      marginTop: 2,
                      fontWeight: isActiveStep ? 600 : 400
                    }}>
                      {isErrorStep ? "Erro" : isActiveStep ? "Processando..." : dynamicDesc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Imagens Geradas */}
        {(order.scenes_done > 0 ||
          (order.pages_data && order.pages_data.length > 0)) && (
            <div
              className="glass"
              style={{
                padding: 24,
                display: "flex",
                flexDirection: "column",
                gap: 20,
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  borderBottom: "1px solid var(--glass-border)",
                  paddingBottom: 12,
                }}
              >
                <i
                  className="fa-solid fa-images"
                  style={{ color: "var(--accent-2)" }}
                ></i>{" "}
                Imagens Geradas ({order.scenes_done} de {order.scenes_total})
                {order.status === 'review' && order.scenes_done < (order.scenes_total || 7) && (
                  <button
                    onClick={handleReprocessScenes}
                    className="btn-glass"
                    style={{
                      marginLeft: 'auto',
                      padding: '4px 12px',
                      fontSize: '12px',
                      background: 'var(--accent-2)',
                      color: 'white',
                      borderRadius: '20px',
                      cursor: 'pointer'
                    }}
                  >
                    <i className="fa-solid fa-rotate"></i> Refazer Cenas
                  </button>
                )}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 12,
                }}
              >
                {/* Bloco da Capa */}
                {order.cover_url ? (
                  <div
                    style={{
                      aspectRatio: "3/2",
                      borderRadius: 12,
                      overflow: "hidden",
                      border: "2px solid var(--accent-1)",
                      position: "relative",
                    }}
                  >
                    <img
                      src={order.cover_url}
                      alt="Capa"
                      onClick={() => setSelectedImage(order.cover_url)}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        cursor: "pointer",
                        transition: "transform 0.3s",
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                      onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
                    />
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background:
                          "linear-gradient(transparent, rgba(0,0,0,0.8))",
                        color: "white",
                        padding: "16px 8px 8px",
                        fontSize: "11px",
                        textAlign: "center",
                        fontWeight: 600,
                      }}
                    >
                      Capa Oficial
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      aspectRatio: "3/2",
                      borderRadius: 12,
                      background: SCENE_COLORS[0],
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      fontWeight: 600,
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    Capa (IA Trabalhando...)
                  </div>
                )}

                {/* Blocos do Miolo */}
                {Array.from({ length: order.scenes_total || 0 }).map((_, i) => {
                  const pageData = order.pages_data && order.pages_data[i];
                  const hasUrl = pageData && pageData.image_url;
                  return hasUrl ? (
                    <div
                      key={i + 1}
                      style={{
                        aspectRatio: "3/2",
                        borderRadius: 12,
                        overflow: "hidden",
                        border: "1px solid var(--glass-border)",
                        position: "relative",
                        boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
                      }}
                    >
                      <img
                        src={pageData.image_url}
                        alt={`Cena ${i + 1}`}
                        onClick={() => setSelectedImage(pageData.image_url)}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          cursor: "pointer",
                          transition: "transform 0.3s",
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                        onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
                      />
                      <div
                        style={{
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          right: 0,
                          background:
                            "linear-gradient(transparent, rgba(0,0,0,0.8))",
                          color: "white",
                          padding: "24px 8px 8px",
                          fontSize: "10px",
                          textAlign: "center",
                          lineHeight: 1.2,
                        }}
                      >
                        {pageData.text}
                      </div>
                    </div>
                  ) : (
                    <div
                      key={i + 1}
                      style={{
                        aspectRatio: "3/2",
                        borderRadius: 12,
                        background: SCENE_COLORS[(i + 1) % SCENE_COLORS.length],
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        fontWeight: 600,
                        border: "1px solid var(--glass-border)",
                      }}
                    >
                      Cena {i + 1}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
      </div>

      {/* Zoom Modal (Lightbox) */}
      {selectedImage && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 40,
            backdropFilter: "blur(5px)",
          }}
          onClick={() => setSelectedImage(null)}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "90%",
              maxHeight: "90%",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
              borderRadius: 20,
              overflow: "hidden",
              border: "4px solid white",
              background: "white",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              style={{
                position: "absolute",
                top: 20,
                right: 20,
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "white",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
                zIndex: 10,
              }}
              onClick={() => setSelectedImage(null)}
            >
              <i className="fa-solid fa-times" style={{ color: "#333", fontSize: 20 }}></i>
            </button>
            <button
              style={{
                position: "absolute",
                top: 20,
                right: 70,
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "white",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
                zIndex: 10,
              }}
              title="Baixar PNG"
              onClick={() => handleDownload(selectedImage)}
            >
              <i className="fa-solid fa-download" style={{ color: "var(--accent-1)", fontSize: 18 }}></i>
            </button>
            <img
              src={selectedImage}
              alt="Zoom"
              style={{
                display: "block",
                maxWidth: "100%",
                maxHeight: "85vh",
                objectFit: "contain",
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}

function InfoItem({ label, value, mono, accent1, accent2, accent4, icon }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-secondary)",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 15,
          fontWeight: 500,
          fontFamily: mono ? "monospace" : "Outfit",
          color: accent1
            ? "var(--accent-1)"
            : accent2
              ? "var(--accent-2)"
              : accent4
                ? "var(--accent-4)"
                : "var(--text-primary)",
        }}
      >
        {icon && (
          <i
            className={`fa-solid ${icon}`}
            style={{ marginRight: 4, fontSize: 12 }}
          ></i>
        )}
        {value}
      </span>
    </div>
  );
}
