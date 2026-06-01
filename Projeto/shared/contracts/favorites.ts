export type FavoriteItem = {
  id: string;
  targetUser: {
    id: string;
    name: string;
    role: "player" | "team";
    avatarUrl: string | null;
    profileId: string | null;
  };
  createdAt: string;
};

export type ListFavoritesResponse = {
  data: FavoriteItem[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type FavoriteActionResponse = {
  id: string;
  favorited: boolean;
};

export type UnfavoriteActionResponse = {
  favorited: boolean;
};
