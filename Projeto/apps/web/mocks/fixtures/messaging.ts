import type { ConversationSummary, Message } from "~shared/contracts";

export const mockConversations: ConversationSummary[] = [
  {
    id: "conv-1",
    otherParticipant: { id: "user-team-1", name: "Time São Paulo FC", avatarUrl: undefined },
    lastMessage: {
      content: "Opa, podemos marcar um teste?",
      createdAt: "2024-01-15T14:00:00Z",
      senderId: "user-team-1",
    },
    unreadCount: 0,
  },
];

export const mockMessagesByConversation: Record<string, Message[]> = {
  "conv-1": [
    {
      id: "msg-1",
      conversationId: "conv-1",
      senderId: "user-player-1",
      content: "Oi, tenho interesse em jogar no time.",
      createdAt: "2024-01-15T13:00:00Z",
    },
    {
      id: "msg-2",
      conversationId: "conv-1",
      senderId: "user-team-1",
      content: "Opa, podemos marcar um teste?",
      createdAt: "2024-01-15T14:00:00Z",
    },
  ],
};
