import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-2xl font-bold text-white mb-4">TrampoAqui</h3>
            <p className="text-gray-400 mb-4">
              Conectando comunidades aos melhores profissionais de serviços gerais.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <i className="fab fa-facebook text-xl"></i>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <i className="fab fa-instagram text-xl"></i>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <i className="fab fa-whatsapp text-xl"></i>
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Para Clientes</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Como contratar</a></li>
              <li><Link href="/services" className="text-gray-400 hover:text-white transition-colors">Buscar profissionais</Link></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Avaliações</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Suporte</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Para Profissionais</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Como se cadastrar</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Gerenciar perfil</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Dicas de sucesso</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Centro de ajuda</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Empresa</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Sobre nós</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Termos de uso</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Privacidade</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Contato</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-400">
            © 2024 TrampoAqui. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
