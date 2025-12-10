export const authMe = async (req, res) => {
  try {
    const user = req.user; // lấy từ authMiddleware

    return res.status(200).json({ user });
  } catch (error) {
    console.error("Error appears when getting info of user");

    return res.status(500).json({ message: "Error system" });
  }
};
