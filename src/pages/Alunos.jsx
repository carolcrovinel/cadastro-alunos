import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Alert, Button, Modal, Form, Collapse } from 'react-bootstrap';

export default function Alunos() {
  const [alunos, setAlunos] = useState([]);
  const [pesquisa, setPesquisa] = useState('');
  const [alunoEditando, setAlunoEditando] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);

  // controle visual
  const [mostrarCadastro, setMostrarCadastro] = useState(false);

  // controle usuário
  const [emailUsuario, setEmailUsuario] = useState(null);

  // itens por página
  const [limite, setLimite] = useState(10);

  // ordenação
  const [ordenacao, setOrdenacao] = useState({
    coluna: 'created_at',
    direcao: 'desc'
  });

  // mensagens
  const [mensagem, setMensagem] = useState(null);
  const [tipoMensagem, setTipoMensagem] = useState('success');

  // modal excluir
  const [showModalExcluir, setShowModalExcluir] = useState(false);
  const [alunoParaExcluir, setAlunoParaExcluir] = useState(null);

  // formulário
  const [form, setForm] = useState({
    nome: '',
    nomemae: '',
    datanascimento: '',
    processo: '',
    observacoes: ''
  });

  /* ======================
     USER / AUTH
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
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 2) value = value.replace(/^(\d{2})(\d)/, '$1/$2');
    if (value.length > 5) value = value.replace(/^(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');
    setForm({ ...form, datanascimento: value });
  }

  function handleProcessoChange(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.replace(/^(\d{4})(\d)/, '$1/$2');
    setForm({ ...form, processo: value });
  }

  function formatarDataParaBanco(data) {
    if (!data || data.length !== 10) return null;
    const [dia, mes, ano] = data.split('/');
    return `${ano}-${mes}-${dia}`;
  }

  function formatarDataParaTela(data) {
    if (!data) return '';
    const [ano, mes, dia] = data.split('-');
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

  function iconeOrdenacao(coluna) {
    if (ordenacao.coluna !== coluna) return '↕';
    return ordenacao.direcao === 'asc' ? '↑' : '↓';
  }

  /* ======================
     CSV EXPORT
     ====================== */

  async function exportarCSV() {
    const { data } = await supabase
      .from('alunos')
      .select('*')
      .or(
        pesquisa
          ? `nome.ilike.%${pesquisa}%,nomemae.ilike.%${pesquisa}%,processo.ilike.%${pesquisa}%`
          : undefined
      )
      .order(ordenacao.coluna, { ascending: ordenacao.direcao === 'asc' });

    if (!data || data.length === 0) return;

    const header = ['Nome', 'Mãe', 'Nascimento', 'Processo', 'Observações'];

    const rows = data.map(a => [
      a.nome,
      a.nomemae || '',
      formatarDataParaTela(a.datanascimento),
      a.processo || '',
      a.observacoes || ''
    ]);

    const csv = [header, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'alunos.csv';
    link.click();

    URL.revokeObjectURL(url);
  }

  /* ======================
     CRUD
     ====================== */

  async function carregarAlunos() {
    const from = (pagina - 1) * limite;
    const to = from + limite - 1;

    let query = supabase
      .from('alunos')
      .select('*', { count: 'exact' })
      .order(ordenacao.coluna, { ascending: ordenacao.direcao === 'asc' })
      .range(from, to);

    if (pesquisa) {
      query = query.or(
        `nome.ilike.%${pesquisa}%,nomemae.ilike.%${pesquisa}%,processo.ilike.%${pesquisa}%`
      );
    }

    const { data, count } = await query;
    setAlunos(data || []);
    setTotal(count || 0);
  }

  async function salvarOuAtualizar() {
    if (!form.nome) {
      setTipoMensagem('danger');
      setMensagem('O nome do aluno é obrigatório.');
      return;
    }

    const payload = {
      ...form,
      datanascimento: formatarDataParaBanco(form.datanascimento)
    };

    if (alunoEditando) {
      await supabase.from('alunos').update(payload).eq('id', alunoEditando);
      setMensagem('Aluno atualizado com sucesso.');
    } else {
      await supabase.from('alunos').insert([payload]);
      setMensagem('Aluno cadastrado com sucesso.');
    }

    setTipoMensagem('success');
    limparFormulario();
    carregarAlunos();
  }

  function editarAluno(aluno) {
    setAlunoEditando(aluno.id);
    setMostrarCadastro(true);
    setForm({
      nome: aluno.nome || '',
      nomemae: aluno.nomemae || '',
      datanascimento: formatarDataParaTela(aluno.datanascimento),
      processo: aluno.processo || '',
      observacoes: aluno.observacoes || ''
    });
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

  async function logout() {
    await supabase.auth.signOut();
  }

  useEffect(() => {
    carregarAlunos();
  }, [pesquisa, pagina, ordenacao, limite]);

  const totalPaginas = Math.ceil(total / limite);

  return (
    <div className="d-flex flex-column min-vh-100 w-100">
      <Header onLogout={logout} />

      <main className="flex-grow-1 bg-light w-100">
        <div className="px-4 py-3">

          {mensagem && (
            <Alert variant={tipoMensagem} dismissible onClose={() => setMensagem(null)}>
              {mensagem}
            </Alert>
          )}

          {/* BOTÕES TOPO */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <Button
              variant="outline-secondary"
              onClick={() => setMostrarCadastro(!mostrarCadastro)}
            >
              {mostrarCadastro ? 'Ocultar cadastro' : 'Mostrar cadastro'}
            </Button>

            {emailUsuario === 'carol.crovinel@gmail.com' && (
              <Button variant="outline-success" onClick={exportarCSV}>
                Exportar CSV
              </Button>
            )}
          </div>

          {/* CADASTRO */}
          <Collapse in={mostrarCadastro}>
            <div>
              <div className="card mb-4">
                <div className="card-body">
                  <h5>{alunoEditando ? 'Editando aluno' : 'Novo aluno'}</h5>

                  <div className="row g-3 mt-1">
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
                      <input className="form-control" placeholder="Processo)"
                        value={form.processo}
                        onChange={handleProcessoChange} />
                    </div>

                    <div className="col-12">
                      <textarea className="form-control" rows="3"
                        placeholder="Observações"
                        value={form.observacoes}
                        onChange={e => setForm({ ...form, observacoes: e.target.value })} />
                    </div>
                  </div>

                  <div className="mt-3">
                    <Button variant="danger" onClick={salvarOuAtualizar}>
                      {alunoEditando ? 'Atualizar' : 'Salvar'}
                    </Button>

                    {alunoEditando && (
                      <Button className="ms-2" variant="secondary" onClick={limparFormulario}>
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Collapse>

          {/* LISTAGEM */}
          <div className="table-responsive">
            <table className="table table-striped table-hover">
              <thead className="table-danger">
                <tr>
                  <th onClick={() => ordenarPor('nome')}>Nome {iconeOrdenacao('nome')}</th>
                  <th onClick={() => ordenarPor('nomemae')}>Mãe {iconeOrdenacao('nomemae')}</th>
                  <th onClick={() => ordenarPor('datanascimento')}>Nascimento {iconeOrdenacao('datanascimento')}</th>
                  <th onClick={() => ordenarPor('processo')}>Processo {iconeOrdenacao('processo')}</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {alunos.map(aluno => (
                  <tr key={aluno.id}>
                    <td>{aluno.nome}</td>
                    <td>{aluno.nomemae || '-'}</td>
                    <td>{formatarDataParaTela(aluno.datanascimento)}</td>
                    <td>{aluno.processo || '-'}</td>
                    <td>
                      <Button size="sm" variant="warning" className="me-2"
                        onClick={() => editarAluno(aluno)}>Editar</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
