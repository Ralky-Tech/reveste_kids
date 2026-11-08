export interface Notificacao {
  _id: string;
  type: "LIKE" | "MATCH" | "MESSAGE";
  message: string;
  read: boolean;
  createdAt: string;
}

export interface ListaNotificacoes {
  notifications: Notificacao[];
  unreadCount: number;
}
