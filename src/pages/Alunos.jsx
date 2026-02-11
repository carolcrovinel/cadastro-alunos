import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Alert, Button, Modal, Form } from 'react-bootstrap';

export default function Alunos() {
  const [alunos, setAlunos] = useState([]);
  const [pesquisa, setPesquisa] = useState('');
  const [alunoEditando, setAlunoEditando] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);

  // itens por página (máx 100)
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
     MÁSCARAS / FORMATOS
     ====================== */

  function handleDateChange(e) {
    let value = e.target.value.replace(/\D/g, '');

    if (value.length > 2) value = value.replace(/^(\d{2})(\d)/, '$1/$2');
    if (value.length > 5) value = value.replace(/^(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');

    setForm({ ...form, datanascimento: value });
  }

  function handleProcessoChange(e) {
    let value = e.target.value.replace(/\D/g, '');

    if (value.length > 4) {
      value = value.replace(/^(\d{4})(\d)/, '$1/$2');
    }

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
     VALIDAÇÕES
     ====================== */

  async function processoJaExiste(processo) {
    let query = supabase
      .from('alunos')
      .select('id')
      .eq('processo', processo);

    if (alunoEditando) {
      query = query.neq('id', alunoEditando);
    }

    const { data } = await query;
    return data && data.length > 0;
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

    if (form.processo) {
      const existe = await processoJaExiste(form.processo);
      if (existe) {
        setTipoMensagem('danger');
        setMensagem('Já existe um aluno cadastrado com este número de processo.');
        return;
      }
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
    setForm({
      nome: aluno.nome || '',
      nomemae: aluno.nomemae || '',
      datanascimento: formatarDataParaTela(aluno.datanascimento),
      processo: aluno.processo || '',
      observacoes: aluno.observacoes || ''
    });
  }

  function confirmarExcluir(aluno) {
    setAlunoParaExcluir(aluno);
    setShowModalExcluir(true);
  }

  async function excluirAluno() {
    await supabase.from('alunos').delete().eq('id', alunoParaExcluir.id);
    setMensagem('Aluno excluído com sucesso.');
    setTipoMensagem('success');
    setShowModalExcluir(false);
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

  async function logout() {
    await supabase.auth.signOut();
  }

  /* ======================
     EFFECT
     ====================== */

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
            <Alert
              variant={tipoMensagem}
              dismissible
              onClose={() => setMensagem(null)}
            >
              {mensagem}
            </Alert>
          )}

          <h4 className="mb-3">
            {alunoEditando ? 'Editando aluno' : 'Cadastro'}
          </h4>

          {/* FORM */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <input className="form-control" placeholder="Nome" value={form.nome}
                    onChange={e => setForm({ ...form, nome: e.target.value })} />
                </div>

                <div className="col-md-6">
                  <input className="form-control" placeholder="Nome da mãe" value={form.nomemae}
                    onChange={e => setForm({ ...form, nomemae: e.target.value })} />
                </div>

                <div className="col-md-4">
                  <input className="form-control" placeholder="dd/mm/aaaa"
                    value={form.datanascimento} onChange={handleDateChange} maxLength={10} />
                </div>

                <div className="col-md-4">
                  <input className="form-control" placeholder="Processo (4444/44)"
                    value={form.processo} onChange={handleProcessoChange} maxLength={7} />
                </div>

                <div className="col-12">
                  <textarea className="form-control" rows="3" placeholder="Observações"
                    value={form.observacoes}
                    onChange={e => setForm({ ...form, observacoes: e.target.value })} />
                </div>
              </div>

              <div className="mt-3">
                <Button variant="danger" onClick={salvarOuAtualizar}>
                  {alunoEditando ? 'Atualizar' : 'Salvar'}
                </Button>

                {alunoEditando && (
                  <Button variant="secondary" className="ms-2" onClick={limparFormulario}>
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* FILTRO + LIMITE */}
          <div className="row mb-3 align-items-end">
            <div className="col-md-6">
              <Form.Label>Pesquisar (todas as colunas)</Form.Label>
              <Form.Control
                value={pesquisa}
                placeholder="Digite qualquer informação"
                onChange={e => {
                  setPesquisa(e.target.value);
                  setPagina(1);
                }}
              />
            </div>

            <div className="col-md-3">
              <Form.Label>Itens por página</Form.Label>
              <Form.Select
                value={limite}
                onChange={e => {
                  setLimite(Number(e.target.value));
                  setPagina(1);
                }}
              >
                {[5, 10, 20, 50, 100].map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </Form.Select>
            </div>
          </div>

          {/* TABELA */}
          <div className="table-responsive">
            <table className="table table-striped table-hover">
              <thead className="table-danger">
                <tr>
                  <th onClick={() => ordenarPor('nome')} style={{ cursor: 'pointer' }}>
                    Nome {iconeOrdenacao('nome')}
                  </th>
                  <th onClick={() => ordenarPor('nomemae')} style={{ cursor: 'pointer' }}>
                    Mãe {iconeOrdenacao('nomemae')}
                  </th>
                  <th onClick={() => ordenarPor('datanascimento')} style={{ cursor: 'pointer' }}>
                    Nascimento {iconeOrdenacao('datanascimento')}
                  </th>
                  <th onClick={() => ordenarPor('processo')} style={{ cursor: 'pointer' }}>
                    Processo {iconeOrdenacao('processo')}
                  </th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {alunos.map(aluno => (
                  <tr key={aluno.id}>
                    <td>{aluno.nome}</td>
                    <td>{aluno.nomemae || '-'}</td>
                    <td>{formatarDataParaTela(aluno.datanascimento) || '-'}</td>
                    <td>{aluno.processo || '-'}</td>
                    <td>
                      <Button size="sm" variant="warning" className="me-2"
                        onClick={() => editarAluno(aluno)}>Editar</Button>
                      <Button size="sm" variant="danger"
                        onClick={() => confirmarExcluir(aluno)}>Excluir</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* PAGINAÇÃO */}
          {totalPaginas > 1 && (
            <nav className="mt-3">
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
        </div>
      </main>

      <Footer />

      {/* MODAL EXCLUIR */}
      <Modal show={showModalExcluir} onHide={() => setShowModalExcluir(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirmar exclusão</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Deseja realmente excluir o aluno <strong>{alunoParaExcluir?.nome}</strong>?
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
