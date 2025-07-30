import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold">TrampoAqui</h3>
            <p className="text-gray-300 text-sm">
              Conectando profissionais qualificados com clientes em busca de serviços de qualidade.
            </p>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h4 className="font-semibold">Serviços</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link href="/services?category=eletricista">Eletricista</Link></li>
              <li><Link href="/services?category=encanador">Encanador</Link></li>
              <li><Link href="/services?category=faxineira">Faxineira</Link></li>
              <li><Link href="/services?category=pintor">Pintor</Link></li>
            </ul>
          </div>

          {/* For Professionals */}
          <div className="space-y-4">
            <h4 className="font-semibold">Para Profissionais</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link href="/register">Cadastre-se</Link></li>
              <li><Link href="/dashboard">Dashboard</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h4 className="font-semibold">Suporte</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><a href="mailto:suporte@trampoaqui.com">suporte@trampoaqui.com</a></li>
              <li><a href="tel:+5511999999999">(11) 99999-9999</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
          <p>&copy; 2024 TrampoAqui. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}