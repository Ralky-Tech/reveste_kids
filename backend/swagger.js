const clothingAttributeProperties = Object.fromEntries(
  Object.entries({
    category: "Camiseta",
    size: "6",
    condition: "Seminova",
    style: "Casual",
  }).map(([name, example]) => [
    name,
    {
      type: "string",
      default: "",
      example,
      description:
        "Opcional. Espaços nas extremidades são removidos. String vazia limpa o atributo; omissão no PUT preserva o valor. Peças antigas sem o campo são retornadas com string vazia.",
    },
  ])
);

const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "Reveste Kids API",
    version: "1.0.0",
    description:
      "Documentação da API do sistema Reveste Kids, incluindo autenticação, usuários, peças de roupa, curtidas, matches, notificações e chat.",
  },
  servers: [
    {
      url: "http://localhost:4000",
      description: "Servidor local",
    },
  ],
  tags: [
    { name: "Auth", description: "Autenticação de usuários" },
    { name: "Users", description: "Gerenciamento de usuários" },
    { name: "Clothes", description: "Gerenciamento de peças de roupa" },
    { name: "Likes", description: "Curtidas em peças de roupa" },
    { name: "Matches", description: "Matches entre usuários" },
    { name: "Chat", description: "Mensagens e conversas entre usuários" },
    { name: "Notifications", description: "Notificações do sistema" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          error: {
            type: "string",
            example: "Erro interno do servidor",
          },
        },
      },
      MessageResponse: {
        type: "object",
        properties: {
          message: {
            type: "string",
            example: "Operação realizada com sucesso",
          },
        },
      },
      User: {
        type: "object",
        properties: {
          _id: {
            type: "string",
            example: "663f1b2a9b3c2d001234abcd",
          },
          name: {
            type: "string",
            example: "Maria Oliveira",
          },
          email: {
            type: "string",
            example: "maria@email.com",
          },
          city: {
            type: "string",
            example: "Registro",
          },
          state: {
            type: "string",
            example: "SP",
          },
        },
      },
      RegisterInput: {
        type: "object",
        required: ["name", "email", "password"],
        properties: {
          name: {
            type: "string",
            example: "Maria Oliveira",
          },
          email: {
            type: "string",
            example: "maria@email.com",
          },
          password: {
            type: "string",
            example: "123456",
          },
        },
      },
      LoginInput: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: {
            type: "string",
            example: "maria@email.com",
          },
          password: {
            type: "string",
            example: "123456",
          },
        },
      },
      LoginResponse: {
        type: "object",
        properties: {
          message: {
            type: "string",
            example: "Login realizado com sucesso",
          },
          token: {
            type: "string",
            example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          },
          user: {
            $ref: "#/components/schemas/User",
          },
        },
      },
      Clothing: {
        type: "object",
        properties: {
          _id: {
            type: "string",
            example: "663f1b2a9b3c2d001234abce",
          },
          title: {
            type: "string",
            example: "Camiseta infantil azul",
          },
          description: {
            type: "string",
            example: "Camiseta em bom estado, tamanho 6.",
          },
          ...clothingAttributeProperties,
          media: {
            type: "array",
            items: { $ref: "#/components/schemas/ClothingMedia" },
          },
          userId: {
            type: "string",
            example: "663f1b2a9b3c2d001234abcd",
          },
        },
      },
      ClothingInput: {
        type: "object",
        required: ["title", "description"],
        properties: {
          title: {
            type: "string",
            example: "Camiseta infantil azul",
          },
          description: {
            type: "string",
            example: "Camiseta em bom estado, tamanho 6.",
          },
          ...clothingAttributeProperties,
          media: {
            type: "array",
            items: { $ref: "#/components/schemas/ClothingMedia" },
          },
        },
      },
      ClothingMedia: {
        type: "object",
        required: ["type", "url"],
        properties: {
          type: { type: "string", enum: ["image", "video"] },
          url: {
            type: "string",
            example: "https://example.invalid/roupa-ficticia.png",
          },
        },
      },
      ClothingUpdateInput: {
        type: "object",
        description:
          "Atualização parcial. Somente title, description, media, category, size, condition e style são editáveis. _id e userId são ignorados. Operadores MongoDB e caminhos pontuados são rejeitados. Informe ao menos um campo editável.",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          media: {
            type: "array",
            items: { $ref: "#/components/schemas/ClothingMedia" },
          },
          ...clothingAttributeProperties,
        },
      },
      ClothingMutationResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
          clothing: { $ref: "#/components/schemas/Clothing" },
        },
      },
      Notification: {
        type: "object",
        properties: {
          _id: {
            type: "string",
            example: "663f1b2a9b3c2d001234abcf",
          },
          userId: {
            type: "string",
            example: "663f1b2a9b3c2d001234abcd",
          },
          message: {
            type: "string",
            example: "Sua peça recebeu uma nova curtida.",
          },
          read: {
            type: "boolean",
            example: false,
          },
          createdAt: {
            type: "string",
            example: "2026-05-13T10:00:00.000Z",
          },
        },
      },
    },
  },
  paths: {
    "/user": {
      post: {
        tags: ["Auth"],
        summary: "Cadastrar novo usuário",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/RegisterInput",
              },
            },
          },
        },
        responses: {
          201: { description: "Usuário cadastrado com sucesso" },
          400: { description: "Dados inválidos ou e-mail já cadastrado" },
          500: { description: "Erro interno do servidor" },
        },
      },
    },

    "/auth": {
      post: {
        tags: ["Auth"],
        summary: "Realizar login",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/LoginInput",
              },
            },
          },
        },
        responses: {
          200: {
            description: "Login realizado com sucesso",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/LoginResponse",
                },
              },
            },
          },
          401: { description: "Credenciais inválidas" },
          500: { description: "Erro interno do servidor" },
        },
      },
    },

    "/clothes": {
      get: {
        tags: ["Clothes"],
        summary: "Listar peças de roupa",
        responses: {
          200: { description: "Lista de peças cadastradas" },
          500: { description: "Erro interno do servidor" },
        },
      },
      post: {
        tags: ["Clothes"],
        summary: "Cadastrar nova peça de roupa",
        description:
          "Recebe JSON com URLs de mídias já disponíveis. O proprietário é definido pelo JWT, nunca pelo corpo da requisição.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ClothingInput",
              },
            },
          },
        },
        responses: {
          201: {
            description: "Peça cadastrada com sucesso",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ClothingMutationResponse" },
              },
            },
          },
          400: { description: "Dados inválidos; os atributos devem ser strings" },
          401: { description: "Não autorizado" },
          500: { description: "Erro interno do servidor" },
        },
      },
    },

    "/clothes/{id}": {
      get: {
        tags: ["Clothes"],
        summary: "Buscar peça por ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Peça encontrada" },
          404: { description: "Peça não encontrada" },
          500: { description: "Erro interno do servidor" },
        },
      },
      put: {
        tags: ["Clothes"],
        summary: "Editar uma peça de roupa do usuário autenticado",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ClothingUpdateInput" },
            },
          },
        },
        responses: {
          200: {
            description: "Peça atualizada com sucesso",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ClothingMutationResponse" },
              },
            },
          },
          400: { description: "ID, atributos ou operação de atualização inválidos" },
          401: { description: "Não autorizado" },
          404: { description: "Peça inexistente ou pertencente a outro usuário" },
          500: { description: "Erro interno do servidor" },
        },
      },
      delete: {
        tags: ["Clothes"],
        summary: "Excluir peça de roupa",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Peça excluída com sucesso" },
          401: { description: "Não autorizado" },
          404: { description: "Peça não encontrada" },
        },
      },
    },

    "/my-clothes": {
      get: {
        tags: ["Clothes"],
        summary: "Listar minhas peças de roupa",
        description: "Retorna as peças cadastradas pelo usuário autenticado.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Lista de peças do usuário autenticado" },
          401: { description: "Não autorizado" },
        },
      },
    },

    "/api/like/{clothingId}": {
      post: {
        tags: ["Likes"],
        summary: "Curtir uma peça de roupa",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "clothingId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Curtida registrada com sucesso" },
          401: { description: "Não autorizado" },
          404: { description: "Peça não encontrada" },
        },
      },
      delete: {
        tags: ["Likes"],
        summary: "Remover curtida de uma peça de roupa",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "clothingId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Curtida removida com sucesso" },
          401: { description: "Não autorizado" },
          404: { description: "Peça ou curtida não encontrada" },
        },
      },
    },

    "/api/my-likes": {
      get: {
        tags: ["Likes"],
        summary: "Listar minhas curtidas",
        description: "Retorna as peças curtidas pelo usuário autenticado.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Lista de curtidas do usuário autenticado" },
          401: { description: "Não autorizado" },
        },
      },
    },

    "/api/matches": {
      get: {
        tags: ["Matches"],
        summary: "Listar matches do usuário autenticado",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Lista de matches" },
          401: { description: "Não autorizado" },
        },
      },
    },

    "/api/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "Listar notificações do usuário autenticado",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Lista de notificações" },
          401: { description: "Não autorizado" },
        },
      },
    },

    "/api/notifications/{notificationId}/read": {
      patch: {
        tags: ["Notifications"],
        summary: "Marcar notificação como lida",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "notificationId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Notificação marcada como lida" },
          404: { description: "Notificação não encontrada" },
        },
      },
    },

    "/api/notifications/read-all": {
      patch: {
        tags: ["Notifications"],
        summary: "Marcar todas as notificações como lidas",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Todas as notificações foram marcadas como lidas" },
          401: { description: "Não autorizado" },
        },
      },
    },

    "/api/notifications/clear-read": {
      patch: {
        tags: ["Notifications"],
        summary: "Limpar notificações lidas",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Notificações lidas removidas com sucesso" },
          401: { description: "Não autorizado" },
        },
      },
    },

    "/api/chat/matches": {
      post: {
        tags: ["Matches"],
        summary: "Criar match para conversa",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  user1: {
                    type: "string",
                    example: "663f1b2a9b3c2d001234abcd",
                  },
                  user2: {
                    type: "string",
                    example: "663f1b2a9b3c2d001234abce",
                  },
                  clothingId: {
                    type: "string",
                    example: "663f1b2a9b3c2d001234abcf",
                  },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Match criado com sucesso" },
          500: { description: "Erro interno do servidor" },
        },
      },
    },

    "/api/chat/messages": {
      post: {
        tags: ["Chat"],
        summary: "Enviar mensagem no chat",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["matchId", "senderId", "text"],
                properties: {
                  matchId: {
                    type: "string",
                    example: "663f1b2a9b3c2d001234abcd",
                  },
                  senderId: {
                    type: "string",
                    example: "663f1b2a9b3c2d001234abce",
                  },
                  text: {
                    type: "string",
                    example: "Olá! Tenho interesse nessa peça.",
                  },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Mensagem enviada com sucesso" },
          500: { description: "Erro interno do servidor" },
        },
      },
    },

    "/api/chat/matches/{matchId}/messages": {
      get: {
        tags: ["Chat"],
        summary: "Listar mensagens de um match",
        parameters: [
          {
            name: "matchId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Lista de mensagens do match" },
          404: { description: "Match não encontrado" },
        },
      },
    },

    "/api/chat/users/{userId}/matches": {
      get: {
        tags: ["Chat"],
        summary: "Listar matches de um usuário",
        parameters: [
          {
            name: "userId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Lista de matches do usuário" },
          404: { description: "Usuário não encontrado" },
        },
      },
    },
  },
};

export default swaggerSpec;
