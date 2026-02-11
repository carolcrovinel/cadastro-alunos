import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Alert, Button, Spinner } from 'react-bootstrap';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mensagem, setMensagem] = useState(null);
  const [tipoMensagem, setTipoMensagem] = useState('danger');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setMensagem(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha
    });

    if (error) {
      setTipoMensagem('danger');
      setMensagem('Email ou senha inválidos.');
      setLoading(false);
      return;
    }

    setLoading(false);
  }

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
      <div className="card shadow" style={{ width: 380 }}>
        <div className="card-header bg-danger text-white text-center">
          <h5 className="mb-0">Acesso ao sistema</h5>
        </div>

        <div className="card-body">
          {mensagem && (
            <Alert
              variant={tipoMensagem}
              dismissible
              onClose={() => setMensagem(null)}
            >
              {mensagem}
            </Alert>
          )}

          <form onSubmit={handleLogin}>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                placeholder="email@exemplo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Senha</label>
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                required
              />
            </div>

            <div className="d-grid">
              <Button variant="danger" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Spinner size="sm" animation="border" className="me-2" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </div>
          </form>
        </div>

        <div className="card-footer text-center text-muted">
          <small>Sistema de Cadastro de Alunos</small>
        </div>
      </div>
    </div>
  );
}
