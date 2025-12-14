import Dish from "../models/Dish.js";

/**
 * CREATE dish
 * POST /api/dishes
 */
export const createDish = async (req, res) => {
  try {
    console.log(req.user);
    const dish = await Dish.create({
      cookId: req.user.id,
      name: req.body.name,
      description: req.body.description,
      unit: req.body.unit,
      pricePerUnit: req.body.pricePerUnit,
      minOrderQty: req.body.minOrderQty,
      imageUrl: req.body.imageUrl,
    });

    res.status(201).json(dish);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * READ all dishes of logged-in cook
 * GET /api/dishes
 */
export const getMyDishes = async (req, res) => {
  try {
    const dishes = await Dish.find({ cookId: req.user.id });
    res.json(dishes);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * READ single dish (only if owned by cook)
 * GET /api/dishes/:id
 */
export const getDishById = async (req, res) => {
  try {
    const dish = await Dish.findOne({
      _id: req.params.id,
      cookId: req.user.id,
    });

    if (!dish) {
      return res.status(404).json({ message: "Dish not found" });
    }

    res.json(dish);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * UPDATE dish
 * PUT /api/dishes/:id
 */
export const updateDish = async (req, res) => {
  try {
    const dish = await Dish.findOneAndUpdate(
      { _id: req.params.id, cookId: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!dish) {
      return res
        .status(404)
        .json({ message: "Dish not found or not authorized" });
    }

    res.json(dish);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * DELETE dish
 * DELETE /api/dishes/:id
 */
export const deleteDish = async (req, res) => {
  try {
    const dish = await Dish.findOneAndDelete({
      _id: req.params.id,
      cookId: req.user.id,
    });

    if (!dish) {
      return res
        .status(404)
        .json({ message: "Dish not found or not authorized" });
    }

    res.json({ message: "Dish deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
