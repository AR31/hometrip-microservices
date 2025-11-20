const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/auth");
const { body } = require("express-validator");
const validate = require("../middleware/validate");

// Validation rules
const signupValidation = [
  body("email").isEmail().normalizeEmail().withMessage("Email invalide"),
  body("fullName").trim().isLength({ min: 2, max: 100 }).withMessage("Nom complet requis (2-100 caractères)"),
  body("password").isLength({ min: 8 }).withMessage("Le mot de passe doit contenir au moins 8 caractères"),
  body("role").optional().isIn(["user", "host", "guest", "admin"]).withMessage("Rôle invalide")
];

const loginValidation = [
  body("email").isEmail().normalizeEmail().withMessage("Email invalide"),
  body("password").notEmpty().withMessage("Mot de passe requis")
];

const changePasswordValidation = [
  body("currentPassword").notEmpty().withMessage("Mot de passe actuel requis"),
  body("newPassword").isLength({ min: 8 }).withMessage("Le nouveau mot de passe doit contenir au moins 8 caractères")
];

// Public routes
router.post("/signup", signupValidation, validate, authController.signup);
router.post("/login", loginValidation, validate, authController.login);
router.post("/refresh", authController.refreshToken);

// Protected routes
router.get("/me", authMiddleware, authController.getMe);
router.post("/logout", authMiddleware, authController.logout);
router.post("/change-password", authMiddleware, changePasswordValidation, validate, authController.changePassword);

module.exports = router;
