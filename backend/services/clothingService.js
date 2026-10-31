import Clothing from "../models/Clothing.js";
import Interest from "../models/Interest.js";

const isObjectId = (value) =>
  typeof value === "string" && /^[a-fA-F0-9]{24}$/.test(value);

const requestError = (message, statusCode) =>
  Object.assign(new Error(message), { statusCode });

const validateOwnershipIds = (id, userId) => {
  if (!isObjectId(userId)) {
    throw requestError("Acesso não autorizado", 401);
  }
  if (!isObjectId(id)) {
    throw requestError("ID da peça inválido", 400);
  }
};

const hasUnsafeKeys = (value) => {
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(
    ([key, nested]) =>
      key.startsWith("$") || key.includes(".") || hasUnsafeKeys(nested)
  );
};

const getEditableFields = (data) => {
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    hasUnsafeKeys(data)
  ) {
    throw requestError("Dados de atualização inválidos", 400);
  }

  const changes = {};
  for (const field of ["title", "description", "media"]) {
    if (Object.hasOwn(data, field)) changes[field] = data[field];
  }
  if (Object.keys(changes).length === 0) {
    throw requestError("Nenhum campo editável informado", 400);
  }
  return changes;
};

class ClothingService {
  async create(data) {
    try {
      const newClothing = new Clothing(data);
      await newClothing.save();
      return newClothing;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async getAll() {
    try {
      const clothes = await Clothing.find()
        .populate("userId", "name email")
        .lean();

      const clothesWithLikes = await Promise.all(
        clothes.map(async (item) => {
          const likesCount = await Interest.countDocuments({
            clothingId: item._id,
          });

          return {
            ...item,
            likesCount,
          };
        }),
      );

      return clothesWithLikes;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async getById(id) {
    try {
      const clothing = await Clothing.findById(id).populate("userId", "name email");
      return clothing;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async update(id, userId, data) {
    try {
      validateOwnershipIds(id, userId);
      const changes = getEditableFields(data);
      const clothing = await Clothing.findOneAndUpdate(
        { _id: id, userId },
        { $set: changes },
        { new: true, runValidators: true }
      );

      return clothing;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async delete(id, userId) {
    try {
      validateOwnershipIds(id, userId);
      const clothing = await Clothing.findOneAndDelete({ _id: id, userId });
      return clothing;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async getByUserId(userId) {
    try {
      const clothes = await Clothing.find({ userId }).populate("userId", "name email");
      return clothes;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}

export default new ClothingService();
