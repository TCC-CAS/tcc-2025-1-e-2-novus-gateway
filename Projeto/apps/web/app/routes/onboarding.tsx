import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useAuth } from "~/lib/auth/auth-context";
import { getHomeForRole } from "~/lib/auth/permissions";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { POSITIONS } from "~shared/contracts";
import { TEAM_LEVELS } from "~shared/contracts";
import type { Position, TeamLevel } from "~shared/contracts";
import { playersApi, teamsApi } from "~/lib/api-client";
import { Check, ChevronLeft, ChevronRight, Trophy } from "lucide-react";

export function meta() {
  return [{ title: "Configurar perfil - VárzeaPro" }];
}

const PLAYER_STEPS = [
  "BEM-VINDO",
  "POSIÇÃO E HABILIDADES",
  "DADOS FÍSICOS",
  "TUDO PRONTO",
] as const;
const TEAM_STEPS = [
  "BEM-VINDO",
  "DADOS DO TIME",
  "POSIÇÕES ABERTAS",
  "TUDO PRONTO",
] as const;

const DAYS_OF_WEEK = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"] as const;

const POSITION_LABELS: Record<string, string> = {
  goleiro: "GOLEIRO",
  lateral: "LATERAL",
  zagueiro: "ZAGUEIRO",
  volante: "VOLANTE",
  meia: "MEIA",
  atacante: "ATACANTE",
};

export default function Onboarding() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const [playerPositions, setPlayerPositions] = useState<string[]>([]);
  const [playerBio, setPlayerBio] = useState("");
  const [playerSkills, setPlayerSkills] = useState<string[]>([]);
  const [playerHeight, setPlayerHeight] = useState("");
  const [playerWeight, setPlayerWeight] = useState("");
  const [playerAvailability, setPlayerAvailability] = useState<string[]>([]);
  const [playerPhone, setPlayerPhone] = useState("");

  const [teamName, setTeamName] = useState("");
  const [teamLevel, setTeamLevel] = useState("amador");
  const [teamRegion, setTeamRegion] = useState("");
  const [teamCity, setTeamCity] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [teamOpenPositions, setTeamOpenPositions] = useState<string[]>([]);
  const [teamMatchDays, setTeamMatchDays] = useState<string[]>([]);

  useEffect(() => {
    if (!user || !role) {
      navigate("/login", { replace: true });
    }
  }, [user, role, navigate]);

  const isPlayer = role === "player";
  const steps = isPlayer ? PLAYER_STEPS : TEAM_STEPS;
  const totalSteps = steps.length;

  async function handleFinish() {
    try {
      if (isPlayer) {
        await playersApi.upsert({
          name: user!.name,
          positions: playerPositions as Position[],
          bio: playerBio || undefined,
          skills: playerSkills,
          height: playerHeight ? Number(playerHeight) : undefined,
          weight: playerWeight ? Number(playerWeight) : undefined,
          phone: playerPhone || undefined,
          availability: playerAvailability.length > 0 ? playerAvailability.join(", ") : undefined,
        });
      } else {
        await teamsApi.upsert({
          name: teamName.trim() || user!.name,
          level: teamLevel as TeamLevel,
          region: teamRegion || undefined,
          city: teamCity || undefined,
          description: teamDescription || undefined,
          openPositions: teamOpenPositions,
          matchDays: teamMatchDays.length > 0 ? teamMatchDays : undefined,
        });
      }
    } catch {
      toast.error("Não foi possível salvar o perfil. Edite depois no seu vestiário.");
    }
    toast.success("Perfil configurado!");
    navigate(getHomeForRole(role!), { replace: true });
  }

  function toggleInArray(
    arr: string[],
    value: string,
    setter: (v: string[]) => void,
  ) {
    setter(
      arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
    );
  }

  if (!user || !role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="font-display text-2xl animate-pulse text-primary tracking-widest">
          CARREGANDO...
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background selection:bg-primary selection:text-primary-foreground relative overflow-x-hidden">
      {/* Decorative Global Noise */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.015] mix-blend-overlay"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
        }}
      ></div>

      <header className="border-b-4 border-foreground bg-primary relative z-10">
        <div className="container flex h-20 items-center justify-between px-6">
          <span className="font-display text-3xl tracking-wider text-foreground">
            VÁRZEA<span className="text-primary-foreground">PRO</span>
          </span>
          <button
            type="button"
            onClick={handleFinish}
            className="font-bold tracking-widest text-sm uppercase text-foreground hover:text-primary-foreground transition-colors underline decoration-2 underline-offset-4"
          >
            PULAR ETAPAS
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 py-12 relative z-10">
        <div className="w-full max-w-2xl bg-background p-8 md:p-12 border-4 border-foreground shadow-[8px_8px_0px_0px_var(--color-primary)] transition-all hover:shadow-[12px_12px_0px_0px_var(--color-foreground)] dark:hover:shadow-[12px_12px_0px_0px_var(--color-foreground)]">
          {/* Brutalist Progress */}
          <div className="mb-10 border-b-4 border-foreground pb-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between font-display text-foreground uppercase gap-2">
              <span className="text-2xl tracking-widest text-muted-foreground">
                ETAPA {step + 1} // {totalSteps}
              </span>
              <span className="text-3xl tracking-wide text-primary">
                {steps[step]}
              </span>
            </div>
            <div className="mt-6 flex gap-3">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-4 flex-1 transition-all duration-300 border-2 border-foreground",
                    i <= step ? "bg-primary" : "bg-transparent opacity-30",
                  )}
                />
              ))}
            </div>
          </div>

          <div className="min-h-[400px]">
            {/* PLAYER FLOW */}
            {isPlayer && step === 0 && (
              <div className="space-y-8 flex flex-col items-center justify-center text-center h-full pt-10">
                <div className="flex size-24 items-center justify-center border-4 border-foreground bg-primary shadow-[4px_4px_0px_0px_var(--color-foreground)] dark:shadow-[4px_4px_0px_0px_var(--color-foreground)]">
                  <Trophy className="size-12 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="font-display text-5xl tracking-wide text-foreground uppercase">
                    BEM-VINDO, {user.name}!
                  </h1>
                  <p className="mt-6 text-lg font-medium text-muted-foreground max-w-md mx-auto">
                    Vamos montar seu perfil de jogador. Preencha o que quiser
                    agora — você pode editar o resto no vestiário depois.
                  </p>
                </div>
              </div>
            )}

            {isPlayer && step === 1 && (
              <div className="space-y-8 animation-fade-in">
                <div>
                  <h2 className="font-display text-4xl tracking-wide text-foreground">
                    CARACTERÍSTICAS
                  </h2>
                  <p className="mt-2 font-bold tracking-widest text-sm text-muted-foreground uppercase">
                    SELECIONE SUAS POSIÇÕES E CONTE O QUE VOCÊ FAZ DE MELHOR.
                  </p>
                </div>

                <div className="space-y-4">
                  <Label className="font-display text-2xl tracking-wide">
                    POSIÇÕES EM CAMPO
                  </Label>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {POSITIONS.map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() =>
                          toggleInArray(
                            playerPositions,
                            pos,
                            setPlayerPositions,
                          )
                        }
                        className={cn(
                          "relative flex items-center justify-center gap-2 border-2 px-4 py-4 font-display text-xl tracking-wide uppercase transition-all",
                          playerPositions.includes(pos)
                            ? "border-primary bg-primary text-primary-foreground shadow-[4px_4px_0px_0px_var(--color-foreground)] dark:shadow-[4px_4px_0px_0px_var(--color-foreground)] -translate-y-1"
                            : "border-foreground bg-background text-foreground hover:border-primary hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-primary)]",
                        )}
                      >
                        {playerPositions.includes(pos) && (
                          <Check className="size-5 shrink-0" />
                        )}
                        <span>{POSITION_LABELS[pos] ?? pos}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <Label
                    htmlFor="onb-bio"
                    className="font-display text-2xl tracking-wide"
                  >
                    SOBRE VOCÊ
                  </Label>
                  <Textarea
                    id="onb-bio"
                    rows={3}
                    placeholder="Ex.: Jogo desde os 12 anos, prefiro peladas à noite..."
                    value={playerBio}
                    onChange={(e) => setPlayerBio(e.target.value)}
                    className="rounded-none border-2 border-foreground bg-muted/50 p-4 text-lg focus-visible:ring-0 focus-visible:border-primary transition-colors"
                  />
                </div>

                <div className="space-y-4 pt-4">
                  <Label
                    htmlFor="onb-skills"
                    className="font-display text-2xl tracking-wide"
                  >
                    HABILIDADES
                  </Label>
                  <Input
                    id="onb-skills"
                    placeholder="Ex.: drible, passe longo, finalização"
                    value={playerSkills.join(", ")}
                    onChange={(e) =>
                      setPlayerSkills(
                        e.target.value
                          ? e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean)
                          : [],
                      )
                    }
                    className="h-14 rounded-none border-2 border-foreground bg-muted/50 px-4 text-lg focus-visible:ring-0 focus-visible:border-primary transition-colors"
                  />
                  <p className="font-bold tracking-widest text-xs text-muted-foreground uppercase">
                    SEPARE POR VÍRGULA
                  </p>
                </div>

                <div className="space-y-4 pt-4">
                  <Label className="font-display text-2xl tracking-wide">
                    DISPONIBILIDADE
                  </Label>
                  <div className="flex flex-wrap gap-3">
                    {DAYS_OF_WEEK.map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() =>
                          toggleInArray(
                            playerAvailability,
                            day,
                            setPlayerAvailability,
                          )
                        }
                        className={cn(
                          "border-2 px-6 py-2 font-display text-xl tracking-wide transition-all",
                          playerAvailability.includes(day)
                            ? "border-primary bg-primary text-primary-foreground shadow-[4px_4px_0px_0px_var(--color-foreground)] dark:shadow-[4px_4px_0px_0px_var(--color-foreground)] -translate-y-1"
                            : "border-foreground bg-background text-foreground hover:border-primary hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-primary)]",
                        )}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {isPlayer && step === 2 && (
              <div className="space-y-8 animation-fade-in">
                <div>
                  <h2 className="font-display text-4xl tracking-wide text-foreground">
                    DADOS FÍSICOS
                  </h2>
                  <p className="mt-2 font-bold tracking-widest text-sm text-muted-foreground uppercase">
                    AJUDA OS TIMES A VEREM SEU PERFIL EM CAMPO. (OPCIONAL)
                  </p>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-4">
                    <Label
                      htmlFor="onb-height"
                      className="font-display text-2xl tracking-wide"
                    >
                      ALTURA (CM)
                    </Label>
                    <Input
                      id="onb-height"
                      type="number"
                      placeholder="175"
                      value={playerHeight}
                      onChange={(e) => setPlayerHeight(e.target.value)}
                      className="h-14 rounded-none border-2 border-foreground bg-muted/50 px-4 text-lg font-display focus-visible:ring-0 focus-visible:border-primary transition-colors"
                    />
                  </div>
                  <div className="space-y-4">
                    <Label
                      htmlFor="onb-weight"
                      className="font-display text-2xl tracking-wide"
                    >
                      PESO (KG)
                    </Label>
                    <Input
                      id="onb-weight"
                      type="number"
                      placeholder="70"
                      value={playerWeight}
                      onChange={(e) => setPlayerWeight(e.target.value)}
                      className="h-14 rounded-none border-2 border-foreground bg-muted/50 px-4 text-lg font-display focus-visible:ring-0 focus-visible:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-6">
                  <Label
                    htmlFor="onb-phone"
                    className="font-display text-2xl tracking-wide"
                  >
                    WHATSAPP (OPCIONAL)
                  </Label>
                  <Input
                    id="onb-phone"
                    placeholder="(11) 99999-9999"
                    value={playerPhone}
                    onChange={(e) => setPlayerPhone(e.target.value)}
                    className="h-14 rounded-none border-2 border-foreground bg-muted/50 px-4 text-lg focus-visible:ring-0 focus-visible:border-primary transition-colors"
                  />
                </div>
              </div>
            )}

            {isPlayer && step === 3 && (
              <div className="space-y-8 flex flex-col items-center justify-center text-center h-full pt-10">
                <div className="flex size-24 items-center justify-center border-4 border-primary bg-primary shadow-[4px_4px_0px_0px_var(--color-foreground)] dark:shadow-[4px_4px_0px_0px_var(--color-foreground)]">
                  <Check className="size-12 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="font-display text-5xl tracking-wide text-foreground">
                    TUDO PRONTO!
                  </h2>
                  <p className="mt-6 text-lg font-medium text-muted-foreground max-w-md mx-auto">
                    Seu perfil de jogador está no banco de dados. Você pode
                    editar qualquer informação a qualquer momento.
                  </p>
                </div>
                {playerPositions.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-3">
                    {playerPositions.map((p) => (
                      <span
                        key={p}
                        className="border-2 border-primary bg-primary/10 px-4 py-2 font-display text-xl tracking-wider text-primary"
                      >
                        {POSITION_LABELS[p] ?? p}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TEAM FLOW */}
            {!isPlayer && step === 0 && (
              <div className="space-y-8 flex flex-col items-center justify-center text-center h-full pt-10">
                <div className="flex size-24 items-center justify-center border-4 border-foreground bg-primary shadow-[4px_4px_0px_0px_var(--color-foreground)] dark:shadow-[4px_4px_0px_0px_var(--color-foreground)]">
                  <Trophy className="size-12 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="font-display text-5xl tracking-wide text-foreground uppercase">
                    BEM-VINDO, {user.name}!
                  </h1>
                  <p className="mt-6 text-lg font-medium text-muted-foreground max-w-md mx-auto">
                    Vamos configurar o perfil do seu time. Preencha o que quiser
                    agora — você pode editar na sede do clube depois.
                  </p>
                </div>
              </div>
            )}

            {!isPlayer && step === 1 && (
              <div className="space-y-8 animation-fade-in">
                <div>
                  <h2 className="font-display text-4xl tracking-wide text-foreground">
                    DADOS DO TIME
                  </h2>
                  <p className="mt-2 font-bold tracking-widest text-sm text-muted-foreground uppercase">
                    INFORMAÇÕES BÁSICAS PARA OS JOGADORES TE ENCONTRAREM.
                  </p>
                </div>

                <div className="space-y-4">
                  <Label
                    htmlFor="onb-team-name"
                    className="font-display text-2xl tracking-wide"
                  >
                    NOME DO TIME
                  </Label>
                  <Input
                    id="onb-team-name"
                    placeholder="Ex.: FC Várzea Unidos"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="h-14 rounded-none border-2 border-foreground bg-muted/50 px-4 text-lg focus-visible:ring-0 focus-visible:border-primary transition-colors uppercase"
                  />
                </div>

                <div className="space-y-4 pt-4">
                  <Label className="font-display text-2xl tracking-wide">
                    NÍVEL
                  </Label>
                  <Select value={teamLevel} onValueChange={setTeamLevel}>
                    <SelectTrigger className="h-14 rounded-none border-2 border-foreground bg-muted/50 px-4 text-lg uppercase font-bold tracking-widest focus:ring-0 focus:border-primary transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-none border-2 border-foreground">
                      {TEAM_LEVELS.map((l) => (
                        <SelectItem
                          key={l}
                          value={l}
                          className="font-bold tracking-widest uppercase hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground data-highlighted:bg-primary data-highlighted:text-primary-foreground cursor-pointer rounded-none"
                        >
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 pt-4">
                  <div className="space-y-4">
                    <Label
                      htmlFor="onb-team-region"
                      className="font-display text-2xl tracking-wide"
                    >
                      REGIÃO / BAIRRO
                    </Label>
                    <Input
                      id="onb-team-region"
                      placeholder="Ex.: Zona Sul"
                      value={teamRegion}
                      onChange={(e) => setTeamRegion(e.target.value)}
                      className="h-14 rounded-none border-2 border-foreground bg-muted/50 px-4 text-lg focus-visible:ring-0 focus-visible:border-primary transition-colors uppercase"
                    />
                  </div>
                  <div className="space-y-4">
                    <Label
                      htmlFor="onb-team-city"
                      className="font-display text-2xl tracking-wide"
                    >
                      CIDADE
                    </Label>
                    <Input
                      id="onb-team-city"
                      placeholder="Ex.: São Paulo"
                      value={teamCity}
                      onChange={(e) => setTeamCity(e.target.value)}
                      className="h-14 rounded-none border-2 border-foreground bg-muted/50 px-4 text-lg focus-visible:ring-0 focus-visible:border-primary transition-colors uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <Label
                    htmlFor="onb-team-desc"
                    className="font-display text-2xl tracking-wide"
                  >
                    DESCRIÇÃO
                  </Label>
                  <Textarea
                    id="onb-team-desc"
                    rows={3}
                    placeholder="Conte sobre o time, horários de treino, estilo de jogo..."
                    value={teamDescription}
                    onChange={(e) => setTeamDescription(e.target.value)}
                    className="rounded-none border-2 border-foreground bg-muted/50 p-4 text-lg focus-visible:ring-0 focus-visible:border-primary transition-colors"
                  />
                </div>
              </div>
            )}

            {!isPlayer && step === 2 && (
              <div className="space-y-8 animation-fade-in">
                <div>
                  <h2 className="font-display text-4xl tracking-wide text-foreground">
                    CONTRATAÇÕES
                  </h2>
                  <p className="mt-2 font-bold tracking-widest text-sm text-muted-foreground uppercase">
                    QUAIS POSIÇÕES O ELENCO PRECISA PREENCHER?
                  </p>
                </div>

                <div className="space-y-4">
                  <Label className="font-display text-2xl tracking-wide">
                    POSIÇÕES QUE PRECISAMOS
                  </Label>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {POSITIONS.map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() =>
                          toggleInArray(
                            teamOpenPositions,
                            pos,
                            setTeamOpenPositions,
                          )
                        }
                        className={cn(
                          "relative flex items-center justify-center gap-2 border-2 px-4 py-4 font-display text-xl tracking-wide uppercase transition-all",
                          teamOpenPositions.includes(pos)
                            ? "border-primary bg-primary text-primary-foreground shadow-[4px_4px_0px_0px_var(--color-foreground)] dark:shadow-[4px_4px_0px_0px_var(--color-foreground)] -translate-y-1"
                            : "border-foreground bg-background text-foreground hover:border-primary hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-primary)]",
                        )}
                      >
                        {teamOpenPositions.includes(pos) && (
                          <Check className="size-5 shrink-0" />
                        )}
                        <span>{POSITION_LABELS[pos] ?? pos}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-6">
                  <Label className="font-display text-2xl tracking-wide">
                    DIAS DE JOGO
                  </Label>
                  <div className="flex flex-wrap gap-3">
                    {DAYS_OF_WEEK.map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() =>
                          toggleInArray(teamMatchDays, day, setTeamMatchDays)
                        }
                        className={cn(
                          "border-2 px-6 py-2 font-display text-xl tracking-wide transition-all",
                          teamMatchDays.includes(day)
                            ? "border-primary bg-primary text-primary-foreground shadow-[4px_4px_0px_0px_var(--color-foreground)] dark:shadow-[4px_4px_0px_0px_var(--color-foreground)] -translate-y-1"
                            : "border-foreground bg-background text-foreground hover:border-primary hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_var(--color-primary)]",
                        )}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!isPlayer && step === 3 && (
              <div className="space-y-8 flex flex-col items-center justify-center text-center h-full pt-10">
                <div className="flex size-24 items-center justify-center border-4 border-primary bg-primary shadow-[4px_4px_0px_0px_var(--color-foreground)] dark:shadow-[4px_4px_0px_0px_var(--color-foreground)]">
                  <Check className="size-12 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="font-display text-5xl tracking-wide text-foreground">
                    TIME CONFIGURADO!
                  </h2>
                  <p className="mt-6 text-lg font-medium text-muted-foreground max-w-md mx-auto">
                    Agora é só garimpar jogadores. Você pode editar tudo na
                    página administrativa do time.
                  </p>
                </div>
                {teamName && (
                  <p className="font-display text-4xl text-primary">
                    {teamName}
                  </p>
                )}
                {teamOpenPositions.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-3">
                    {teamOpenPositions.map((p) => (
                      <span
                        key={p}
                        className="border-2 border-primary bg-primary/10 px-4 py-2 font-display text-xl tracking-wider text-primary"
                      >
                        {POSITION_LABELS[p] ?? p}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-12 mt-4 border-t-2 border-dashed border-border/50">
            <Button
              variant="outline"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="h-auto rounded-none border-2 border-foreground py-3 px-6 font-display text-xl tracking-widest text-foreground transition-all hover:-translate-x-1 hover:shadow-[-4px_4px_0px_0px_var(--color-primary)] dark:hover:shadow-[-4px_4px_0px_0px_var(--color-primary)] disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:shadow-none bg-transparent gap-2"
            >
              <ChevronLeft className="size-5" />
              VOLTAR
            </Button>

            {step < totalSteps - 1 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                className="h-auto rounded-none border-2 border-primary bg-primary py-3 px-8 font-display text-xl tracking-widest text-primary-foreground transition-all hover:translate-x-1 hover:-translate-y-1 hover:shadow-[5px_5px_0px_0px_var(--color-foreground)] dark:hover:shadow-[5px_5px_0px_0px_var(--color-foreground)] gap-2 uppercase"
              >
                AVANÇAR
                <ChevronRight className="size-5" />
              </Button>
            ) : (
              <Button
                onClick={handleFinish}
                className="h-auto rounded-none border-2 border-primary bg-primary py-3 px-8 font-display text-xl tracking-widest text-primary-foreground transition-all hover:-translate-y-1 hover:shadow-[5px_5px_0px_0px_var(--color-foreground)] dark:hover:shadow-[5px_5px_0px_0px_var(--color-foreground)] uppercase animate-pulse"
              >
                IR PARA O CAMPO
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
