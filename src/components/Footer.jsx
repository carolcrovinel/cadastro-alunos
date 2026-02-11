export default function Footer() {
  const ano = new Date().getFullYear();

  return (
    <footer className="bg-dark text-white text-center py-3 mt-auto">
      <small>
        © {ano} Sistema de Cadastro de Alunos — Desenvolvido por Carol Crovinel
      </small>
    </footer>
  );
}
