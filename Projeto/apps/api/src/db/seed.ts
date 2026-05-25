/**
 * VarzeaPro — Seed realista
 * Cria 30 jogadores (free/craque/fenomeno), 15 times (free/profissional) + 1 admin
 * Uso: npx tsx src/db/seed.ts
 */
import { createWriteStream } from "fs"

const API_URL = process.env.API_URL || "http://localhost:3000"
const ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173"
const PASSWORD = "VarzeaPro@2026"
const CSV_PATH = "./seed-credentials.csv"

// ─── Dados base ────────────────────────────────────────────────────────────────

const cities: Record<string, string[]> = {
  "São Paulo":       ["São Paulo", "Campinas", "Santos", "Ribeirão Preto", "São Bernardo do Campo"],
  "Rio de Janeiro":  ["Rio de Janeiro", "Niterói", "Petrópolis", "Nova Iguaçu"],
  "Belo Horizonte":  ["Belo Horizonte", "Uberlândia", "Contagem", "Juiz de Fora"],
  "Curitiba":        ["Curitiba", "Londrina", "Maringá", "Ponta Grossa"],
  "Porto Alegre":    ["Porto Alegre", "Caxias do Sul", "Pelotas", "Santa Maria"],
  "Salvador":        ["Salvador", "Feira de Santana", "Vitória da Conquista"],
  "Recife":          ["Recife", "Olinda", "Caruaru", "Petrolina"],
  "Brasília":        ["Brasília", "Gama", "Taguatinga", "Ceilândia"],
  "Fortaleza":       ["Fortaleza", "Caucaia", "Juazeiro do Norte"],
  "Manaus":          ["Manaus", "Parintins"],
}

const positions = ["goleiro", "zagueiro", "lateral", "volante", "meia", "atacante"] as const
type Pos = typeof positions[number]

const availabilities = [
  "disponível", "disponível finais de semana", "disponível durante a semana",
  "disponível para treinos noturnos", "disponível para jogos marcados",
]

// ─── Jogadores pré-definidos ───────────────────────────────────────────────────

const PLAYERS: Array<{
  name: string
  plan: "free" | "craque" | "fenomeno"
  pos: Pos[]
  region: string
  level: "amador" | "recreativo" | "semi-profissional"
  height: number; weight: number
  birth: string
  bio: string
  skills: string[]
  career?: Array<{ clubName: string; period: string; gamesPlayed?: number; goals?: number; assists?: number; championships?: string }>
  stats?: { gamesPlayed?: number; goals?: number; assists?: number; cleanSheets?: number }
}> = [
  // ── FREE (10) ─────────────────────────────────────────────────────────────────
  {
    name: "Carlos Eduardo Silva", plan: "free", pos: ["atacante"], region: "São Paulo",
    level: "amador", height: 178, weight: 73, birth: "2001-03-15",
    bio: "Gosto de jogar nas peladas do bairro e tenho muita vontade de evoluir.",
    skills: ["Velocidade", "Drible"],
  },
  {
    name: "Thiago Mendes Costa", plan: "free", pos: ["volante"], region: "Recife",
    level: "recreativo", height: 175, weight: 70, birth: "1998-07-22",
    bio: "Volante raçudo, jogo para o time e não me importo de correr muito.",
    skills: ["Marcação", "Resistência"],
  },
  {
    name: "Gabriel Ferreira Lima", plan: "free", pos: ["zagueiro"], region: "Curitiba",
    level: "amador", height: 183, weight: 80, birth: "2000-11-05",
    bio: "Zagueiro alto e forte, boa presença na área.", skills: ["Jogo aéreo", "Posicionamento"],
  },
  {
    name: "Pedro Almeida Rocha", plan: "free", pos: ["meia"], region: "Belo Horizonte",
    level: "recreativo", height: 172, weight: 68, birth: "1999-04-18",
    bio: "Meia criativo, gosto de inventar jogadas.", skills: ["Visão de jogo", "Passe longo"],
  },
  {
    name: "Lucas Nunes Barbosa", plan: "free", pos: ["goleiro"], region: "Porto Alegre",
    level: "amador", height: 185, weight: 82, birth: "2002-09-30",
    bio: "Goleiro novo querendo experiência.", skills: ["Defesa", "Posicionamento"],
  },
  {
    name: "Matheus Cardoso Dias", plan: "free", pos: ["lateral", "volante"], region: "Salvador",
    level: "recreativo", height: 174, weight: 71, birth: "1997-12-01",
    bio: "Lateral que também jogo de volante, bastante versátil.",
    skills: ["Marcação", "Velocidade"],
  },
  {
    name: "Diego Souza Vieira", plan: "free", pos: ["atacante", "meia"], region: "Fortaleza",
    level: "amador", height: 170, weight: 66, birth: "2003-06-14",
    bio: "Jovem atacante com muita fome de bola.", skills: ["Drible", "Velocidade"],
  },
  {
    name: "Igor Moraes Teixeira", plan: "free", pos: ["zagueiro", "lateral"], region: "Brasília",
    level: "recreativo", height: 180, weight: 77, birth: "1996-02-28",
    bio: "Defensor experiente nas peladas da cidade.", skills: ["Jogo aéreo", "Marcação"],
  },
  {
    name: "Renan Correia Santos", plan: "free", pos: ["meia", "atacante"], region: "Manaus",
    level: "amador", height: 169, weight: 64, birth: "2004-08-19",
    bio: "Meia-atacante rápido, ainda buscando meu time.", skills: ["Drible", "Velocidade"],
  },
  {
    name: "Vitor Hugo Pinto", plan: "free", pos: ["goleiro"], region: "Rio de Janeiro",
    level: "recreativo", height: 187, weight: 85, birth: "1995-01-11",
    bio: "Goleiro experiente, jogo finais de semana.", skills: ["Defesa", "Liderança"],
  },

  // ── CRAQUE (12) ───────────────────────────────────────────────────────────────
  {
    name: "Rafael Oliveira Gomes", plan: "craque", pos: ["atacante"], region: "São Paulo",
    level: "semi-profissional", height: 176, weight: 72, birth: "1996-05-20",
    bio: "Atacante veloz com passagem por times da várzea paulistana. Busco time com estrutura.",
    skills: ["Velocidade", "Finalizador", "Drible"],
    career: [
      { clubName: "Nacional FC", period: "2019–2021", gamesPlayed: 45, goals: 22, assists: 8 },
      { clubName: "Estrela do Norte", period: "2021–2023", gamesPlayed: 38, goals: 19, assists: 11, championships: "Copa Várzea SP 2022" },
    ],
  },
  {
    name: "André Luis Rodrigues", plan: "craque", pos: ["volante", "zagueiro"], region: "Rio de Janeiro",
    level: "semi-profissional", height: 179, weight: 76, birth: "1994-09-03",
    bio: "Volante box-to-box, cobertura ampla. Jogo há 10 anos no futebol de várzea carioca.",
    skills: ["Marcação", "Resistência", "Liderança", "Posicionamento"],
    career: [
      { clubName: "Botafoguinho RJ", period: "2015–2018", gamesPlayed: 60, goals: 5, assists: 12 },
      { clubName: "Praiano EC", period: "2018–2022", gamesPlayed: 80, goals: 8, assists: 18, championships: "Taça Guanabara Amadora 2020" },
      { clubName: "Vila Nova FC", period: "2022–2024", gamesPlayed: 40, goals: 3, assists: 9 },
    ],
  },
  {
    name: "Felipe Martins Araujo", plan: "craque", pos: ["meia"], region: "Belo Horizonte",
    level: "semi-profissional", height: 174, weight: 69, birth: "1997-11-17",
    bio: "Meia armador com excelente visão de jogo. Prefiro equipes que gostam de construir desde atrás.",
    skills: ["Visão de jogo", "Passe longo", "Bola parada", "Falta técnica"],
    career: [
      { clubName: "Cruzeirinho BH", period: "2017–2020", gamesPlayed: 55, goals: 12, assists: 28 },
      { clubName: "Mineiro FC", period: "2020–2024", gamesPlayed: 72, goals: 15, assists: 34, championships: "Liga Mineira Amadora 2022, 2023" },
    ],
  },
  {
    name: "Bruno Pereira Nascimento", plan: "craque", pos: ["zagueiro"], region: "Porto Alegre",
    level: "semi-profissional", height: 184, weight: 82, birth: "1993-03-25",
    bio: "Zagueiro experiente, forte no jogo aéreo e na liderança defensiva.",
    skills: ["Jogo aéreo", "Liderança", "Posicionamento", "Marcação"],
    career: [
      { clubName: "Gaúcho EC", period: "2013–2017", gamesPlayed: 90, goals: 8, assists: 4 },
      { clubName: "Sul FC", period: "2017–2021", gamesPlayed: 70, goals: 5, assists: 2, championships: "Copa RS Amadora 2019" },
      { clubName: "Pampa United", period: "2021–2024", gamesPlayed: 52, goals: 6, assists: 3 },
    ],
  },
  {
    name: "Guilherme Cardoso Freitas", plan: "craque", pos: ["goleiro"], region: "Curitiba",
    level: "semi-profissional", height: 186, weight: 84, birth: "1992-07-08",
    bio: "Goleiro veterano com muita experiência em finais. Reflexos rápidos e bom com os pés.",
    skills: ["Defesa", "Bola parada", "Liderança", "Posicionamento"],
    career: [
      { clubName: "Paranaense A", period: "2012–2016", gamesPlayed: 80 },
      { clubName: "Furacão FC", period: "2016–2020", gamesPlayed: 65, championships: "Copa Paraná Amadora 2018" },
      { clubName: "Araucária EC", period: "2020–2024", gamesPlayed: 55 },
    ],
  },
  {
    name: "Eduardo Campos Ribeiro", plan: "craque", pos: ["lateral"], region: "Salvador",
    level: "semi-profissional", height: 175, weight: 70, birth: "1998-02-14",
    bio: "Lateral ofensivo, bom cruzamento e marcação forte. Versátil no lado direito e esquerdo.",
    skills: ["Cruzamento", "Marcação", "Velocidade", "Resistência"],
    career: [
      { clubName: "Bahiano SC", period: "2018–2021", gamesPlayed: 55, goals: 6, assists: 20 },
      { clubName: "Nordestino FC", period: "2021–2024", gamesPlayed: 44, goals: 4, assists: 16, championships: "Taça Salvador 2022" },
    ],
  },
  {
    name: "Henrique Monteiro Lopes", plan: "craque", pos: ["atacante", "meia"], region: "Recife",
    level: "semi-profissional", height: 173, weight: 67, birth: "1999-10-05",
    bio: "Atacante habilidoso com faro de gol. Convocado para a seleção regional de várzea em 2023.",
    skills: ["Drible", "Finalizador", "Velocidade", "Bola parada"],
    career: [
      { clubName: "Leão do Capibaribe", period: "2019–2022", gamesPlayed: 62, goals: 38, assists: 15, championships: "Copa Nordeste Amadora 2021" },
      { clubName: "Sport da Várzea", period: "2022–2024", gamesPlayed: 40, goals: 28, assists: 10 },
    ],
  },
  {
    name: "Caio Vinicius Monteiro", plan: "craque", pos: ["volante", "meia"], region: "Brasília",
    level: "semi-profissional", height: 176, weight: 73, birth: "1995-12-29",
    bio: "Volante combativo com saída de bola qualificada. Jogo pela seleção do DF nos torneios regionais.",
    skills: ["Marcação", "Passe longo", "Resistência", "Visão de jogo"],
    career: [
      { clubName: "Candango FC", period: "2016–2019", gamesPlayed: 70, goals: 10, assists: 22 },
      { clubName: "Planalto EC", period: "2019–2023", gamesPlayed: 80, goals: 12, assists: 30, championships: "Torneio BSB 2020, 2022" },
    ],
  },
  {
    name: "Samuel Torres Freitas", plan: "craque", pos: ["zagueiro", "volante"], region: "Fortaleza",
    level: "semi-profissional", height: 181, weight: 78, birth: "1997-05-11",
    bio: "Defensor que também pode atuar no meio campo. Forte fisicamente e bom de liderança.",
    skills: ["Jogo aéreo", "Marcação", "Liderança", "Posicionamento"],
    career: [
      { clubName: "Cearense A", period: "2017–2020", gamesPlayed: 60, goals: 5, assists: 8 },
      { clubName: "Fortaleza EC Várzea", period: "2020–2024", gamesPlayed: 68, goals: 7, assists: 10, championships: "Copa CE Amadora 2023" },
    ],
  },
  {
    name: "Alex Rodrigues Dias", plan: "craque", pos: ["meia", "atacante"], region: "São Paulo",
    level: "semi-profissional", height: 171, weight: 65, birth: "1996-08-23",
    bio: "Meia-atacante elétrico, jogo entre linhas e crio oportunidades. Destaque do campeonato da AA Pirituba 2023.",
    skills: ["Drible", "Visão de jogo", "Velocidade", "Falta técnica"],
    career: [
      { clubName: "Pirituba FC", period: "2016–2019", gamesPlayed: 58, goals: 20, assists: 24, championships: "AA Pirituba 2017" },
      { clubName: "Real Tucuruvi", period: "2019–2022", gamesPlayed: 55, goals: 22, assists: 19 },
      { clubName: "Santos da Zona Norte", period: "2022–2024", gamesPlayed: 38, goals: 16, assists: 14, championships: "AA Pirituba 2023" },
    ],
  },
  {
    name: "Leandro Alves Correia", plan: "craque", pos: ["goleiro"], region: "Rio de Janeiro",
    level: "semi-profissional", height: 188, weight: 86, birth: "1991-04-02",
    bio: "Goleiro de grande porte, excelente nos cruzamentos e defesas difíceis. Referência na várzea carioca.",
    skills: ["Defesa", "Jogo aéreo", "Bola parada", "Liderança"],
    career: [
      { clubName: "Madureira Várzea", period: "2011–2015", gamesPlayed: 88 },
      { clubName: "Rioense EC", period: "2015–2019", gamesPlayed: 75, championships: "Taça Rio Amadora 2016, 2018" },
      { clubName: "Fluminense da Baixada", period: "2019–2024", gamesPlayed: 60 },
    ],
  },
  {
    name: "Fernando Nascimento Vieira", plan: "craque", pos: ["lateral", "zagueiro"], region: "Belo Horizonte",
    level: "semi-profissional", height: 177, weight: 74, birth: "1993-11-30",
    bio: "Defensor experiente e versátil. Participei de 4 campeonatos regionais com equipes diferentes.",
    skills: ["Marcação", "Jogo aéreo", "Resistência", "Posicionamento"],
    career: [
      { clubName: "Atleticano BH", period: "2013–2017", gamesPlayed: 82, goals: 6, assists: 10 },
      { clubName: "Cruzado EC", period: "2017–2021", gamesPlayed: 65, goals: 4, assists: 8, championships: "Liga BH 2019, 2020" },
      { clubName: "Serra Negra FC", period: "2021–2024", gamesPlayed: 48, goals: 3, assists: 6 },
    ],
  },

  // ── FENÔMENO (8) ──────────────────────────────────────────────────────────────
  {
    name: "Rodrigo Lima Santos", plan: "fenomeno", pos: ["atacante"], region: "São Paulo",
    level: "semi-profissional", height: 180, weight: 76, birth: "1992-06-14",
    bio: "Artilheiro consistente com mais de 200 gols na várzea. Busco um time competitivo para disputar campeonatos sérios.",
    skills: ["Finalizador", "Velocidade", "Drible", "Cabeceio", "Chute forte"],
    career: [
      { clubName: "Ipiranga FC", period: "2012–2015", gamesPlayed: 72, goals: 48, assists: 18, championships: "Copa SP Várzea 2013" },
      { clubName: "Itaquerão EC", period: "2015–2018", gamesPlayed: 85, goals: 62, assists: 22, championships: "Liga Paulistana 2016, 2017" },
      { clubName: "Corintiano da Várzea", period: "2018–2022", gamesPlayed: 96, goals: 71, assists: 30, championships: "Copa Várzea SP 2019, 2021" },
      { clubName: "Elite FC SP", period: "2022–2024", gamesPlayed: 55, goals: 40, assists: 15, championships: "AA Elite 2023" },
    ],
    stats: { gamesPlayed: 308, goals: 221, assists: 85 },
  },
  {
    name: "João Victor Pereira", plan: "fenomeno", pos: ["meia"], region: "Rio de Janeiro",
    level: "semi-profissional", height: 173, weight: 68, birth: "1994-02-28",
    bio: "Meia maestro com mais de 150 assistências na carreira. Visão de jogo privilegiada e capacidade de ditar o ritmo.",
    skills: ["Visão de jogo", "Passe longo", "Falta técnica", "Bola parada", "Drible"],
    career: [
      { clubName: "Botafogo Raiz", period: "2013–2016", gamesPlayed: 78, goals: 20, assists: 45 },
      { clubName: "Olaria FC", period: "2016–2019", gamesPlayed: 82, goals: 18, assists: 52, championships: "Copa Rio Amadora 2017, 2018" },
      { clubName: "Maracanã EC", period: "2019–2022", gamesPlayed: 88, goals: 22, assists: 60, championships: "Liga Carioca 2020, 2021" },
      { clubName: "Zonal Rio", period: "2022–2024", gamesPlayed: 50, goals: 10, assists: 30, championships: "Taça Rio 2023" },
    ],
    stats: { gamesPlayed: 298, goals: 70, assists: 187 },
  },
  {
    name: "Gustavo Henrique Alves", plan: "fenomeno", pos: ["zagueiro"], region: "Belo Horizonte",
    level: "semi-profissional", height: 185, weight: 83, birth: "1991-09-17",
    bio: "Zagueiro líder, organizador defensivo de alto nível. Capitão em todos os times que joguei.",
    skills: ["Jogo aéreo", "Liderança", "Marcação", "Posicionamento", "Passe longo"],
    career: [
      { clubName: "Cruzeiro da Várzea", period: "2010–2014", gamesPlayed: 95, goals: 12, assists: 8, championships: "Liga MG 2011, 2013" },
      { clubName: "Mineirão FC", period: "2014–2018", gamesPlayed: 88, goals: 10, assists: 6, championships: "Copa MG 2015, 2016, 2017" },
      { clubName: "BH Campeões", period: "2018–2022", gamesPlayed: 75, goals: 8, assists: 5, championships: "Liga Mineira 2019, 2021" },
      { clubName: "Seleção BH Várzea", period: "2022–2024", gamesPlayed: 45, goals: 5, assists: 3 },
    ],
    stats: { gamesPlayed: 303, goals: 35, assists: 22 },
  },
  {
    name: "Marcos Antonio Ribeiro", plan: "fenomeno", pos: ["goleiro"], region: "Curitiba",
    level: "semi-profissional", height: 190, weight: 88, birth: "1989-12-03",
    bio: "Goleiro lendário da várzea paranaense. 200+ jogos e o melhor índice de defesas da Copa PR Amadora.",
    skills: ["Defesa", "Bola parada", "Liderança", "Jogo aéreo", "Posicionamento"],
    career: [
      { clubName: "Paranaense Elite", period: "2009–2013", gamesPlayed: 80, championships: "Copa PR 2010, 2012" },
      { clubName: "Paranavaí FC", period: "2013–2017", gamesPlayed: 85, championships: "Liga PR 2014, 2015, 2016" },
      { clubName: "Coritibano Várzea", period: "2017–2021", gamesPlayed: 72, championships: "Copa PR 2018, 2020" },
      { clubName: "Araucária Campeões", period: "2021–2024", gamesPlayed: 55 },
    ],
    stats: { gamesPlayed: 292, goals: 0, assists: 0, cleanSheets: 115 },
  },
  {
    name: "Nathan Felipe Carvalho", plan: "fenomeno", pos: ["volante", "meia"], region: "Porto Alegre",
    level: "semi-profissional", height: 178, weight: 75, birth: "1993-07-21",
    bio: "Volante completo, melhor jogador da Série A Amadora Gaúcha 2022 e 2023. Jogo há mais de 12 anos.",
    skills: ["Marcação", "Passe longo", "Resistência", "Visão de jogo", "Liderança"],
    career: [
      { clubName: "Gaúcho Bravos", period: "2011–2015", gamesPlayed: 85, goals: 15, assists: 35, championships: "Série A RS 2012, 2014" },
      { clubName: "Grêmio da Várzea", period: "2015–2019", gamesPlayed: 88, goals: 18, assists: 40, championships: "Copa RS 2016, 2017, 2018" },
      { clubName: "Sul United", period: "2019–2022", gamesPlayed: 80, goals: 14, assists: 36, championships: "Série A RS 2020, 2021" },
      { clubName: "Pampa Élite FC", period: "2022–2024", gamesPlayed: 52, goals: 10, assists: 22, championships: "Série A RS 2022, 2023" },
    ],
    stats: { gamesPlayed: 305, goals: 57, assists: 133 },
  },
  {
    name: "Enzo Rodrigo Gomes", plan: "fenomeno", pos: ["atacante", "lateral"], region: "Salvador",
    level: "semi-profissional", height: 176, weight: 71, birth: "1995-04-09",
    bio: "Atacante versátil que também joga de lateral. Artilheiro da Copa Bahia 2022 e 2023.",
    skills: ["Velocidade", "Drible", "Cruzamento", "Finalizador", "Resistência"],
    career: [
      { clubName: "Bahiano Elite", period: "2014–2017", gamesPlayed: 70, goals: 42, assists: 25, championships: "Copa BA 2015" },
      { clubName: "Salvador FC", period: "2017–2021", gamesPlayed: 88, goals: 55, assists: 30, championships: "Copa BA 2018, 2020" },
      { clubName: "Nordeste Champions", period: "2021–2024", gamesPlayed: 65, goals: 45, assists: 22, championships: "Copa BA 2022, 2023" },
    ],
    stats: { gamesPlayed: 223, goals: 142, assists: 77 },
  },
  {
    name: "Arthur Mendes Costa", plan: "fenomeno", pos: ["lateral", "meia"], region: "Recife",
    level: "semi-profissional", height: 174, weight: 69, birth: "1994-10-16",
    bio: "Lateral de alto rendimento ofensivo. Mais de 100 assistências na carreira, reconhecido como melhor do NE.",
    skills: ["Cruzamento", "Velocidade", "Passe longo", "Resistência", "Drible"],
    career: [
      { clubName: "Sport Várzea PE", period: "2013–2016", gamesPlayed: 72, goals: 10, assists: 38, championships: "Copa NE 2014, 2015" },
      { clubName: "Santa Cruz da Várzea", period: "2016–2020", gamesPlayed: 85, goals: 12, assists: 44, championships: "Liga PE 2017, 2018, 2019" },
      { clubName: "Nordestino Elite", period: "2020–2024", gamesPlayed: 75, goals: 9, assists: 40, championships: "Copa NE 2021, 2022" },
    ],
    stats: { gamesPlayed: 232, goals: 31, assists: 122 },
  },
  {
    name: "Miguel Torres Santana", plan: "fenomeno", pos: ["atacante"], region: "Fortaleza",
    level: "semi-profissional", height: 177, weight: 73, birth: "1993-01-25",
    bio: "Centroavante físico e técnico. Artilheiro com mais de 180 gols na várzea nordestina. Referência no Ceará.",
    skills: ["Cabeceio", "Finalizador", "Chute forte", "Velocidade", "Bola parada"],
    career: [
      { clubName: "Cearense Elite", period: "2012–2015", gamesPlayed: 75, goals: 52, assists: 18, championships: "Copa CE 2013, 2014" },
      { clubName: "Fortaleza FC Amador", period: "2015–2019", gamesPlayed: 88, goals: 68, assists: 22, championships: "Liga CE 2016, 2017, 2018" },
      { clubName: "Nordeste Bravos", period: "2019–2022", gamesPlayed: 80, goals: 58, assists: 20, championships: "Copa CE 2020, 2021" },
      { clubName: "Dragão CE", period: "2022–2024", gamesPlayed: 42, goals: 30, assists: 12 },
    ],
    stats: { gamesPlayed: 285, goals: 208, assists: 72 },
  },
]

// ─── Times pré-definidos ───────────────────────────────────────────────────────

const TEAMS: Array<{
  name: string
  plan: "free" | "profissional"
  level: "amador" | "recreativo" | "semi-profissional" | "outro"
  region: string
  description: string
  openPositions: string[]
  matchDays: string[]
}> = [
  // ── FREE / PELADA (7) ─────────────────────────────────────────────────────────
  {
    name: "Pelada do Bairro FC", plan: "free", level: "amador", region: "São Paulo",
    description: "Time de amigos que joga toda semana no campinho do bairro. Sempre aberto a novos jogadores.",
    openPositions: ["goleiro", "zagueiro"],
    matchDays: ["Sábado", "Domingo"],
  },
  {
    name: "Veteranos EC", plan: "free", level: "recreativo", region: "Belo Horizonte",
    description: "Time de veteranos acima de 35 anos. Diversão garantida e muito bate papo após o jogo.",
    openPositions: ["lateral", "volante"],
    matchDays: ["Domingo"],
  },
  {
    name: "Raça e Garra SC", plan: "free", level: "amador", region: "Recife",
    description: "Time jovem querendo crescer. Aceitamos jogadores de qualquer posição.",
    openPositions: ["goleiro", "meia", "atacante"],
    matchDays: ["Sexta", "Sábado"],
  },
  {
    name: "Unidos do Parque EC", plan: "free", level: "recreativo", region: "Porto Alegre",
    description: "Grupo de amigos do condomínio, jogamos para nos divertir e manter a forma.",
    openPositions: ["atacante"],
    matchDays: ["Sábado"],
  },
  {
    name: "Força Jovem FC", plan: "free", level: "amador", region: "Curitiba",
    description: "Time novo em formação, aceitamos jogadores de todas as idades.",
    openPositions: ["zagueiro", "lateral", "atacante"],
    matchDays: ["Domingo"],
  },
  {
    name: "Associação Atlética Estrela", plan: "free", level: "recreativo", region: "Salvador",
    description: "Associação esportiva do bairro, ativa há 5 anos.",
    openPositions: ["goleiro"],
    matchDays: ["Sábado", "Domingo"],
  },
  {
    name: "Spartanos FC", plan: "free", level: "amador", region: "Brasília",
    description: "Time de servidores públicos que joga às sextas após o trabalho.",
    openPositions: ["volante", "atacante"],
    matchDays: ["Sexta"],
  },

  // ── PROFISSIONAL (8) ─────────────────────────────────────────────────────────
  {
    name: "Fúria FC", plan: "profissional", level: "semi-profissional", region: "São Paulo",
    description: "Um dos times mais tradicionais da várzea paulistana. Campeões regionais em 2022 e 2023. Buscamos reforços de alto nível para a temporada 2025.",
    openPositions: ["goleiro", "zagueiro", "meia"],
    matchDays: ["Quarta", "Sábado"],
  },
  {
    name: "Trovão United", plan: "profissional", level: "semi-profissional", region: "Rio de Janeiro",
    description: "Clube estruturado com campo próprio e uniforme oficial. Disputamos os principais campeonatos cariocas. Buscamos jogadores comprometidos com o esporte.",
    openPositions: ["lateral", "volante", "atacante"],
    matchDays: ["Terça", "Sábado"],
  },
  {
    name: "Leões da Serra", plan: "profissional", level: "semi-profissional", region: "Belo Horizonte",
    description: "Clube mineiro com 8 anos de história. Priorizamos jogadores com histórico de carreira e comprometimento. Temos premiação em dinheiro para campanhas.",
    openPositions: ["zagueiro", "atacante"],
    matchDays: ["Quinta", "Domingo"],
  },
  {
    name: "Dragão Vermelho EC", plan: "profissional", level: "semi-profissional", region: "Curitiba",
    description: "Time paranaense disputando a primeira divisão da liga amadora local. Estrutura completa: uniformes, bolas e transporte para jogos fora.",
    openPositions: ["goleiro", "meia", "lateral"],
    matchDays: ["Segunda", "Sábado"],
  },
  {
    name: "Pampa Elite FC", plan: "profissional", level: "semi-profissional", region: "Porto Alegre",
    description: "Tradicional na liga gaúcha, 6 títulos em 10 anos. Buscamos jogadores com estatísticas comprovadas para completar nosso elenco.",
    openPositions: ["volante", "atacante"],
    matchDays: ["Quarta", "Domingo"],
  },
  {
    name: "Nordeste Champions", plan: "profissional", level: "semi-profissional", region: "Recife",
    description: "Melhor time de Pernambuco no futebol de várzea organizado. Parceria com academia para preparação física. Queremos jogadores técnicos.",
    openPositions: ["meia", "atacante"],
    matchDays: ["Terça", "Sábado"],
  },
  {
    name: "Bahiano Elite SC", plan: "profissional", level: "semi-profissional", region: "Salvador",
    description: "Clube soteropolitano com estrutura profissional. Participamos de 4 campeonatos por ano. Buscamos jogadores para a disputa da Copa BA 2025.",
    openPositions: ["goleiro", "zagueiro"],
    matchDays: ["Quinta", "Domingo"],
  },
  {
    name: "Fortaleza Bravos FC", plan: "profissional", level: "semi-profissional", region: "Fortaleza",
    description: "Um dos clubes mais organizados do Ceará. Scouting ativo via VarzeaPro para descobrir novos talentos regionais.",
    openPositions: ["lateral", "volante", "atacante"],
    matchDays: ["Segunda", "Sábado"],
  },
]

// ─── Helpers de API ────────────────────────────────────────────────────────────

async function signUp(name: string, email: string, password: string, role: string) {
  const res = await fetch(`${API_URL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": ORIGIN },
    body: JSON.stringify({ name, email, password, role }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`sign-up failed for ${email}: ${res.status} ${body.slice(0, 200)}`)
  }
  return res
}

async function signIn(email: string, password: string): Promise<string> {
  const res = await fetch(`${API_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": ORIGIN },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(`sign-in failed for ${email}: ${res.status}`)
  const cookie = res.headers.get("set-cookie") ?? ""
  // better-auth returns the cookie directly as a session token in header
  return cookie
}

async function api(method: string, path: string, cookie: string, body?: unknown) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Origin": ORIGIN,
      "Cookie": cookie,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`${method} ${path} → ${res.status}: ${txt.slice(0, 200)}`)
  }
  return res.json()
}

function slug(name: string): string {
  return name.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, ".").replace(/[^a-z0-9.]/g, "")
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🌱 VarzeaPro Seed — modo realista\n")
  const csv = createWriteStream(CSV_PATH)
  csv.write("tipo,nome,email,senha,plano\n")

  const errors: string[] = []

  // ── Admin ────────────────────────────────────────────────────────────────────
  console.log("[ ADMIN ]")
  const adminEmail = "admin@varzeapro.online"
  try {
    await signUp("Admin VarzeaPro", adminEmail, PASSWORD, "player")
    // Better Auth não suporta role=admin no signup; promover via SQL:
    // UPDATE users SET role='admin', plan_id='free' WHERE email='admin@varzeapro.online';
    csv.write(`admin,Admin VarzeaPro,${adminEmail},${PASSWORD},admin\n`)
    console.log(`  ✓ admin@varzeapro.online  (promoção via SQL necessária)`)
  } catch (e) {
    const msg = (e as Error).message
    if (msg.includes("already") || msg.includes("409") || msg.includes("unique")) {
      console.log(`  ~ admin já existe`)
    } else {
      console.log(`  ✗ ${msg}`)
      errors.push(msg)
    }
  }

  // ── Jogadores ────────────────────────────────────────────────────────────────
  console.log(`\n[ JOGADORES — ${PLAYERS.length} ] (free:10 craque:12 fenomeno:8)`)
  for (const p of PLAYERS) {
    const email = `${slug(p.name)}@varzeapro.online`
    try {
      await signUp(p.name, email, PASSWORD, "player")
      const cookie = await signIn(email, PASSWORD)
      await sleep(200)

      // Montar perfil
      const region = p.region
      const citiesForRegion = cities[region] || [region]
      const city = citiesForRegion[Math.floor(Math.random() * citiesForRegion.length)]
      const availability = availabilities[Math.floor(Math.random() * availabilities.length)]

      const profile: Record<string, unknown> = {
        name: p.name,
        positions: p.pos,
        bio: p.bio,
        skills: p.skills,
        height: p.height,
        weight: p.weight,
        birthDate: p.birth,
        availability,
        region,
        city,
        level: p.level,
      }
      if (p.career) profile.careerHistory = p.career
      if (p.stats) profile.detailedStats = p.stats

      await api("PUT", "/api/players/me", cookie, profile)
      await sleep(150)

      // Plano via checkout (mock mode ativa na hora)
      if (p.plan !== "free") {
        await api("POST", "/api/subscription/checkout", cookie, { planId: p.plan })
        await sleep(150)
      }

      csv.write(`jogador,${p.name},${email},${PASSWORD},${p.plan}\n`)
      console.log(`  ✓ [${p.plan.padEnd(8)}] ${p.name}`)
    } catch (e) {
      const msg = (e as Error).message
      if (msg.includes("already") || msg.includes("409") || msg.includes("unique")) {
        // User exists — sign in and re-apply profile + plan
        try {
          const cookie = await signIn(email, PASSWORD)
          await sleep(200)

          const region = p.region
          const citiesForRegion = cities[region] || [region]
          const city = citiesForRegion[Math.floor(Math.random() * citiesForRegion.length)]
          const availability = availabilities[Math.floor(Math.random() * availabilities.length)]

          const profile: Record<string, unknown> = {
            name: p.name, positions: p.pos, bio: p.bio, skills: p.skills,
            height: p.height, weight: p.weight, birthDate: p.birth,
            availability, region, city, level: p.level,
          }
          if (p.career) profile.careerHistory = p.career
          if (p.stats) profile.detailedStats = p.stats

          await api("PUT", "/api/players/me", cookie, profile)
          await sleep(150)

          if (p.plan !== "free") {
            await api("POST", "/api/subscription/checkout", cookie, { planId: p.plan })
            await sleep(150)
          }

          csv.write(`jogador,${p.name},${email},${PASSWORD},${p.plan}\n`)
          console.log(`  ~ [${p.plan.padEnd(8)}] ${p.name} (atualizado)`)
        } catch (e2) {
          console.log(`  ✗ ${p.name} (reapply): ${(e2 as Error).message}`)
          errors.push(`${p.name} (reapply): ${(e2 as Error).message}`)
        }
      } else {
        console.log(`  ✗ ${p.name}: ${msg}`)
        errors.push(`${p.name}: ${msg}`)
      }
    }
  }

  // ── Times ────────────────────────────────────────────────────────────────────
  console.log(`\n[ TIMES — ${TEAMS.length} ] (free:7 profissional:8)`)
  for (const t of TEAMS) {
    const email = `time.${slug(t.name)}@varzeapro.online`
    try {
      await signUp(t.name, email, PASSWORD, "team")
      const cookie = await signIn(email, PASSWORD)
      await sleep(200)

      const region = t.region
      const citiesForRegion = cities[region] || [region]
      const city = citiesForRegion[0]

      await api("PUT", "/api/teams/me", cookie, {
        name: t.name,
        level: t.level,
        region,
        city,
        description: t.description,
        openPositions: t.openPositions,
        matchDays: t.matchDays,
      })
      await sleep(150)

      if (t.plan === "profissional") {
        await api("POST", "/api/subscription/checkout", cookie, { planId: "profissional" })
        await sleep(150)
      }

      csv.write(`time,${t.name},${email},${PASSWORD},${t.plan}\n`)
      console.log(`  ✓ [${t.plan.padEnd(12)}] ${t.name}`)
    } catch (e) {
      const msg = (e as Error).message
      if (msg.includes("already") || msg.includes("409") || msg.includes("unique")) {
        // Team exists — sign in and re-apply profile + plan
        try {
          const cookie = await signIn(email, PASSWORD)
          await sleep(200)

          const region = t.region
          const citiesForRegion = cities[region] || [region]
          const city = citiesForRegion[0]

          await api("PUT", "/api/teams/me", cookie, {
            name: t.name, level: t.level, region, city,
            description: t.description,
            openPositions: t.openPositions,
            matchDays: t.matchDays,
          })
          await sleep(150)

          if (t.plan === "profissional") {
            await api("POST", "/api/subscription/checkout", cookie, { planId: "profissional" })
            await sleep(150)
          }

          csv.write(`time,${t.name},${email},${PASSWORD},${t.plan}\n`)
          console.log(`  ~ [${t.plan.padEnd(12)}] ${t.name} (atualizado)`)
        } catch (e2) {
          console.log(`  ✗ ${t.name} (reapply): ${(e2 as Error).message}`)
          errors.push(`${t.name} (reapply): ${(e2 as Error).message}`)
        }
      } else {
        console.log(`  ✗ ${t.name}: ${msg}`)
        errors.push(`${t.name}: ${msg}`)
      }
    }
  }

  csv.end()

  // ── Profile Views ────────────────────────────────────────────────────────────
  console.log("\n[ PROFILE VIEWS ]")

  // Map: player name → which teams viewed (team name list)
  const VIEW_SCENARIOS: Array<{ player: string; viewers: string[] }> = [
    // Matheus Cardoso — visto por 6 times (destaque do seed)
    {
      player: "Matheus Cardoso Dias",
      viewers: ["Fúria FC", "Trovão United", "Leões da Serra", "Dragão Vermelho EC", "Nordeste Champions", "Pampa Elite FC"],
    },
    // Rodrigo Lima Santos (fenomeno/atacante SP) — muito procurado
    {
      player: "Rodrigo Lima Santos",
      viewers: ["Fúria FC", "Trovão United", "Leões da Serra", "Dragão Vermelho EC"],
    },
    // João Victor Pereira (fenomeno/meia RJ) — times locais + nacionais
    {
      player: "João Victor Pereira",
      viewers: ["Trovão United", "Fúria FC", "Nordeste Champions"],
    },
    // Gustavo Henrique Alves (fenomeno/zagueiro BH)
    {
      player: "Gustavo Henrique Alves",
      viewers: ["Leões da Serra", "Dragão Vermelho EC", "Pampa Elite FC"],
    },
    // Rafael Oliveira Gomes (craque/atacante SP)
    {
      player: "Rafael Oliveira Gomes",
      viewers: ["Fúria FC", "Bahiano Elite SC"],
    },
    // Nathan Felipe Carvalho (fenomeno/volante-meia POA)
    {
      player: "Nathan Felipe Carvalho",
      viewers: ["Pampa Elite FC", "Dragão Vermelho EC"],
    },
    // Carlos Eduardo Silva (free/atacante SP)
    {
      player: "Carlos Eduardo Silva",
      viewers: ["Fúria FC"],
    },
  ]

  for (const scenario of VIEW_SCENARIOS) {
    const playerEmail = `${slug(scenario.player)}@varzeapro.online`
    // Sign in as each viewer team and GET the player profile
    let successCount = 0
    for (const teamName of scenario.viewers) {
      const teamEmail = `time.${slug(teamName)}@varzeapro.online`
      try {
        // Find player id first — need to call search or GET /players/me as player
        const playerCookie = await signIn(playerEmail, PASSWORD)
        const playerMe = await api("GET", "/api/players/me", playerCookie) as { data: { id: string } }
        const playerId = playerMe.data.id

        // Now sign in as team and view the profile
        const teamCookie = await signIn(teamEmail, PASSWORD)
        await api("GET", `/api/players/${playerId}`, teamCookie)
        successCount++
        await sleep(100)
      } catch (e) {
        // non-critical
      }
    }
    console.log(`  ✓ ${scenario.player} — ${successCount}/${scenario.viewers.length} views registradas`)
  }

  // ─── Resumo ──────────────────────────────────────────────────────────────────
  console.log("\n─────────────────────────────────────────────────────────────────")
  console.log("SEED CONCLUÍDO\n")

  console.log("SENHA UNIVERSAL: " + PASSWORD + "\n")

  console.log("─── ADMIN ───────────────────────────────────────────────────────")
  console.log("  admin@varzeapro.online")
  console.log("  ⚠  Promover via SQL:")
  console.log("     UPDATE users SET role='admin' WHERE email='admin@varzeapro.online';\n")

  console.log("─── JOGADORES FREE (sem carreira/stats) ─────────────────────────")
  for (const p of PLAYERS.filter(x => x.plan === "free")) {
    console.log(`  ${slug(p.name)}@varzeapro.online  [${p.pos.join("/")}] ${p.region}`)
  }

  console.log("\n─── JOGADORES CRAQUE (carreira visível) ─────────────────────────")
  for (const p of PLAYERS.filter(x => x.plan === "craque")) {
    console.log(`  ${slug(p.name)}@varzeapro.online  [${p.pos.join("/")}] ${p.region}`)
  }

  console.log("\n─── JOGADORES FENÔMENO (stats + carreira) ───────────────────────")
  for (const p of PLAYERS.filter(x => x.plan === "fenomeno")) {
    console.log(`  ${slug(p.name)}@varzeapro.online  [${p.pos.join("/")}] ${p.region}`)
  }

  console.log("\n─── TIMES PELADA (free — não vê stats) ─────────────────────────")
  for (const t of TEAMS.filter(x => x.plan === "free")) {
    console.log(`  time.${slug(t.name)}@varzeapro.online  ${t.region}`)
  }

  console.log("\n─── TIMES PROFISSIONAL (vê carreira + stats) ────────────────────")
  for (const t of TEAMS.filter(x => x.plan === "profissional")) {
    console.log(`  time.${slug(t.name)}@varzeapro.online  ${t.region}`)
  }

  if (errors.length > 0) {
    console.log("\n─── ERROS ───────────────────────────────────────────────────────")
    for (const e of errors) console.log("  ✗ " + e)
  }

  console.log("\nCredenciais salvas em: " + CSV_PATH)
  console.log("─────────────────────────────────────────────────────────────────\n")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
