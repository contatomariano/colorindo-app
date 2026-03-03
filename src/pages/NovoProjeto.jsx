import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAccount } from '../context/AccountContext';

export default function NovoProjeto() {
    const navigate = useNavigate();
    const { selectedAccountId } = useAccount();
    const [loading, setLoading] = useState(false);
    const [csvFile, setCsvFile] = useState(null);
    const csvInputRef = useRef(null);
    const [form, setForm] = useState({
        name: '',
        client: '',
        description: '',
        status: 'active',
    });
    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const handleCsvDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) setCsvFile(file);
    };

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase.from('projects').insert([{
                name: form.name,
                description: form.description ? `${form.client ? `Cliente: ${form.client}. ` : ''}${form.description}` : form.client || null,
                status: form.status,
                account_id: selectedAccountId,
            }]);
            if (error) throw error;
            navigate('/projetos');
        } catch (err) {
            alert('Erro ao criar projeto: ' + err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <div className="header">
                <div>
                    <Link to="/projetos" style={{ color: 'var(--text-secondary)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, textDecoration: 'none' }}>
                        <i className="fa-solid fa-arrow-left"></i> Voltar para Projetos
                    </Link>
                    <h1>Criar Novo Projeto (Lote)</h1>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div style={{ maxWidth: 800, display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 100 }}>

                    {/* Detalhes do Projeto */}
                    <div className="glass" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div style={{ fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--glass-border)', paddingBottom: 12 }}>
                            <i className="fa-solid fa-folder-plus" style={{ color: 'var(--accent-1)' }}></i> Detalhes do Projeto
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                            <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <label style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>Nome do Projeto</label>
                                <input required className="form-input" style={{ width: '100%', background: '#e2e8f0', border: '1px solid transparent' }} placeholder="Ex: Escola Estadual Machado de Assis - Turmas 2026" value={form.name} onChange={e => set('name', e.target.value)} />
                            </div>
                            <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <label style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>Cliente / Patrocinador</label>
                                <input className="form-input" style={{ width: '100%', background: '#e2e8f0', border: '1px solid transparent' }} placeholder="Ex: Prefeitura de São Paulo" value={form.client} onChange={e => set('client', e.target.value)} />
                            </div>
                            <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <label style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>Descrição <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>(Opcional)</span></label>
                                <textarea className="form-input" style={{ width: '100%', background: '#e2e8f0', border: '1px solid transparent', height: 90, resize: 'vertical' }} placeholder="Notas sobre a entrega, faturamento, etc..." value={form.description} onChange={e => set('description', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* Importação por CSV */}
                    <div className="glass" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--glass-border)', paddingBottom: 12 }}>
                            <i className="fa-solid fa-file-csv" style={{ color: 'var(--accent-4)' }}></i> Importação de Lote (CSV)
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: -4 }}>
                            Suba a planilha com os dados das crianças. O CSV deve conter as colunas: <code style={{ background: 'rgba(0,0,0,0.06)', padding: '1px 5px', borderRadius: 4 }}>Nome</code>, <code style={{ background: 'rgba(0,0,0,0.06)', padding: '1px 5px', borderRadius: 4 }}>Idade</code>, e <code style={{ background: 'rgba(0,0,0,0.06)', padding: '1px 5px', borderRadius: 4 }}>Url_Foto</code>.
                        </p>
                        <div
                            onClick={() => csvInputRef.current?.click()}
                            onDragOver={e => e.preventDefault()}
                            onDrop={handleCsvDrop}
                            style={{ border: '2px dashed var(--glass-border)', borderRadius: 12, padding: 40, textAlign: 'center', background: csvFile ? 'rgba(16,185,129,0.05)' : 'rgba(0,0,0,0.04)', cursor: 'pointer', transition: '0.2s' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-4)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; }}
                        >
                            {csvFile ? (
                                <>
                                    <i className="fa-solid fa-file-excel" style={{ fontSize: 32, color: 'var(--accent-4)', marginBottom: 12, display: 'block' }}></i>
                                    <h3 style={{ marginBottom: 8, fontWeight: 500, color: 'var(--accent-4)' }}>{csvFile.name}</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{(csvFile.size / 1024).toFixed(1)}KB · Clique para substituir</p>
                                </>
                            ) : (
                                <>
                                    <i className="fa-solid fa-file-excel" style={{ fontSize: 32, color: 'var(--accent-4)', marginBottom: 12, display: 'block' }}></i>
                                    <h3 style={{ marginBottom: 8, fontWeight: 500 }}>Arraste o arquivo CSV aqui</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Ou clique para procurar (Gerará os pedidos automaticamente)</p>
                                </>
                            )}
                        </div>
                        <input ref={csvInputRef} type="file" accept=".csv,.xlsx" style={{ display: 'none' }} onChange={e => setCsvFile(e.target.files[0])} />
                    </div>

                </div>

                {/* Bottom Bar Fixa */}
                <div style={{ position: 'fixed', bottom: 0, right: 0, width: 'calc(100% - 280px)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--glass-border)', padding: '16px 40px', display: 'flex', justifyContent: 'flex-end', gap: 16, zIndex: 100 }}>
                    <Link to="/projetos" style={{ padding: '12px 24px', borderRadius: 8, fontWeight: 600, fontSize: 15, cursor: 'pointer', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                        Cancelar
                    </Link>
                    <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: 15, fontWeight: 600 }} disabled={loading}>
                        {loading ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Salvando...</> : <><i className="fa-solid fa-check"></i> Salvar Projeto</>}
                    </button>
                </div>
            </form>
        </>
    );
}
