import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import './PlanEditor.css';

export default function PlanEditor() {
    const { user } = useAuth();
    const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
    const [selectedId, setSelectedId] = useState('');
    const [error, setError] = useState('');
    const [started, setStarted] = useState(false);
    useEffect(() => {
        let active = true;
        supabase.from('projects').select('id,name').order('name').then(({ data, error }) => {
            if (!active) return;
            if (error) setError('Projeler yüklenemedi. Lütfen tekrar deneyin.');
            else setProjects(data || []);
        });
        return () => { active = false; };
    }, [user?.id]);
    const project = projects.find(p => p.id === selectedId);
    const query = new URLSearchParams({ workspace: `${user?.id}:${selectedId}`, name: project?.name || '' });
    return <Layout>
        <section className="plan-editor-page">
            <div className="plan-editor-heading">
                <h1>📐 Kat Planı</h1>
                <label>Proje
                    <select value={selectedId} onChange={e => { setStarted(false); setSelectedId(e.target.value); }} disabled={started}>
                        <option value="">Proje seçin</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </label>
                {started ? <button className="btn btn-secondary" onClick={() => setStarted(false)}>Proje seçimine dön</button>
                    : <button className="btn btn-primary" disabled={!project} onClick={() => setStarted(true)}>Editörü aç</button>}
            </div>
            {error && <p role="alert">{error}</p>}
            {started && project && user
                ? <iframe className="plan-editor-frame" title={`${project.name} kat planı editörü`} src={`/plan-editor/index.html?${query}`} allow="fullscreen" />
                : <div className="plan-editor-welcome">
                    <span aria-hidden="true">📐</span><h2>2D ve 3D çizim stüdyosu</h2>
                    <p>Projeni seçip duvar, kapı, pencere, kat ve mobilyalarla tasarıma başla.</p>
                    <p>Çizimler bu cihazın tarayıcısında otomatik saklanır. Başka bir cihaza geçmeden önce JSON yedeğini indir.</p>
                </div>}
        </section>
    </Layout>;
}
