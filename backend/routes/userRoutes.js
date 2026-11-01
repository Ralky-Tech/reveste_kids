//importando
import express from 'express';
//Carregar o express.Route()
const userRoutes = express.Router()
//Importar o controller de usuário
import userController from '../controllers/userController.js'
import { googleLogin } from '../controllers/googleAuthController.js';

//Endpoint pára cadastrar um usuário
userRoutes.post("/user", userController.createUser)

//Endpoint para logar um usuario
userRoutes.post("/auth", userController.loginUser )

userRoutes.post("/auth/google", googleLogin);

export default userRoutes;