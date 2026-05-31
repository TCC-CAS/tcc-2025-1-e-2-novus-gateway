import { Link } from "react-router"
import { GlobalHeader } from "~/components/global-header"

export function meta() {
  return [
    { title: "Política de Privacidade - VárzeaPro" },
    { name: "description", content: "Política de Privacidade da plataforma VárzeaPro." },
  ]
}

export default function Privacidade() {
  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary selection:text-primary-foreground">
      <GlobalHeader />

      <main className="flex-1 px-6 py-16 sm:px-12">
        <div className="mx-auto max-w-3xl">
          {/* Header */}
          <div className="mb-12 border-b-4 border-foreground pb-10">
            <div className="mb-4 inline-block bg-primary px-3 py-1 font-display text-lg tracking-widest text-primary-foreground">
              DOCUMENTO LEGAL
            </div>
            <h1 className="font-display text-[14vw] leading-[0.85] tracking-tight text-foreground sm:text-[7vw]">
              POLÍTICA<br />
              <span className="text-transparent [-webkit-text-stroke:2px_var(--color-foreground)] dark:[-webkit-text-stroke:2px_var(--color-foreground)]">
                DE PRIVACIDADE
              </span>
            </h1>
            <p className="mt-6 font-bold tracking-widest text-muted-foreground text-xs uppercase">
              Última atualização: 31 de maio de 2026
            </p>
          </div>

          {/* Intro */}
          <div className="mb-12 space-y-4 border-l-4 border-primary pl-6 text-base leading-relaxed text-foreground/80">
            <p>
              A presente Política de Privacidade descreve como o VárzeaPro coleta, utiliza, armazena,
              compartilha e protege os dados pessoais de seus usuários, em conformidade com a Lei Geral
              de Proteção de Dados Pessoais – LGPD (Lei nº 13.709/2018).
            </p>
            <p>
              Ao utilizar o aplicativo ou o site do VárzeaPro, o usuário declara estar ciente e concordar
              com as práticas de privacidade descritas neste documento.
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-12">

            <Section number="1" title="FINALIDADE DA COLETA DE DADOS">
              <p>O VárzeaPro coleta dados pessoais com a finalidade de:</p>
              <BulletList items={[
                { text: "possibilitar a criação e manutenção de perfis de jogadores e times;" },
                { text: "segmentar o motor de busca tática de acordo com a identidade de gênero/modalidade esportiva, direcionando atletas para elencos masculinos, femininos ou de categorias mistas (\"Prefiro não dizer\");" },
                { text: "indexar informações em um motor de busca pública, permitindo que visitantes não cadastrados visualizem dados básicos dos perfis para fomentar a atratividade e utilidade do ecossistema;" },
                { text: "viabilizar a rede de relacionamentos da plataforma através do sistema de \"Conexões\" mútuas e da montagem e exibição pública do \"Elenco\" das agremiações;" },
                { text: "permitir comunicação entre usuários via mensagens;" },
                { text: "exibir informações esportivas relevantes (posições, habilidades, localização geral etc.);" },
                { text: "aprimorar continuamente o sistema, seu desempenho e usabilidade;" },
                { text: "cumprir obrigações legais e atender solicitações regulatórias, quando aplicável." },
              ]} />
              <p>
                Nenhum dado é coletado sem finalidade específica, em respeito ao princípio da necessidade
                e minimização previsto na LGPD.
              </p>
            </Section>

            <Section number="2" title="DADOS COLETADOS">
              <p>O VárzeaPro pode coletar os seguintes dados, conforme o uso:</p>
              <SubSection title="2.1 Dados cadastrais">
                <BulletList items={[
                  { text: "Nome completo (ou nome do responsável legal, no caso de perfis de Times)" },
                  { text: "Cadastro de Pessoas Físicas (CPF) válido (obrigatório para atletas e para o responsável legal do Time)" },
                  { text: "E-mail de contato" },
                  { text: "Senha (armazenada de forma criptografada)" },
                  { text: "Data de nascimento" },
                  { text: "Gênero/Modalidade de atuação (Masculino, Feminino ou Prefiro não dizer)" },
                  { text: "Cidade e região aproximada" },
                ]} />
              </SubSection>
              <SubSection title="2.2 Dados de perfil esportivo">
                <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">(para jogadores)</p>
                <BulletList items={[
                  { text: "Posição principal e secundárias" },
                  { text: "Disponibilidade de horários" },
                  { text: "Fotos e vídeos esportivos (mídias)" },
                  { text: "Histórico esportivo informado voluntariamente" },
                  { text: "Histórico de conexões aceitas e estabelecidas" },
                ]} />
                <p className="mt-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">(para times)</p>
                <BulletList items={[
                  { text: "Nome oficial da agremiação" },
                  { text: "Nome completo e CPF do Responsável Legal pelo clube" },
                  { text: "Localização geográfica exata de atuação (Bairro/Cidade)" },
                  { text: "Vagas e posições desejadas" },
                  { text: "Lista de jogadores vinculados ao \"Elenco\" público do time" },
                ]} />
              </SubSection>
              <SubSection title="2.3 Dados gerados automaticamente">
                <BulletList items={[
                  { text: "Logs de acesso" },
                  { text: "Ações dentro do app (cliques, buscas, interações)" },
                  { text: "Dados técnicos do dispositivo (modelo, sistema operacional, versão do app)" },
                  { text: "Endereço IP aproximado" },
                ]} />
              </SubSection>
              <SubSection title="2.4 Dados fornecidos em comunicações internas">
                <BulletList items={[
                  { text: "Mensagens enviadas pelo chat interno" },
                  { text: "Histórico de interações entre jogadores e times" },
                ]} />
              </SubSection>
              <p className="mt-4 border-l-4 border-muted pl-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                O VárzeaPro não coleta dados sensíveis, como origem racial, convicções religiosas, dados biométricos ou informações financeiras.
              </p>
            </Section>

            <Section number="3" title="BASES LEGAIS PARA O TRATAMENTO DE DADOS">
              <p>
                O tratamento de dados pessoais realizado pelo VárzeaPro observa rigorosamente as
                disposições da LGPD – Lei nº 13.709/2018, adotando bases legais específicas conforme a
                finalidade de cada operação de tratamento.
              </p>
              <SubSection title="3.1 Consentimento do titular (Art. 7º, I, LGPD)">
                <p>O consentimento é utilizado como base legal para:</p>
                <BulletList items={[
                  { text: "criação da conta do usuário (Jogador ou Time) e coleta inicial do gênero e CPF;" },
                  { text: "envio de fotos, vídeos e demais mídias esportivas;" },
                  { text: "disponibilização de dados básicos do perfil no motor de busca pública para visualização por Visitantes não autenticados;" },
                  { text: "uso de localização aproximada para melhorar a busca de jogadores/times;" },
                  { text: "exibição pública do perfil esportivo dentro da plataforma;" },
                  { text: "recebimento de notificações internas." },
                ]} />
                <p>
                  O consentimento é livre, informado e inequívoco, podendo ser revogado a qualquer
                  momento pelo usuário, nos termos do Art. 8º da LGPD. Em caso de revogação,
                  determinados serviços podem deixar de funcionar, mas o usuário continuará tendo
                  acesso aos seus direitos previstos na legislação.
                </p>
              </SubSection>
              <SubSection title="3.2 Cumprimento de obrigação legal ou regulatória (Art. 7º, II, LGPD)">
                <p>Determinadas situações exigem o tratamento e a preservação de dados para:</p>
                <BulletList items={[
                  { text: "atender requisições judiciais;" },
                  { text: "cooperar com investigações de autoridades competentes;" },
                  { text: "registrar logs mínimos de acesso, conforme o Marco Civil da Internet (Lei nº 12.965/2014);" },
                  { text: "prevenir atividades ilícitas, fraudes ou comportamentos que violem termos legais." },
                ]} />
              </SubSection>
              <SubSection title="3.3 Execução de contrato e procedimentos preliminares (Art. 7º, V, LGPD)">
                <p>
                  Ainda que o VárzeaPro seja um projeto acadêmico, a relação estabelecida entre
                  plataforma e usuário caracteriza uma relação contratual para fins da LGPD. Assim,
                  são tratados dados necessários para:
                </p>
                <BulletList items={[
                  { text: "a utilização do CPF como chave única de validação para impedir a duplicidade de contas e fraudes cadastrais;" },
                  { text: "a entrega dos limites operacionais atrelados a cada plano (Livre, Craque, Fenômeno para atletas; Pelada e Profissional para clubes);" },
                  { text: "o funcionamento das mensagens diretas (\"Resenha\") e do ecossistema de conexões;" },
                  { text: "permitir o funcionamento de perfis e interações;" },
                  { text: "possibilitar a comunicação interna entre jogadores e times;" },
                  { text: "administrar convites para partidas, treinos e competições;" },
                  { text: "viabilizar funcionalidades essenciais do aplicativo." },
                ]} />
              </SubSection>
              <SubSection title="3.4 Interesse legítimo do controlador (Art. 7º, IX, LGPD)">
                <p>No VárzeaPro, aplica-se para:</p>
                <BulletList items={[
                  { text: "aprimoramento da experiência do usuário (UX);" },
                  { text: "prevenção a abusos, spam e uso indevido da plataforma;" },
                  { text: "manutenção da segurança e integridade do sistema;" },
                  { text: "análises internas e estatísticas para melhoria do projeto acadêmico;" },
                  { text: "moderação de conteúdo em casos de denúncia." },
                ]} />
              </SubSection>
              <SubSection title="3.5 Observância dos princípios da LGPD">
                <p>Todos os tratamentos respeitam integralmente os princípios essenciais da legislação:</p>
                <BulletList items={[
                  { strong: "Finalidade –", text: "tratamento para propósitos legítimos e informados ao titular;" },
                  { strong: "Adequação –", text: "compatibilidade entre dados coletados e a finalidade declarada;" },
                  { strong: "Necessidade –", text: "limitação do tratamento ao mínimo necessário;" },
                  { strong: "Transparência –", text: "informações claras e facilmente acessíveis ao titular;" },
                  { strong: "Segurança –", text: "adoção de medidas técnicas e administrativas para proteger dados;" },
                  { strong: "Responsabilização –", text: "comprovação das boas práticas adotadas." },
                ]} />
              </SubSection>
            </Section>

            <Section number="4" title="COMO OS DADOS SÃO UTILIZADOS">
              <p>Os dados coletados podem ser usados para:</p>
              <BulletList items={[
                { text: "exibir perfis de jogadores e times dentro da plataforma;" },
                { text: "permitir a troca de mensagens entre usuários;" },
                { text: "melhorar precisão das buscas e recomendações;" },
                { text: "garantir segurança, prevenção a fraudes e moderação;" },
                { text: "realizar estatísticas e análises internas para melhorar o projeto;" },
                { text: "enviar notificações sobre interações, convites ou atualizações." },
              ]} />
              <p className="border-l-4 border-primary pl-4 font-bold tracking-wide text-sm uppercase text-foreground mt-4">
                O VárzeaPro não vende, não aluga e não comercializa dados pessoais.
              </p>
            </Section>

            <Section number="5" title="COMPARTILHAMENTO DE DADOS">
              <p>Os dados do usuário podem ser compartilhados apenas nos seguintes casos:</p>
              <SubSection title="5.1 Internamente entre usuários">
                <BulletList items={[
                  { strong: "Visitantes (Não logados):", text: "Podem visualizar informações públicas e resumidas de perfis (nome, foto, região, posição e elenco do time) por meio do motor de busca aberta da plataforma." },
                  { strong: "Usuários Cadastrados:", text: "Podem explorar perfis detalhados de atletas e equipes através dos filtros de busca tática segmentados por região, nível e modalidade de gênero." },
                  { strong: "Usuários Conectados:", text: "Estabelecem um vínculo de rede que autoriza a visualização mútua de portfólios estendidos, galerias completas de mídia e troca de mensagens diretas." },
                  { strong: "Membros do Elenco:", text: "Os atletas vinculados a um clube terão seus nomes e perfis associados publicamente à listagem de elenco da respectiva agremiação." },
                ]} />
              </SubSection>
              <SubSection title="5.2 Terceiros essenciais à operação">
                <p>Exemplos: provedores de hospedagem (cloud), serviços de autenticação, ferramentas de análise de uso. Todos seguem padrões de segurança compatíveis com a LGPD.</p>
              </SubSection>
              <SubSection title="5.3 Obrigações legais">
                <p>Dados podem ser fornecidos mediante ordem judicial, requisição do Ministério Público ou investigações legais.</p>
              </SubSection>
            </Section>

            <Section number="6" title="ARMAZENAMENTO E SEGURANÇA">
              <p>
                O VárzeaPro adota um conjunto de medidas técnicas e administrativas destinadas a proteger
                os dados pessoais contra acessos não autorizados, vazamentos, alterações indevidas,
                destruição acidental ou qualquer outra forma de tratamento inadequado.
              </p>
              <SubSection title="6.1 Local de Armazenamento">
                <p>
                  Os dados são armazenados em provedores de computação em nuvem reconhecidos
                  internacionalmente, com infraestrutura certificada em normas como ISO/IEC 27001, SOC 2
                  e PCI DSS, mecanismos robustos de controle de acesso e monitoramento contínuo.
                </p>
              </SubSection>
              <SubSection title="6.2 Segurança de Senhas">
                <p>
                  Todas as senhas são armazenadas com algoritmos de hash modernos, com aplicação de salt
                  e múltiplas iterações, garantindo que as credenciais permaneçam protegidas mesmo em
                  caso de comprometimento da base de dados.
                </p>
              </SubSection>
              <SubSection title="6.3 Retenção de Dados">
                <BulletList items={[
                  { text: "Os dados são mantidos enquanto a conta estiver ativa." },
                  { text: "Contas inativas por mais de 12 meses poderão ser desativadas automaticamente." },
                  { text: "Após a desativação, dados poderão ser anonimizados ou excluídos, salvo obrigação legal." },
                  { text: "O usuário poderá solicitar a exclusão de seus dados a qualquer momento." },
                ]} />
              </SubSection>
              <SubSection title="6.4 Princípios de Segurança Adotados">
                <BulletList items={[
                  { strong: "Confidencialidade –", text: "somente pessoas autorizadas têm acesso às informações;" },
                  { strong: "Integridade –", text: "dados protegidos contra alterações indevidas;" },
                  { strong: "Disponibilidade –", text: "recursos acessíveis conforme os limites do projeto acadêmico;" },
                  { strong: "Minimização –", text: "coleta apenas do necessário ao funcionamento." },
                ]} />
              </SubSection>
              <SubSection title="6.5 Limitações da Segurança">
                <p>
                  Nenhum ambiente digital pode garantir segurança absoluta. O usuário reconhece que a
                  transmissão de dados pela internet envolve riscos e que a segurança depende também de
                  práticas individuais, como uso adequado de senhas e dispositivos atualizados.
                </p>
              </SubSection>
            </Section>

            <Section number="7" title="DIREITOS DO USUÁRIO (LGPD)">
              <p>O usuário pode exercer, a qualquer momento, os seguintes direitos:</p>
              <BulletList items={[
                { text: "Acesso aos dados pessoais" },
                { text: "Correção de dados incompletos ou desatualizados" },
                { text: "Exclusão de dados e da conta" },
                { text: "Revogação do consentimento" },
                { text: "Portabilidade" },
                { text: "Solicitação de informações sobre uso e compartilhamento" },
              ]} />
              <p>Para exercer tais direitos, entre em contato pelo e-mail institucional do projeto.</p>
            </Section>

            <Section number="8" title="RETENÇÃO E EXCLUSÃO DE DADOS">
              <p>Os dados serão mantidos enquanto:</p>
              <BulletList items={[
                { text: "a conta estiver ativa;" },
                { text: "houver necessidade acadêmica para o projeto;" },
                { text: "for necessário para cumprir obrigações legais." },
              ]} />
              <p>Após solicitação de exclusão, os dados serão removidos, exceto quando a lei exigir retenção.</p>
            </Section>

            <Section number="9" title="COOKIES E TECNOLOGIAS SIMILARES">
              <p>
                O VárzeaPro poderá utilizar cookies e tecnologias similares (como local storage, session
                storage, pixels e identificadores de dispositivo) com o objetivo de melhorar o
                desempenho, a personalização e a segurança da plataforma.
              </p>
              <SubSection title="9.1 O que são cookies?">
                <p>
                  Cookies são pequenos arquivos armazenados no navegador do usuário que permitem
                  identificar preferências, registrar atividades e manter sessões ativas. Não são
                  executáveis e não contêm vírus ou programas maliciosos.
                </p>
              </SubSection>
              <SubSection title="9.2 Finalidades do uso de cookies">
                <p className="font-bold tracking-wide text-sm uppercase text-foreground mb-1">Cookies estritamente necessários</p>
                <BulletList items={[
                  { text: "autenticação do usuário;" },
                  { text: "manutenção da sessão;" },
                  { text: "segurança e prevenção de fraudes." },
                ]} />
                <p className="font-bold tracking-wide text-sm uppercase text-foreground mt-4 mb-1">Cookies de desempenho e estatísticas</p>
                <BulletList items={[
                  { text: "medir tráfego e padrões de navegação;" },
                  { text: "identificar erros técnicos e melhorar a usabilidade;" },
                  { text: "realizar análises internas e acadêmicas." },
                ]} />
                <p className="font-bold tracking-wide text-sm uppercase text-foreground mt-4 mb-1">Cookies de funcionalidade</p>
                <BulletList items={[
                  { text: "guardar preferências do usuário (idioma, configurações de exibição, filtros de busca)." },
                ]} />
              </SubSection>
              <SubSection title="9.3 Consentimento e gerenciamento de cookies">
                <p>
                  Quando não forem estritamente necessários, cookies poderão depender de consentimento
                  do usuário. O usuário pode configurar seu navegador para bloquear todos os cookies,
                  excluir históricos ou ser avisado antes da gravação. Entretanto, o bloqueio de alguns
                  tipos pode comprometer funcionalidades como login automático e persistência de sessão.
                </p>
              </SubSection>
              <SubSection title="9.4 Cookies de terceiros">
                <p>
                  Caso sejam integrados recursos externos (mapas, vídeos, hospedagem de mídia), provedores
                  terceirizados podem utilizar seus próprios cookies. O VárzeaPro não controla tecnologias
                  de terceiros e não se responsabiliza pela forma como tais serviços tratam dados.
                </p>
              </SubSection>
            </Section>

            <Section number="10" title="USO DE MÍDIAS (FOTOS E VÍDEOS)">
              <p>Ao enviar fotos e vídeos, o usuário declara:</p>
              <BulletList items={[
                { text: "ser titular dos direitos sobre o conteúdo;" },
                { text: "autorizar sua exibição somente dentro da plataforma;" },
                { text: "entender que mídias impróprias, violentas ou ofensivas serão removidas." },
              ]} />
              <p>O VárzeaPro não redistribui, lucra ou reutiliza essas mídias fora do sistema.</p>
            </Section>

            <Section number="11" title="LINKS E CONTEÚDOS DE TERCEIROS">
              <p>Links externos presentes nas mensagens ou nos perfis não são controlados pela plataforma.</p>
              <p>O VárzeaPro não se responsabiliza por conteúdo externo, práticas de privacidade de terceiros ou danos decorrentes de acesso externo.</p>
            </Section>

            <Section number="12" title="SEGURANÇA NAS INTERAÇÕES">
              <p>
                O VárzeaPro não exerce controle prévio sobre o teor das interações, nem realiza
                monitoramento contínuo das mensagens trocadas entre os usuários. Todas as conversas,
                convites, combinações e negociações são de responsabilidade exclusiva dos usuários.
              </p>
              <SubSection title="12.1 Limitações de responsabilidade nas interações">
                <p>O VárzeaPro não se responsabiliza por:</p>
                <BulletList items={[
                  { text: "Comportamentos inadequados, incluindo ofensas, ameaças ou condutas discriminatórias." },
                  { text: "Golpes, fraudes ou informações falsas declaradas por usuários." },
                  { text: "Encontros presenciais organizados fora da plataforma — todo encontro é feito por livre escolha e risco do usuário." },
                ]} />
              </SubSection>
              <SubSection title="12.2 Orientações de segurança">
                <BulletList items={[
                  { text: "Evite compartilhar informações pessoais sensíveis." },
                  { text: "Verifique identidades antes de confirmar participações." },
                  { text: "Desconfie de propostas que pareçam suspeitas." },
                  { text: "Combine encontros em locais públicos e horários adequados." },
                  { text: "Não envie valores sem verificação prévia." },
                ]} />
              </SubSection>
              <SubSection title="12.3 Mecanismos de denúncia e moderação">
                <p>
                  O VárzeaPro disponibiliza canais internos para denúncia de comportamentos inadequados.
                  Em caso de denúncia, a equipe administradora analisará o caso e poderá aplicar
                  advertência, suspensão ou exclusão de conta.
                </p>
              </SubSection>
            </Section>

            <Section number="13" title="ENCERRAMENTO DO PROJETO E DISPONIBILIDADE">
              <p>Por se tratar de um projeto acadêmico, o VárzeaPro pode:</p>
              <BulletList items={[
                { text: "mudar funcionalidades;" },
                { text: "pausar ou encerrar operações;" },
                { text: "excluir dados ao término da pesquisa." },
              ]} />
              <p>Nenhuma garantia de continuidade é oferecida.</p>
            </Section>

            <Section number="14" title="ALTERAÇÕES DESTA POLÍTICA">
              <p>
                O VárzeaPro poderá atualizar, modificar ou substituir a presente Política de Privacidade
                sempre que necessário. Todas as alterações serão publicadas em local de fácil acesso
                dentro da plataforma.
              </p>
              <p>
                A continuidade do uso do aplicativo ou site após a divulgação das alterações será
                interpretada como aceitação plena e inequívoca da nova versão.
              </p>
            </Section>

            <Section number="15" title="CONTATO PARA DÚVIDAS OU SOLICITAÇÕES">
              <p>
                O VárzeaPro disponibiliza um canal institucional para esclarecimento de dúvidas,
                solicitações relacionadas ao tratamento de dados pessoais e exercício dos direitos
                previstos na LGPD.
              </p>
              <p>
                Entre em contato pelo endereço eletrônico:{" "}
                <a
                  href="mailto:varzeapro@outlook.com"
                  className="font-bold text-foreground underline decoration-2 underline-offset-4 hover:text-primary transition-colors"
                >
                  varzeapro@outlook.com
                </a>
                . Todas as solicitações serão analisadas e respondidas dentro de prazo razoável, observando-se
                os princípios de transparência, segurança e boa-fé.
              </p>
            </Section>

          </div>

          {/* Footer nav */}
          <div className="mt-16 flex flex-wrap items-center gap-6 border-t-2 border-border pt-8">
            <Link
              to="/termos"
              className="font-display text-xl tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              ← TERMOS DE USO
            </Link>
            <Link
              to="/"
              className="font-display text-xl tracking-widest text-foreground hover:text-primary transition-colors underline decoration-2 underline-offset-4"
            >
              INÍCIO →
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
            <Link to="/termos" className="font-bold tracking-widest text-muted-foreground uppercase text-sm hover:text-foreground transition-colors">
              TERMOS DE USO
            </Link>
            <Link to="/privacidade" className="font-bold tracking-widest text-foreground uppercase text-sm underline decoration-2 underline-offset-4">
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
