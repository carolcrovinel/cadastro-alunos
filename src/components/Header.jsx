export default function Header({ onLogout }) {
  return (
    <header className="bg-danger text-white w-100">
      <div className="d-flex justify-content-between align-items-center px-4 py-3">
        <h5 className="mb-0">📚 Alunos</h5>

        <button
          className="btn btn-outline-light btn-sm"
          onClick={onLogout}
        >
          Sair
        </button>
      </div>
    </header>
  );
}
