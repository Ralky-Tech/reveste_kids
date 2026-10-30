import { Link } from 'react-router-dom';
import './Register.css';

function Register() {
  return (
    <section className="register-page">
      <div className="register-main">
        <div className="register-container">
          <div className="register-top">
            <Link to="/" className="register-back">
              &lsaquo;
            </Link>

            <div className="register-brand">
              <img
                src="/ralky-white.png"
                alt="Ralky"
                className="register-brand-logo"
              />

              <span>Ralky</span>
            </div>
          </div>

          <h1 className="register-title">Comece a usar o ReVeste</h1>

          <p className="register-subtitle">
            Crie uma conta para começar a circular roupas infantis.
          </p>

          <form className="register-form">
            <div className="register-field">
              <label>Número de celular ou email</label>

              <input type="text" placeholder="Número de celular ou email" />
            </div>

            <p className="register-info">
              Você poderá receber notificações enviadas por nós.
            </p>

            <div className="register-field">
              <label>Senha</label>

              <input type="password" placeholder="Senha" />
            </div>

            <div className="register-field">
              <label>Data de nascimento</label>

              <div className="register-date">
                <select defaultValue="">
                  <option value="" disabled>
                    Dia
                  </option>

                  {Array.from({ length: 31 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>

                <select defaultValue="">
                  <option value="" disabled>
                    Mês
                  </option>

                  {[
                    'Janeiro',
                    'Fevereiro',
                    'Março',
                    'Abril',
                    'Maio',
                    'Junho',
                    'Julho',
                    'Agosto',
                    'Setembro',
                    'Outubro',
                    'Novembro',
                    'Dezembro',
                  ].map((mes, index) => (
                    <option key={index} value={index + 1}>
                      {mes}
                    </option>
                  ))}
                </select>

                <select defaultValue="">
                  <option value="" disabled>
                    Ano
                  </option>

                  {Array.from(
                    { length: 100 },
                    (_, i) => new Date().getFullYear() - i
                  ).map((ano) => (
                    <option key={ano} value={ano}>
                      {ano}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="register-field">
              <label>Nome</label>

              <input type="text" placeholder="Nome completo" />
            </div>

            <div className="register-field">
              <label>Nome de usuário</label>

              <input type="text" placeholder="Nome de usuário" />
            </div>

            <div className="register-field">
              <label>Endereço</label>

              <input type="text" placeholder="Rua / Avenida" />
            </div>

            <div className="register-address-grid">
              <input type="text" placeholder="Número" />
              <input type="text" placeholder="Complemento" />
            </div>

            <div className="register-address-grid">
              <input type="text" placeholder="Bairro" />
              <input type="text" placeholder="CEP" />
            </div>

            <div className="register-address-grid">
              <input type="text" placeholder="Cidade" />

              <select defaultValue="">
                <option value="" disabled>
                  Estado
                </option>

                {[
                  'AC',
                  'AL',
                  'AP',
                  'AM',
                  'BA',
                  'CE',
                  'DF',
                  'ES',
                  'GO',
                  'MA',
                  'MT',
                  'MS',
                  'MG',
                  'PA',
                  'PB',
                  'PR',
                  'PE',
                  'PI',
                  'RJ',
                  'RN',
                  'RS',
                  'RO',
                  'RR',
                  'SC',
                  'SP',
                  'SE',
                  'TO',
                ].map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>

            <p className="register-policy">
              Ao criar uma conta no ReVeste, você concorda com nossos
              <strong> Termos de Uso</strong>,
              <strong> Política de Privacidade</strong> e
              <strong> Diretrizes da comunidade</strong>.
              <br />
              <br />
              Utilizamos suas informações para oferecer uma experiência mais
              segura, personalizada e eficiente dentro da plataforma.
            </p>

            <button type="submit" className="register-button">
              Enviar
            </button>

            <Link to="/login" className="register-login-button">
              Já tenho uma conta
            </Link>
          </form>
        </div>
      </div>

      <footer className="register-footer">
        <div className="register-footer-links">
          <button>Ralky</button>
          <button>Sobre</button>
          <button>Ajuda</button>
          <button>API</button>
          <button>Comunidade</button>
          <button>Diretrizes</button>
          <button>Segurança</button>
          <button>Privacidade</button>
          <button>Termos</button>
          <button>Contato</button>
          <button>Português (Brasil)</button>
          <button>© 2026 ReVeste by Ralky</button>
        </div>

        <div className="register-footer-bottom">
          <span>Português (Brasil)</span>
          <span>© 2026 ReVeste by Ralky</span>
        </div>
      </footer>
    </section>
  );
}

export default Register;
