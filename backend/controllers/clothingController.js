import clothingService from "../services/clothingService.js";

const createClothing = async (req, res) => {
  try {
    const { title, description, size, category, media, condition, style } = req.body;

    const clothing = await clothingService.create({
      title,
      description,
      size,
      category,
      media,
      condition,
      style,
      userId: req.loggerUser.id,
    });

    return res.status(201).json({
      message: "Peça cadastrada com sucesso",
      clothing,
    });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({ error: error.message });
    }
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ error: "Dados da peça inválidos" });
    }
    console.log(error);
    return res.status(500).json({
      error: "Não foi possível cadastrar a peça",
    });
  }
};

const getAllClothes = async (req, res) => {
  try {
    const clothes = await clothingService.getAll();
    return res.status(200).json(clothes);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      error: "Não foi possível buscar as peças",
    });
  }
};

const getClothingById = async (req, res) => {
  try {
    const { id } = req.params;
    const clothing = await clothingService.getById(id);

    if (!clothing) {
      return res.status(404).json({
        error: "Peça não encontrada",
      });
    }

    return res.status(200).json(clothing);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      error: "Não foi possível buscar a peça",
    });
  }
};

const updateClothing = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await clothingService.update(id, req.loggerUser?.id, req.body);

    if (!updated) {
      return res.status(404).json({
        error: "Peça não encontrada",
      });
    }

    return res.status(200).json({
      message: "Peça atualizada com sucesso",
      clothing: updated,
    });
  } catch (error) {
    if (error.statusCode === 400 || error.statusCode === 401) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ error: "Dados da peça inválidos" });
    }
    console.log(error);
    return res.status(500).json({
      error: "Erro ao atualizar peça",
    });
  }
};

const deleteClothing = async (req, res) => {
  try {
    const { id } = req.params;
    const clothing = await clothingService.delete(id, req.loggerUser?.id);

    if (!clothing) {
      return res.status(404).json({
        error: "Peça não encontrada",
      });
    }

    return res.status(200).json({
      message: "Peça removida com sucesso",
    });
  } catch (error) {
    if (error.statusCode === 400 || error.statusCode === 401) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.log(error);
    return res.status(500).json({
      error: "Não foi possível remover a peça",
    });
  }
};

const getMyClothes = async (req, res) => {
  try {
    const userId = req.loggerUser.id;

    const clothes = await clothingService.getByUserId(userId);

    return res.status(200).json(clothes);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      error: "Não foi possível buscar as peças do usuário",
    });
  }
};
export default {
  createClothing,
  getAllClothes,
  getClothingById,
  getMyClothes,
  updateClothing,
  deleteClothing,
};
