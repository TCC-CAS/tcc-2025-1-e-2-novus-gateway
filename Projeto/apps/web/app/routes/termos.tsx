import { Link } from "react-router"
import { GlobalHeader } from "~/components/global-header"

export function meta() {
  return [
    { title: "Termos de Uso - VárzeaPro" },
    { name: "description", content: "Termos e Condições de Uso da plataforma VárzeaPro." },
  ]
}

export default function Termos() {
  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary selection:text-primary-foreground">
      <GlobalHeader />

      <main className="flex-1 px-6 py-16 sm:px-12">
        <div className="mx-auto max-w-3xl">
          {/* Header */}
          <div className="mb-12 border-b-4 border-foreground pb-10">
            <div className="mb-4 inline-block bg-foreground px-3 py-1 font-display text-lg tracking-widest text-background">
              DOCUMENTO LEGAL
            </div>
            <h1 className="font-display text-[14vw] leading-[0.85] tracking-tight text-foreground sm:text-[7vw]">
              TERMOS<br />
              <span className="text-primary">DE USO</span>
            </h1>
            <p className="mt-6 font-bold tracking-widest text-muted-foreground text-xs uppercase">
              Última atualização: 2025
            </p>
          </div>

          {/* Intro */}
          <div className="mb-12 space-y-4 border-l-4 border-primary pl-6 text-base leading-relaxed text-foreground/80">
            <p>
              Nós somos o VárzeaPro, uma plataforma digital desenvolvida com o propósito de fortalecer
              e organizar o futebol amador brasileiro. Este texto apresenta os Termos e Condições de Uso
              aplicáveis ao aplicativo e ao site, orientando o usuário quanto ao acesso, às
              responsabilidades e às regras de funcionamento das PLATAFORMAS.
            </p>
            <p>
              O VárzeaPro busca ampliar a visibilidade de jogadores, facilitar a comunicação entre atletas
              e times e incentivar a prática esportiva em comunidades de várzea, contribuindo para a
              inclusão social e para a valorização do esporte amador. Ao acessar ou utilizar nossos
              serviços, o usuário declara que leu, compreendeu e concorda com todas as condições aqui
              estabelecidas. Caso não concorde com algum dos termos, o uso da plataforma não é autorizado.
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-12">

            <Section number="1" title="OBJETIVO DA PLATAFORMA">
              <p>
                O VárzeaPro tem como finalidade oferecer um ambiente digital estruturado para apoiar,
                organizar e fortalecer o futebol amador brasileiro, conhecido popularmente como várzea.
                A plataforma foi projetada para facilitar a interação entre jogadores, times e demais
                participantes da comunidade esportiva, reunindo em um único espaço funcionalidades que
                ampliam a visibilidade dos atletas, otimizam processos de captação e promovem a prática
                esportiva de forma acessível e transparente.
              </p>
              <p>
                O sistema permite a criação de perfis completos de jogadores, contendo informações
                pessoais, características esportivas, posições de atuação, disponibilidade, fotos e
                vídeos que auxiliam na demonstração do desempenho do atleta. Para os times, a plataforma
                possibilita a divulgação de vagas, necessidades específicas de posições e detalhes sobre
                treinos, competições e agendas de partidas, oferecendo ferramentas que simplificam a
                busca por novos integrantes.
              </p>
              <p>
                O VárzeaPro disponibiliza recursos de troca de mensagens internas, permitindo que
                jogadores e equipes se comuniquem diretamente, negociem participações em partidas,
                esclareçam dúvidas e estabeleçam vínculos esportivos. A plataforma também permite a
                publicação de mídias — fotos e vídeos relacionados à prática do futebol — que contribuem
                para a construção de portfólios esportivos e ajudam times a avaliar melhor o perfil de
                cada atleta.
              </p>
              <p>
                É importante destacar que o VárzeaPro não atua como intermediador financeiro, não
                realiza pagamentos entre usuários e não garante contratações, limitando-se a oferecer a
                infraestrutura tecnológica necessária para a comunicação e conexão entre jogadores e
                times. Assim, acordos informais, negociações externas e qualquer tipo de interação
                financeira são de responsabilidade exclusiva das partes envolvidas.
              </p>
            </Section>

            <Section number="2" title="ACEITAÇÃO DO TERMO">
              <p>
                A utilização da plataforma VárzeaPro implica a aceitação plena e irrestrita das condições
                estabelecidas neste Termo de Uso. Ao criar uma conta, acessar, navegar ou utilizar
                qualquer funcionalidade disponível no aplicativo ou no site, o usuário declara que leu,
                compreendeu e concorda com todas as regras aqui descritas, responsabilizando-se por
                cumprir integralmente as disposições apresentadas.
              </p>
              <p>
                Caso o usuário não concorde com qualquer cláusula deste documento, deverá abster-se
                imediatamente de utilizar a plataforma, excluindo sua conta e interrompendo qualquer
                atividade no sistema. A continuidade de acesso será interpretada, legalmente, como
                concordância expressa aos termos e às políticas vigentes.
              </p>
              <p>
                O usuário também reconhece que este Termo pode ser atualizado periodicamente, visando
                melhorias no funcionamento da plataforma ou adequações às legislações aplicáveis,
                especialmente no tocante à Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709/2018).
                Assim, o uso continuado do VárzeaPro após a publicação de alterações constitui aceitação
                automática da nova versão disponibilizada.
              </p>
            </Section>

            <Section number="3" title="DEFINIÇÕES">
              <p>Para garantir clareza e compreensão uniforme, aplicam-se neste Termo as seguintes definições:</p>
              <BulletList items={[
                { strong: "USUÁRIO:", text: "qualquer pessoa física ou jurídica que acessa ou utiliza a plataforma, cadastrada ou não." },
                { strong: "JOGADOR:", text: "usuário que cria perfil esportivo individual para divulgar suas informações e buscar oportunidades no futebol amador." },
                { strong: "TIME:", text: "usuário responsável por gerenciar perfis de equipes amadoras e divulgar vagas, treinos e convites." },
                { strong: "PLATAFORMA:", text: "ambiente digital VárzeaPro acessível via aplicativo e/ou site, incluindo banco de dados, interface, serviços e funcionalidades." },
                { strong: "MÍDIA:", text: "qualquer conteúdo visual (fotos, vídeos) enviado pelo usuário ao sistema." },
                { strong: "CONTA:", text: "registro criado pelo usuário para acessar recursos exclusivos da plataforma." },
                { strong: "DADOS PESSOAIS:", text: "informações capazes de identificar ou tornar identificável o usuário, conforme definido pela LGPD." },
                { strong: "ADMINISTRADORES:", text: "equipe responsável pela manutenção, moderação e desenvolvimento do VárzeaPro." },
              ]} />
            </Section>

            <Section number="4" title="CADASTRO E RESPONSABILIDADES DO USUÁRIO">
              <p>
                O uso da Plataforma VárzeaPro implica a aceitação das seguintes responsabilidades e a
                adesão às regras de conduta estabelecidas, sendo o usuário o único responsável por todas
                as ações realizadas em sua conta.
              </p>
              <SubSection title="4.1">
                <p>Para utilizar os recursos do VárzeaPro, o usuário deve criar uma conta, fornecendo dados verdadeiros, completos e atualizados.</p>
              </SubSection>
              <SubSection title="4.2 O usuário é integralmente responsável por:">
                <BulletList items={[
                  { text: "manter a confidencialidade de sua senha;" },
                  { text: "garantir que o uso da conta seja pessoal e intransferível;" },
                  { text: "zelar pela veracidade das informações cadastradas;" },
                  { text: "utilizar a plataforma em conformidade com este Termo e com a legislação vigente." },
                ]} />
              </SubSection>
              <SubSection title="4.3 É proibido:">
                <BulletList items={[
                  { text: "criar perfis falsos ou com identidade de terceiros;" },
                  { text: "utilizar linguagem ofensiva, discriminatória ou inadequada;" },
                  { text: "praticar atos de assédio, ameaça ou qualquer conduta ilegal;" },
                  { text: "manipular avaliações, descrições esportivas ou interações para obter vantagem indevida." },
                ]} />
              </SubSection>
              <SubSection title="4.4">
                <p>O VárzeaPro não se responsabiliza por perfis falsos, mas realiza ações preventivas de moderação.</p>
              </SubSection>
              <SubSection title="4.5">
                <p>O VárzeaPro poderá suspender ou excluir contas que descumprirem este Termo.</p>
              </SubSection>
            </Section>

            <Section number="5" title="MODELO DE MONETIZAÇÃO">
              <p>
                A plataforma VárzeaPro foi projetada para operar sob o modelo Freemium, assegurando que
                os Jogadores tenham acesso 100% gratuito e que os Times possam utilizar o serviço com
                clareza sobre os custos.
              </p>
              <BulletList items={[
                { text: "O cadastro de novos usuários e a busca por perfis de jogadores são totalmente gratuitos." },
                { text: "Os Times podem iniciar até cinco contatos mensais gratuitamente; a partir desse limite, os contatos adicionais exigem a assinatura de um plano pago (mensal ou anual)." },
                { text: "O modelo prevê, como fontes de receita complementares, a exibição de publicidade local e o estabelecimento de parcerias com marcas esportivas." },
                { text: "Essa estrutura de receita visa garantir a sustentabilidade financeira do projeto, cobrindo os custos operacionais de hospedagem, manutenção e marketing." },
              ]} />
            </Section>

            <Section number="6" title="FUNCIONAMENTO DO SISTEMA">
              <p>
                O usuário se compromete a utilizar a plataforma exclusivamente para fins esportivos,
                comunitários e de interação social relacionados ao futebol amador.
              </p>
              <p className="font-bold tracking-widest text-sm uppercase text-foreground mt-4 mb-2">São finalidades permitidas:</p>
              <BulletList items={[
                { text: "criar e manter perfis esportivos;" },
                { text: "buscar jogadores, times e oportunidades;" },
                { text: "interagir por meio do sistema de mensagens;" },
                { text: "divulgar mídias esportivas e conteúdos relacionados à várzea." },
              ]} />
              <p className="font-bold tracking-widest text-sm uppercase text-foreground mt-6 mb-2">É vedado o uso da plataforma para:</p>
              <BulletList items={[
                { text: "fins comerciais não autorizados;" },
                { text: "divulgação de propaganda política, religiosa ou ofensiva;" },
                { text: "fraudes, golpes ou captação enganosa;" },
                { text: "coleta indevida de dados de outros usuários." },
              ]} />
            </Section>

            <Section number="7" title="IDADE MÍNIMA PARA UTILIZAÇÃO">
              <p>
                O uso da plataforma VárzeaPro é permitido somente para pessoas com idade igual ou
                superior a 18 anos. Caso o usuário não atenda ao critério etário, sua conta poderá ser
                removida sem aviso prévio.
              </p>
            </Section>

            <Section number="8" title="RISCOS ESPORTIVOS E LIMITAÇÃO DE RESPONSABILIDADE FÍSICA">
              <p>
                O VárzeaPro não se responsabiliza por quaisquer acidentes, lesões, danos físicos ou
                materiais ocorridos antes, durante ou após partidas, treinos ou encontros organizados
                entre usuários. A prática esportiva envolve riscos inerentes, e o usuário concorda que
                toda participação é voluntária e realizada sob sua própria responsabilidade.
              </p>
            </Section>

            <Section number="9" title="CONTEÚDOS E LINKS DE TERCEIROS">
              <p>
                A plataforma pode permitir a visualização ou envio de links para redes sociais, vídeos
                ou outros conteúdos externos. O VárzeaPro não controla tais conteúdos, não garante sua
                disponibilidade e não se responsabiliza por danos, riscos ou prejuízos decorrentes de
                acessos externos ou serviços de terceiros.
              </p>
            </Section>

            <Section number="10" title="PROPRIEDADE INTELECTUAL E CONTEÚDO DO USUÁRIO">
              <SubSection title="10.1 Propriedade da Plataforma">
                <p>
                  Todo o conteúdo da Plataforma VárzeaPro — incluindo logotipo, layout, textos,
                  diagramas, código-fonte, banco de dados, design e elementos visuais — é de propriedade
                  intelectual exclusiva dos desenvolvedores do projeto.
                </p>
                <p>
                  É estritamente proibido copiar, reproduzir, modificar, distribuir ou realizar
                  engenharia reversa de qualquer parte da plataforma sem autorização prévia por escrito.
                </p>
              </SubSection>
              <SubSection title="10.2 Propriedade e Uso do Conteúdo do Usuário">
                <p>
                  <strong>10.2.1.</strong> O usuário declara e garante ser o titular dos direitos de
                  uso das mídias e conteúdo que publica na Plataforma.
                </p>
                <p>
                  <strong>10.2.2.</strong> Ao publicar mídias (fotos e vídeos), o usuário mantém a
                  propriedade dos direitos autorais, mas concede à VárzeaPro uma licença não exclusiva
                  para exibir e utilizar esse conteúdo dentro da plataforma, exclusivamente para os fins
                  de uso regular do sistema e visibilidade do perfil.
                </p>
                <p>
                  <strong>10.2.3. Conteúdo Proibido:</strong> É vedada a publicação de conteúdo
                  difamatório, discriminatório, ofensivo, que contenha imagens de terceiros sem
                  autorização ou que viole quaisquer direitos autorais ou de imagem. A Plataforma se
                  reserva o direito de remover qualquer conteúdo que infrinja esta regra.
                </p>
              </SubSection>
            </Section>

            <Section number="11" title="PRIVACIDADE E PROTEÇÃO DE DADOS (LGPD)">
              <p>
                A plataforma VárzeaPro realiza o tratamento de dados pessoais em estrita conformidade
                com a Lei Geral de Proteção de Dados – LGPD (Lei nº 13.709/2018). Garantimos a
                finalidade específica, a minimização dos dados coletados, a segurança e a
                confidencialidade, bem como a transparência em todas as operações de tratamento.
              </p>
              <SubSection title="11.1 Dados Coletados">
                <p>A VárzeaPro coleta dados estritamente necessários para o funcionamento e a prestação dos seus serviços, que incluem:</p>
                <BulletList items={[
                  { text: "Nome, e-mail, idade e localização aproximada do usuário." },
                  { text: "Informações esportivas do jogador (posições, disponibilidade, habilidades)." },
                  { text: "Informações do time (nome, responsáveis, cidade/região de atuação)." },
                  { text: "Registros de atividades na plataforma (logs de acesso, uso de funcionalidades)." },
                  { text: "Conteúdo de mídias, conversas e mensagens trocadas entre usuários." },
                ]} />
              </SubSection>
              <SubSection title="11.2 Finalidade do Tratamento">
                <p>O tratamento dos dados pessoais coletados possui finalidades específicas e legítimas, que são:</p>
                <BulletList items={[
                  { text: "Garantir o pleno funcionamento e segurança do sistema." },
                  { text: "Criação de perfis detalhados para jogadores e times." },
                  { text: "Mediação da comunicação e conexão entre jogadores e times." },
                  { text: "Melhoria contínua e análise de viabilidade do projeto acadêmico." },
                ]} />
              </SubSection>
              <SubSection title="11.3 Direitos do Usuário">
                <p>O usuário é o titular dos dados e possui plenos direitos garantidos pela LGPD. O usuário pode solicitar:</p>
                <BulletList items={[
                  { text: "Acesso aos seus dados." },
                  { text: "Correção de informações incorretas e desatualizadas." },
                  { text: "Exclusão da conta e dos dados associados (respeitando o período legal de retenção)." },
                  { text: "Revogação do consentimento para o tratamento de dados não essenciais ao funcionamento do serviço." },
                ]} />
                <p className="mt-2">A plataforma não comercializa dados pessoais de seus usuários.</p>
              </SubSection>
              <SubSection title="11.4 Segurança">
                <p>
                  A VárzeaPro emprega medidas de segurança técnicas e administrativas para proteger os
                  dados pessoais contra acesso não autorizado e situações acidentais ou ilícitas de
                  destruição, perda, alteração, comunicação ou difusão.
                </p>
                <p>
                  O usuário reconhece, contudo, que nenhuma plataforma digital oferece risco zero. Como
                  projeto acadêmico, a VárzeaPro opera com medidas de segurança proporcionais ao seu
                  escopo e complexidade.
                </p>
              </SubSection>
            </Section>

            <Section number="12" title="INTERAÇÕES ENTRE USUÁRIOS">
              <SubSection title="12.1 Responsabilidade do Usuário">
                <p>
                  Toda comunicação realizada dentro da plataforma é de responsabilidade exclusiva dos
                  usuários. As interações, mensagens, convites, negociações e quaisquer acordos feitos
                  (como agendamento de testes ou acertos financeiros) são de responsabilidade exclusiva
                  das partes envolvidas.
                </p>
                <p>É estritamente proibido aos usuários enviar:</p>
                <BulletList items={[
                  { text: "Mensagens ofensivas, discriminatórias ou ameaçadoras." },
                  { text: "Convites indevidos, assédio ou conteúdo impróprio." },
                  { text: "Spam ou links maliciosos." },
                ]} />
              </SubSection>
              <SubSection title="12.2 Exclusão de Responsabilidade da Plataforma">
                <p>
                  O VárzeaPro não monitora as conversas em tempo real, mas pode intervir em caso de
                  denúncia. A plataforma não se responsabiliza por:
                </p>
                <BulletList items={[
                  { text: "Comportamentos inadequados ou abusivos dos usuários fora ou dentro da plataforma." },
                  { text: "Atrasos, faltas ou prejuízos (incluindo danos morais ou materiais) resultantes de acordos em partidas." },
                  { text: "Diferenças entre as informações declaradas nos perfis (habilidades, disponibilidade) e a realidade." },
                ]} />
                <p>
                  Casos de abuso ou violação destes Termos, incluindo o envio de conteúdo proibido,
                  podem resultar em suspensão ou banimento da conta, a critério da administração da
                  plataforma.
                </p>
              </SubSection>
            </Section>

            <Section number="13" title="MODERAÇÃO E SUSPENSÃO DE CONTA">
              <p>
                A administração da plataforma VárzeaPro possui a prerrogativa de garantir a integridade
                do ambiente e a segurança de seus usuários. Para tal, os administradores podem suspender,
                limitar ou excluir permanentemente contas que:
              </p>
              <BulletList items={[
                { text: "Violem qualquer disposição estabelecida nestes Termos de Uso." },
                { text: "Infrinjam as regras de conduta e interação." },
                { text: "Causem prejuízo, dano moral ou material a outros usuários ou à reputação da plataforma." },
                { text: "Publiquem conteúdos ilegais, difamatórios ou que sejam considerados danosos." },
                { text: "Utilizem a plataforma de forma contrária ao seu propósito esportivo e comunitário (por exemplo, para fins comerciais não autorizados ou atividades ilícitas)." },
              ]} />
              <p>
                O VárzeaPro também poderá remover conteúdos que violem direitos autorais ou que estejam
                em desacordo com a LGPD. A aplicação de suspensão ou exclusão será feita após análise
                interna, visando proteger a comunidade e manter a conformidade legal.
              </p>
            </Section>

            <Section number="14" title="DISPONIBILIDADE, MANUTENÇÃO E ATUALIZAÇÕES">
              <p>
                Por se tratar de um projeto acadêmico, o VárzeaPro pode passar por instabilidades,
                interrupções temporárias, modificações de funcionalidades ou exclusão de dados sem aviso
                prévio. O usuário reconhece que não há garantia de disponibilidade contínua, integridade
                de informações ou funcionamento permanente da plataforma.
              </p>
            </Section>

            <Section number="15" title="ALTERAÇÕES DOS TERMOS">
              <p>
                A plataforma VárzeaPro se reserva o direito de atualizar e revisar este Termo de Uso e
                as Políticas de Privacidade a qualquer momento, visando aprimorar o serviço, adaptar-se
                a novas legislações ou ajustar as regras de convivência da comunidade.
              </p>
              <p>
                Os usuários serão notificados sobre quaisquer alterações significativas. A continuidade
                do uso da plataforma após a publicação das modificações implica a aceitação integral da
                nova versão do Termo de Uso.
              </p>
            </Section>

            <Section number="16" title="SUPORTE E ATENDIMENTO AO USUÁRIO">
              <p>
                O VárzeaPro disponibiliza um canal oficial de comunicação para o atendimento de dúvidas,
                sugestões, reclamações, denúncias de mau uso ou solicitações relacionadas à privacidade
                e proteção de dados dos usuários.
              </p>
              <p>
                O suporte ao usuário é realizado exclusivamente por meio do endereço eletrônico:{" "}
                <a
                  href="mailto:varzeapro@outlook.com"
                  className="font-bold text-foreground underline decoration-2 underline-offset-4 hover:text-primary transition-colors"
                >
                  varzeapro@outlook.com
                </a>
                .
              </p>
              <p>
                O VárzeaPro envidará os melhores esforços para responder às solicitações enviadas ao
                canal de atendimento supracitado em tempo hábil. Contudo, o usuário declara estar ciente
                de que o tempo de resposta pode variar conforme o volume de demandas e a complexidade da
                solicitação.
              </p>
              <p>
                Fica estabelecido que qualquer notificação ou comunicação oficial entre o VárzeaPro e o
                usuário deverá ser formalizada via correio eletrônico, sendo este o meio reconhecido como
                válido para fins de registro e comprovação de atendimento.
              </p>
            </Section>

            <Section number="17" title="DISPOSIÇÕES FINAIS">
              <p>
                Estes Termos de Uso possuem natureza acadêmica, sendo aplicáveis exclusivamente ao uso
                e às interações realizadas na plataforma no contexto do projeto de pesquisa e
                desenvolvimento do VárzeaPro.
              </p>
              <p>
                Qualquer situação não prevista ou eventual lacuna nestes Termos será analisada e
                resolvida de forma pontual pela equipe responsável pelo desenvolvimento do VárzeaPro,
                sempre buscando a solução mais justa, com base nos princípios de boa-fé, transparência
                e no propósito social do projeto.
              </p>
            </Section>

          </div>

          {/* Footer nav */}
          <div className="mt-16 flex flex-wrap items-center gap-6 border-t-2 border-border pt-8">
            <Link
              to="/"
              className="font-display text-xl tracking-widest text-foreground hover:text-primary transition-colors underline decoration-2 underline-offset-4"
            >
              ← INÍCIO
            </Link>
            <Link
              to="/privacidade"
              className="font-display text-xl tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              POLÍTICA DE PRIVACIDADE →
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t-2 border-border bg-background py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 sm:px-12 md:flex-row">
          <Link to="/" className="font-display text-3xl tracking-widest text-foreground">
            VÁRZEA<span className="text-primary">PRO</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link to="/termos" className="font-bold tracking-widest text-foreground uppercase text-sm underline decoration-2 underline-offset-4">
              TERMOS DE USO
            </Link>
            <Link to="/privacidade" className="font-bold tracking-widest text-muted-foreground uppercase text-sm hover:text-foreground transition-colors">
              PRIVACIDADE
            </Link>
          </div>
          <p className="font-bold tracking-widest text-muted-foreground uppercase text-sm">
            © {new Date().getFullYear()} VárzeaPro. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Local layout components                                              */
/* ------------------------------------------------------------------ */

function Section({
  number,
  title,
  children,
}: {
  number: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-baseline gap-4 border-b-2 border-border pb-3">
        <span className="font-display text-4xl text-primary leading-none">{number}.</span>
        <h2 className="font-display text-2xl tracking-wide text-foreground">{title}</h2>
      </div>
      <div className="space-y-3 text-base leading-relaxed text-foreground/80 pl-2">
        {children}
      </div>
    </section>
  )
}

function SubSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="mt-4 space-y-2">
      <p className="font-bold tracking-wide text-sm uppercase text-foreground border-l-4 border-primary pl-3">
        {title}
      </p>
      <div className="space-y-2 pl-3">
        {children}
      </div>
    </div>
  )
}

function BulletList({
  items,
}: {
  items: { strong?: string; text: string }[]
}) {
  return (
    <ul className="space-y-2 mt-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 bg-primary" />
          <span>
            {item.strong && <strong className="text-foreground">{item.strong} </strong>}
            {item.text}
          </span>
        </li>
      ))}
    </ul>
  )
}
