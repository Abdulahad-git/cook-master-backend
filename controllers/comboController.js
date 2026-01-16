import Combo from "../models/Combo.js";
import Dish from "../models/Dish.js";

/**
 * ✅ Create Combo
 */
export const createCombo = async (req, res) => {
  try {
    const { name, description, dishes, price, imageUrl, minOrderQty } =
      req.body;

    const cookId = req.user.id; // assuming auth middleware

    if (!dishes || dishes.length === 0) {
      return res
        .status(400)
        .json({ message: "Combo must contain at least one dish" });
    }

    // 🔍 Validate dishes exist
    const dishIds = dishes.map((d) => d.dishId);
    const foundDishes = await Dish.find({ _id: { $in: dishIds } });

    if (foundDishes.length !== dishIds.length) {
      return res
        .status(400)
        .json({ message: "One or more dishes are invalid" });
    }

    const combo = await Combo.create({
      cookId,
      name,
      description,
      dishes,
      price,
      imageUrl,
      minOrderQty,
    });

    res.status(201).json({
      message: "Combo created successfully",
      combo,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create combo",
      error: error.message,
    });
  }
};

/**
 * ✅ Get all combos of a cook
 */
export const getCombosByCook = async (req, res) => {
  try {
    const cookId = req.user.id;

    const combos = await Combo.find({ cookId })
      .populate("dishes.dishId")
      .sort({ createdAt: -1 });

    res.json(combos);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch combos",
      error: error.message,
    });
  }
};

/**
 * ✅ Get single combo by ID
 */
export const getComboById = async (req, res) => {
  try {
    const { id } = req.params;

    const combo = await Combo.findById(id).populate("dishes.dishId");

    if (!combo) {
      return res.status(404).json({ message: "Combo not found" });
    }

    res.json(combo);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch combo",
      error: error.message,
    });
  }
};

/**
 * ✅ Update combo
 */
export const updateCombo = async (req, res) => {
  try {
    const { id } = req.params;
    const cookId = req.user.id;

    const updatedCombo = await Combo.findOneAndUpdate(
      { _id: id, cookId },
      req.body,
      { new: true, runValidators: true }
    ).populate("dishes.dishId");

    if (!updatedCombo) {
      return res
        .status(404)
        .json({ message: "Combo not found or unauthorized" });
    }

    res.json({
      message: "Combo updated successfully",
      combo: updatedCombo,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update combo",
      error: error.message,
    });
  }
};

/**
 * ✅ Delete combo
 */
export const deleteCombo = async (req, res) => {
  try {
    const { id } = req.params;
    const cookId = req.user.id;

    const deleted = await Combo.findOneAndDelete({ _id: id, cookId });

    if (!deleted) {
      return res
        .status(404)
        .json({ message: "Combo not found or unauthorized" });
    }

    res.json({ message: "Combo deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete combo",
      error: error.message,
    });
  }
};
