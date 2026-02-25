import { useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "~/lib/auth/auth-context";
import { getHomeForRole } from "~/lib/auth/permissions";
import { Button } from "~/components/ui/button";

export function meta() {
  return [
    { title: "VárzeaPro - Conectando jogadores e times" },
    {
      name: "description",
      content: "Plataforma para conectar jogadores de futebol amador e times.",
    },
  ];
}

export default function Index() {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && role) {
      navigate(getHomeForRole(role), { replace: true });
    }
  }, [user, role, navigate]);

  if (user && role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="animate-pulse font-display text-2xl tracking-widest text-primary">
          ENTRANDO EM CAMPO...
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary selection:text-primary-foreground">
      {/* Decorative Global Noise */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.015] mix-blend-overlay"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
        }}
      ></div>

      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-40 border-b-2 border-border/10 bg-background/80 px-6 py-4 backdrop-blur-md sm:px-12">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link
            to="/"
            className="font-display text-4xl tracking-wider text-foreground transition-transform hover:scale-105"
          >
            VÁRZEA<span className="text-primary">PRO</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              to="/planos"
              className="hidden font-display text-2xl tracking-wide text-foreground transition-colors hover:text-primary md:block"
            >
              PLANOS
            </Link>
            <Link
              to="/login"
              className="hidden font-display text-2xl tracking-wide text-foreground transition-colors hover:text-primary sm:block"
            >
              ENTRAR
            </Link>
            <Button
              asChild
              className="rounded-none border-2 border-primary bg-primary px-6 font-display text-xl tracking-wider text-primary-foreground transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-primary)] hover:bg-primary"
            >
              <Link to="/cadastro">JOGAR AGORA</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative flex min-h-screen items-center justify-center overflow-hidden border-b-[12px] border-primary px-6 pb-20 pt-40 sm:px-12">
          {/* Geometric Abstract Shapes */}
          <div className="absolute right-0 top-1/4 -z-10 h-[50vh] w-[50vw] rotate-12 bg-primary/20 blur-[150px]"></div>
          <div className="absolute -left-1/4 bottom-0 -z-10 h-[40vh] w-[40vw] -rotate-12 bg-accent/20 blur-[120px]"></div>

          <div className="relative z-10 mx-auto w-full max-w-7xl">
            <div className="flex flex-col justify-between gap-16 md:flex-row md:items-end">
              <div className="max-w-4xl flex-1">
                <div className="mb-6 inline-block -rotate-2 bg-foreground px-4 py-2 font-display text-2xl tracking-widest text-background">
                  O FUTEBOL AMADOR RESPIRA
                </div>
                <h1 className="font-display text-[15vw] leading-[0.8] tracking-tight text-foreground md:text-[9vw] lg:text-[11vw]">
                  ELEVE O NÍVEL <br />
                  <span className="text-transparent [-webkit-text-stroke:2px_var(--color-primary)] dark:[-webkit-text-stroke:2px_var(--color-primary)]">
                    DO SEU TIME
                  </span>
                </h1>

                <p className="mt-10 max-w-xl border-l-4 border-primary pl-6 text-xl font-medium leading-relaxed text-muted-foreground sm:text-2xl">
                  Não é só um jogo de fim de semana. Conecte jogadores, gerencie
                  elencos e domine a várzea com a plataforma definitiva do
                  futebol amador.
                </p>

                <div className="mt-14 flex flex-wrap items-center gap-6">
                  <Button
                    size="lg"
                    asChild
                    className="h-auto rounded-none bg-primary px-8 py-5 font-display text-3xl tracking-widest text-primary-foreground transition-transform hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_var(--color-foreground)] dark:hover:shadow-[6px_6px_0px_0px_var(--color-foreground)] sm:px-12"
                  >
                    <Link to="/cadastro">COMEÇAR AGORA</Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    asChild
                    className="h-auto rounded-none border-2 border-foreground bg-transparent px-8 py-5 font-display text-3xl tracking-widest text-foreground transition-all hover:-translate-y-1 hover:bg-foreground hover:text-background sm:px-12"
                  >
                    <Link to="/login">JÁ TENHO CONTA</Link>
                  </Button>
                </div>
              </div>

              {/* Massive statistical accent */}
              <div className="flex-shrink-0 border-l-4 border-muted pl-8 text-left md:block md:text-right">
                <div className="mb-12 group">
                  <p className="font-display text-8xl text-foreground transition-colors group-hover:text-primary">
                    2.5K
                  </p>
                  <p className="font-display text-xl tracking-widest text-muted-foreground">
                    JOGADORES ATIVOS
                  </p>
                </div>
                <div className="group">
                  <p className="font-display text-8xl text-primary transition-colors group-hover:text-foreground">
                    380+
                  </p>
                  <p className="font-display text-xl tracking-widest text-muted-foreground">
                    TIMES REGISTRADOS
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* BENTO GRID / COMO FUNCIONA */}
        <section className="bg-foreground px-6 py-32 sm:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="mb-20 flex flex-col justify-between gap-8 md:flex-row md:items-end">
              <h2 className="font-display text-[10vw] leading-[0.85] tracking-tight text-background md:text-[6vw]">
                COMO <br />
                <span className="text-primary">FUNCIONA</span>
              </h2>
              <p className="max-w-md text-xl font-medium text-background/70">
                A várzea exige raça, mas a gestão do seu time pode ser
                profissional.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3 md:grid-rows-2">
              {/* Card 1 */}
              <div className="group relative flex flex-col justify-between overflow-hidden bg-background p-10 transition-transform hover:-translate-y-2 md:col-span-2 md:row-span-2">
                <div className="absolute -right-10 -top-10 font-display text-[200px] leading-none text-muted/20 transition-transform group-hover:scale-110">
                  1
                </div>
                <div className="relative z-10 max-w-lg">
                  <h3 className="font-display text-5xl text-foreground sm:text-7xl">
                    CRIE SEU PERFIL
                  </h3>
                  <p className="mt-6 text-xl text-muted-foreground">
                    Jogadores detalham posição, perna boa, e região. Times
                    expõem escudo, dia de jogo e necessidades do elenco. Entre
                    no radar.
                  </p>
                </div>
                <div className="relative z-10 mt-12 aspect-[2/1] w-full border-4 border-foreground bg-muted p-4">
                  <div className="h-full w-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                    <span className="font-display text-3xl text-muted-foreground/50">
                      MOCKUP PERFIL
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2 */}
              <div className="group relative overflow-hidden bg-primary p-10 transition-transform hover:-translate-y-2">
                <div className="absolute -right-4 -top-4 font-display text-[150px] leading-none text-black/10 transition-transform group-hover:scale-110">
                  2
                </div>
                <div className="relative z-10">
                  <h3 className="font-display text-4xl text-primary-foreground sm:text-5xl">
                    BUSCA TÁTICA
                  </h3>
                  <p className="mt-4 text-lg font-medium text-primary-foreground/80">
                    Filtre jogadores por posição, região e nível técnico.
                    Encontre a peça que falta no seu esquema.
                  </p>
                </div>
              </div>

              {/* Card 3 */}
              <div className="group relative overflow-hidden bg-accent p-10 transition-transform hover:-translate-y-2">
                <div className="absolute -right-4 -top-4 font-display text-[150px] leading-none text-black/10 transition-transform group-hover:scale-110">
                  3
                </div>
                <div className="relative z-10">
                  <h3 className="font-display text-4xl text-accent-foreground sm:text-5xl">
                    FECHE O JOGO
                  </h3>
                  <p className="mt-4 text-lg font-medium text-accent-foreground/80">
                    Mensagens diretas. Sem enrolação. Marque o amistoso ou feche
                    a contratação na hora.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SOCIAL PROOF / TESTIMONIALS */}
        <section className="border-t-8 border-primary bg-background px-6 py-32 sm:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-16 lg:grid-cols-2">
              <div>
                <h2 className="font-display text-[8vw] leading-[0.85] text-foreground lg:text-[5vw]">
                  A VOZ DO <br />
                  <span className="text-transparent [-webkit-text-stroke:2px_var(--color-foreground)] dark:[-webkit-text-stroke:2px_var(--color-foreground)]">
                    TERRENO
                  </span>
                </h2>
                <div className="mt-12">
                  <Button
                    size="lg"
                    asChild
                    className="h-auto rounded-none bg-foreground px-8 py-5 font-display text-2xl tracking-widest text-background transition-transform hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-primary)]"
                  >
                    <Link to="/cadastro">JUNTE-SE AOS +2.5K</Link>
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-8">
                <blockquote className="border-l-8 border-primary bg-muted/40 p-8 sm:p-12 transition-colors hover:bg-muted/80">
                  <p className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
                    "Toda sexta era um sufoco pra achar goleiro. No VárzeaPro a
                    gente acha jogador comprometido com 2 cliques. Mudou nossa
                    rotina."
                  </p>
                  <footer className="mt-8 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-none bg-foreground"></div>
                    <div>
                      <p className="font-display text-xl text-foreground">
                        BRUNO ALVES
                      </p>
                      <p className="text-sm font-bold tracking-widest text-muted-foreground">
                        CAPITÃO, REAL MADRUGA
                      </p>
                    </div>
                  </footer>
                </blockquote>

                <blockquote className="border-l-8 border-accent bg-muted/40 p-8 sm:p-12 transition-colors hover:bg-muted/80">
                  <p className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
                    "Fiquei sem time depois que mudei de bairro. Filtrei por
                    lateral-direito na zona sul e no mesmo dia tava treinando
                    com a rapaziada."
                  </p>
                  <footer className="mt-8 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-none bg-foreground"></div>
                    <div>
                      <p className="font-display text-xl text-foreground">
                        RAFAEL SILVA
                      </p>
                      <p className="text-sm font-bold tracking-widest text-muted-foreground">
                        JOGADOR LIVRE
                      </p>
                    </div>
                  </footer>
                </blockquote>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING PREVIEW */}
        <section className="border-t-8 border-foreground bg-background px-6 py-32 sm:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="mb-16 text-center">
              <h2 className="font-display text-[10vw] leading-[0.85] text-foreground md:text-[6vw]">
                QUANTO{" "}
                <span className="text-transparent [-webkit-text-stroke:2px_var(--color-primary)]">
                  CUSTA
                </span>
                ?
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-xl font-medium text-muted-foreground">
                Jogadores jogam de graça. Times investem no elenco.
                A busca é sempre justa.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {/* Player Free */}
              <div className="border-4 border-foreground bg-background p-8 transition-transform hover:-translate-y-2 hover:shadow-[6px_6px_0px_0px_var(--color-primary)]">
                <p className="font-display text-sm tracking-widest text-muted-foreground">
                  JOGADOR
                </p>
                <h3 className="mt-2 font-display text-4xl text-foreground">
                  LIVRE
                </h3>
                <p className="mt-1 font-display text-5xl text-primary">
                  GRÁTIS
                </p>
                <ul className="mt-6 space-y-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  <li>Perfil completo</li>
                  <li>Buscar times sem limite</li>
                  <li>10 mensagens/mês</li>
                </ul>
              </div>

              {/* Team Titular */}
              <div className="relative border-4 border-primary bg-background p-8 shadow-[6px_6px_0px_0px_var(--color-primary)] transition-transform hover:-translate-y-2">
                <div className="absolute -right-2 -top-4 rotate-2 bg-primary px-3 py-1 font-display text-xs tracking-widest text-primary-foreground">
                  MAIS POPULAR
                </div>
                <p className="font-display text-sm tracking-widest text-muted-foreground">
                  TIME
                </p>
                <h3 className="mt-2 font-display text-4xl text-foreground">
                  TITULAR
                </h3>
                <p className="mt-1">
                  <span className="font-display text-lg text-muted-foreground">
                    R$
                  </span>
                  <span className="font-display text-5xl text-primary">
                    29,90
                  </span>
                  <span className="text-sm font-bold text-muted-foreground">
                    /mês
                  </span>
                </p>
                <ul className="mt-6 space-y-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  <li>Busca ilimitada</li>
                  <li>Mensagens ilimitadas</li>
                  <li>Filtros avançados</li>
                </ul>
              </div>

              {/* Team Campeao */}
              <div className="border-4 border-foreground bg-background p-8 transition-transform hover:-translate-y-2 hover:shadow-[6px_6px_0px_0px_var(--color-foreground)]">
                <p className="font-display text-sm tracking-widest text-muted-foreground">
                  TIME
                </p>
                <h3 className="mt-2 font-display text-4xl text-foreground">
                  CAMPEÃO
                </h3>
                <p className="mt-1">
                  <span className="font-display text-lg text-muted-foreground">
                    R$
                  </span>
                  <span className="font-display text-5xl text-foreground">
                    59,90
                  </span>
                  <span className="text-sm font-bold text-muted-foreground">
                    /mês
                  </span>
                </p>
                <ul className="mt-6 space-y-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  <li>Tudo do Titular</li>
                  <li>Analytics + Recomendações AI</li>
                  <li>Mensagem em massa</li>
                </ul>
              </div>
            </div>

            <div className="mt-12 flex justify-center">
              <Button
                asChild
                className="h-auto rounded-none border-4 border-foreground bg-foreground px-10 py-5 font-display text-3xl tracking-widest text-background transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_var(--color-primary)]"
              >
                <Link to="/planos">VER TODOS OS PLANOS</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* FINAL CTA MASSIVE */}
        <section className="bg-primary px-6 py-40 sm:px-12">
          <div className="mx-auto flex max-w-7xl flex-col items-center text-center">
            <h2 className="font-display text-[12vw] leading-[0.8] text-primary-foreground md:text-[8vw]">
              ENTRE EM CAMPO
            </h2>
            <p className="mt-8 max-w-2xl text-2xl font-medium text-primary-foreground/90">
              Crie sua conta agora e leve a gestão do seu time para o próximo
              patamar. A várzea nunca mais será a mesma.
            </p>
            <Button
              size="lg"
              asChild
              className="mt-14 h-auto rounded-none border-4 border-foreground bg-foreground px-12 py-6 font-display text-4xl tracking-widest text-background transition-all hover:scale-105 hover:bg-transparent hover:text-foreground"
            >
              <Link to="/cadastro">CRIAR CONTA GRÁTIS</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-border bg-background py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 sm:px-12 md:flex-row">
          <p className="font-display text-3xl tracking-widest text-foreground">
            VÁRZEA<span className="text-primary">PRO</span>
          </p>
          <p className="font-bold tracking-widest text-muted-foreground uppercase text-sm">
            © {new Date().getFullYear()} VárzeaPro. Todos os direitos
            reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
