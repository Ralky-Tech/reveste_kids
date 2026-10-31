// Interfaces TypeScript: o "contrato" entre o app e a API (Aula 14)

export interface Usuario {
  _id: string;
  name?: string;
  email?: string;
}

export interface Midia {
  type: "image" | "video";
  url: string;
}

export interface Roupa {
  _id: string;
  title: string;
  description: string;
  media: Midia[];
  userId: Usuario | string | null; // pode vir nulo se a conta do dono foi apagada
  category?: string;
  size?: string;
  condition?: string;
  style?: string;
  likesCount?: number;
  createdAt?: string;
}

export interface Match {
  user: Usuario;
  myLikedClothing: Roupa;
  likedMyClothing: Roupa;
}

export interface Sessao {
  token: string;
  id: string;
  email: string;
  nome?: string;
  expiraEm?: number; // momento em que o token vence, em milissegundos
}
