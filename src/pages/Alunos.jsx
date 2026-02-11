import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Alert, Button, Modal, Form, Collapse } from 'react-bootstrap';

export default function Alunos() {

    /* ======================
       STATES BÁSICOS
       ====================== */

    const [alunos, setAlunos] = useState([]);
    const [pesquisa, setPesquisa] = useState('');
    const [pagina, setPagina] = useState(1);
    const [total, setTotal] = useState(0);
    const [limite, setLimite] = useState(10);

    const [alunoEditando, setAlunoEditando] = useState(null);
    const [mostrarCadastro, setMostrarCadastro] = useState(false);

    const [mensagem, setMensagem] = useState(null);
    const [tipoMensagem, setTipoMensagem] = useState('success');

    const [emailUsuario, setEmailUsuario] = useState(null);

    /* ======================
       MODAL EXCLUIR (ESTÁVEL)
       ====================== */

    const [showModalExcluir, setShowModalExcluir] = useState(false);
    const [alunoParaExcluir, setAlunoParaExcluir] = useState(null);

    /* ======================
       ORDENAÇÃO
       ====================== */

    const [ordenacao, setOrdenacao] = useState({
        coluna: 'created_at',
        direcao: 'desc'
    });

    /* ======================
       FORMULÁRIO
       ====================== */

    const [form, setForm] = useState({
        nome: '',
        nomemae: '',
        datanascimento: '',
        processo: '',
        observacoes: ''
    });

    /* ======================
       AUTH
       ====================== */

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setEmailUsuario(data?.user?.email || null);
        });
    }, []);

    /* ======================
       MÁSCARAS
       ====================== */

    function handleDateChange(e) {
        let v = e.target.value.replace(/\D/g, '');
        if (v.length > 2) v = v.replace(/^(\d{2})(\d)/, '$1/$2');
        if (v.length > 5) v = v.replace(/^(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');
        setForm({ ...form, datanascimento: v });
    }

    function handleProcessoChange(e) {
        let v = e.target.value.replace(/\D/g, '');
        if (v.length > 4) v = v.replace(/^(\d{4})(\d)/, '$1/$2');
        setForm({ ...form, processo: v });
    }

    function dataParaBanco(d) {
        if (!d || d.length !== 10) return null;
        const [dia, mes, ano] = d.split('/');
        return `${ano}-${mes}-${dia}`;
    }

    function dataParaTela(d) {
        if (!d) return '';
        const [ano, mes, dia] = d.split('-');
        return `${dia}/${mes}/${ano}`;
    }

    /* ======================
       ORDENAÇÃO
       ====================== */

    function ordenarPor(coluna) {
        setPagina(1);
        setOrdenacao(prev =>
            prev.coluna === coluna
                ? { coluna, direcao: prev.direcao === 'asc' ? 'desc' : 'asc' }
                : { coluna, direcao: 'asc' }
        );
    }

    function icone(coluna) {
        if (ordenacao.coluna !== coluna) return '↕';
        return ordenacao.direcao === 'asc' ? '↑' : '↓';
    }

    /* ======================
       CRUD
       ====================== */

    async function carregarAlunos() {
        const from = (pagina - 1) * limite;
        const to = from + limite - 1;

        let q = supabase
            .from('alunos')
            .select('*', { count: 'exact' })
            .order(ordenacao.coluna, { ascending: ordenacao.direcao === 'asc' })
            .range(from, to);

        if (pesquisa) {
            q = q.or(
                `nome.ilike.%${pesquisa}%,nomemae.ilike.%${pesquisa}%,processo.ilike.%${pesquisa}%`
            );
        }

        const { data, count } = await q;
        setAlunos(data || []);
        setTotal(count || 0);
    }

    async function salvarOuAtualizar() {
        if (!form.nome) {
            setTipoMensagem('danger');
            setMensagem('Nome é obrigatório.');
            return;
        }

        const payload = {
            ...form,
            datanascimento: dataParaBanco(form.datanascimento)
        };

        if (alunoEditando) {
            await supabase.from('alunos').update(payload).eq('id', alunoEditando);
            setMensagem('Aluno atualizado.');
        } else {
            await supabase.from('alunos').insert([payload]);
            setMensagem('Aluno cadastrado.');
        }

        setTipoMensagem('success');
        limparFormulario();
        carregarAlunos();
    }

    async function logout() {
    await supabase.auth.signOut();
    }


    function editarAluno(a) {
        setAlunoEditando(a.id);
        setMostrarCadastro(true);
        setForm({
            nome: a.nome || '',
            nomemae: a.nomemae || '',
            datanascimento: dataParaTela(a.datanascimento),
            processo: a.processo || '',
            observacoes: a.observacoes || ''
        });
    }

    function confirmarExcluir(aluno) {
        setAlunoParaExcluir(aluno);
        setShowModalExcluir(true);
    }

    async function excluirAluno() {
        await supabase.from('alunos').delete().eq('id', alunoParaExcluir.id);
        setShowModalExcluir(false);
        setMensagem('Aluno excluído.');
        setTipoMensagem('success');
        carregarAlunos();
    }

    function limparFormulario() {
        setForm({
            nome: '',
            nomemae: '',
            datanascimento: '',
            processo: '',
            observacoes: ''
        });
        setAlunoEditando(null);
    }

    useEffect(() => {
        carregarAlunos();
    }, [pesquisa, pagina, limite, ordenacao]);

    const totalPaginas = Math.ceil(total / limite);

    /* ======================
       CSV
       ====================== */

    async function exportarCSV() {
        const { data } = await supabase.from('alunos').select('*');

        const header = ['Nome', 'Mãe', 'Nascimento', 'Processo', 'Observações'];
        const rows = data.map(a => [
            a.nome,
            a.nomemae || '',
            dataParaTela(a.datanascimento),
            a.processo || '',
            a.observacoes || ''
        ]);

        const csv = [header, ...rows]
            .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob(
            ['\uFEFF' + csv],
            { type: 'text/csv;charset=utf-8;' }
        );

        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = 'alunos.csv';
        link.click();
        URL.revokeObjectURL(url);
    }

    /* ======================
       RENDER
       ====================== */

    return (
        <div className="d-flex flex-column min-vh-100">
            <Header onLogout={logout} />


            <main className="flex-grow-1 bg-light p-3">

                {mensagem && (
                    <Alert variant={tipoMensagem} dismissible onClose={() => setMensagem(null)}>
                        {mensagem}
                    </Alert>
                )}

                <div className="d-flex justify-content-between mb-3">
                    <Button onClick={() => setMostrarCadastro(!mostrarCadastro)}>
                        {mostrarCadastro ? 'Ocultar cadastro' : 'Mostrar cadastro'}
                    </Button>

                    {emailUsuario === 'carol.crovinel@gmail.com' && (
                        <Button variant="success" onClick={exportarCSV}>
                            Exportar CSV
                        </Button>
                    )}
                </div>

                <Collapse in={mostrarCadastro}>
                    <div className="card mb-3">
                        <div className="card-body">
                            <h5>{alunoEditando ? 'Editando aluno' : 'Novo aluno'}</h5>

                            <div className="row g-3">
                                <div className="col-md-6">
                                    <input className="form-control" placeholder="Nome"
                                        value={form.nome}
                                        onChange={e => setForm({ ...form, nome: e.target.value })} />
                                </div>

                                <div className="col-md-6">
                                    <input className="form-control" placeholder="Nome da mãe"
                                        value={form.nomemae}
                                        onChange={e => setForm({ ...form, nomemae: e.target.value })} />
                                </div>

                                <div className="col-md-4">
                                    <input className="form-control" placeholder="dd/mm/aaaa"
                                        value={form.datanascimento}
                                        onChange={handleDateChange} />
                                </div>

                                <div className="col-md-4">
                                    <input className="form-control" placeholder="Processo"
                                        value={form.processo}
                                        onChange={handleProcessoChange} />
                                </div>

                                <div className="col-12">
                                    <textarea className="form-control" placeholder="Observações"
                                        value={form.observacoes}
                                        onChange={e => setForm({ ...form, observacoes: e.target.value })} />
                                </div>
                            </div>

                            <div className="mt-3">
                                <Button variant="danger" onClick={salvarOuAtualizar}>
                                    {alunoEditando ? 'Atualizar' : 'Salvar'}
                                </Button>

                                {alunoEditando && (
                                    <Button
                                        variant="secondary"
                                        className="ms-2"
                                        onClick={() => {
                                            limparFormulario();
                                        }}
                                    >
                                        Cancelar
                                    </Button>
                                )}
                            </div>

                        </div>
                    </div>
                </Collapse>

                {/* FILTRO */}
                <Form.Control
                    className="mb-3"
                    placeholder="Pesquisar nome, mãe ou processo"
                    value={pesquisa}
                    onChange={e => {
                        setPesquisa(e.target.value);
                        setPagina(1);
                    }}
                />

                {/* TABELA */}
                <table className="table table-striped table-hover">
                    <thead className="table-danger">
                        <tr>
                            <th onClick={() => ordenarPor('nome')}>Nome {icone('nome')}</th>
                            <th onClick={() => ordenarPor('nomemae')}>Mãe {icone('nomemae')}</th>
                            <th onClick={() => ordenarPor('datanascimento')}>Nascimento {icone('datanascimento')}</th>
                            <th onClick={() => ordenarPor('processo')}>Processo {icone('processo')}</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {alunos.map(a => (
                            <tr key={a.id}>
                                <td>{a.nome}</td>
                                <td>{a.nomemae || '-'}</td>
                                <td>{dataParaTela(a.datanascimento)}</td>
                                <td>{a.processo || '-'}</td>
                                <td>
                                    <Button size="sm" variant="warning" onClick={() => editarAluno(a)}>Editar</Button>{' '}
                                    <Button size="sm" variant="danger" onClick={() => confirmarExcluir(a)}>Excluir</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* PAGINAÇÃO */}
                {totalPaginas > 1 && (
                    <nav>
                        <ul className="pagination justify-content-center">
                            {[...Array(totalPaginas)].map((_, i) => (
                                <li key={i} className={`page-item ${pagina === i + 1 ? 'active' : ''}`}>
                                    <button className="page-link" onClick={() => setPagina(i + 1)}>
                                        {i + 1}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </nav>
                )}

            </main>

            <Footer />

            {/* MODAL CONFIRMAR EXCLUSÃO */}
            <Modal show={showModalExcluir} onHide={() => setShowModalExcluir(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Confirmar exclusão</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Deseja realmente excluir <strong>{alunoParaExcluir?.nome}</strong>?
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModalExcluir(false)}>
                        Cancelar
                    </Button>
                    <Button variant="danger" onClick={excluirAluno}>
                        Excluir
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}
