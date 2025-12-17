import express from "express";
import {
  signIn,
  signUp,
  signOut,
  refreshToken,
  refreshTokenWhenUnauthorized,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/signup", signUp);

router.post("/signin", signIn);

router.post("/signout", signOut);

router.post("/refresh", refreshToken);

router.post("/refresh-when-unauthorized", refreshTokenWhenUnauthorized);

export default router;
