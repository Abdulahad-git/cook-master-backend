import express from "express";
import cloudinary from "../config/cloudinary.js";
import upload from "../config/multer.js";
import sharp from "sharp";

const router = express.Router();

router.post("/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // 🔹 Compress image using Sharp
    const compressedBuffer = await sharp(req.file.buffer)
      .resize({ width: 1024 }) // resize (optional)
      .jpeg({ quality: 70 }) // compression quality (60–80 ideal)
      .toBuffer();

    const base64Image = `data:image/jpeg;base64,${compressedBuffer.toString(
      "base64"
    )}`;

    // 🔹 Upload to Cloudinary
    const result = await cloudinary.uploader.upload(base64Image, {
      folder: "uploads",
    });

    res.status(200).json({
      success: true,
      imageUrl: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
