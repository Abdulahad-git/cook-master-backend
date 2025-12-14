import User from "../models/User.js";
import bcrypt from "bcryptjs";

/**
 * UPDATE logged-in user's profile
 * PUT /api/users/me
 */
export const updateMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const { name, phone, email, password, businessName, address } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update allowed fields
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (email) user.email = email;
    if (businessName !== undefined) user.businessName = businessName;
    if (address !== undefined) user.address = address;

    // Password update (optional)
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(password, salt);
    }

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        businessName: user.businessName,
        address: user.address,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
};

/**
 * GET /api/users/me
 */
export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-passwordHash");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Get Profile Error:", error);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};
