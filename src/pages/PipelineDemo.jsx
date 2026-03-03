import React, { useState } from 'react';

const PIPELINE_STEPS = [
    { key: "avatar_gen", label: "Personagem", icon: "fa-face-smile", desc: "IA" },
    { key: "avatar_approve", label: "Aprovação 1", icon: "fa-check-double", desc: "Ação" },
    { key: "cover_gen", label: "Capa do Livro", icon: "fa-book-open", desc: "IA" },
    { key: "cover_approve", label: "Aprovação 2", icon: "fa-signature", desc: "Ação" },
    { key: "scenes_gen", label: "Cenas do Livro", icon: "fa-images", desc: "IA (0/7)" },
    { key: "upscale", label: "Alta Resolução", icon: "fa-wand-magic-sparkles", desc: "IA" },
    { key: "pdf_convert", label: "Conversão", icon: "fa-file-export", desc: "Sistema" },
    { key: "pdf_gen", label: "Conclusão", icon: "fa-file-pdf", desc: "Final" },
];

export default function PipelineDemo() {
    const [currentStep, setCurrentStep] = useState(4); // Simula que está na geração de cenas
    const pct = Math.round((currentStep / (PIPELINE_STEPS.length - 1)) * 100);

    return (
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 20px" }}>
            <div style={{ marginBottom: 30 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>
                    Layout Preview: Progresso Compacto
                </h1>
                <p style={{ color: "var(--text-secondary)", marginTop: 8 }}>
                    Uma nova proposta de design mais limpa e horizontal para o acompanhamento do Pipeline.
                </p>
            </div>

            {/* COMPONENTE PROPOSTO */}
            <div
                className="glass"
                style={{
                    padding: "24px 32px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 24,
                    borderRadius: 20,
                    border: "1px solid var(--glass-border)",
                    background: "rgba(255, 255, 255, 0.4)",
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
                        left: 20,
                        right: 20,
                        height: 4,
                        background: "rgba(0,0,0,0.06)",
                        borderRadius: 2,
                        zIndex: 1
                    }}></div>

                    {/* Barra de Progresso Fill */}
                    <div style={{
                        position: "absolute",
                        top: 20,
                        left: 20,
                        width: `calc(${pct}% - 20px)`,
                        height: 4,
                        background: "linear-gradient(90deg, var(--accent-1), var(--accent-4))",
                        borderRadius: 2,
                        zIndex: 2,
                        transition: "width 0.5s ease-in-out"
                    }}></div>

                    {/* Nós da Linha do Tempo */}
                    {PIPELINE_STEPS.map((step, idx) => {
                        const isDone = idx < currentStep;
                        const isActive = idx === currentStep;
                        const isPending = idx > currentStep;

                        let bgColor = "white";
                        let borderColor = "var(--glass-border)";
                        let iconColor = "#cbd5e1";

                        if (isDone) {
                            bgColor = "var(--accent-4)";
                            borderColor = "var(--accent-4)";
                            iconColor = "white";
                        } else if (isActive) {
                            bgColor = "var(--accent-1)";
                            borderColor = "var(--accent-1)";
                            iconColor = "white";
                        }

                        return (
                            <div key={step.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, zIndex: 3, width: 80 }}>
                                {/* Círculo do Ícone */}
                                <div style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: "50%",
                                    background: bgColor,
                                    border: `3px solid ${isActive ? "rgba(99,102,241,0.3)" : isDone ? "white" : "white"}`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    boxShadow: isActive ? "0 0 0 4px rgba(99,102,241,0.15)" : "0 2px 5px rgba(0,0,0,0.05)",
                                    transition: "all 0.3s"
                                }}>
                                    <i className={`fa-solid ${step.icon} ${isActive ? 'fa-fade' : ''}`} style={{ color: iconColor, fontSize: 16 }}></i>
                                </div>

                                {/* Textos */}
                                <div style={{ textAlign: "center" }}>
                                    <div style={{
                                        fontSize: 12,
                                        fontWeight: isActive ? 700 : 600,
                                        color: isActive ? "var(--text-primary)" : isDone ? "var(--text-primary)" : "var(--text-secondary)",
                                        lineHeight: 1.2
                                    }}>
                                        {step.label}
                                    </div>
                                    <div style={{
                                        fontSize: 10,
                                        color: isActive ? "var(--accent-1)" : "var(--text-secondary)",
                                        marginTop: 2,
                                        fontWeight: isActive ? 600 : 400
                                    }}>
                                        {isActive ? "Processando..." : step.desc}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Controles para Teste (Apenas nesta página) */}
            <div style={{ marginTop: 40, padding: 20, background: "rgba(0,0,0,0.02)", borderRadius: 12, border: "1px dashed var(--glass-border)" }}>
                <h3 style={{ fontSize: 14, marginBottom: 16, color: "var(--text-secondary)" }}>Testador Interativo</h3>
                <div style={{ display: "flex", gap: 10 }}>
                    <button className="btn" onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}>
                        <i className="fa-solid fa-arrow-left"></i> Voltar Passo
                    </button>
                    <button className="btn btn-primary" onClick={() => setCurrentStep(Math.min(PIPELINE_STEPS.length - 1, currentStep + 1))}>
                        Avançar Passo <i className="fa-solid fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        </div>
    );
}
