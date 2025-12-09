import express, { Router } from "express";
import { authMe } from "../controllers/userController.js";

const router = express.Router();

router.get("/me", authMe);

export default router;
