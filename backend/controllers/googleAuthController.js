import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import userService from '../services/userService.js';

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID?.trim(),
);

function issueSession(user, res) {
  const token = jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWTSECRET,
    { expiresIn: '48h' },
  );

  return res.json({
    token,
    message: 'Login com Google realizado com sucesso',
  });
}

export async function googleLogin(req, res) {
  const audience = process.env.GOOGLE_CLIENT_ID?.trim();

  if (!audience || !process.env.JWTSECRET) {
    return res.status(503).json({
      error: 'Autenticação Google indisponível.',
    });
  }

  const { idToken } = req.body || {};

  if (
    typeof idToken !== 'string' ||
    !idToken.trim() ||
    idToken.length > 16384
  ) {
    return res.status(400).json({
      error: 'Token de identificação do Google não fornecido ou inválido.',
    });
  }

  let profile;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience,
    });

    profile = ticket.getPayload();
  } catch {
    return res.status(401).json({
      error: 'Não foi possível validar sua conta Google.',
    });
  }

  if (
    !profile ||
    typeof profile.sub !== 'string' ||
    !profile.sub.trim() ||
    typeof profile.email !== 'string' ||
    !profile.email.trim() ||
    profile.email_verified !== true
  ) {
    return res.status(401).json({
      error: 'Identidade Google não verificada.',
    });
  }

  try {
    await userService.ensureGoogleIdentityIndexes();

    const identities = await userService.getByGoogleSub(profile.sub);

    if (identities.length > 1) {
      return res.status(409).json({
        error: 'Identidade Google em conflito.',
      });
    }

    // Usuário já vinculado ao Google.
    if (identities.length === 1) {
      return issueSession(identities[0], res);
    }

    const email = profile.email.trim().toLowerCase();

    // Impede a vinculação automática a uma conta existente.
    const existingUser = await userService.getByGoogleEmail(email);

    if (existingUser) {
      return res.status(409).json({
        code: 'GOOGLE_LINK_REQUIRED',
        error: 'Use o login tradicional. A vinculação segura com Google ainda não está disponível.',
      });
    }

    // Cria uma nova conta quando o e-mail ainda não existe.
    const password = await bcrypt.hash(
      randomBytes(32).toString('hex'),
      10,
    );

    try {
      const user = await userService.createGoogleUser({
        name: profile.name || email.split('@')[0],
        email,
        password,
        googleSub: profile.sub,
      });

      return issueSession(user, res);
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          error: 'Cadastro em conflito. Tente novamente.',
        });
      }

      throw error;
    }
  } catch {
    return res.status(503).json({
      error: 'Autenticação Google temporariamente indisponível.',
    });
  }
}
