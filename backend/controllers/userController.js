//importando o userService
import userService from "../services/userService.js";
//importando JWT criação token
import jwt from "jsonwebtoken";

//import bcrypte
import bcrypt from "bcrypt";

// importanfdo as variaveis de ambiente (dotenv)
import dotenv from "dotenv";
//configurnco o dotenv
dotenv.config();

//acessando a variavel armazenada no .env
const JWTSecret = process.env.JWTSECRET;

//Função para cadastrar um usuario
const createUser = async (req, res) => {
  try {
    //coletando os dados
    const { name, email, password } = req.body;

    // Gerando o hash de senha
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    // enviando para cadastrar
    await userService.Create(name, email, hash, "user");

    // Retorno da resposta
    res.status(201).json({ message: "Usuário cadastrado com sucesso" });
    // cod. 201 (create)
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({
        error: "Não foi possivel cadastrar o usuário. Erro interno do servidor",
      });
  }
};

// Função para autenticar(login) um usuario
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    //primeira validação: checar se email existe
    if (email != undefined) {
      // Buscando o usuario no bd
      const user = await userService.getOne(email);
      // se o usuario for encontrado
      if (user != undefined) {
        // verificando o hash de senha
        const correct = bcrypt.compareSync(password, user.password);
        if (correct) {
          // Criar o token
          jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            JWTSecret,
            { expiresIn: "48h" },
            (error, token) => {
              if (error) {
                res
                  .status(400)
                  .json({
                    error: "Não foi possivel gerar o token de autenticação",
                  });
              } else {
                res
                  .status(200)
                  .json({
                    message: "Login realizado com sucesso",
                    token: token,
                  });
              }
            },
          );
        } else {
          res
            .status(401)
            .json({ error: "suas credenciais invalidas. Tente novamente" });
          // cod 401 (unauthorized)
        }
      } else {
        //usuario não encontrardo
        res.status(404).json({ error: "O usuario não foi encontrado." });
      }
      //email invalido ou vazio
    } else {
      res.status(404).json({ error: "email invalido ou nao informado" });
    }
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({
        error: "Não foi possivel realizar o login. Erro interno do sistema",
      });
  }
};

export default { createUser, loginUser, JWTSecret };
