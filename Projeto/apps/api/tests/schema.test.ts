import { describe, it, expect } from "vitest"
import {
  users,
  players,
  teams,
  conversations,
  messages,
  subscriptions,
  auditLogs,
  moderationReports,
  roleEnum,
  planIdEnum,
  teamLevelEnum,
  subscriptionStatusEnum,
  reportedEntityTypeEnum,
  reportReasonEnum,
  reportStatusEnum,
} from "../src/db/schema/index"

describe("Schema: users", () => {
  it("has expected columns", () => {
    const cols = Object.keys(users)
    expect(cols).toContain("id")
    expect(cols).toContain("email")
    expect(cols).toContain("name")
    expect(cols).toContain("passwordHash")
    expect(cols).toContain("role")
    expect(cols).toContain("planId")
    expect(cols).toContain("banned")
    expect(cols).toContain("createdAt")
    expect(cols).toContain("updatedAt")
  })

  it("email has unique constraint", () => {
    const emailCol = (users as any).email
    expect(emailCol.isUnique).toBe(true)
  })

  it("roleEnum has correct values", () => {
    expect(roleEnum.enumValues).toEqual(["player", "team", "admin"])
  })

  it("planIdEnum has correct values", () => {
    expect(planIdEnum.enumValues).toEqual(["free", "craque", "titular", "campeao"])
  })
})

describe("Schema: players", () => {
  it("has expected columns", () => {
    const cols = Object.keys(players)
    expect(cols).toContain("id")
    expect(cols).toContain("userId")
    expect(cols).toContain("name")
    expect(cols).toContain("photoUrl")
    expect(cols).toContain("positions")
    expect(cols).toContain("bio")
    expect(cols).toContain("skills")
    expect(cols).toContain("height")
    expect(cols).toContain("weight")
    expect(cols).toContain("birthDate")
    expect(cols).toContain("phone")
    expect(cols).toContain("availability")
    expect(cols).toContain("createdAt")
    expect(cols).toContain("updatedAt")
  })

  it("positions column is an array type", () => {
    const posCol = (players as any).positions
    expect(posCol.columnType).toMatch(/array/i)
  })
})

describe("Schema: teams", () => {
  it("has expected columns", () => {
    const cols = Object.keys(teams)
    expect(cols).toContain("id")
    expect(cols).toContain("userId")
    expect(cols).toContain("name")
    expect(cols).toContain("logoUrl")
    expect(cols).toContain("level")
    expect(cols).toContain("region")
    expect(cols).toContain("city")
    expect(cols).toContain("description")
    expect(cols).toContain("openPositions")
    expect(cols).toContain("matchDays")
    expect(cols).toContain("createdAt")
    expect(cols).toContain("updatedAt")
  })

  it("teamLevelEnum has correct values", () => {
    expect(teamLevelEnum.enumValues).toEqual(["amador", "recreativo", "semi-profissional", "outro"])
  })
})

describe("Schema: conversations", () => {
  it("has expected columns", () => {
    const cols = Object.keys(conversations)
    expect(cols).toContain("id")
    expect(cols).toContain("participantA")
    expect(cols).toContain("participantB")
    expect(cols).toContain("createdAt")
    expect(cols).toContain("updatedAt")
  })
})

describe("Schema: messages", () => {
  it("has expected columns", () => {
    const cols = Object.keys(messages)
    expect(cols).toContain("id")
    expect(cols).toContain("conversationId")
    expect(cols).toContain("senderId")
    expect(cols).toContain("content")
    expect(cols).toContain("readAt")
    expect(cols).toContain("createdAt")
  })

  it("id column uses bigserial (not text)", () => {
    const idCol = (messages as any).id
    expect(idCol.columnType).toBe("PgBigSerial")
  })
})

describe("Schema: subscriptions", () => {
  it("has expected columns", () => {
    const cols = Object.keys(subscriptions)
    expect(cols).toContain("id")
    expect(cols).toContain("userId")
    expect(cols).toContain("planId")
    expect(cols).toContain("status")
    expect(cols).toContain("currentPeriodStart")
    expect(cols).toContain("currentPeriodEnd")
    expect(cols).toContain("cancelAtPeriodEnd")
    expect(cols).toContain("createdAt")
    expect(cols).toContain("updatedAt")
  })

  it("userId has unique constraint (one subscription per user)", () => {
    const userIdCol = (subscriptions as any).userId
    expect(userIdCol.isUnique).toBe(true)
  })

  it("subscriptionStatusEnum has correct values", () => {
    expect(subscriptionStatusEnum.enumValues).toEqual(["active", "canceled", "past_due", "trialing"])
  })
})

describe("Schema: auditLogs", () => {
  it("has expected columns", () => {
    const cols = Object.keys(auditLogs)
    expect(cols).toContain("id")
    expect(cols).toContain("adminId")
    expect(cols).toContain("action")
    expect(cols).toContain("targetEntityType")
    expect(cols).toContain("targetEntityId")
    expect(cols).toContain("note")
    expect(cols).toContain("createdAt")
  })
})

describe("Schema: moderationReports", () => {
  it("has expected columns", () => {
    const cols = Object.keys(moderationReports)
    expect(cols).toContain("id")
    expect(cols).toContain("reporterId")
    expect(cols).toContain("reportedEntityType")
    expect(cols).toContain("reportedEntityId")
    expect(cols).toContain("reason")
    expect(cols).toContain("description")
    expect(cols).toContain("status")
    expect(cols).toContain("createdAt")
  })

  it("reportedEntityTypeEnum has correct values", () => {
    expect(reportedEntityTypeEnum.enumValues).toEqual(["player", "team", "message"])
  })

  it("reportReasonEnum has correct values", () => {
    expect(reportReasonEnum.enumValues).toEqual(["inappropriate", "spam", "harassment", "fake", "other"])
  })

  it("reportStatusEnum has correct values", () => {
    expect(reportStatusEnum.enumValues).toEqual(["pending", "dismissed", "resolved"])
  })
})

describe("Schema: index re-exports", () => {
  it("exports all 8 table variables", () => {
    expect(users).toBeDefined()
    expect(players).toBeDefined()
    expect(teams).toBeDefined()
    expect(conversations).toBeDefined()
    expect(messages).toBeDefined()
    expect(subscriptions).toBeDefined()
    expect(auditLogs).toBeDefined()
    expect(moderationReports).toBeDefined()
  })

  it("exports all enum variables", () => {
    expect(roleEnum).toBeDefined()
    expect(planIdEnum).toBeDefined()
    expect(teamLevelEnum).toBeDefined()
    expect(subscriptionStatusEnum).toBeDefined()
    expect(reportedEntityTypeEnum).toBeDefined()
    expect(reportReasonEnum).toBeDefined()
    expect(reportStatusEnum).toBeDefined()
  })
})
