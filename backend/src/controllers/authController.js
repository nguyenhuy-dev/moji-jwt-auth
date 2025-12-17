import bcrypt from "bcrypt";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import Session from "../models/Session.js";
import crypto from "crypto";

const ACCESS_TOKEN_TTL = "10m"; // thường dưới 15m
const REFRESH_TOKEN_TTL = 14 * 24 * 60 * 60 * 1000;

export const signUp = async (req, res) => {
  try {
    const { username, password, email, firstName, lastName } = req.body;

    if (!username || !password || !email || !firstName || !lastName)
      return res.status(400).json({
        message:
          "Can not empty username, password, email, firstName and lastName",
      });

    // kiểm tra username tồn tại chưa
    const duplicate = await User.findOne({ username });

    if (duplicate)
      return res.status(400).json({ message: "username has been existed" });

    // mã hóa password
    const hashedPassword = await bcrypt.hash(password, 10); // salt = 10

    // tạo user mới
    await User.create({
      username,
      hashedPassword,
      email,
      displayName: `${firstName} ${lastName}`,
    });

    // return
    return res.sendStatus(204);
  } catch (error) {
    console.error("Error appears when signing up", error);
    return res.status(500).json({ message: "Error system" });
  }
};

export const signIn = async (req, res) => {
  try {
    // lấy input
    const { username, password } = req.body;

    if (!username || !password)
      return res
        .status(400)
        .json({ message: "Need both username and password" });

    // kiểm tra user có tồn tại
    const user = await User.findOne({ username });

    if (!user)
      return res
        .status(401)
        .json({ message: "username or password is not correct" });

    // lấy hashedPassword trong db để so sánh với password input
    const passwordCorrect = await bcrypt.compare(password, user.hashedPassword);

    if (!passwordCorrect)
      return res
        .status(401)
        .json({ message: "username or password is not correct" });

    // nếu khớp, tạo accessToken với JWT
    const accessToken = jwt.sign(
      { userId: user._id },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL }
    );

    // tạo refresh token
    const refreshToken = crypto.randomBytes(64).toString("hex");

    // tạo session mới để lưu refresh token
    await Session.create({
      userId: user._id,
      refreshToken,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL),
    });

    // trả refresh token về trong cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none", // backend, frontend deploy riêng
      maxAge: REFRESH_TOKEN_TTL,
    });

    // trả access token về trong res
    return res.status(200).json({
      message: `User ${user.displayName} sign in successfully`,
      accessToken,
    });
  } catch (error) {
    console.error("Error appears when signing in", error);
    return res.status(500).json({ message: "Error system" });
  }
};

export const signOut = async (req, res) => {
  try {
    // lấy refresh token từ cookie
    const token = req.cookies?.refreshToken;

    if (token) {
      // xóa refresh token trong Session
      await Session.deleteOne({ refreshToken: token });

      // xóa cookie
      res.clearCookie("refreshToken");
    }

    return res.sendStatus(204);
  } catch (error) {
    console.error("Error appears when signing out", error);
    return res.status(500).json({ message: "Error system" });
  }
};

export const refreshToken = async (req, res) => {
  try {
    // lấy refresh token từ cookies
    const token = req.cookies?.refreshToken;
    if (!token)
      return res.status(401).json({ message: "Token không tồn tại." });

    // so sánh với refresh token trong database
    const session = await Session.findOne({ refreshToken: token });
    if (!session)
      return res
        .status(403)
        .json({ message: "Token không hợp lệ hoặc đã hết hạn." });

    // kiểm tra hết hạn chưa
    if (session.expiresAt < new Date())
      return res
        .status(403)
        .json({ message: "Token không hợp lệ hoặc đã hết hạn." });

    // tạo access token mới
    const accessToken = jwt.sign(
      { userId: session.userId },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL }
    );

    // return
    return res.status(200).json({ accessToken });
  } catch (error) {
    console.error("Error happened when calling refresh token", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

const updateRefreshToken = async (session, res) => {
  // xóa refresh token trong Session
  await Session.deleteOne({ refreshToken: session.refreshToken });

  // tạo refresh token mới
  const refreshToken = crypto.randomBytes(64).toString("hex");

  await Session.create({
    userId: session.userId,
    refreshToken,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL),
  });

  // cập nhật refresh token trong cookies
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: REFRESH_TOKEN_TTL,
  });
};

export const refreshTokenWhenUnauthorized = async (req, res) => {
  try {
    // lấy refresh token từ cookies
    const token = req.cookies?.refreshToken;
    if (!token)
      return res.status(401).json({ message: "Token không tồn tại." });

    // so sánh với refresh token trong database
    const session = await Session.findOne({ refreshToken: token });
    if (!session)
      return res
        .status(403)
        .json({ message: "Token không hợp lệ hoặc đã hết hạn." });

    // kiểm tra hết hạn chưa
    if (session.expiresAt < new Date())
      return res
        .status(403)
        .json({ message: "Token không hợp lệ hoặc đã hết hạn." });

    // tạo access token mới
    const accessToken = jwt.sign(
      { userId: session.userId },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL }
    );

    // cập nhật lại refresh token
    await updateRefreshToken(session, res);

    // return
    return res.status(200).json({ accessToken });
  } catch (error) {
    console.error("Error happened when calling refresh token", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};
