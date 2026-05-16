import { randomUUID } from "crypto"
import { createWriteStream } from "fs"

const API_URL = process.env.API_URL || "http://localhost:3000"
const ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173"
const PASSWORD = "VarzeaPro@2026"
const CSV_PATH = "./seed-credentials.csv"

const positions = ["Goleiro", "Zagueiro", "Lateral", "Volante", "Meia", "Atacante"]
const levels = ["amador", "recreativo", "semi-profissional"] as const
const regions = ["São Paulo", "Rio de Janeiro", "Belo Horizonte", "Curitiba", "Porto Alegre", "Salvador", "Recife", "Brasília"]
const cities: Record<string, string[]> = {
  "São Paulo": ["São Paulo", "Campinas", "Santos", "Ribeirão Preto"],
  "Rio de Janeiro": ["Rio de Janeiro", "Niterói", "Petrópolis"],
  "Belo Horizonte": ["Belo Horizonte", "Uberlândia", "Contagem"],
  "Curitiba": ["Curitiba", "Londrina", "Maringá"],
  "Porto Alegre": ["Porto Alegre", "Caxias do Sul", "Pelotas"],
  "Salvador": ["Salvador", "Feira de Santana"],
  "Recife": ["Recife", "Olinda", "Caruaru"],
  "Brasília": ["Brasília", "Gama", "Taguatinga"],
}

const teamNames = [
  "Fúria FC", "Trovão United", "Águia Dourada", "Leões da Serra",
  "Fênix SC", "Lobo Bravo", "Tubarão Azul", "Pegasus FC",
  "Tempestade EC", "Falcão Real", "Dragão Vermelho", "Gladiador FC",
  "Trovão Negro", "Águia de Fogo", "Titan FC", "Comando Alpha",
  "Raio de Luz", "Ferro e Fogo", "Ventania EC", "Cavaleiros do Asfalto",
]

const firstNames = [
  "Lucas", "Gabriel", "Rafael", "Matheus", "Bruno", "Felipe", "Carlos",
  "André", "Diego", "Thiago", "Guilherme", "Pedro", "João", "Marcos",
  "Vinícius", "Leonardo", "Daniel", "Rodrigo", "Eduardo", "Gustavo",
  "Henrique", "Caio", "Igor", "Renan", "Vitor", "Alex", "Ricardo",
  "Fernando", "Leandro", "Nathan", "Arthur", "Enzo", "Miguel", "Bernardo",
  "Davi", "Nicolas", "Samuel", "Ryan", "Yuri", "Tales",
]

const lastNames = [
  "Silva", "Santos", "Oliveira", "Souza", "Lima", "Costa", "Ferreira",
  "Rodrigues", "Almeida", "Nascimento", "Pereira", "Araújo", "Barbosa",
  "Moraes", "Ribeiro", "Martins", "Carvalho", "Gomes", "Rocha", "Dias",
  "Campos", "Mendes", "Cardoso", "Nunes", "Teixeira", "Vieira", "Monteiro",
  "Freitas", "Correia", "Pinto",
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function slug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ".").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9.]/g, "")
}

async function signUp(name: string, email: string, password: string, role: string) {
  const res = await fetch(`${API_URL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": ORIGIN },
    body: JSON.stringify({ name, email, password, role }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Sign-up failed for ${email}: ${res.status} ${body}`)
  }
  return res.json()
}

async function main() {
  console.log("Seeding via API...\n")
  const csv = createWriteStream(CSV_PATH)
  csv.write("tipo,nome,email,senha,role\n")

  // ─── Admin ─────────────────────────────────────────────────
  console.log("Creating admin...")
  // Better Auth doesn't have admin role in signup, create as player then update via DB
  // For simplicity, just note it — admin needs to be set manually in DB
  csv.write(`admin,Admin VarzeaPro,admin@varzeapro.online,${PASSWORD},admin\n`)

  // ─── Teams ─────────────────────────────────────────────────
  console.log("Creating 20 teams...")
  for (const teamName of teamNames) {
    const email = `time.${slug(teamName)}@varzeapro.online`
    try {
      await signUp(teamName, email, PASSWORD, "team")
      csv.write(`time,${teamName},${email},${PASSWORD},team\n`)
      console.log(`  ✓ ${teamName}`)
    } catch (e) {
      console.log(`  ✗ ${teamName}: ${(e as Error).message}`)
    }
  }

  // ─── Players ───────────────────────────────────────────────
  console.log("\nCreating 50 players...")
  const usedNames = new Set<string>()
  for (let i = 0; i < 50; i++) {
    let fullName: string
    do {
      fullName = `${pick(firstNames)} ${pick(lastNames)}`
    } while (usedNames.has(fullName))
    usedNames.add(fullName)

    const email = `${slug(fullName)}@varzeapro.online`
    try {
      await signUp(fullName, email, PASSWORD, "player")
      csv.write(`jogador,${fullName},${email},${PASSWORD},player\n`)
      console.log(`  ✓ ${fullName}`)
    } catch (e) {
      console.log(`  ✗ ${fullName}: ${(e as Error).message}`)
    }
  }

  csv.end()
  console.log(`\nCSV saved to ${CSV_PATH}`)
  console.log(`All passwords: ${PASSWORD}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
